// iPhone Duo Lab — เดินทาง 7 บทจากตัวเครื่องถึงชิป + เลนส์ขยายภาพตัดขวางจอ (บท 04)
// ขนาดเครื่องตามสเปก Apple (กาง 164.6×117.8×5.2 มม. / พับ 84.1×117.8×11.3 มม.)
// ชนิดชิ้นส่วนมาจาก Apple · รูปทรง/ตำแหน่งภายในเป็นภาพอธิบาย · ความหนาชั้นจอในเลนส์เป็นค่าสมมติ
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/RoomEnvironment.js';
import { innerScreen, outerScreen } from './screens.mjs';
import { CHAPTERS, PARTS, SRC, BIZ } from './content.mjs';
import { buildExterior, buildHinge, buildInside, buildChip } from './parts.mjs';

const Q = new URLSearchParams(location.search);
const EMBEDDED = Q.has('embed');
const SCROLL_STORY = EMBEDDED && Q.has('scroll');
const BUSINESS_ARTICLE = SCROLL_STORY && Q.has('article');
if (BUSINESS_ARTICLE) document.body.classList.add('business-article');
if (EMBEDDED) document.body.classList.add('article-embedded');
if (SCROLL_STORY) document.body.classList.add('article-scrolling');
let articleVisible = true;
let scrollReady = false, pendingStoryProgress = 0;
if (EMBEDDED) addEventListener('message', event => {
  if (event.origin !== location.origin || event.source !== parent) return;
  if (event.data?.type === 'apple-story-visibility') articleVisible = event.data.visible === true;
  if (SCROLL_STORY && event.data?.type === 'apple-story-progress' && Number.isFinite(event.data.progress)) {
    pendingStoryProgress = event.data.progress;
    if (scrollReady) applyStoryProgress(pendingStoryProgress);
  }
});
const STILL = Q.has('still');
const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
let REDUCED = motionPreference.matches;
let INSTANT = STILL || REDUCED;
motionPreference.addEventListener('change', () => { REDUCED = motionPreference.matches; INSTANT = STILL || REDUCED; if (scrollReady) applyStoryProgress(pendingStoryProgress); });
const MM = 0.1;                       // หน่วยฉาก ต่อ 1 มม.
const D2R = Math.PI / 180;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = t => t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;
const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

/* ================= ขนาดเครื่อง (มม.) ================= */
const W = 164.6, H = 117.8, T = 5.2;
const A = 1.6;                        // ช่วงที่งอในโมเดล 3D → ปิดแล้วเว้น 2A/π ≈ 1 มม.
const RC = 11.5, F = 0.9, BEZ = 1.6;  // มุมโค้ง / ลบมุมขอบ / ขอบจอ
const SP = A / 2 + 1.6;               // ครึ่งความกว้างสันบานพับ

/* ================= โมเดลภาพตัดขวาง (บท 04) ================= */
const AM = 6.0;                       // ความยาวช่วงงอในบานพับ (มม.) → ปิดสนิท R ≈ 1.9 มม.
const EXAG = 5;                       // ขยายความหนาให้เห็นชั้น
const GLUE = 12;                      // µm
const LAYERS = [                      // ชั้นหลักที่ Apple เอ่ยชื่อ เรียงจากฝั่งหน้าจอลงไป · µm (ค่าสมมติ)
  { name: 'ชั้นเคลือบโพลิเมอร์', t: 50 },
  { name: 'กระจกเหนือแผงจอ', t: 30, glass: true },
  { name: 'แผงจอ OLED', t: 40 },
  { name: 'กระจกใต้แผงจอ', t: 30, glass: true },
  { name: 'แผ่นไทเทเนียม', t: 30 },
];
(() => {                              // y วัดเข้าหาฝั่งเว้า (หน้าจอ) โดยให้กลางสแต็ก = 0
  const tot = LAYERS.reduce((s, l) => s + l.t, 0) + GLUE * (LAYERS.length - 1);
  let top = tot / 2;
  for (const l of LAYERS) { l.top = top; l.bot = top - l.t; l.c = top - l.t / 2; top = l.bot - GLUE; }
})();
function strainOf(l, kap, mode) {     // % ที่ผิวชั้นที่ยืด/หดมากสุด
  const y = mode === 'bond' ? Math.max(Math.abs(l.top), Math.abs(l.bot)) : l.t / 2;
  return y / 1000 * kap * 100;
}
const HEAT = [[0, [31, 143, 122]], [1, [66, 211, 146]], [2.5, [245, 181, 68]], [4.5, [255, 90, 95]]];
function heat(p) {
  for (let i = 1; i < HEAT.length; i++) {
    if (p <= HEAT[i][0] || i === HEAT.length - 1) {
      const [p0, c0] = HEAT[i - 1], [p1, c1] = HEAT[i];
      const t = clamp((p - p0) / (p1 - p0), 0, 1);
      return `rgb(${c0.map((c, k) => Math.round(c + (c1[k] - c) * t)).join(',')})`;
    }
  }
}

/* ================= การตั้งค่า 3D ต่อบท ================= */
// pose: ท่าของตัวเครื่อง · fold: มุมพับ · cam: [ตำแหน่งกล้อง, จุดมอง] · slider: turn|explode · auto: แยกชิ้นอัตโนมัติเมื่อเข้าบท
const CH3D = {
  closed: { pose: 'stand', fold: 180, cam: [[4, 10.5, 45], [-0.2, 6.2, 1.2]], slider: 'turn' },
  open: { pose: 'laptop', fold: 100, cam: [[3.6, 12.8, 35], [-0.9, 2.1, 0.2]] },
  hinge: { pose: 'flip', fold: 0, cam: [[2, 31, 31], [-0.4, 2.6, -1.2]], slider: 'explode', auto: 0.8 },
  glass: { pose: 'laptop', fold: 120, cam: [[3.6, 12.8, 35], [-0.9, 2.1, 0.2]], lens: true },
  inside: { pose: 'flip', fold: 0, cam: [[2, 33, 30], [-0.4, 3.0, -1.2]], slider: 'explode', auto: 0.85 },
  chip: { pose: 'flip', fold: 0, cam: [[1.2, 25, 23], [-1.3, 3.2, -1.8]], slider: 'explode', auto: 0.8, chip: true },
  biz: { pose: 'stand', fold: 180, cam: [[4, 10.5, 45], [-0.2, 6.2, 1.2]], spin: true },
};
const TURN_FOR = { outer: 0, centerstage: 0, frame: 270, touchid: 270, cameractl: 270, cameras: 180, back: 180 };

/* ================= state ================= */
const state = {
  ch: clamp((+Q.get('ch') || 1) - 1, 0, CHAPTERS.length - 1),
  theta: 180, mode: Q.get('mode') === 'bond' ? 'bond' : 'glide', crease: 0,
  explode: 0, turn: 0, part: null, spin: 0,
};
state.crease = state.mode === 'bond' ? 1 : 0;
let dirty = true;

/* ================= เส้นโค้งการพับ ================= */
function curve(s, th, a) {            // พิกัด 2D: จุดล่างสุดของส่วนโค้งอยู่ที่ (0,0), ฝั่งเว้าชี้ +v
  const k = th / a, half = a / 2;
  const sc = clamp(s, -half, half), phi = k * sc;
  let u, v;
  if (k < 1e-6) { u = sc; v = k * sc * sc / 2; }
  else { u = Math.sin(phi) / k; v = (1 - Math.cos(phi)) / k; }
  const tu = Math.cos(phi), tv = Math.sin(phi), r = s - sc;
  return [u + r * tu, v + r * tv, tu, tv];
}
let FR = null;                        // เฟรมที่ทำให้ครึ่งฐานวางราบนิ่ง
function setFrame(th) {
  const c = Math.cos(th / 2), s = Math.sin(th / 2);
  const [u0, v0] = curve(-A / 2, th, A);
  FR = { th, c, s, du: -A / 2 - (u0 * c - v0 * s), dv: -(u0 * s + v0 * c) };
}
function mapPt(s, z, d, out, i3) {    // (s ตามแนวกาง, z ตามแนวบานพับ, d ความลึกจากผิวจอ) → พิกัดของ phone
  const [u, v, tu, tv] = curve(s, FR.th, A);
  const pu = u + d * tv, pv = v - d * tu;
  out[i3] = (pu * FR.c - pv * FR.s + FR.du) * MM;
  out[i3 + 1] = (pu * FR.s + pv * FR.c + FR.dv) * MM;
  out[i3 + 2] = z * MM;
}
function lidMatrix(m) {               // ครึ่งฝา: แกน X ตามแนวฝา, Y = -ความลึก, จุดกำเนิด = s 0
  const [u, v, tu, tv] = curve(A / 2, FR.th, A);
  const ox = (u * FR.c - v * FR.s + FR.du) * MM, oy = (u * FR.s + v * FR.c + FR.dv) * MM;
  const tx = tu * FR.c - tv * FR.s, ty = tu * FR.s + tv * FR.c;
  m.set(tx, -ty, 0, ox - A / 2 * MM * tx,
        ty, tx, 0, oy - A / 2 * MM * ty,
        0, 0, 1, 0,
        0, 0, 0, 1);
}

