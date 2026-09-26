// หนึ่งชิป ห้าด่าน — พื้นผิว (canvas) ที่วาดเองทั้งหมด ไม่ใช้ภาพถ่าย/ผังจริงของผู้ผลิต
import * as THREE from 'three';

export function rng(seed = 1) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let MAX_ANISO = 8;
export function setAniso(n) { MAX_ANISO = n; }

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}
function tex(c, { repeat = null, srgb = true } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = MAX_ANISO;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}
const hex = (h, a = 1) => {
  const n = parseInt(h.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
};

/* ================= ดาต้าเซ็นเตอร์ ================= */
// หน้าตู้ 50U (0.6 × 2.2 m) — ถาดคอมพิวต์ 18 · ถาดสวิตช์ 9 · ชั้นจ่ายไฟ · ช่องว่าง
export const RACK_U = 50;
export const RACK_LAYOUT = (() => {
  const L = [];
  for (let u = 0; u < RACK_U; u++) L.push('blank');
  for (const u of [0, 1, 2, 36, 37, 38, 39, 40, 41]) L[u] = 'psu';
  for (let u = 3; u <= 10; u++) L[u] = 'compute';
  for (let u = 13; u <= 21; u++) L[u] = 'switch';
  for (let u = 24; u <= 33; u++) L[u] = 'compute';
  for (let u = 43; u <= 48; u++) L[u] = 'manifold';
  return L;
})();
export const PULLED_U = 24;

export function rackFront({ emptyU = -1, seed = 3 } = {}) {
  const W = 256, H = 1024, uh = H / RACK_U;
  const [c, g] = canvas(W * 2, H * 2), [e, ge] = canvas(W * 2, H * 2);
  g.scale(2, 2); ge.scale(2, 2);
  const r = rng(seed);
  g.fillStyle = '#0b0f0e'; g.fillRect(0, 0, W, H);
  ge.fillStyle = '#000'; ge.fillRect(0, 0, W, H);
  // เสาตู้ซ้าย/ขวา
  g.fillStyle = '#151b19'; g.fillRect(0, 0, 14, H); g.fillRect(W - 14, 0, 14, H);
  g.fillStyle = '#1d2522';
  for (let y = 4; y < H; y += uh / 3) { g.fillRect(4, y, 5, 2); g.fillRect(W - 9, y, 5, 2); }
  const X0 = 16, X1 = W - 16;
  RACK_LAYOUT.forEach((kind, u) => {
    const y = u * uh;
    if (u === emptyU) {                                   // ช่องที่ถาดถูกดึงออกไป
      g.fillStyle = '#020303'; g.fillRect(X0, y + 1, X1 - X0, uh - 2);
      g.fillStyle = '#1a2320'; g.fillRect(X0, y + 1, 5, uh - 2); g.fillRect(X1 - 5, y + 1, 5, uh - 2);
      return;
    }
    if (kind === 'blank') {
      g.fillStyle = '#0e1312'; g.fillRect(X0, y + 1, X1 - X0, uh - 2);
      return;
    }
    if (kind === 'manifold') {
      g.fillStyle = '#101614'; g.fillRect(X0, y + 1, X1 - X0, uh - 2);
      g.fillStyle = u % 2 ? '#1f8f86' : '#b8742f';
      g.fillRect(X0 + 10, y + uh * .35, X1 - X0 - 20, uh * .3);
      return;
    }
    g.fillStyle = kind === 'switch' ? '#141a1d' : kind === 'psu' ? '#151917' : '#121816';
    g.fillRect(X0, y + 1, X1 - X0, uh - 2);
    g.fillStyle = 'rgba(255,255,255,.05)'; g.fillRect(X0, y + 1, X1 - X0, 1);
    if (kind === 'compute') {
      // ช่องลมรังผึ้ง
      g.fillStyle = '#070a09';
      for (let x = X0 + 8; x < X0 + 104; x += 5) for (let yy = y + 4; yy < y + uh - 4; yy += 4) g.fillRect(x + ((yy / 4) % 2) * 2, yy, 3, 2);
      // พอร์ต OSFP
      for (let i = 0; i < 4; i++) {
        g.fillStyle = '#6d7a78'; g.fillRect(X0 + 116 + i * 24, y + 5, 19, uh - 10);
        g.fillStyle = '#1b2220'; g.fillRect(X0 + 118 + i * 24, y + 7, 15, uh - 14);
      }
      g.fillStyle = '#2b3431'; g.fillRect(X1 - 14, y + 4, 8, uh - 8);          // มือจับ
      ge.fillStyle = r() < .9 ? '#3ddc97' : '#f5b544';
      ge.fillRect(X0 + 214, y + uh / 2 - 2, 4, 4);
      ge.fillStyle = '#3ddc97'; if (r() < .6) ge.fillRect(X0 + 206, y + uh / 2 - 2, 4, 4);
    } else if (kind === 'switch') {
      for (let i = 0; i < 18; i++) {
        g.fillStyle = '#58625f'; g.fillRect(X0 + 6 + i * 11.5, y + 5, 9, uh - 10);
        g.fillStyle = '#161c1a'; g.fillRect(X0 + 7 + i * 11.5, y + 7, 7, uh - 14);
        if (r() < .75) { ge.fillStyle = r() < .85 ? '#52d6e8' : '#f5b544'; ge.fillRect(X0 + 9 + i * 11.5, y + 2, 3, 2); }
      }
    } else if (kind === 'psu') {
      for (let i = 0; i < 6; i++) {
        g.fillStyle = '#1a201e'; g.fillRect(X0 + 4 + i * 37, y + 2, 34, uh - 4);
        g.fillStyle = '#0a0d0c';
        for (let x = 0; x < 22; x += 4) g.fillRect(X0 + 8 + i * 37 + x, y + 5, 2, uh - 10);
        ge.fillStyle = '#3ddc97'; ge.fillRect(X0 + 32 + i * 37, y + uh / 2 - 1, 3, 3);
      }
    }
  });
  return { map: tex(c), emissive: tex(e) };
}

export function rackBack() {
  const W = 256, H = 1024;
  const [c, g] = canvas(W, H);
  g.fillStyle = '#0c100f'; g.fillRect(0, 0, W, H);
  // ท่อน้ำเย็น/ร้อนแนวตั้ง + สายไฟ
  g.fillStyle = '#1f8f86'; g.fillRect(40, 30, 16, H - 60);
  g.fillStyle = '#b8742f'; g.fillRect(64, 30, 16, H - 60);
  g.fillStyle = '#20282a';
  for (let x = 100; x < 220; x += 8) g.fillRect(x, 20, 5, H - 40);
  g.fillStyle = '#3a4543';
  for (let y = 40; y < H - 40; y += 21) { g.fillRect(36, y, 48, 4); }
  return tex(c);
}

export function rackSide() {
  const W = 256, H = 512;
  const [c, g] = canvas(W, H);
  g.fillStyle = '#101514'; g.fillRect(0, 0, W, H);
  g.fillStyle = '#0a0e0d';
  for (let y = 10; y < H - 10; y += 6) for (let x = 10 + ((y / 6) % 2) * 3; x < W - 10; x += 6) g.fillRect(x, y, 2, 2);
  g.fillStyle = '#18201e'; g.fillRect(0, 0, W, 6); g.fillRect(0, H - 6, W, 6);
  return tex(c);
}

export function rackTop() {
  const [c, g] = canvas(128, 256);
  g.fillStyle = '#121816'; g.fillRect(0, 0, 128, 256);
  g.strokeStyle = '#1c2522'; g.lineWidth = 3; g.strokeRect(4, 4, 120, 248);
  g.fillStyle = '#0b0f0e'; g.fillRect(20, 30, 88, 60);
  return tex(c);
}

export function floorTiles() {
  const S = 512;
  const [c, g] = canvas(S, S);
  const r = rng(7);
  g.fillStyle = '#0d1211'; g.fillRect(0, 0, S, S);
  const n = 4, t = S / n;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const v = 16 + r() * 5;
    g.fillStyle = `rgb(${v},${v + 5},${v + 3})`;
    g.fillRect(i * t + 2, j * t + 2, t - 4, t - 4);
  }
  g.strokeStyle = '#060808'; g.lineWidth = 3;
  for (let i = 0; i <= n; i++) { g.beginPath(); g.moveTo(i * t, 0); g.lineTo(i * t, S); g.stroke(); g.beginPath(); g.moveTo(0, i * t); g.lineTo(S, i * t); g.stroke(); }
  return c;
}
export function floorTex(repeat) { return tex(floorTiles(), { repeat }); }

