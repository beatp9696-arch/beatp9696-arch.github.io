// หนึ่งชิป ห้าด่าน — เครื่องยนต์ซูมต่อเนื่อง 10 ทศนิยม (40 m → 1.5 nm)
// เคล็ดลับ: ทุกเฟรมย่อ/ขยายโลกให้ "ภาพกว้าง 10 หน่วย" เสมอ แล้วคำนวณตำแหน่งแต่ละชั้นด้วย float64 ใน JS
// GPU จึงเห็นแต่ตัวเลขขนาดพอดีๆ ไม่ว่าจะซูมลึกแค่ไหน
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/RoomEnvironment.js';
import { buildLevels, atomUniforms, smooth } from './levels.mjs';
import { setAniso } from './textures.mjs';
import { GATES, LAYERS, COMPARE, TOUR, SUMMARY, SRC, SRC_ORDER } from './content.mjs';

const Q = new URLSearchParams(location.search);
const STILL = Q.has('still');
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const LOG_MAX = Math.log10(40), LOG_MIN = Math.log10(1.6e-9);
const D2R = Math.PI / 180;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lg = Math.log10;
const $ = s => document.querySelector(s);

/* ================= renderer / scene ================= */
const canvas = $('#stage');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
} catch (e) {
  document.body.dataset.fail = 'webgl';
  throw e;
}
let PR = Math.min(devicePixelRatio || 1, STILL ? 1.5 : 1.75);
renderer.setPixelRatio(PR);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
setAniso(Math.min(8, renderer.capabilities.getMaxAnisotropy()));

const BG = new THREE.Color('#050908');
const scene = new THREE.Scene();
scene.background = BG;
scene.fog = new THREE.Fog(BG, 20, 60);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.55;

const camera = new THREE.PerspectiveCamera(32, 1, 0.05, 420);
scene.add(new THREE.HemisphereLight('#cfe3ff', '#0a0f0d', 0.5));
const key = new THREE.DirectionalLight('#fff6ea', 2.6);
key.position.set(0.42, 1, 0.58).multiplyScalar(40);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
Object.assign(key.shadow.camera, { left: -17, right: 17, top: 17, bottom: -17, near: 1, far: 95 });
key.shadow.bias = -0.0004;
key.shadow.normalBias = 0.035;
scene.add(key, key.target);
const rim = new THREE.DirectionalLight('#7fe6ff', 0.75);
rim.position.set(-0.6, 0.45, -0.8).multiplyScalar(40);
scene.add(rim);

/* ================= โลก 8 ชั้น ================= */
let LEVELS = [];
function initLevels() {
  LEVELS = buildLevels();
  // จุดกำเนิดของแต่ละชั้นในพิกัดโลก (เมตร, float64)
  let o = [0, 0, 0];
  for (const L of LEVELS) {
    L.origin = o.slice();
    L.step = L.focus.map(v => v * L.unit);
    o = o.map((v, i) => v + L.step[i]);
    L.group.visible = false;
    L.group.matrixAutoUpdate = true;
    scene.add(L.group);
  }
}
function targetAt(logS) {
  const t = [0, 0, 0];
  for (const L of LEVELS) {
    if (!L.step.some(v => v)) continue;
    const w = L.move ? smooth(lg(L.move[0]), lg(L.move[1]), logS) : 0;
    for (let i = 0; i < 3; i++) t[i] += L.step[i] * w;
  }
  return t;
}

/* ================= กล้อง: มุมตามขนาด ================= */
// [ขนาดภาพ (m), เงย (องศา), หมุนรอบ (องศา)]
const CAM = [
  [40, 50, -34], [10, 40, -38], [2, 47, -18], [0.55, 52, -8], [0.2, 55, -2], [0.075, 50, 4], [0.028, 47, 10],
  [0.0045, 45, 16], [0.0006, 52, 12], [6e-5, 58, 8], [7e-6, 50, 20], [1.2e-6, 40, 40], [3e-7, 26, 58], [4e-8, 13, 74], [4e-9, 7, 80], [1e-9, 7, 82],
].map(([s, p, y]) => [lg(s), p, y]);
function camAt(logS) {
  if (logS >= CAM[0][0]) return [CAM[0][1], CAM[0][2]];
  for (let i = 1; i < CAM.length; i++) {
    if (logS >= CAM[i][0]) {
      const [a, pa, ya] = CAM[i - 1], [b, pb, yb] = CAM[i];
      const t = smooth(a, b, logS);
      return [pa + (pb - pa) * t, ya + (yb - ya) * t];
    }
  }
  const l = CAM[CAM.length - 1];
  return [l[1], l[2]];
}