/* ================= กริดที่งอตามเส้นโค้ง ================= */
function samples(s0, s1, rc, extra = []) {
  const set = new Set(), push = v => { if (v >= s0 - 1e-6 && v <= s1 + 1e-6) set.add(Math.round(v * 1e4) / 1e4); };
  const c = (s0 + s1) / 2, half = (s1 - s0) / 2, inner = half - rc;
  for (let i = 0; i <= 14; i++) { const b = (i / 14) * Math.PI / 2; push(c + inner + rc * Math.cos(b)); push(c - inner - rc * Math.cos(b)); }
  const n = Math.max(2, Math.ceil((2 * inner) / 3));
  for (let i = 0; i <= n; i++) push(c - inner + 2 * inner * i / n);
  for (let v = -5; v <= 5 + 1e-9; v += 0.125) push(v);
  extra.forEach(push);
  return [...set].sort((a, b) => a - b);
}
function hwOf(s, s0, s1, Hx, rc) {
  const c = (s0 + s1) / 2, inner = (s1 - s0) / 2 - rc;
  const e = Math.max(0, Math.abs(s - c) - inner);
  return Hx / 2 - rc + Math.sqrt(Math.max(0, rc * rc - e * e));
}
function makeGrid({ ss, rows, hw, depth, flip, uv }) {
  const n = ss.length, m = rows, pos = new Float32Array(n * m * 3), idx = [];
  for (let i = 0; i < n - 1; i++) for (let j = 0; j < m - 1; j++) {
    const a = i * m + j, b = (i + 1) * m + j, c = i * m + j + 1, d = (i + 1) * m + j + 1;
    flip ? idx.push(a, b, c, b, d, c) : idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setIndex(idx);
  if (uv) {
    const uvs = new Float32Array(n * m * 2);
    for (let i = 0; i < n; i++) { const h = hw(ss[i]); for (let j = 0; j < m; j++) {
      const z = -h + 2 * h * j / (m - 1), [U, V] = uv(ss[i], z); uvs[(i * m + j) * 2] = U; uvs[(i * m + j) * 2 + 1] = V; } }
    g.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  }
  g.userData.update = () => {
    for (let i = 0; i < n; i++) {
      const s = ss[i], h = hw(s), d = depth(s);
      for (let j = 0; j < m; j++) mapPt(s, -h + 2 * h * j / (m - 1), d, pos, (i * m + j) * 3);
    }
    g.attributes.position.needsUpdate = true;
    g.computeVertexNormals(); g.computeBoundingSphere(); g.computeBoundingBox();
  };
  return g;
}
function makeBand({ ss, hw }) {       // ขอบไทเทเนียมรอบตัวเครื่อง (ลบมุมโค้ง F)
  const loop = [];
  for (let i = 0; i < ss.length; i++) loop.push([ss[i], -hw(ss[i])]);
  for (let i = ss.length - 1; i >= 0; i--) loop.push([ss[i], hw(ss[i])]);
  const N = loop.length, nrm = loop.map((_, k) => {
    const p0 = loop[(k - 1 + N) % N], p1 = loop[(k + 1) % N];
    const ds = p1[0] - p0[0], dz = p1[1] - p0[1], L = Math.hypot(ds, dz) || 1;
    return [dz / L, -ds / L];
  });
  const prof = [];
  for (let i = 0; i <= 5; i++) { const b = i / 5 * Math.PI / 2; prof.push([F * Math.sin(b), F * (1 - Math.cos(b))]); }
  prof.push([F, T - F]);
  for (let i = 1; i <= 5; i++) { const b = Math.PI / 2 + i / 5 * Math.PI / 2; prof.push([F * Math.sin(b), T - F * (1 + Math.cos(b))]); }
  const m = prof.length, pos = new Float32Array(N * m * 3), idx = [];
  for (let k = 0; k < N; k++) { const k2 = (k + 1) % N; for (let p = 0; p < m - 1; p++) {
    const a = k * m + p, b = k2 * m + p, c = k * m + p + 1, d = k2 * m + p + 1; idx.push(a, b, c, b, d, c); } }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.userData.update = () => {
    for (let k = 0; k < N; k++) for (let p = 0; p < m; p++) {
      const [o, d] = prof[p];
      mapPt(loop[k][0] + o * nrm[k][0], loop[k][1] + o * nrm[k][1], d, pos, (k * m + p) * 3);
    }
    g.attributes.position.needsUpdate = true;
    g.computeVertexNormals(); g.computeBoundingSphere(); g.computeBoundingBox();
  };
  return g;
}

/* ================= texture เวที ================= */
async function fontsReady() {
  try {
    await Promise.all(['700 90px "IBM Plex Sans Thai"', '600 90px "IBM Plex Sans Thai"', '500 40px "IBM Plex Mono"']
      .map(f => document.fonts.load(f, 'กขAa0')));
  } catch (e) { /* ใช้ฟอนต์สำรอง */ }
}
function rr(g, x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }
function ringTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 2048;
  const g = c.getContext('2d'), m = 1024;
  const bg = g.createRadialGradient(m, m, 0, m, m, m);
  bg.addColorStop(0, '#16201d'); bg.addColorStop(.75, '#0e1513'); bg.addColorStop(1, '#0a0f0e');
  g.fillStyle = bg; g.fillRect(0, 0, 2048, 2048);
  for (let r = 120; r < 1000; r += 70) { g.beginPath(); g.arc(m, m, r, 0, Math.PI * 2); g.strokeStyle = 'rgba(255,255,255,.022)'; g.lineWidth = 2; g.stroke(); }
  for (let a = 0; a < 360; a += 3) {
    const maj = a % 15 === 0, r0 = maj ? 930 : 958, t = a * D2R;
    g.beginPath(); g.moveTo(m + Math.cos(t) * r0, m + Math.sin(t) * r0); g.lineTo(m + Math.cos(t) * 990, m + Math.sin(t) * 990);
    g.strokeStyle = maj ? 'rgba(61,220,151,.30)' : 'rgba(255,255,255,.07)'; g.lineWidth = maj ? 3 : 2; g.stroke();
  }
  return c;
}
function shadowTexture() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 512;
  const g = c.getContext('2d');
  for (let i = 0; i < 40; i++) { const p = i * 4.2; rr(g, 96 - p, 96 - p, 320 + 2 * p, 320 + 2 * p, 40 + p); g.fillStyle = 'rgba(0,0,0,.028)'; g.fill(); }
  return c;
}

/* ================= three ================= */
const canvas = document.getElementById('stage');
if (STILL) document.documentElement.classList.add('still');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !STILL, alpha: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(STILL ? 1 : Math.min(2, devicePixelRatio || 1));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.75;

const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 200);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true; controls.enablePan = false;
if (EMBEDDED) {
  controls.enableZoom = false;
  canvas.style.touchAction = 'pan-y';
}
controls.minDistance = 7; controls.maxDistance = 60;
controls.minPolarAngle = 0.2; controls.maxPolarAngle = 1.4;
controls.rotateSpeed = 0.6;
controls.addEventListener('start', () => { userOrbit = true; });
let userOrbit = false;

for (const [c, i, p] of [[0xffffff, 1.5, [-8, 16, 10]], [0xbfeedd, 1.6, [7, 6, -14]], [0x8f9cff, 0.35, [12, 3, 8]]]) {
  const l = new THREE.DirectionalLight(c, i); l.position.set(...p); scene.add(l);
}

// แท่น
const deck = new THREE.Group(); deck.position.z = -1.8; scene.add(deck);
const ringTex = new THREE.CanvasTexture(ringTexture()); ringTex.colorSpace = THREE.SRGBColorSpace; ringTex.anisotropy = 8;
const platTop = new THREE.Mesh(new THREE.CircleGeometry(9.2, 128), new THREE.MeshStandardMaterial({ map: ringTex, roughness: 0.62, metalness: 0.15 }));
platTop.rotation.x = -Math.PI / 2; deck.add(platTop);
const platSide = new THREE.Mesh(new THREE.CylinderGeometry(9.2, 8.9, 0.5, 128, 1, true), new THREE.MeshStandardMaterial({ color: 0x0b100f, roughness: 0.4, metalness: 0.6 }));
platSide.position.y = -0.25; deck.add(platSide);
const rimLine = new THREE.Mesh(new THREE.TorusGeometry(9.2, 0.025, 8, 256), new THREE.MeshBasicMaterial({ color: 0x3ddc97, transparent: true, opacity: 0.8 }));
rimLine.rotation.x = Math.PI / 2; rimLine.position.y = 0.005; deck.add(rimLine);
const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1),
  new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(shadowTexture()), transparent: true, opacity: 0.9, depthWrite: false }));
shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.01; deck.add(shadow);

// ลำดับชั้น: pivot (ท่าของบท) → center (-จุดหมุน) → phone (มุมมองแบบแล็ปท็อป)
const FLOAT = 1.15, PZ = -3.2;
const pivot = new THREE.Group(), center = new THREE.Group(); scene.add(pivot); pivot.add(center);
const phone = new THREE.Group(); phone.rotation.y = Math.PI / 2; phone.position.set(0, FLOAT + T * MM, PZ); center.add(phone);
const lidG = new THREE.Group(); lidG.matrixAutoUpdate = false; phone.add(lidG);

const mTi = new THREE.MeshPhysicalMaterial({ color: 0xd3cdc1, metalness: 1, roughness: 0.3 });
const mSpine = new THREE.MeshPhysicalMaterial({ color: 0xc4beb2, metalness: 1, roughness: 0.6, transparent: true });
const mBack = new THREE.MeshPhysicalMaterial({ color: 0xe2ded6, metalness: 0, roughness: 0.42, clearcoat: 0.6, clearcoatRoughness: 0.35, transparent: true });
const mBezel = new THREE.MeshPhysicalMaterial({ color: 0x030405, metalness: 0, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.08 });
const innerTex = new THREE.CanvasTexture(document.createElement('canvas')); innerTex.colorSpace = THREE.SRGBColorSpace; innerTex.anisotropy = 8;
const outerTex = new THREE.CanvasTexture(document.createElement('canvas')); outerTex.colorSpace = THREE.SRGBColorSpace; outerTex.anisotropy = 8;
// จอเรืองแสงเอง ไม่รับแสงไฟในฉาก (ไฟหลักเคยสะท้อนเป็นฝ้าเทาทั้งจอฝา)
const mScreen = new THREE.MeshBasicMaterial({ map: innerTex });
// รอยพับ: เห็นจากแสงสะท้อนที่หักตามร่อง → แถบเงาใสทับแนวพับ
const mCrease = new THREE.MeshPhysicalMaterial({ color: 0x000000, roughness: 0.12, metalness: 0, envMapIntensity: 1.6,
  clearcoat: 1, clearcoatRoughness: 0.05, transparent: true, opacity: 0, depthWrite: false });
const mOuter = new THREE.MeshBasicMaterial({ map: outerTex, transparent: true });

const fs0 = -W / 2 + F, fs1 = W / 2 - F, fH = H - 2 * F, fRC = RC - F;
const ssF = samples(fs0, fs1, fRC, [-SP, SP]);
const hwF = s => hwOf(s, fs0, fs1, fH, fRC);
const ds0 = -W / 2 + BEZ, ds1 = W / 2 - BEZ, dH = H - 2 * BEZ, dRC = RC - BEZ;
const ssD = samples(ds0, ds1, dRC);
const hwD = s => hwOf(s, ds0, ds1, dH, dRC);
const creaseDepth = s => { const w = 1.1; return state.crease * 0.16 * Math.exp(-(s * s) / (w * w)) + 0.012 * Math.exp(-(s * s) / 1.2); };
const os0 = SP + 0.5, os1 = W / 2 - 1.3, oH = H - 2.4, oRC = RC - 1.2;
const ssO = samples(os0, os1, oRC);
const hwO = s => hwOf(s, os0, os1, oH, oRC);

const DEV = {};
const devParts = [
  ['bezel', makeGrid({ ss: ssF, rows: 6, hw: hwF, depth: () => 0 }), mBezel],
  ['screen', makeGrid({ ss: ssD, rows: 30, hw: hwD, depth: s => -0.04 + creaseDepth(s),
    uv: (s, z) => [(z + dH / 2) / dH, (s - ds0) / (ds1 - ds0)] }), mScreen],
  ['crease', makeGrid({ ss: ssD.filter(s => Math.abs(s) <= 2.6), rows: 30, hw: hwD, depth: s => -0.06 + creaseDepth(s) }), mCrease],
  ['backB', makeGrid({ ss: ssF.filter(s => s <= -SP + 1e-6), rows: 6, hw: hwF, depth: () => T, flip: true }), mBack],
  ['backL', makeGrid({ ss: ssF.filter(s => s >= SP - 1e-6), rows: 6, hw: hwF, depth: () => T, flip: true }), mBack],
  ['spine', makeGrid({ ss: ssF.filter(s => Math.abs(s) <= SP + 1e-6), rows: 10, hw: hwF, depth: () => T, flip: true }), mSpine],
  ['outer', makeGrid({ ss: ssO, rows: 12, hw: hwO, depth: () => T + 0.05, flip: true,
    uv: (s, z) => [(s - os0) / (os1 - os0), (z + oH / 2) / oH] }), mOuter],
  ['band', makeBand({ ss: ssF, hw: hwF }), mTi],
];
const geos = devParts.map(([k, g, m]) => { const me = new THREE.Mesh(g, m); DEV[k] = me; phone.add(me); return g; });

// ชิ้นส่วนเสริม
const EXT = buildExterior({ W, H, T, MM, mTi });
phone.add(EXT.base);
const HIN = buildHinge({ W, H, T, MM, SP, M: EXT.mats });
phone.add(HIN.base); lidG.add(HIN.lid);
const INS = buildInside({ W, H, T, MM, M: EXT.mats, lensPos: { s: -W / 2 + 22, z: H / 2 - 15 } });
phone.add(INS.base); lidG.add(INS.lid);
const CHIP = buildChip({ M: EXT.mats });
const chipG = new THREE.Group(); chipG.position.set(0, 3.2, -0.4); chipG.add(CHIP.g); scene.add(chipG);

/* ================= ท่าของตัวเครื่อง ================= */
const qAx = (x, y, z, a) => new THREE.Quaternion().setFromAxisAngle(V3(x, y, z), a);
const POSE = {
  laptop: { C: V3(), P: V3(), q: new THREE.Quaternion() },
  // ปิดเครื่องแล้วตั้งขึ้นหันจอนอกหากล้อง สันบานพับอยู่ซ้ายแบบหนังสือ
  stand: { C: V3(0, FLOAT + T * MM + 0.05, PZ + W / 4 * MM), P: V3(0, 7.2, 1.2), q: qAx(0, 0, 1, Math.PI / 2).multiply(qAx(1, 0, 0, Math.PI / 2)) },
  // กางราบแล้วคว่ำ ให้ด้านหลังหงายขึ้นสำหรับแยกชิ้นส่วน
  flip: { C: V3(0, FLOAT + T * MM / 2, PZ), P: V3(0, 2.3, -1.4), q: qAx(0, 0, 1, Math.PI) },
};
const poseCur = { C: V3(), P: V3(), q: new THREE.Quaternion() };
const qTurn = new THREE.Quaternion();
function applyPose() {
  qTurn.setFromAxisAngle(V3(0, 1, 0), (state.turn + state.spin) * D2R);
  pivot.position.copy(poseCur.P);
  pivot.quaternion.copy(qTurn).multiply(poseCur.q);
  center.position.copy(poseCur.C).negate();
}

/* ================= ทวีน ================= */
const slots = {};
function tween(name, dur, apply, done) {
  if (slots[name]) slots[name].dead = true;
  if (INSTANT || dur <= 0) { apply(1); done && done(); return; }
  slots[name] = { t: 0, dur, apply, done };
}
function stepTweens(dt) {
  for (const [k, tw] of Object.entries(slots)) {
    if (!tw || tw.dead) { delete slots[k]; continue; }
    tw.t = Math.min(1, tw.t + dt / tw.dur); tw.apply(ease(tw.t)); dirty = true;
    if (tw.t >= 1) { delete slots[k]; tw.done && tw.done(); }
  }
}