export function perfTile(repeat) {        // แผ่นพื้นมีรูระบายลมเย็นในทางเดินเย็น
  const S = 256;
  const [c, g] = canvas(S, S);
  g.fillStyle = '#141b1a'; g.fillRect(0, 0, S, S);
  g.fillStyle = '#070a0a';
  for (let y = 12; y < S - 8; y += 9) for (let x = 12; x < S - 8; x += 9) { g.beginPath(); g.arc(x, y, 2.6, 0, 7); g.fill(); }
  g.strokeStyle = '#050707'; g.lineWidth = 4; g.strokeRect(0, 0, S, S);
  return tex(c, { repeat });
}

/* ================= ถาดคอมพิวต์ ================= */
export function pcb({ w = 1024, h = 2048, seed = 11 } = {}) {
  const [c, g] = canvas(w, h);
  const r = rng(seed);
  g.fillStyle = '#0c1a14'; g.fillRect(0, 0, w, h);
  // ลายทองแดงใต้ solder mask
  g.lineCap = 'round';
  for (let i = 0; i < 520; i++) {
    g.strokeStyle = `rgba(40,92,66,${.25 + r() * .35})`;
    g.lineWidth = 1 + r() * 2.5;
    let x = r() * w, y = r() * h;
    g.beginPath(); g.moveTo(x, y);
    for (let k = 0; k < 4; k++) {
      if (r() < .5) x += (r() - .5) * 260; else y += (r() - .5) * 260;
      g.lineTo(x, y);
    }
    g.stroke();
  }
  // pad/via
  for (let i = 0; i < 2600; i++) {
    g.fillStyle = r() < .7 ? 'rgba(160,140,90,.55)' : 'rgba(210,210,200,.5)';
    const s = 1.5 + r() * 2.5;
    g.fillRect(r() * w, r() * h, s, s);
  }
  // silkscreen (กรอบชิ้นส่วน)
  g.strokeStyle = 'rgba(220,230,225,.22)'; g.lineWidth = 1.5;
  for (let i = 0; i < 90; i++) g.strokeRect(r() * w, r() * h, 10 + r() * 60, 8 + r() * 40);
  return tex(c);
}