/* ================= state ================= */
const state = {
  logS: clamp(Q.has('s') ? lg(+Q.get('s')) : lg(GATES[0].stop), LOG_MIN, LOG_MAX),
  logT: 0, yawOff: +(Q.get('yaw') || 0), pitchOff: +(Q.get('pitch') || 0),
  tour: null, gate: -1, layer: -1, touched: false, t: 0,
};
state.logT = state.logS;

/* ================= UI: ราง ขนาด + ด่าน ================= */
const rail = $('#rail'), railTrack = $('#rail-track');
const yOf = logS => (LOG_MAX - logS) / (LOG_MAX - LOG_MIN);        // 0 บนสุด → 1 ล่างสุด
function fmt(m) {
  const u = [[1, 'm'], [1e-2, 'cm'], [1e-3, 'mm'], [1e-6, 'µm'], [1e-9, 'nm']];
  for (const [f, n] of u) if (m >= f * 0.999) { const v = m / f; return (v >= 100 ? v.toFixed(0) : v >= 10 ? v.toFixed(1) : v.toFixed(2)) + ' ' + n; }
  return (m / 1e-9).toFixed(2) + ' nm';
}
function buildRail() {
  const ticks = [[10, '10 m'], [1, '1 m'], [0.1, '10 cm'], [0.01, '1 cm'], [1e-3, '1 mm'], [1e-4, '100 µm'], [1e-5, '10 µm'], [1e-6, '1 µm'], [1e-7, '100 nm'], [1e-8, '10 nm'], [1e-9, '1 nm']];
  let html = '';
  for (const g of GATES) {
    const top = yOf(Math.min(LOG_MAX, lg(g.from))), bot = g.to ? yOf(Math.max(LOG_MIN, lg(g.to))) : 1;
    html += `<span class="band" style="top:${top * 100}%;height:${(bot - top) * 100}%;--gc:${g.color}"></span>`;
  }
  for (const [m, t] of ticks) html += `<span class="tick" style="top:${yOf(lg(m)) * 100}%"><i></i>${t}</span>`;
  for (const g of GATES) {
    html += `<button type="button" class="node" data-gate="${g.id}" style="top:${yOf(lg(g.stop)) * 100}%;--gc:${g.color}" aria-label="ไปด่าน ${g.id} ${g.co}">
      <b>${g.id}</b><span>${g.co}</span></button>`;
  }
  html += `<span class="marker" id="marker"><i></i><b id="mk-v"></b></span>`;
  railTrack.innerHTML = html;
  railTrack.querySelectorAll('.node').forEach(b => b.addEventListener('click', () => {
    stopTour();
    const g = GATES[+b.dataset.gate - 1];
    fly(lg(g.stop));
  }));
  // ลากบนรางเพื่อซูม
  let dragging = false;
  const fromY = y => {
    const r = railTrack.getBoundingClientRect();
    return LOG_MAX - clamp((y - r.top) / r.height, 0, 1) * (LOG_MAX - LOG_MIN);
  };
  railTrack.addEventListener('pointerdown', e => {
    if (e.target.closest('.node')) return;
    dragging = true; railTrack.setPointerCapture(e.pointerId); stopTour(); touch();
    state.logT = fromY(e.clientY);
  });
  railTrack.addEventListener('pointermove', e => { if (dragging) state.logT = fromY(e.clientY); });
  railTrack.addEventListener('pointerup', () => { dragging = false; });
}