/* ================= การแยกชิ้น + การมองเห็น ================= */
const EXPLODE = { hinge: HIN.all, inside: INS.all, chip: CHIP.all };
function applyExplode() {
  const id = CHAPTERS[state.ch].id, e = state.explode;
  for (const [k, list] of Object.entries(EXPLODE)) {
    const on = k === id, unit = k === 'chip' ? 1 : MM;
    for (const o of list) { const x = o.userData.explode; o.position.copy(o.userData.rest).addScaledVector(x.dir, x.dist * unit * (on ? e : 0)); }
  }
  const lift = id === 'inside' ? -34 * MM * e : 0;
  for (const k of ['backB', 'backL', 'spine', 'outer']) DEV[k].position.y = lift;
  mBack.opacity = mOuter.opacity = mSpine.opacity = id === 'inside' ? 1 - 0.72 * e : 1;
  DEV.spine.visible = !(id === 'hinge' && e > 0.02);
}
function applyVisibility() {
  const id = CHAPTERS[state.ch].id;
  HIN.base.visible = HIN.lid.visible = id === 'hinge';
  INS.base.visible = INS.lid.visible = id === 'inside';
  chipG.visible = id === 'chip';
  pivot.visible = id !== 'chip';
}

/* ================= rebuild ================= */
const tmp = new Float32Array(3);
function bboxX() {
  let lo = Infinity, hi = -Infinity;
  for (const [s, d] of [[-W / 2, 0], [-W / 2, T], [W / 2, 0], [W / 2, T], [0, T], [SP, T], [-SP, T]]) {
    mapPt(s, 0, d, tmp, 0); lo = Math.min(lo, tmp[0]); hi = Math.max(hi, tmp[0]);
  }
  return [lo, hi];
}
const SHADOW = { stand: [W / 2 * MM * 1.15, 2.2, 0.42], flip: [H * MM * 1.42, W * MM * 1.34, 0.85], chip: [11, 10, 0.55] };
function rebuild() {
  setFrame(state.theta * D2R);
  geos.forEach(g => g.userData.update());
  lidMatrix(lidG.matrix); lidG.matrixWorldNeedsUpdate = true;
  mCrease.opacity = 0.05 + 0.95 * state.crease;
  applyExplode(); applyPose();
  // เงาใต้เครื่องตามท่า
  const D = CH3D[CHAPTERS[state.ch].id];
  if (D.chip) { shadow.scale.set(SHADOW.chip[0], SHADOW.chip[1], 1); shadow.position.set(chipG.position.x, 0.01, chipG.position.z - deck.position.z); shadow.material.opacity = SHADOW.chip[2]; }
  else if (D.pose === 'laptop') {
    const [lo, hi] = bboxX();
    shadow.scale.set(H * MM * 1.45, (hi - lo) * 1.5, 1);
    shadow.position.set(0, 0.01, PZ - (lo + hi) / 2 - deck.position.z);
    shadow.material.opacity = 0.75 + 0.2 * (state.theta / 180);
  } else {
    const [sx, sz, op] = SHADOW[D.pose];
    shadow.scale.set(sx, sz, 1); shadow.position.set(poseCur.P.x, 0.01, poseCur.P.z - deck.position.z); shadow.material.opacity = op;
  }
}

/* ================= เลนส์ขยาย (บท 04) ================= */
const $ = id => document.getElementById(id);
const lensCv = $('lens'), lctx = lensCv.getContext('2d');
function lensPoint(s, y, kap, X, Y) { const [u, v, tu, tv] = curve(s, kap * AM, AM); return [X(u - y * tv), Y(v + y * tu)]; }
function matParam(sk, y, kap) {        // จุดเนื้อวัสดุเดิมที่ sk ไปอยู่ตรงไหนเมื่อชั้นงอรอบแกนตัวเอง
  const f = 1 - y * kap, Lh = AM / 2 * f, a = Math.abs(sk), sg = Math.sign(sk);
  return a <= Lh ? sk / f : sg * (AM / 2 + a - Lh);
}
function drawLens() {
  const S = lensCv.clientWidth; if (!S) return;
  const dpr = Math.min(2, devicePixelRatio || 1), px = Math.round(S * dpr);
  if (lensCv.width !== px || lensCv.height !== px) { lensCv.width = lensCv.height = px; }
  const g = lctx; g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, S, S);
  const R0 = S / 2, th = state.theta * D2R, kap = th / AM, mode = state.mode;
  g.save(); g.beginPath(); g.arc(R0, R0, R0, 0, Math.PI * 2); g.clip();
  const bg = g.createRadialGradient(R0 * .8, R0 * .6, 4, R0, R0, R0);
  bg.addColorStop(0, '#12201c'); bg.addColorStop(1, '#050807'); g.fillStyle = bg; g.fillRect(0, 0, S, S);
  const Rb = th > 1e-4 ? AM / th : 1e9, k = S / 7.4, vc = Math.min(1.95, 0.95 * Rb * (1 - Math.cos(th / 2)));
  const X = u => R0 + u * k, Y = v => R0 + S * 0.05 - (v - vc) * k;
  g.strokeStyle = 'rgba(255,255,255,.04)'; g.lineWidth = 1;
  for (let x = R0 % (k / 2); x < S; x += k / 2) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, S); g.stroke(); }
  for (let y = R0 % (k / 2); y < S; y += k / 2) { g.beginPath(); g.moveTo(0, y); g.lineTo(S, y); g.stroke(); }
  const SM = 11, step = 0.04, sv = y => y / 1000 * EXAG;
  const band = (y0, y1) => { g.beginPath();
    for (let s = -SM; s <= SM; s += step) { const [x, y] = lensPoint(s, sv(y0), kap, X, Y); s === -SM ? g.moveTo(x, y) : g.lineTo(x, y); }
    for (let s = SM; s >= -SM; s -= step) { const [x, y] = lensPoint(s, sv(y1), kap, X, Y); g.lineTo(x, y); }
    g.closePath(); };
  band(LAYERS[0].top, LAYERS[LAYERS.length - 1].bot);
  g.fillStyle = mode === 'glide' ? 'rgba(160,200,255,.10)' : 'rgba(255,200,120,.10)'; g.fill();
  for (const l of LAYERS) {
    band(l.top, l.bot);
    g.fillStyle = heat(strainOf(l, kap, mode)); g.globalAlpha = 0.92; g.fill(); g.globalAlpha = 1;
    g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 0.8; g.stroke();
  }
  g.setLineDash([4, 4]); g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 1.2;
  for (const ya of (mode === 'bond' ? [0] : LAYERS.map(l => l.c))) {
    g.beginPath();
    for (let s = -SM; s <= SM; s += step) { const [x, y] = lensPoint(s, sv(ya), kap, X, Y); s === -SM ? g.moveTo(x, y) : g.lineTo(x, y); }
    g.stroke();
  }
  g.setLineDash([]);
  g.strokeStyle = 'rgba(8,12,11,.85)'; g.lineWidth = 1.6;
  for (let i = -20; i <= 20; i++) {
    const sk = i * 0.5;
    for (const l of LAYERS) {
      const s = mode === 'bond' ? sk : matParam(sk, sv(l.c), kap);
      const [x0, y0] = lensPoint(s, sv(l.bot), kap, X, Y), [x1, y1] = lensPoint(s, sv(l.top), kap, X, Y);
      g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
    }
  }
  g.fillStyle = 'rgba(232,239,234,.75)'; g.fillRect(R0 - k / 2, 34, k, 2);
  g.font = '500 11px "IBM Plex Sans Thai"'; g.textAlign = 'center'; g.fillText('1 มม.', R0, 28);
  g.restore();
}
const legend = $('legend');
legend.innerHTML = LAYERS.map((l, i) => `<li><i data-i="${i}"></i><span>${l.name}</span><em data-p="${i}"></em></li>`).join('') +
  '<li class="ax"><i></i><span>แกนที่ไม่ยืดไม่หด</span><em></em></li>';