export function coldPlate() {
  // ผิวกลึงวงโค้ง + รูสกรู 4 มุม (ทองแดงชุบนิกเกิล)
  const S = 512;
  const [c, g] = canvas(S, S);
  const gr = g.createLinearGradient(0, 0, S, S);
  gr.addColorStop(0, '#c98d5c'); gr.addColorStop(.5, '#d9a273'); gr.addColorStop(1, '#b97b4c');
  g.fillStyle = gr; g.fillRect(0, 0, S, S);
  g.lineWidth = 1;
  for (let k = 0; k < 150; k++) {
    g.strokeStyle = `rgba(${k % 2 ? '255,230,200' : '90,50,25'},${.05 + (k % 5) * .012})`;
    g.beginPath(); g.arc(-S * .6, S / 2, S * .4 + k * 4.6, -.9, .9); g.stroke();
  }
  g.fillStyle = 'rgba(40,24,14,.55)';
  for (const [x, y] of [[40, 40], [S - 40, 40], [40, S - 40], [S - 40, S - 40]]) { g.beginPath(); g.arc(x, y, 14, 0, 7); g.fill(); }
  g.strokeStyle = 'rgba(60,34,18,.35)'; g.lineWidth = 3; g.strokeRect(80, 80, S - 160, S - 160);
  return tex(c);
}