/* ================= UI: การ์ดด่าน / คำบรรยาย / ตัวอ่านขนาด ================= */
const card = $('#card');
function gateIndex(S) {
  for (let i = 0; i < GATES.length; i++) if (S <= GATES[i].from && S > GATES[i].to) return i;
  return GATES.length - 1;
}
function renderCard(i) {
  const g = GATES[i];
  document.body.style.setProperty('--gc', g.color);
  const stats = g.stats.map(s => `<div${s.gm != null ? ' class="gm"' : ''}><dt>${s.k}</dt><dd>${s.v}${s.sub ? `<small>${s.sub}</small>` : ''}</dd>${s.gm != null ? `<span class="gm-bar" style="--w:${s.gm}%"></span>` : ''}</div>`).join('');
  const src = g.src ? SRC[g.src] : null;
  card.innerHTML = `
    <p class="c-kick"><span>ด่าน ${g.id}<em>/6</em></span><span class="c-tick">${g.tick}</span></p>
    <h2 class="c-co">${g.co}</h2>
    <p class="c-head">${g.head}</p>
    <p class="c-body">${g.body}</p>
    <dl class="c-stats">${stats}</dl>
    <p class="c-note">${g.note}</p>
    ${src ? `<a class="c-src" href="${src.u}" target="_blank" rel="noopener">ที่มา: ${src.t} ↗</a>` : ''}`;
  card.classList.remove('in'); void card.offsetWidth; card.classList.add('in');
  railTrack.querySelectorAll('.node').forEach(n => n.classList.toggle('on', +n.dataset.gate === g.id));
}
function renderCaption(i) {
  const L = LAYERS[i];
  $('#cap-en').textContent = L.en;
  $('#cap-th').textContent = L.th;
  $('#caption').classList.remove('in'); void $('#caption').offsetWidth; $('#caption').classList.add('in');
}
function layerIndex(S) {
  for (let i = 0; i < LAYERS.length; i++) if (S <= LAYERS[i].from && S > LAYERS[i].to) return i;
  return LAYERS.length - 1;
}
function compare(W) {
  let best = null, bd = 1e9;
  for (const c of COMPARE) {
    const d = Math.abs(lg(W / c.m));
    if (d < bd) { bd = d; best = c; }
  }
  const r = W / best.m;
  if (r >= 0.95 && r <= 1.05) return `≈ ${best.t}`;
  if (r > 1) return `≈ ${best.t} ×${r < 10 ? r.toFixed(1) : Math.round(r)}`;
  return `≈ 1/${1 / r < 10 ? (1 / r).toFixed(1) : Math.round(1 / r)} ของ${best.t}`;
}