const fmt = (v, d = 2) => v.toFixed(d);
function updateLens() {
  const th = state.theta * D2R, kap = th / AM;
  LAYERS.forEach((l, i) => {
    const p = strainOf(l, kap, state.mode);
    legend.querySelector(`[data-i="${i}"]`).style.background = heat(p);
    legend.querySelector(`[data-p="${i}"]`).textContent = fmt(p) + '%';
  });
  const glass = LAYERS.filter(l => l.glass);
  const gB = Math.max(...glass.map(l => strainOf(l, kap, 'bond'))), gG = Math.max(...glass.map(l => strainOf(l, kap, 'glide')));
  const g = state.mode === 'bond' ? gB : gG;
  const shift = (LAYERS[0].c - LAYERS[LAYERS.length - 1].c) / 1000 * th / 2;
  $('r-strain').textContent = fmt(g) + '%'; $('r-strain').style.color = heat(g);
  $('r-shift').textContent = state.mode === 'bond' ? '0 มม.' : fmt(shift) + ' มม.';
  const ex = $('explain'), bClosed = Math.max(...glass.map(l => strainOf(l, Math.PI / AM, 'bond')));
  if (state.theta < 3 && state.mode === 'bond') ex.innerHTML = `กางสุดแล้ว แต่ถ้าชั้นถูกล็อกไว้ ทุกครั้งที่ปิดเครื่อง กระจกชั้นนอกสุดจะโดนยืดถึง <b>${fmt(bClosed)}%</b> ซ้ำไปซ้ำมา เส้นสะท้อนแสงกลางจอคือรอยพับที่ตามมา`;
  else if (state.theta < 3) ex.innerHTML = 'กางสุด จอแบนราบ <b>ทุกชั้นไม่ต้องยืดเลย</b> ลองลากบานพับข้างล่างให้เครื่องพับลงมา';
  else if (state.mode === 'bond') ex.innerHTML = `ทุกชั้นถูกล็อกให้งอรอบแกนเดียวกัน กระจกชั้นนอกสุดเลยโดนยืด <b>${fmt(gB)}%</b> มากกว่าแบบไถลได้ <b>${fmt(gB / gG, 1)} เท่า</b>`;
  else ex.innerHTML = `แต่ละชั้นงอรอบแกนกลางของตัวเอง กระจกจึงยืดแค่ <b>${fmt(gG)}%</b> ราคาที่ต้องจ่ายคือขอบชั้นเหลื่อมกัน <b>${fmt(shift)} มม.</b> เหมือนสันหนังสือที่งอ`;
  drawLens();
}

/* ================= หน้าปัด + แถบเลื่อน ================= */
(() => {
  const t = $('d-ticks');
  for (let a = 0; a <= 180; a += 7.5) {
    const maj = a % 45 === 0, r0 = maj ? 132 : 134, r1 = maj ? 144 : 139, rad = a * D2R;
    const l = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    l.setAttribute('x1', 160 + r0 * Math.cos(rad)); l.setAttribute('y1', 160 - r0 * Math.sin(rad));
    l.setAttribute('x2', 160 + r1 * Math.cos(rad)); l.setAttribute('y2', 160 - r1 * Math.sin(rad));
    l.setAttribute('class', 'd-tick' + (maj ? ' maj' : '')); t.appendChild(l);
  }
})();
function updateDial() {
  const th = state.theta * D2R, x = 160 + 124 * Math.cos(th), y = 160 - 124 * Math.sin(th);
  $('d-knob').setAttribute('cx', x.toFixed(2)); $('d-knob').setAttribute('cy', y.toFixed(2));
  $('d-arm').setAttribute('transform', `rotate(${-state.theta} 160 160)`);
  $('d-fill').setAttribute('d', `M284 160 A124 124 0 0 0 ${x.toFixed(2)} ${y.toFixed(2)}`);
  $('d-val').textContent = Math.round(state.theta) + '°';
  dial.setAttribute('aria-valuenow', Math.round(state.theta)); dial.setAttribute('aria-valuetext', `มุมพับ ${Math.round(state.theta)} องศา`);
}
const dial = $('dial');
function setTheta(v) { tween('fold', 0, () => {}); state.theta = clamp(v, 0, 180); dirty = true; }
function dialAngle(e) {
  const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(dial.getScreenCTM().inverse());
  const a = Math.atan2(160 - p.y, p.x - 160) / D2R;
  return a < 0 ? (p.x < 160 ? 180 : 0) : a;
}
dial.addEventListener('pointerdown', e => { e.preventDefault(); dial.focus(); dial.setPointerCapture(e.pointerId); setTheta(dialAngle(e)); });
dial.addEventListener('pointermove', e => { if (dial.hasPointerCapture(e.pointerId)) setTheta(dialAngle(e)); });
dial.addEventListener('keydown', e => {
  const d = { ArrowRight: -3, ArrowDown: -3, ArrowLeft: 3, ArrowUp: 3, PageUp: 15, PageDown: -15 }[e.key];
  if (d !== undefined) { e.preventDefault(); setTheta(state.theta + d); }
  if (e.key === 'Home') { e.preventDefault(); setTheta(0); }
  if (e.key === 'End') { e.preventDefault(); setTheta(180); }
});
const slider = $('sl');
slider.addEventListener('input', () => {
  const v = +slider.value / 1000, kind = CH3D[CHAPTERS[state.ch].id].slider;
  if (kind === 'turn') { tween('turn', 0, () => {}); state.turn = v * 360; }
  else { tween('explode', 0, () => {}); state.explode = v; }
  dirty = true;
});
function updateSlider() {
  const kind = CH3D[CHAPTERS[state.ch].id].slider; if (!kind) return;
  const v = kind === 'turn' ? ((state.turn % 360) + 360) % 360 / 360 : state.explode;
  if (document.activeElement !== slider) slider.value = Math.round(v * 1000);
  $('sl-val').textContent = kind === 'turn' ? `${Math.round(v * 360)}°` : `${Math.round(v * 100)}%`;
}
document.querySelectorAll('.mode button').forEach(b => b.addEventListener('click', () => {
  state.mode = b.dataset.mode;
  document.querySelectorAll('.mode button').forEach(x => x.setAttribute('aria-checked', String(x === b)));
  dirty = true;
}));
document.querySelectorAll('.mode button').forEach(x => x.setAttribute('aria-checked', String(x.dataset.mode === state.mode)));