export function frontPanel() {
  const W = 1024, H = 128;
  const [c, g] = canvas(W, H);
  g.fillStyle = '#141a18'; g.fillRect(0, 0, W, H);
  g.fillStyle = '#070a09';
  for (let x = 20; x < 330; x += 10) for (let y = 16; y < H - 14; y += 9) g.fillRect(x + ((y / 9) % 2) * 4, y, 6, 5);
  for (let i = 0; i < 4; i++) {
    g.fillStyle = '#7b8784'; g.fillRect(360 + i * 110, 24, 92, 80);
    g.fillStyle = '#161c1a'; g.fillRect(366 + i * 110, 30, 80, 68);
  }
  g.fillStyle = '#3ddc97'; g.fillRect(830, 56, 12, 12);
  g.fillStyle = '#24302c'; g.fillRect(880, 20, 110, 88);
  return tex(c);
}

/* ================= แพ็กเกจ ================= */
export function substrate() {
  const S = 1024;
  const [c, g] = canvas(S, S);
  const r = rng(21);
  g.fillStyle = '#16241e'; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 9000; i++) {
    const v = r();
    g.fillStyle = v < .5 ? 'rgba(90,110,70,.18)' : 'rgba(20,34,28,.5)';
    g.fillRect(r() * S, r() * S, 2, 2);
  }
  g.strokeStyle = 'rgba(190,160,90,.16)'; g.lineWidth = 2;
  for (let i = 0; i < 60; i++) { const y = r() * S; g.beginPath(); g.moveTo(0, y); g.lineTo(S, y + (r() - .5) * 40); g.stroke(); }
  return tex(c);
}

/* ================= ผังชิป (ภาพอธิบาย ไม่ใช่ผังจริงของ NVIDIA) ================= */
// หน่วย: มม. ในพิกัดได (กลางได = 0,0) ได 26 × 30
export const DIE = { w: 26, d: 30 };
export const SMG = { cols: 8, rows: 5, w: 2.8, d: 2.2, px: 2.95, pz: 2.35 };
export function smCenters() {
  const out = [];
  const x0 = -((SMG.cols - 1) * SMG.px) / 2;
  for (const half of [-1, 1]) {
    const zc = half * 7.9;
    const z0 = zc - ((SMG.rows - 1) * SMG.pz) / 2;
    for (let i = 0; i < SMG.cols; i++) for (let j = 0; j < SMG.rows; j++) out.push({ x: x0 + i * SMG.px, z: z0 + j * SMG.pz, i, j, half });
  }
  return out;
}
export const FOCUS_SM = { i: 5, j: 2, half: -1 };
export const DIE_BLOCKS = [       // [x0,z0,x1,z1,kind]
  [-12.2, -1.55, 12.2, 1.55, 'l2'],
  [-12.9, -14.9, 12.9, -14.1, 'phy'], [-12.9, 14.1, 12.9, 14.9, 'phy'],
  [-12.95, -13.6, -12.35, 13.6, 'nvhbi'],
  [12.35, -13.6, 12.95, 13.6, 'io'],
  [-12.2, -2.05, 12.2, -1.7, 'xbar'], [-12.2, 1.7, 12.2, 2.05, 'xbar'],
];

// บล็อกใน SM หนึ่งหน่วย (µm, กลาง SM = 0,0) ขนาด 2800 × 2200
export const SM_BLOCKS = (() => {
  const B = [];
  const pbW = 700, gap = 24;
  for (let p = 0; p < 4; p++) {
    const x0 = -1400 + p * pbW + gap / 2, x1 = x0 + pbW - gap;
    B.push([x0, -1090, x1, -660, 'sram', 3.0, 'reg']);
    B.push([x0, -636, x1, -10, 'tensor', 4.2, 'tc', p]);
    B.push([x0, 14, x1, 250, 'logic', 2.2, 'alu']);
    B.push([x0, 274, x0 + (x1 - x0) * .62, 404, 'ctrl', 1.6, 'sched']);
    B.push([x0 + (x1 - x0) * .62 + 12, 274, x1, 404, 'sram', 1.8, 'icache']);
  }
  B.push([-1388, 440, 520, 1090, 'sram', 3.4, 'l1']);
  for (let k = 0; k < 4; k++) {
    const x0 = 546 + k * 213;
    B.push([x0, 440, x0 + 200, 760, 'logic', 2.6, 'tex']);
  }
  B.push([546, 784, 1388, 1090, 'ctrl', 2.0, 'lsu']);
  return B;
})();
export const TC_FOCUS = { x: 350 + 24, z: -300 };    // จุดโฟกัสใน Tensor Core ของ partition ที่ 3