/* ================= ป้ายชี้ในฉาก ================= */
const labelBox = $('#labels');
const LABELS = [];
function buildLabels() {
  for (const L of LEVELS) for (const d of L.labels || []) {
    const el = document.createElement('div');
    el.className = 'lbl' + (d.tone ? ' ' + d.tone : '');
    el.innerHTML = `<i></i><span><b>${d.text}</b>${d.sub ? `<small>${d.sub}</small>` : ''}</span>`;
    labelBox.appendChild(el);
    LABELS.push({ L, d, el, v: new THREE.Vector3(...d.p) });
  }
}
const _v = new THREE.Vector3();
function updateLabels(logS, W, H) {
  const cr = card.getBoundingClientRect(), rr = rail.getBoundingClientRect();
  const placed = [];
  const blocked = (x, y) => y < 92 || (x > cr.left - 150 && x < cr.right && y > cr.top - 30 && y < cr.bottom + 10) || (x < rr.right + 30 && y > rr.top - 20 && y < rr.bottom + 20);
  for (const it of LABELS) {
    const [hi, lo] = it.d.show;
    let a = it.L.group.visible ? Math.min(smooth(lg(hi), lg(hi) - 0.18, logS), smooth(lg(lo), lg(lo) + 0.18, logS)) : 0;
    if (state.tour && state.tour.phase === 'move' && state.tour.fast) a = 0;
    if (a > 0.01) {
      _v.copy(it.v).applyMatrix4(it.L.group.matrixWorld).project(camera);
      const x = (_v.x + 1) / 2 * W, y = (1 - _v.y) / 2 * H;
      // กล่องของป้าย (ด้านบนขวาของจุด หรือซ้ายถ้าพลิก) — ชนป้ายที่วางแล้วก็ไม่แสดง
      const bw = (it.w ||= it.el.querySelector('span').offsetWidth || 140) + 14, flipNow = x > W * (W > 760 ? 0.6 : 0.55);
      const box = [flipNow ? x - bw : x, y - 52, flipNow ? x : x + bw, y + 6];
      const hit = placed.some(p => box[0] < p[2] && box[2] > p[0] && box[1] < p[3] && box[3] > p[1]);
      if (_v.z > 1 || Math.abs(_v.x) > 1.05 || Math.abs(_v.y) > 1.05 || blocked(x, y) || hit) a = 0;
      else {
        placed.push(box);
        it.el.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`;
        const flip = flipNow;
        if (flip !== it.flip) { it.flip = flip; it.el.classList.toggle('flip', flip); }
      }
    }
    it.el.style.opacity = a.toFixed(3);
    it.el.style.visibility = a > 0.01 ? 'visible' : 'hidden';
  }
}

/* ================= การบิน / ทัวร์ ================= */
const ease = t => t < .5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
function fly(to, dur) {
  const from = state.logS;
  const d = dur ?? clamp(Math.abs(to - from) * 1.1, 0.9, 6);
  state.flight = { from, to, t0: state.t, dur: REDUCED ? 0.01 : d };
}
function startTour() {
  touch();
  $('#play').setAttribute('aria-pressed', 'true');
  $('#play').innerHTML = '<span aria-hidden="true">❚❚</span> หยุด';
  // เริ่มจากจุดหยุดถัดไปที่เล็กกว่าขนาดปัจจุบัน (ถ้าอยู่ลึกสุดแล้ว เริ่มใหม่จากห้อง)
  let i = TOUR.findIndex(([s]) => lg(s) < state.logS - 0.05);
  if (i < 0) { i = 0; }
  state.tour = { i, phase: 'move', t0: state.t };
  if (i === 0 && state.logS < lg(TOUR[0][0]) - 0.1) fly(lg(TOUR[0][0]), 3.2);
  else fly(lg(TOUR[i][0]));
}
function stopTour() {
  if (!state.tour) return;
  state.tour = null;
  $('#play').setAttribute('aria-pressed', 'false');
  $('#play').innerHTML = '<span aria-hidden="true">▶</span> เล่นทั้งทาง';
}
function tickTour() {
  const T = state.tour;
  if (!T || state.flight) return;
  if (T.phase === 'move') { T.phase = 'hold'; T.t0 = state.t; return; }
  const hold = T.i < TOUR.length ? TOUR[T.i][1] : 0;
  if (state.t - T.t0 < hold) return;
  T.i++;
  if (T.i < TOUR.length) { T.phase = 'move'; fly(lg(TOUR[T.i][0])); return; }
  if (!T.out) {                                   // จบที่อะตอม → ถอยกลับออกมาทีเดียว
    T.out = true; T.fast = true; T.phase = 'move';
    fly(lg(GATES[0].stop), 6.5);
    return;
  }
  stopTour();
  openDialog('summary');
}

/* ================= อินพุต ================= */
function touch() {
  if (state.touched) return;
  state.touched = true;
  $('#hint').classList.add('gone');
}
function zoomBy(d) { stopTour(); state.flight = null; touch(); state.logT = clamp(state.logT + d, LOG_MIN, LOG_MAX); }
canvas.addEventListener('wheel', e => {
  e.preventDefault();
  const k = e.deltaMode === 1 ? 0.05 : e.deltaMode === 2 ? 0.8 : 0.0016;
  zoomBy(e.deltaY * k * (e.ctrlKey ? 2.2 : 1));
}, { passive: false });
const ptrs = new Map();
let pinch0 = 0;
canvas.addEventListener('pointerdown', e => {
  canvas.setPointerCapture(e.pointerId);
  ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); }
});
canvas.addEventListener('pointermove', e => {
  const p = ptrs.get(e.pointerId);
  if (!p) return;
  if (ptrs.size === 1) {
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    state.yawOff = state.yawOff - dx * 0.22;
    state.pitchOff = clamp(state.pitchOff + dy * 0.16, -40, 40);
    touch();
  }
  p.x = e.clientX; p.y = e.clientY;
  if (ptrs.size === 2) {
    const [a, b] = [...ptrs.values()];
    const d = Math.hypot(a.x - b.x, a.y - b.y);
    if (pinch0 > 0 && d > 0) zoomBy(-lg(d / pinch0) * 1.6);
    pinch0 = d;
  }
});
const up = e => { ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch0 = 0; };
canvas.addEventListener('pointerup', up);
canvas.addEventListener('pointercancel', up);
canvas.addEventListener('dblclick', () => { state.yawOff = 0; state.pitchOff = 0; });
addEventListener('keydown', e => {
  if (e.target.closest?.('dialog')) return;
  if (e.key === 'ArrowUp' || e.key === '+' || e.key === '=') { zoomBy(-0.25); e.preventDefault(); }
  else if (e.key === 'ArrowDown' || e.key === '-') { zoomBy(0.25); e.preventDefault(); }
  else if (e.key === 'ArrowLeft') state.yawOff += 6;
  else if (e.key === 'ArrowRight') state.yawOff -= 6;
  else if (e.key === ' ' && e.target === document.body) { e.preventDefault(); state.tour ? stopTour() : startTour(); }
});
$('#play').addEventListener('click', () => (state.tour ? stopTour() : startTour()));
$('#zin').addEventListener('click', () => zoomBy(-0.5));
$('#zout').addEventListener('click', () => zoomBy(0.5));
$('#card-toggle')?.addEventListener('click', () => document.body.classList.toggle('card-open'));

/* ================= dialogs ================= */
function openDialog(id) {
  const d = $('#' + id);
  if (d.open) return;
  d.showModal();
}
function buildDialogs() {
  const S = SUMMARY;
  const max = 90;
  $('#sum-body').innerHTML = `
    <p class="s-lead">${S.body}</p>
    <table class="s-tab"><thead><tr><th>ด่าน</th><th>บริษัท</th><th>Gross margin</th><th>ผูกกับ AI แค่ไหน (ตามงบ)</th></tr></thead><tbody>
    ${S.rows.map(r => `<tr style="--gc:${GATES[r.g - 1].color}"><td><b>${r.g}</b></td><td>${r.co}</td><td><span class="s-gm"><i style="width:${r.gm / max * 100}%"></i><em>${r.gm.toFixed(r.co.startsWith('Microsoft') ? 0 : 1)}%</em></span></td><td>${r.ai}</td></tr>`).join('')}
    </tbody></table>
    <p class="s-watch">${S.watch}</p>
    <p class="s-cav">${S.caveat}</p>`;
  $('#src-list').innerHTML = SRC_ORDER.map(k => `<li><a href="${SRC[k].u}" target="_blank" rel="noopener">${SRC[k].t} ↗</a></li>`).join('');
  $('#open-summary').addEventListener('click', () => { stopTour(); openDialog('summary'); });
  $('#open-src').addEventListener('click', () => openDialog('sources'));
  document.querySelectorAll('dialog').forEach(d => {
    d.addEventListener('click', e => { if (e.target === d) d.close(); });
    d.querySelector('.d-close').addEventListener('click', () => d.close());
  });
}

/* ================= เฟรม ================= */
let W = 0, H = 0, DIST = 17;
function resize() {
  W = innerWidth; H = innerHeight;
  renderer.setSize(W, H, false);
  camera.aspect = W / H;
  camera.updateProjectionMatrix();
  const tv = Math.tan(camera.fov * D2R / 2);
  DIST = camera.aspect >= 1 ? 5 / tv : 5 / (camera.aspect * tv);
  // ย้ายจุดกลางภาพไปกลางพื้นที่ว่าง (ไม่ให้ของที่ซูมไปจมใต้การ์ด/รางด้านข้าง)
  if (W > 760) camera.setViewOffset(W, H, Math.round((380 - 230) / 2), 0, W, H);
  else camera.setViewOffset(W, H, 0, Math.round(H * 0.1), W, H);
  scene.fog.near = DIST * 1.12;
  scene.fog.far = DIST * 3.4;
  atomUniforms.fogColor.value.copy(BG);
  atomUniforms.fogNear.value = scene.fog.near;
  atomUniforms.fogFar.value = scene.fog.far;
}
addEventListener('resize', resize);

let last = performance.now(), slow = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  state.t += dt;

  if (state.flight) {
    const F = state.flight;
    const k = clamp((state.t - F.t0) / F.dur, 0, 1);
    state.logS = F.from + (F.to - F.from) * ease(k);
    state.logT = state.logS;
    if (k >= 1) state.flight = null;
  } else if (STILL) {
    state.logS = state.logT;
  } else {
    state.logS += (state.logT - state.logS) * (1 - Math.exp(-dt * 7));
  }
  tickTour();

  const logS = state.logS, S = 10 ** logS;
  const V = S / 10;
  const tgt = targetAt(logS);

  // กล้อง
  let [pitch, yaw] = camAt(logS);
  if (!STILL && !REDUCED) { yaw += 2.4 * Math.sin(state.t * 0.13); pitch += 1.1 * Math.sin(state.t * 0.17 + 1); }
  if (state.tour) { state.yawOff *= 1 - dt * 0.8; state.pitchOff *= 1 - dt * 0.8; }
  pitch = clamp(pitch + state.pitchOff, 3, 86);
  yaw += state.yawOff;
  const p = pitch * D2R, y = yaw * D2R;
  camera.position.set(Math.sin(y) * Math.cos(p), Math.sin(p), Math.cos(y) * Math.cos(p)).multiplyScalar(DIST);
  camera.lookAt(0, 0, 0);

  // วางแต่ละชั้น
  for (const L of LEVELS) {
    const vis = S <= L.show[0] && S >= L.show[1];
    L.group.visible = vis;
    if (!vis) continue;
    const s = L.unit / V;
    L.group.scale.setScalar(s);
    L.group.position.set((L.origin[0] - tgt[0]) / V, (L.origin[1] - tgt[1]) / V, (L.origin[2] - tgt[2]) / V);
    L.update?.(S, state.t);
  }
  scene.updateMatrixWorld();

  // UI
  const Wm = S * Math.max(1, camera.aspect);
  $('#ro-v').textContent = fmt(Wm);
  $('#ro-c').textContent = compare(Wm);
  $('#mk-v').textContent = fmt(Wm);
  $('#marker').style.top = (clamp(yOf(logS), 0, 1) * 100) + '%';
  const gi = gateIndex(S);
  if (gi !== state.gate) { state.gate = gi; renderCard(gi); }
  const li = layerIndex(S);
  if (li !== state.layer) { state.layer = li; renderCaption(li); }

  renderer.render(scene, camera);
  updateLabels(logS, W, H);

  // ลดความละเอียดอัตโนมัติถ้าเครื่องช้า
  if (!STILL && dt > 0.028) { if (++slow > 45 && PR > 1) { PR = Math.max(1, PR - 0.25); renderer.setPixelRatio(PR); resize(); slow = 0; } }
  else slow = Math.max(0, slow - 1);

  if (!document.body.dataset.ready) document.body.dataset.ready = 'true';
  requestAnimationFrame(frame);
}

/* ================= เริ่ม ================= */
const TIMING = {};
async function start() {
  const t0 = performance.now();
  try {
    initLevels();
  } catch (e) {
    document.body.dataset.fail = 'build';
    console.error(e);
    return;
  }
  buildRail();
  buildLabels();
  buildDialogs();
  resize();
  // คอมไพล์ shader ทุกชั้นล่วงหน้า กันกระตุกตอนซูมผ่าน
  TIMING.build = Math.round(performance.now() - t0);
  // คอมไพล์ shader ของสองชั้นแรกก่อนเปิดหน้า ที่เหลือคอมไพล์เบื้องหลัง (เครื่องที่ cache ยังเย็นอาจใช้หลายวินาที)
  LEVELS.forEach((L, i) => { L.group.visible = i < 2; });
  try { await renderer.compileAsync?.(scene, camera); } catch { /* ไม่เป็นไร */ }
  TIMING.compile = Math.round(performance.now() - t0 - TIMING.build);
  LEVELS.forEach(L => { L.group.visible = true; });
  renderer.compileAsync?.(scene, camera).then(() => {
    TIMING.all = Math.round(performance.now() - t0);
    TIMING.programs = renderer.info.programs?.length;
  }).catch(() => {});
  $('#loader').classList.add('gone');
  canvas.classList.add('on');
  if (Q.has('tour') && !STILL) setTimeout(startTour, 600);
  requestAnimationFrame(t => { last = t; frame(t); });
}
window.__cz = {
  setS(m) { stopTour(); state.flight = null; state.logT = state.logS = clamp(lg(m), LOG_MIN, LOG_MAX); },
  get S() { return 10 ** state.logS; },
  state, LEVELS, TIMING,
};
requestAnimationFrame(() => setTimeout(start, 30));