/* ================= ป้ายชี้ชิ้นส่วน ================= */
const tmpV = V3(), tmpN = V3(), tmpL = V3(), camDir = V3(), qTmp = new THREE.Quaternion();
function devWorld(s, z, d, out) { mapPt(s, z, d, tmp, 0); out.set(tmp[0], tmp[1], tmp[2]); return phone.localToWorld(out); }
// dev: [s,z,d] + n: จุดที่สองกำหนดทิศหน้าของพื้นผิว · obj: วัตถุ + off (พิกัดของวัตถุ)
const ANCH = {
  outer: { dev: [W / 4 + 2, -12, T + 0.06], n: [W / 4 + 2, -12, T + 2] },
  centerstage: { dev: [(os0 + os1) / 2, oH / 2 - 6, T + 0.06], n: [(os0 + os1) / 2, oH / 2 - 6, T + 2] },
  frame: { dev: [-W / 2, 6, T / 2], n: [-W / 2 - 2, 6, T / 2] },
  touchid: { obj: () => EXT.btnTouch, n: [-1, 0, 0] },
  cameractl: { obj: () => EXT.btnCam, n: [-1, 0, 0] },
  cameras: { obj: () => EXT.lenses, off: [0, -0.26, 0], n: [0, -1, 0] },
  back: { dev: [-W / 4 + 6, -26, T], n: [-W / 4 + 6, -26, T + 2] },
  inner: { dev: [W / 4, -20, -0.05], n: [W / 4, -20, -2] },
  thin: { dev: [-W / 2, -36, T / 2], n: [-W / 2 - 2, -36, T / 2] },
  udc: { dev: [W / 2 - 7, 0, -0.05], n: [W / 2 - 7, 0, -2] },
  hcover: { obj: () => HIN.cover, off: [0, -0.17, -3.2] },
  hlinks: { obj: () => HIN.links, off: [0, 0.05, 1.7] },
  hsupport: { obj: () => HIN.support, off: [0.52, -0.05, -4.2] },
  magnets: { obj: () => HIN.magnets[0], off: [0, -0.07, 3.2] },
  backglass: { dev: [W / 4 + 10, 30, T], n: [W / 4 + 10, 30, T + 2], lift: true },
  magsafe: { obj: () => INS.coil, off: [0, -0.05, 1.2] },
  battery: { obj: () => INS.batL, off: [0.6, -0.16, -2] },
  vapor: { obj: () => INS.vapor, off: [0, -0.06, -2.2] },
  board: { obj: () => INS.soc, off: [0, -0.06, 0] },
  c2: { obj: () => INS.c2, off: [0, -0.05, 0] },
  n1: { obj: () => INS.n1, off: [0, -0.04, 0] },
  cammod: { obj: () => INS.cam, off: [0.86, -0.3, 0] },
  super: { chip: 'super' }, effic: { chip: 'effic' }, gpu: { chip: 'gpu' }, ane: { chip: 'ane' },
  pkg: { obj: () => CHIP.mem[1], off: [0, 0.12, 0] },
};
function anchorWorld(key, out) {       // คืนค่า true ถ้าหันหากล้อง
  const a = ANCH[key]; if (!a) return false;
  if (a.dev) {
    devWorld(...a.dev, out); devWorld(...a.n, tmpN); tmpN.sub(out);
    // ฝาหลังที่ยกขึ้นตอนแยกชิ้น: เลื่อนจุดตาม DEV.backL (แกน Y ของ phone)
    if (a.lift) out.add(tmpL.set(0, DEV.backL.position.y, 0).applyQuaternion(phone.getWorldQuaternion(qTmp)));
  } else if (a.chip) {
    out.copy(CHIP.at(a.chip)); CHIP.g.localToWorld(out); tmpN.set(0, 1, 0);
  } else {
    const o = a.obj(); out.set(...(a.off || [0, 0, 0])); o.localToWorld(out);
    if (a.n) { tmpN.set(...a.n).transformDirection(o.matrixWorld); } else tmpN.set(0, 0, 0);
  }
  if (tmpN.lengthSq() < 1e-9) return true;
  camDir.copy(camera.position).sub(out);
  return tmpN.dot(camDir) > 0;
}
const coLayer = $('callouts'), coLines = $('co-lines');
let coEls = [];
function buildCallouts() {
  coLayer.querySelectorAll('.co, .co-dot').forEach(e => e.remove()); coLines.innerHTML = '';
  coEls = CHAPTERS[state.ch].parts.map(k => {
    const el = document.createElement('button'); el.type = 'button'; el.className = 'co'; el.dataset.part = k;
    el.innerHTML = `<span>${PARTS[k].name}</span>`;
    el.addEventListener('click', () => selectPart(k, true));
    const dot = document.createElement('i'); dot.className = 'co-dot'; dot.addEventListener('click', () => selectPart(k, true));
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    coLayer.append(el, dot); coLines.appendChild(line);
    return { k, el, dot, line };
  });
}
const bbox = new THREE.Box3(), corner = V3();
function screenBox(obj) {             // กรอบของวัตถุบนจอ (px)
  bbox.setFromObject(obj);
  let l = Infinity, r = -Infinity, t = Infinity, b = -Infinity;
  for (let i = 0; i < 8; i++) {
    corner.set(i & 1 ? bbox.max.x : bbox.min.x, i & 2 ? bbox.max.y : bbox.min.y, i & 4 ? bbox.max.z : bbox.min.z).project(camera);
    const x = (corner.x + 1) / 2 * innerWidth, y = (1 - corner.y) / 2 * innerHeight;
    l = Math.min(l, x); r = Math.max(r, x); t = Math.min(t, y); b = Math.max(b, y);
  }
  return { l, r, t, b, cx: (l + r) / 2 };
}
function layoutCallouts() {
  if (!coEls.length) return;
  const w = innerWidth, h = innerHeight, narrow = w < 820;
  const side = document.querySelector('.side').getBoundingClientRect(), insp = $('insp').getBoundingClientRect();
  const minX = narrow ? 8 : side.right + 16, maxX = narrow ? w - 8 : (insp.width ? insp.left - 16 : w - 16);
  const sb = screenBox(CH3D[CHAPTERS[state.ch].id].chip ? chipG : pivot);
  const items = coEls.map(c => {
    const vis = anchorWorld(c.k, tmpV); tmpV.project(camera);
    const x = (tmpV.x + 1) / 2 * w, y = (1 - tmpV.y) / 2 * h;
    return { c, x, y, vis: vis && tmpV.z < 1, tw: c.el.offsetWidth || 120, left: x < sb.cx };
  });
  // ฝั่งไหนที่ไม่พอวางป้าย ย้ายไปอีกฝั่ง
  const roomL = sb.l - 30 - minX, roomR = maxX - (sb.r + 30);
  for (const it of items) {
    if (it.left && roomL < it.tw && roomR > roomL) it.left = false;
    else if (!it.left && roomR < it.tw && roomL > roomR) it.left = true;
  }
  const topY = narrow ? 170 : 80, botY = h - (narrow ? 250 : 150);
  for (const leftSide of [true, false]) {       // ป้ายเรียงเป็นคอลัมน์นอกตัวเครื่อง แล้วกันซ้อน
    const col = items.filter(i => i.left === leftSide).sort((a, b) => a.y - b.y);
    col.forEach(it => { it.ty = clamp(it.y, topY, botY); });
    for (let i = 1; i < col.length; i++) if (col[i].ty - col[i - 1].ty < 38) col[i].ty = col[i - 1].ty + 38;
    const over = col.length ? col[col.length - 1].ty - botY : 0;
    if (over > 0) col.forEach(it => { it.ty -= over; });
  }
  for (const it of items) {
    let tx = it.left ? sb.l - 30 - it.tw : sb.r + 30;
    tx = clamp(tx, minX, maxX - it.tw);
    const ty = it.ty - 16;
    const { el, dot, line } = it.c;
    el.style.transform = `translate(${tx}px, ${ty}px)`; dot.style.transform = `translate(${it.x - 5}px, ${it.y - 5}px)`;
    el.classList.toggle('dim', !it.vis); dot.classList.toggle('dim', !it.vis);
    const ex = it.left ? tx + it.tw : tx;
    line.setAttribute('x1', it.x); line.setAttribute('y1', it.y); line.setAttribute('x2', ex); line.setAttribute('y2', it.ty);
    line.classList.toggle('dim', !it.vis);
  }
}

/* ================= ไฮไลต์ชิ้นส่วนที่เลือก ================= */
const HL = { touchid: () => [EXT.btnTouch], cameractl: () => [EXT.btnCam], cameras: () => [EXT.plateau, EXT.lenses],
  hcover: () => [HIN.cover], hlinks: () => [HIN.links], hsupport: () => [HIN.support], magnets: () => HIN.magnets,
  magsafe: () => [INS.coil], battery: () => [INS.batB, INS.batL], vapor: () => [INS.vapor], board: () => [INS.board],
  c2: () => [INS.c2], n1: () => [INS.n1], cammod: () => [INS.cam], pkg: () => CHIP.mem, frame: () => [DEV.band] };
const hlOrig = new Map();
function clearHL() { for (const [m, orig] of hlOrig) m.material = orig; hlOrig.clear(); }
function setHL(k) {
  clearHL(); const f = HL[k]; if (!f) return;
  for (const root of f()) root.traverse(o => {
    if (!o.isMesh || hlOrig.has(o)) return;
    hlOrig.set(o, o.material);
    const mk = m => { const c = m.clone(); if ('emissive' in c) { c.emissive = new THREE.Color(0x3ddc97); c.emissiveIntensity = 0.28; } return c; };
    o.material = Array.isArray(o.material) ? o.material.map(mk) : mk(o.material);
  });
}

/* ================= UI ของบท ================= */
const chapNav = $('chapters');
chapNav.innerHTML = CHAPTERS.map((c, i) => `<button type="button" data-i="${i}"><span>${c.no}</span>${c.short}</button>`).join('');
chapNav.querySelectorAll('button').forEach(b => b.addEventListener('click', () => go(+b.dataset.i)));
$('prev').addEventListener('click', () => go(state.ch - 1));
$('next').addEventListener('click', () => go(state.ch + 1));
function srcLink(k) { const s = SRC[k]; return `<a href="${s.url}" target="_blank" rel="noreferrer">${s.label} ↗</a>`; }
$('src-list').innerHTML = $('src-list-2').innerHTML = Object.keys(SRC).map(k => `<li>${srcLink(k)}</li>`).join('');
$('src-open').addEventListener('click', () => $('sources').showModal());
$('src-close').addEventListener('click', () => $('sources').close());