export const SILICON = {
  sram: { base: '#113038', hi: '#5fc4cf' },
  tensor: { base: '#2b2a14', hi: '#d8c46a' },
  logic: { base: '#221a14', hi: '#a8805e' },
  ctrl: { base: '#1a1b2a', hi: '#7c7fb0' },
  chan: { base: '#0a100f', hi: '#2f4a44' },
};

function drawSRAM(g, x, y, w, h, s = 1, r = Math.random) {
  const c = SILICON.sram;
  g.fillStyle = c.base; g.fillRect(x, y, w, h);
  const cw = Math.max(1, 3 * s), ch = Math.max(1, 2 * s);
  g.fillStyle = hex(c.hi, .55);
  for (let yy = y + 2; yy < y + h - 1; yy += ch * 2) for (let xx = x + 2; xx < x + w - 1; xx += cw * 2) g.fillRect(xx, yy, cw, ch);
  // แถบถอดรหัสแถว/คอลัมน์
  g.fillStyle = hex(c.hi, .8);
  const bands = Math.max(1, Math.round(w / (60 * s)));
  for (let k = 1; k < bands; k++) g.fillRect(x + (w * k) / bands - s, y, 2 * s, h);
  g.fillRect(x, y + h - 4 * s, w, 3 * s);
}
function drawTensor(g, x, y, w, h, s = 1, r = Math.random) {
  const c = SILICON.tensor;
  g.fillStyle = c.base; g.fillRect(x, y, w, h);
  const n = 8, m = 8, pw = w / n, ph = h / m;
  for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) {
    const px = x + i * pw, py = y + j * ph;
    g.fillStyle = hex(c.hi, .18 + r() * .1); g.fillRect(px + pw * .08, py + ph * .08, pw * .84, ph * .84);
    g.fillStyle = hex(c.hi, .45);
    for (let k = 0; k < 4; k++) g.fillRect(px + pw * .14, py + ph * (.18 + k * .18), pw * .72, Math.max(1, ph * .06));
    g.fillStyle = hex('#f0e3a0', .6); g.fillRect(px + pw * .75, py + ph * .75, pw * .1, ph * .1);
  }
}
function drawLogic(g, x, y, w, h, s = 1, r = Math.random, col = SILICON.logic) {
  g.fillStyle = col.base; g.fillRect(x, y, w, h);
  const rowH = Math.max(1.5, 3 * s);
  for (let yy = y; yy < y + h; yy += rowH) {
    let xx = x;
    while (xx < x + w) {
      const cw = (2 + r() * 10) * s;
      g.fillStyle = hex(col.hi, .12 + r() * .45);
      g.fillRect(xx, yy + rowH * .12, Math.min(cw, x + w - xx) - s * .4, rowH * .76);
      xx += cw;
    }
  }
}

export function smTexture(size = 1024) {
  // พื้นผิว SM ทั้งหน่วย (ใช้ในระดับได) วาดจาก SM_BLOCKS เดียวกับระดับ SM
  const W = size, H = Math.round(size * 2200 / 2800);
  const [c, g] = canvas(W, H);
  const r = rng(31);
  const sx = W / 2800, sz = H / 2200;
  g.fillStyle = SILICON.chan.base; g.fillRect(0, 0, W, H);
  g.strokeStyle = hex(SILICON.chan.hi, .6); g.lineWidth = 1;
  for (let x = 0; x < W; x += 3) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
  for (const b of SM_BLOCKS) {
    const [x0, z0, x1, z1, kind] = b;
    const X = (x0 + 1400) * sx, Y = (z0 + 1100) * sz, w = (x1 - x0) * sx, h = (z1 - z0) * sz;
    if (kind === 'sram') drawSRAM(g, X, Y, w, h, .5, r);
    else if (kind === 'tensor') drawTensor(g, X, Y, w, h, .5, r);
    else if (kind === 'logic') drawLogic(g, X, Y, w, h, .4, r);
    else drawLogic(g, X, Y, w, h, .4, r, SILICON.ctrl);
  }
  g.strokeStyle = 'rgba(200,230,220,.35)'; g.lineWidth = 2; g.strokeRect(1, 1, W - 2, H - 2);
  return tex(c);
}