function selectPart(k, fromUser) {
  state.part = k;
  const p = PARTS[k];
  $('i-cat').textContent = p.cat; $('i-name').textContent = p.name; $('i-body').textContent = p.body;
  $('i-apple').innerHTML = `${p.apple}<cite>— Apple · ${srcLink(p.src)}</cite>`;
  $('i-model').textContent = p.model || ''; $('i-model').hidden = !p.model;
  document.querySelectorAll('#plist button, .co').forEach(b => b.classList.toggle('on', b.dataset.part === k));
  document.querySelectorAll('#plist button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.part === k)));
  setHL(k);
  if (fromUser && CH3D[CHAPTERS[state.ch].id].slider === 'turn' && k in TURN_FOR) {
    let to = TURN_FOR[k], from = state.turn % 360;
    if (to - from > 180) to -= 360; if (from - to > 180) to += 360;
    tween('turn', 0.9, e => { state.turn = from + (to - from) * e; });
  }
}
function renderChapter() {
  const C = CHAPTERS[state.ch], D = CH3D[C.id];
  document.body.dataset.ui = C.id === 'glass' ? 'glass' : C.id === 'biz' ? 'biz' : 'parts';
  document.body.dataset.ctl = C.control ? C.control.kind : 'none';
  $('k-no').textContent = C.no; $('k-en').textContent = C.en;
  $('title').innerHTML = C.title; $('lead').innerHTML = C.lead;
  if (SCROLL_STORY) {
    $('lead').textContent = BUSINESS_ARTICLE ? BUSINESS_LEADS[state.ch] : STORY_LEADS[state.ch];
    if (BUSINESS_ARTICLE) $('title').innerHTML = BUSINESS_TITLES[state.ch];
    $('story-position').textContent = `${C.no} / 07 · ${C.short}`;
    document.body.dataset.storyChapter = String(state.ch);
  }
  chapNav.querySelectorAll('button').forEach((b, i) => b.setAttribute('aria-current', i === state.ch ? 'step' : 'false'));
  $('prev').disabled = state.ch === 0; $('next').disabled = state.ch === CHAPTERS.length - 1;
  $('next').innerHTML = state.ch < CHAPTERS.length - 1 ? `${CHAPTERS[state.ch + 1].short} <span>→</span>` : 'จบ';
  $('plist').innerHTML = C.parts.map(k => `<button type="button" data-part="${k}" aria-pressed="false">${PARTS[k].name}</button>`).join('');
  $('plist').querySelectorAll('button').forEach(b => b.addEventListener('click', () => selectPart(b.dataset.part, true)));
  if (C.control && C.control.kind === 'slider') { $('sl-label').textContent = C.control.label; $('sl-from').textContent = C.control.from; $('sl-to').textContent = C.control.to; }
  $('fine').textContent = C.id === 'glass'
    ? 'Apple บอกว่าจอในมี 10 ชั้นบางเฉียบ ภาพนี้แสดงเฉพาะชั้นหลักที่ Apple เอ่ยชื่อ · ความหนาแต่ละชั้นเป็นค่าสมมติ · แหล่งข้อมูล Apple Newsroom (9 ก.ย. 2026)'
    : 'ชนิดชิ้นส่วนและตัวเลขมาจาก Apple · รูปทรงและตำแหน่งภายในเป็นภาพอธิบาย (ยังไม่มีการแกะเครื่องจริง)';
  if (C.id === 'biz') renderBiz();
  buildCallouts();
  if (C.parts.length) selectPart(C.parts[0], false); else { state.part = null; clearHL(); }
  document.title = `${C.title.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()} — iPhone Duo | Moatrices Lab`;
}
function renderBiz() {
  if (BUSINESS_ARTICLE) {
    $('biz').innerHTML = `<p class="view"><span>สมมติฐานที่ต้องพิสูจน์</span>ลูกค้ายอมจ่ายเพิ่มเพราะได้ประโยชน์จากจอพับจริงหรือไม่ และรายได้ส่วนเพิ่มเหลือเป็นกำไรแค่ไหนหลังหักต้นทุน?</p><p class="view"><span>ยังไม่มีผลขายหลังวางจำหน่าย ณ 26 ก.ย. 2026</span>Apple กำหนดวางขาย 23 ต.ค. 2026 จึงยังใช้ยอดขายจริงยืนยันความสำเร็จไม่ได้</p><p class="view"><span>มุมมอง Moatrices</span>ออกแบบชิปเองช่วยเลือกคุณสมบัติได้มากขึ้น แต่ยังต้องลงทุนวิจัยและพึ่งโรงงานผลิต ไม่รับประกันต้นทุนต่ำหรือกำไรเพิ่ม</p>`;
    return;
  }
  $('biz').innerHTML =
    `<div class="facts">${BIZ.facts.map(([k, v, s]) => `<div><dt>${k}</dt><dd>${v}</dd><small>${s}</small></div>`).join('')}</div>` +
    `<p class="view"><span>มุมมอง Moatrices</span>${BIZ.view}</p>` +
    `<p class="watch-h">สิ่งที่ต้องจับตา</p><ol class="watch">${BIZ.watch.map(([h, b]) => `<li><b>${h}</b>${b}</li>`).join('')}</ol>`;
}

/* ================= เปลี่ยนบท ================= */
function go(i, first = false) {
  i = clamp(i, 0, CHAPTERS.length - 1);
  if (i === state.ch && !first) return;
  state.ch = i;
  const C = CHAPTERS[i], D = CH3D[C.id];
  renderChapter();
  applyVisibility();
  // ท่า
  const from = { C: poseCur.C.clone(), P: poseCur.P.clone(), q: poseCur.q.clone() }, to = POSE[D.pose];
  tween('pose', first ? 0 : 1.2, e => { poseCur.C.lerpVectors(from.C, to.C, e); poseCur.P.lerpVectors(from.P, to.P, e); poseCur.q.slerpQuaternions(from.q, to.q, e); });
  // มุมพับ
  const th0 = state.theta, th1 = STILL && Q.has('fold') && first ? clamp(+Q.get('fold'), 0, 180) : D.fold;
  if (!first || STILL) tween('fold', first ? 0 : 1.2, e => { state.theta = th0 + (th1 - th0) * e; });
  // หมุน / แยกชิ้น
  const tu0 = state.turn % 360, tu1 = STILL && Q.has('turn') ? +Q.get('turn') : 0;
  tween('turn', first ? 0 : 1.0, e => { state.turn = tu0 + ((tu1 - tu0 + 540) % 360 - 180) * e; });
  state.spin = 0;
  const ex0 = state.explode;
  tween('explode', first ? 0 : 0.5, e => { state.explode = ex0 * (1 - e); }, () => {
    if (!D.auto) return;
    const target = STILL && Q.has('x') ? clamp(+Q.get('x'), 0, 1) : D.auto;
    tween('explode', STILL ? 0 : 1.8, e => { state.explode = target * e; });
  });
  // ชิป: ย่อ-ขยายเข้า
  if (D.chip) { chipG.scale.setScalar(0.4); tween('chip', first ? 0 : 1.1, e => chipG.scale.setScalar(0.4 + 0.6 * e)); }
  cameraTo(D.cam, first ? 0 : 1.3);
  if (!first && !SCROLL_STORY) {
    const url = new URL(location.href);
    url.searchParams.set('ch', i + 1);
    history.replaceState(null, '', url);
  }
  dirty = true;
}

/* ================= กล้อง ================= */
let fit = 1;
function cameraTo([p, t], dur) {
  const P1 = V3(...p), T1 = V3(...t);
  P1.sub(T1).multiplyScalar(fit).add(T1);
  const P0 = camera.position.clone(), T0 = controls.target.clone();
  userOrbit = false;
  tween('cam', dur, e => { camera.position.lerpVectors(P0, P1, e); controls.target.lerpVectors(T0, T1, e); });
}
function resize() {
  const w = innerWidth, h = innerHeight, narrow = w < 820;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.fov = narrow ? 44 : 30;
  if (narrow) camera.setViewOffset(w, h, 0, -h * 0.02, w, h); else camera.clearViewOffset();
  camera.updateProjectionMatrix();
  // จอเล็ก/เตี้ย: คอลัมน์ข้าง (px คงที่) กินที่มากขึ้น → ถอยกล้อง
  // มือถือแนวตั้ง: มุมมองแนวนอนแคบมาก → ถอยตามสัดส่วนจอ
  const f2 = narrow ? clamp(0.64 / camera.aspect, 1, 1.9) : clamp(Math.max(1320 / w, 880 / h), 1, 1.45);
  if (f2 !== fit) { camera.position.sub(controls.target).multiplyScalar(f2 / fit).add(controls.target); fit = f2; }
  dirty = true;
}
addEventListener('resize', resize);
addEventListener('keydown', e => {
  if (e.target.closest && e.target.closest('input, #dial, dialog')) return;
  if (SCROLL_STORY) {
    if (e.target.closest?.('button, a')) return;
    const steps = {ArrowDown:100, ArrowUp:-100, PageDown:innerHeight*.8, PageUp:-innerHeight*.8, ' ':innerHeight*.8};
    if (e.key in steps) { e.preventDefault(); parent.postMessage({type:'apple-story-scroll',delta:e.key===' '&&e.shiftKey?-steps[e.key]:steps[e.key]},location.origin); }
    return;
  }
  if (e.key === 'ArrowRight') go(state.ch + 1); if (e.key === 'ArrowLeft') go(state.ch - 1);
});

/* ================= เส้นโยงบานพับ → เลนส์ (บท 04) ================= */
const leaderLine = $('leader-line'), leaderDot = $('leader-dot');
function updateLeader() {
  if (CHAPTERS[state.ch].id !== 'glass') return;
  devWorld(0, H / 2 - F, 0, tmpV); tmpV.project(camera);
  const w = innerWidth, h = innerHeight, x = (tmpV.x + 1) / 2 * w, y = (1 - tmpV.y) / 2 * h;
  const r = document.querySelector('.lens-ring').getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2, rad = r.width / 2 + 8, ang = Math.atan2(y - cy, x - cx);
  leaderLine.setAttribute('x1', x); leaderLine.setAttribute('y1', y);
  leaderLine.setAttribute('x2', cx + Math.cos(ang) * rad); leaderLine.setAttribute('y2', cy + Math.sin(ang) * rad);
  leaderDot.setAttribute('cx', x); leaderDot.setAttribute('cy', y);
}

/* ================= loop ================= */
let last = performance.now(), hlPulse = 0;
function frame(now) {
  if (document.hidden || !articleVisible) { last = now; requestAnimationFrame(frame); return; }
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  stepTweens(dt);
  const id = CHAPTERS[state.ch].id;
  const cTarget = state.mode === 'bond' ? 1 : 0;
  if (Math.abs(state.crease - cTarget) > 1e-3) { state.crease += (cTarget - state.crease) * Math.min(1, dt * 6); dirty = true; }
  if (CH3D[id].spin && !SCROLL_STORY && !INSTANT && !userOrbit) { state.spin += dt * 9; dirty = true; }
  if (dirty) { rebuild(); if (id === 'glass') updateLens(); updateDial(); updateSlider(); dirty = false; }
  hlPulse += dt;
  for (const m of hlOrig.keys()) { const ms = Array.isArray(m.material) ? m.material : [m.material]; ms.forEach(x => { if ('emissiveIntensity' in x) x.emissiveIntensity = REDUCED ? 0.18 : 0.18 + 0.14 * Math.sin(hlPulse * 3); }); }
  controls.update();
  renderer.render(scene, camera);
  updateLeader(); layoutCallouts();
  requestAnimationFrame(frame);
}

const BUSINESS_TITLES = ['พกพาง่าย<br><em>แค่ไหน</em>','จอที่ใหญ่ขึ้น<br><em>ช่วยงานอะไร</em>','ประสบการณ์<br><em>มีต้นทุน</em>','จอพับกับ<br><em>ข้อจำกัด</em>','ออกแบบ<br><em>ทั้งระบบ</em>','ประสิทธิภาพ<br><em>ตรงกับงาน</em>','คุณค่าใหม่<br><em>กำไรใหม่?</em>'];
const BUSINESS_LEADS = [
  'ตอนพับ งานประจำต้องยังสะดวก ประโยชน์ของจอใหญ่ต้องมากพอให้ลูกค้ายอมรับรูปทรงและราคาที่เปลี่ยนไป',
  'จอใน 7.6 นิ้วตามสเปก Apple เปิดพื้นที่ให้แอปทำงานร่วมกัน คำถามคือพื้นที่นั้นช่วยงานได้คุ้มกับเงินที่จ่ายเพิ่มหรือไม่',
  'กลไกที่ทำงานได้ลื่นต้องทนด้วย ภาพแยกชิ้นนี้เป็นแบบจำลอง ไม่ได้เปิดเผยต้นทุน อัตราของเสีย หรือความทนทานจริง',
  'เปรียบเทียบหลักการยึดชั้นจอได้ในเลนส์ ค่าความหนาและการยืดเป็นแบบจำลองสมมติ ไม่ใช่ผลทดสอบจอ Duo จริง',
  'แบตเตอรี่ ระบบความร้อน และแผงวงจรใช้พื้นที่ร่วมกัน การออกแบบทั้งระบบช่วยเลือกจุดสมดุล แต่ไม่รับประกันว่าต้นทุนจะต่ำ',
  'A20 Pro เป็นชื่อที่ Apple ยืนยัน บล็อกสีแยกหน้าที่ให้เข้าใจ ไม่ใช่ผังไดจริง และ 2 นาโนเมตรคือชื่อกระบวนการผลิต',
  'ต้องแยกรายได้ที่เพิ่มใหม่จากยอดที่ย้ายมาจาก iPhone รุ่นอื่น และหักต้นทุนเพิ่ม ก่อนสรุปว่ารูปทรงใหม่ช่วยกำไร',
];
if (BUSINESS_ARTICLE) {
  const note = document.createElement('p'); note.className = 'business-model-note';
  note.textContent = 'แบบจำลองเพื่ออธิบาย · ภายในและผังชิปไม่ใช่แบบจริง · สเกลและค่าชั้นจอเป็นสมมติฐาน';
  document.body.append(note);
}
const STORY_LEADS = [
  'เริ่มจากตัวเครื่องที่พับอยู่ เลื่อนลงเพื่อค่อย ๆ หมุนดูรูปทรง ก่อนกางหน้าจอที่ซ่อนอยู่ข้างใน',
  'หน้าจอด้านในค่อย ๆ กางออกตามการเลื่อนของคุณ จากเครื่องพกพาขนาดเล็กเป็นพื้นที่ใช้งานที่กว้างขึ้น',
  'ใต้สันเครื่องคือชุดบานพับ เลื่อนต่อเพื่อแยกส่วนที่รองรับหน้าจอและช่วยให้สองฝั่งเคลื่อนไปด้วยกัน',
  'มองในเลนส์ขยายขณะที่จอค่อย ๆ พับ ชั้นต่าง ๆ ไถลผ่านกันเหมือนหน้าหนังสือ ลองสลับวิธียึดชั้นจอเพื่อเปรียบเทียบ',
  'ฝาหลังค่อย ๆ เปิดให้เห็นแบตเตอรี่ ระบบระบายความร้อน และแผงวงจร เลื่อนต่อเพื่อแยกชั้นและมองความสัมพันธ์ของแต่ละส่วน',
  'มาถึงชิป A20 Pro เลื่อนลงเพื่อยกแพ็กเกจออก แล้วมองส่วนที่ทำหน้าที่ประมวลผลต่างกันในผังอธิบายนี้',
  'จากตัวเครื่องจนถึงชิป กลับมาที่คำถามของผู้ถือหุ้น: การออกแบบเหล่านี้สร้างคุณค่าให้ลูกค้าและธุรกิจอย่างไร',
];
if (SCROLL_STORY) {
  const position = document.createElement('span'); position.id = 'story-position';
  document.querySelector('.bar').prepend(position);
  const cue = document.createElement('div'); cue.className = 'story-scroll-cue';
  cue.innerHTML = '<span>เลื่อนเพื่อสำรวจต่อ ↓</span><div><i id="story-progress"></i></div>';
  document.body.append(cue);
}
function applyStoryProgress(progress) {
  const value = clamp(progress,0,6.999), index = Math.floor(value);
  if (state.ch !== index) go(index);
  // Scrolling owns these actions; camera and pose transitions remain smooth.
  for (const key of ['fold','explode','turn']) delete slots[key];
  const p = REDUCED ? .65 : ease(clamp((value-index-.08)/.80,0,1));
  const D = CH3D[CHAPTERS[index].id];
  state.theta = index===1 ? 180*(1-p) : index===3 ? 45+p*105 : D.fold;
  state.turn = index===0 ? p*120 : 0;
  state.explode = D.auto ? p*D.auto : 0;
  state.spin = 0;
  $('story-progress').style.transform = `scaleX(${value/7})`;
  document.body.dataset.storyProgress = p.toFixed(3);
  dirty = true;
}

await fontsReady();
innerTex.image = innerScreen(); innerTex.needsUpdate = true;
outerTex.image = outerScreen(); outerTex.needsUpdate = true;
resize();
const D0 = CH3D[CHAPTERS[state.ch].id];
camera.position.set(...D0.cam[0]); controls.target.set(...D0.cam[1]);
Object.assign(poseCur, { C: POSE[D0.pose].C.clone(), P: POSE[D0.pose].P.clone(), q: POSE[D0.pose].q.clone() });
state.theta = D0.fold;
go(state.ch, true);
if (SCROLL_STORY) {
  scrollReady = true;
  applyStoryProgress(pendingStoryProgress);
  parent.postMessage({type:'apple-duo-ready'},location.origin);
}
if (Q.has('part') && PARTS[Q.get('part')]) selectPart(Q.get('part'), true);
rebuild();
requestAnimationFrame(t => { last = t; frame(t); canvas.classList.add('on'); $('leader').classList.add('on'); });
// เปิดหน้าครั้งแรกที่บท 01: ให้เครื่องหมุนโชว์ด้านหลังแวบหนึ่ง
if (!SCROLL_STORY && !INSTANT && state.ch === 0 && !Q.has('part')) setTimeout(() => { if (!slots.turn && state.turn === 0) tween('turn', 2.2, e => { state.turn = Math.sin(e * Math.PI) * 35; }); }, 700);