export function blockTexture(kind, { size = 1024, repeat = null, seed = 5 } = {}) {
  const [c, g] = canvas(size, size);
  const r = rng(seed);
  if (kind === 'sram') drawSRAM(g, 0, 0, size, size, 2, r);
  else if (kind === 'tensor') drawTensor(g, 0, 0, size, size, 2, r);
  else if (kind === 'logic') drawLogic(g, 0, 0, size, size, 2.2, r);
  else if (kind === 'ctrl') drawLogic(g, 0, 0, size, size, 2.2, r, SILICON.ctrl);
  else if (kind === 'chan') {
    g.fillStyle = SILICON.chan.base; g.fillRect(0, 0, size, size);
    for (let x = 0; x < size; x += 6) { g.fillStyle = hex(SILICON.chan.hi, .3 + r() * .5); g.fillRect(x, 0, 2, size); }
    for (let y = 0; y < size; y += 16) { g.fillStyle = hex('#4c6c64', .35); g.fillRect(0, y, size, 3); }
  }
  return tex(c, { repeat });
}

export function dieTexture({ size = 2048, withFocusHole = false } = {}) {
  // ได 1 ชิ้นทั้งผืน — ใช้กับได "ฝั่งซ้าย" และเป็นฉากหลังของระดับได
  const W = size, H = Math.round(size * DIE.d / DIE.w);
  const [c, g] = canvas(W, H);
  const r = rng(41);
  const X = x => (x + DIE.w / 2) / DIE.w * W, Z = z => (z + DIE.d / 2) / DIE.d * H;
  g.fillStyle = '#0b1211'; g.fillRect(0, 0, W, H);
  // เส้นแบ่ง GPC + ช่องสายไฟ
  drawLogic(g, 0, 0, W, H, 1.2, r, SILICON.chan);
  for (const [x0, z0, x1, z1, kind] of DIE_BLOCKS) {
    const x = X(x0), y = Z(z0), w = X(x1) - x, h = Z(z1) - y;
    if (kind === 'l2') drawSRAM(g, x, y, w, h, 1.2, r);
    else if (kind === 'phy') { g.fillStyle = '#2a2212'; g.fillRect(x, y, w, h); g.fillStyle = 'rgba(230,190,110,.55)'; for (let k = x; k < x + w; k += 7) g.fillRect(k, y + 2, 3, h - 4); }
    else if (kind === 'nvhbi' || kind === 'io') { g.fillStyle = '#16142a'; g.fillRect(x, y, w, h); g.fillStyle = 'rgba(160,140,240,.5)'; for (let k = y; k < y + h; k += 6) g.fillRect(x + 2, k, w - 4, 2); }
    else drawLogic(g, x, y, w, h, .8, r, SILICON.ctrl);
  }
  const smt = smTexture(512).image;
  for (const s of smCenters()) {
    const x = X(s.x - SMG.w / 2), y = Z(s.z - SMG.d / 2), w = X(s.x + SMG.w / 2) - x, h = Z(s.z + SMG.d / 2) - y;
    g.drawImage(smt, x, y, w, h);
  }
  // ขอบซีล
  g.strokeStyle = 'rgba(210,230,220,.55)'; g.lineWidth = 4; g.strokeRect(6, 6, W - 12, H - 12);
  return tex(c);
}

export function hbmTop() {
  const [c, g] = canvas(256, 256);
  const r = rng(51);
  g.fillStyle = '#1a1d22'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(255,255,255,${r() * .05})`; g.fillRect(r() * 256, r() * 256, 2, 2); }
  g.strokeStyle = 'rgba(255,255,255,.14)'; g.lineWidth = 3; g.strokeRect(6, 6, 244, 244);
  return tex(c);
}
