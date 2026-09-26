// หน้าจอสไตล์ iOS สำหรับโมเดล iPhone Duo — วาดเองทั้งหมดด้วย canvas
// (ไม่ใช้รูปวอลเปเปอร์/ไอคอนจริงของ Apple — ลิขสิทธิ์) แค่ให้บรรยากาศใกล้เคียง: เนินทรายโทนนวล + โฮมสกรีน
const SYS = 'system-ui, -apple-system, "SF Pro Text", "Helvetica Neue", "IBM Plex Sans Thai", sans-serif';
const font = (w, px) => `${w} ${px}px ${SYS}`;
const TAU = Math.PI * 2;

function rr(g, x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

/* ================= วอลเปเปอร์เนินทราย ================= */
function dunes(g, W, H, horizon) {
  const hy = H * horizon, s = Math.min(W, H);
  const sky = g.createLinearGradient(0, 0, 0, hy + s * 0.1);
  sky.addColorStop(0, '#9fb2c6'); sky.addColorStop(0.5, '#c9cfd3'); sky.addColorStop(1, '#eadfce');
  g.fillStyle = sky; g.fillRect(0, 0, W, H);
  const sun = g.createRadialGradient(W * 0.64, hy * 0.96, 0, W * 0.64, hy * 0.96, s * 0.9);
  sun.addColorStop(0, 'rgba(255,247,232,.8)'); sun.addColorStop(1, 'rgba(255,247,232,0)');
  g.fillStyle = sun; g.fillRect(0, 0, W, H);

  const curve = (base, amps) => x => amps.reduce((y, [a, f, p]) => y + a * Math.sin(x / W * f * TAU + p), base);
  const layer = (base, amps, top, bot, depth, crest) => {
    const y = curve(base, amps), step = W / 300;
    g.beginPath(); g.moveTo(0, H);
    for (let x = 0; x <= W + step; x += step) g.lineTo(x, y(x));
    g.lineTo(W, H); g.closePath();
    const lg = g.createLinearGradient(0, base - depth, 0, base + depth * 3);
    lg.addColorStop(0, top); lg.addColorStop(1, bot);
    g.fillStyle = lg; g.fill();
    if (!crest) return;
    // สันเนิน: เส้นสว่างบนสัน + เงานุ่มใต้สันฝั่งลาดลง
    for (let x = 0; x < W; x += step) {
      const y0 = y(x), y1 = y(x + step), slope = (y1 - y0) / step;
      const sh = Math.max(0, Math.min(1, slope * 1.6));
      if (sh > 0.02) {
        const sg = g.createLinearGradient(0, y0, 0, y0 + depth * 1.4);
        sg.addColorStop(0, `rgba(110,82,52,${0.42 * sh})`); sg.addColorStop(1, 'rgba(110,82,52,0)');
        g.fillStyle = sg; g.fillRect(x, y0 + 1, step + 0.6, depth * 1.4);
      }
    }
    g.beginPath();
    for (let x = 0; x <= W + step; x += step) x === 0 ? g.moveTo(x, y(x)) : g.lineTo(x, y(x));
    g.strokeStyle = 'rgba(255,251,242,.55)'; g.lineWidth = Math.max(2, s * 0.0025); g.stroke();
  };
  // ภูเขาไกล (หมอกจาง) → เนินทรายใกล้
  layer(hy - s * 0.03, [[s * 0.06, 1.2, 0.4], [s * 0.025, 3.1, 1.2], [s * 0.01, 7.7, 2]], '#a39a8f', '#cbbfb0', s * 0.06, false);
  layer(hy + s * 0.02, [[s * 0.045, 1.6, 2.2], [s * 0.018, 4.3, 0.3], [s * 0.007, 11, 1]], '#8f8577', '#bfb09b', s * 0.05, false);
  layer(hy + s * 0.10, [[s * 0.03, 1.1, 1.0], [s * 0.012, 2.9, 0.2]], '#e6d6bb', '#c4aa84', s * 0.05, true);
  layer(hy + s * 0.19, [[s * 0.045, 0.9, 2.6], [s * 0.018, 2.3, 1.4]], '#ebdbc0', '#bb9d74', s * 0.06, true);
  layer(hy + s * 0.32, [[s * 0.065, 0.7, 0.3], [s * 0.022, 1.9, 2.0]], '#efe0c6', '#b39469', s * 0.07, true);
  layer(hy + s * 0.50, [[s * 0.085, 0.6, 1.9], [s * 0.028, 1.5, 0.6]], '#f2e4cc', '#a98a5f', s * 0.08, true);
  // เกรนละเอียด
  const img = g.getImageData(0, 0, W, H), d = img.data, r = rng(7);
  for (let i = 0; i < d.length; i += 4) { const n = (r() - 0.5) * 9; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
  g.putImageData(img, 0, 0);
}

/* ================= ไอคอน (วาดเอง รูปทรงทั่วไป) ================= */
const bg = (g, s, a, b) => { const l = g.createLinearGradient(0, 0, 0, s); l.addColorStop(0, a); l.addColorStop(1, b); g.fillStyle = l; g.fillRect(0, 0, s, s); };
const W8 = '#fff';
const ICON = {
  phone(g, s) {
    bg(g, s, '#6fe483', '#2db94c');
    g.translate(s / 2, s / 2); g.rotate(-0.7);
    g.strokeStyle = W8; g.lineWidth = s * 0.12; g.lineCap = 'round';
    g.beginPath(); g.arc(0, s * 0.12, s * 0.25, Math.PI * 1.18, Math.PI * 1.82); g.stroke();
    g.fillStyle = W8;
    for (const sg of [-1, 1]) { rr(g, sg * s * 0.25 - s * 0.075, s * 0.0, s * 0.15, s * 0.15, s * 0.05); g.fill(); }
  },
  messages(g, s) {
    bg(g, s, '#6fe483', '#2db94c'); g.fillStyle = W8;
    g.beginPath(); g.ellipse(s * 0.5, s * 0.47, s * 0.31, s * 0.25, 0, 0, TAU); g.fill();
    g.beginPath(); g.moveTo(s * 0.3, s * 0.6); g.quadraticCurveTo(s * 0.28, s * 0.74, s * 0.18, s * 0.78); g.quadraticCurveTo(s * 0.36, s * 0.76, s * 0.44, s * 0.68); g.fill();
  },
  mail(g, s) {
    bg(g, s, '#57b8ff', '#1c78f0'); g.fillStyle = W8; rr(g, s * 0.17, s * 0.3, s * 0.66, s * 0.42, s * 0.05); g.fill();
    g.strokeStyle = '#8cc7ff'; g.lineWidth = s * 0.03; g.lineJoin = 'round';
    g.beginPath(); g.moveTo(s * 0.2, s * 0.34); g.lineTo(s * 0.5, s * 0.55); g.lineTo(s * 0.8, s * 0.34); g.stroke();
  },
  safari(g, s) {
    bg(g, s, '#ffffff', '#e4e9ef');
    const c = g.createLinearGradient(0, s * 0.14, 0, s * 0.86); c.addColorStop(0, '#5ecbff'); c.addColorStop(1, '#1467e0');
    g.fillStyle = c; g.beginPath(); g.arc(s / 2, s / 2, s * 0.36, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = s * 0.012;
    for (let i = 0; i < 24; i++) { const a = i / 24 * TAU; g.beginPath(); g.moveTo(s / 2 + Math.cos(a) * s * 0.3, s / 2 + Math.sin(a) * s * 0.3); g.lineTo(s / 2 + Math.cos(a) * s * 0.34, s / 2 + Math.sin(a) * s * 0.34); g.stroke(); }
    g.translate(s / 2, s / 2); g.rotate(Math.PI / 4);
    g.fillStyle = '#ff3b30'; g.beginPath(); g.moveTo(0, -s * 0.27); g.lineTo(s * 0.055, 0); g.lineTo(-s * 0.055, 0); g.fill();
    g.fillStyle = W8; g.beginPath(); g.moveTo(0, s * 0.27); g.lineTo(s * 0.055, 0); g.lineTo(-s * 0.055, 0); g.fill();
  },
  camera(g, s) {
    bg(g, s, '#e9e9ee', '#a4a4aa');
    g.fillStyle = '#3a3a3c'; rr(g, s * 0.15, s * 0.3, s * 0.7, s * 0.46, s * 0.08); g.fill(); rr(g, s * 0.37, s * 0.24, s * 0.26, s * 0.1, s * 0.03); g.fill();
    g.fillStyle = '#1c1c1e'; g.beginPath(); g.arc(s / 2, s * 0.53, s * 0.15, 0, TAU); g.fill();
    g.strokeStyle = '#8e8e93'; g.lineWidth = s * 0.03; g.stroke();
    g.fillStyle = '#ffd60a'; g.beginPath(); g.arc(s * 0.74, s * 0.38, s * 0.03, 0, TAU); g.fill();
  },
  photos(g, s) {
    bg(g, s, '#ffffff', '#f2f2f5'); g.globalCompositeOperation = 'multiply';
    const cols = ['#ff9f0a', '#ffd60a', '#a4e14b', '#30d158', '#40c8e0', '#0a84ff', '#bf5af2', '#ff375f'];
    cols.forEach((c, i) => { const a = i / 8 * TAU; g.save(); g.translate(s / 2 + Math.cos(a) * s * 0.15, s / 2 + Math.sin(a) * s * 0.15); g.rotate(a);
      g.fillStyle = c; g.globalAlpha = 0.85; g.beginPath(); g.ellipse(0, 0, s * 0.16, s * 0.075, 0, 0, TAU); g.fill(); g.restore(); });
  },
  maps(g, s) {
    bg(g, s, '#dff3d2', '#c7e8b5');
    g.fillStyle = '#f5f0e1'; g.fillRect(0, s * 0.55, s, s * 0.45);
    g.strokeStyle = W8; g.lineWidth = s * 0.08; g.beginPath(); g.moveTo(-s * 0.1, s * 0.9); g.lineTo(s * 1.1, s * 0.2); g.stroke();
    g.strokeStyle = '#ffcc4d'; g.lineWidth = s * 0.05; g.beginPath(); g.moveTo(s * 0.62, -s * 0.1); g.lineTo(s * 0.62, s * 1.1); g.stroke();
    g.strokeStyle = '#0a84ff'; g.lineWidth = s * 0.045; g.lineCap = 'round'; g.beginPath(); g.moveTo(s * 0.2, s * 0.78); g.lineTo(s * 0.45, s * 0.63); g.lineTo(s * 0.62, s * 0.42); g.stroke();
    g.fillStyle = '#ff3b30'; g.beginPath(); g.arc(s * 0.62, s * 0.36, s * 0.07, 0, TAU); g.fill();
  },
  music(g, s) {
    bg(g, s, '#ff6f88', '#fa2d4f'); g.fillStyle = W8; g.strokeStyle = W8; g.lineWidth = s * 0.05;
    g.beginPath(); g.moveTo(s * 0.42, s * 0.66); g.lineTo(s * 0.42, s * 0.3); g.lineTo(s * 0.7, s * 0.24); g.lineTo(s * 0.7, s * 0.6); g.stroke();
    g.beginPath(); g.moveTo(s * 0.42, s * 0.3); g.lineTo(s * 0.7, s * 0.24); g.lineTo(s * 0.7, s * 0.33); g.lineTo(s * 0.42, s * 0.39); g.fill();
    for (const [x, y] of [[0.35, 0.67], [0.63, 0.61]]) { g.beginPath(); g.ellipse(s * x, s * y, s * 0.09, s * 0.07, -0.3, 0, TAU); g.fill(); }
  },
  notes(g, s) {
    bg(g, s, '#ffffff', '#f7f7f7');
    const y = g.createLinearGradient(0, 0, 0, s * 0.24); y.addColorStop(0, '#ffdf5e'); y.addColorStop(1, '#f7c325');
    g.fillStyle = y; g.fillRect(0, 0, s, s * 0.24);
    g.strokeStyle = '#d1d1d6'; g.lineWidth = s * 0.02;
    for (const yy of [0.44, 0.58, 0.72, 0.86]) { g.beginPath(); g.moveTo(s * 0.14, s * yy); g.lineTo(s * 0.86, s * yy); g.stroke(); }
  },
  settings(g, s) {
    bg(g, s, '#c9c9ce', '#8e8e93');
    g.translate(s / 2, s / 2); g.fillStyle = '#48484a';
    for (let i = 0; i < 12; i++) { g.save(); g.rotate(i / 12 * TAU); rr(g, -s * 0.04, -s * 0.36, s * 0.08, s * 0.14, s * 0.02); g.fill(); g.restore(); }
    g.beginPath(); g.arc(0, 0, s * 0.27, 0, TAU); g.fill();
    g.fillStyle = '#b8b8bd'; g.beginPath(); g.arc(0, 0, s * 0.17, 0, TAU); g.fill();
    g.fillStyle = '#48484a'; g.beginPath(); g.arc(0, 0, s * 0.07, 0, TAU); g.fill();
  },
  clock(g, s) {
    bg(g, s, '#1c1c1e', '#000000');
    g.fillStyle = W8; g.beginPath(); g.arc(s / 2, s / 2, s * 0.39, 0, TAU); g.fill();
    g.translate(s / 2, s / 2); g.strokeStyle = '#1c1c1e';
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; g.lineWidth = s * 0.018; g.beginPath(); g.moveTo(Math.cos(a) * s * 0.31, Math.sin(a) * s * 0.31); g.lineTo(Math.cos(a) * s * 0.35, Math.sin(a) * s * 0.35); g.stroke(); }
    const hand = (a, l, w, c) => { g.strokeStyle = c; g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.sin(a) * l, -Math.cos(a) * l); g.stroke(); };
    hand((10 + 24 / 60) / 12 * TAU, s * 0.19, s * 0.045, '#1c1c1e'); hand(24 / 60 * TAU, s * 0.29, s * 0.035, '#1c1c1e'); hand(0.62 * TAU, s * 0.31, s * 0.015, '#ff9500');
  },
  health(g, s) {
    bg(g, s, '#ffffff', '#f2f2f5');
    const h = g.createLinearGradient(0, s * 0.25, 0, s * 0.8); h.addColorStop(0, '#ff6b8b'); h.addColorStop(1, '#ff2d55');
    g.fillStyle = h; g.beginPath(); g.moveTo(s * 0.5, s * 0.78);
    g.bezierCurveTo(s * 0.12, s * 0.52, s * 0.18, s * 0.2, s * 0.5, s * 0.34);
    g.bezierCurveTo(s * 0.82, s * 0.2, s * 0.88, s * 0.52, s * 0.5, s * 0.78); g.fill();
  },
  wallet(g, s) {
    bg(g, s, '#1c1c1e', '#000000');
    ['#34c759', '#ffcc00', '#ff9500', '#5ac8fa'].forEach((c, i) => { g.fillStyle = c; rr(g, s * 0.16, s * (0.24 + i * 0.08), s * 0.68, s * 0.3, s * 0.05); g.fill(); });
    g.fillStyle = '#2c2c2e'; rr(g, s * 0.12, s * 0.52, s * 0.76, s * 0.3, s * 0.07); g.fill();
  },
  stocks(g, s) {
    bg(g, s, '#1c1c1e', '#000000');
    g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = s * 0.01;
    for (const y of [0.3, 0.5, 0.7]) { g.beginPath(); g.moveTo(s * 0.12, s * y); g.lineTo(s * 0.88, s * y); g.stroke(); }
    g.strokeStyle = '#30d158'; g.lineWidth = s * 0.045; g.lineJoin = 'round'; g.lineCap = 'round'; g.beginPath();
    [[0.14, 0.72], [0.3, 0.62], [0.42, 0.66], [0.56, 0.46], [0.68, 0.5], [0.86, 0.26]].forEach(([x, y], i) => i ? g.lineTo(s * x, s * y) : g.moveTo(s * x, s * y));
    g.stroke();
  },
  calculator(g, s) {
    bg(g, s, '#2c2c2e', '#1c1c1e');
    [['#a5a5aa', 0.33, 0.33], ['#ff9f0a', 0.67, 0.33], ['#505055', 0.33, 0.67], ['#ff9f0a', 0.67, 0.67]].forEach(([c, x, y]) => { g.fillStyle = c; g.beginPath(); g.arc(s * x, s * y, s * 0.13, 0, TAU); g.fill(); });
  },
  moatrices(g, s) {
    bg(g, s, '#12805f', '#073d30'); g.fillStyle = '#3ddc97';
    [[0.24, 0.5, 0.28], [0.43, 0.36, 0.42], [0.62, 0.22, 0.56]].forEach(([x, y, h]) => { rr(g, s * x, s * y, s * 0.14, s * h, s * 0.03); g.fill(); });
  },
  books(g, s) {
    bg(g, s, '#ffac33', '#ff7a00'); g.fillStyle = W8;
    g.beginPath(); g.moveTo(s * 0.5, s * 0.36); g.quadraticCurveTo(s * 0.34, s * 0.28, s * 0.16, s * 0.32); g.lineTo(s * 0.16, s * 0.72); g.quadraticCurveTo(s * 0.34, s * 0.68, s * 0.48, s * 0.76); g.fill();
    g.beginPath(); g.moveTo(s * 0.52, s * 0.36); g.quadraticCurveTo(s * 0.66, s * 0.28, s * 0.84, s * 0.32); g.lineTo(s * 0.84, s * 0.72); g.quadraticCurveTo(s * 0.66, s * 0.68, s * 0.52, s * 0.76); g.fill();
  },
  podcasts(g, s) {
    bg(g, s, '#d57bff', '#8b3be3'); g.strokeStyle = W8; g.fillStyle = W8; g.lineCap = 'round';
    for (const [r, w] of [[0.3, 0.045], [0.2, 0.045]]) { g.lineWidth = s * w; g.beginPath(); g.arc(s / 2, s * 0.44, s * r, Math.PI * 0.8, Math.PI * 2.2); g.stroke(); }
    g.beginPath(); g.arc(s / 2, s * 0.44, s * 0.08, 0, TAU); g.fill(); rr(g, s * 0.455, s * 0.55, s * 0.09, s * 0.25, s * 0.045); g.fill();
  },
  home(g, s) {
    bg(g, s, '#ffffff', '#f2f2f5');
    const o = g.createLinearGradient(0, s * 0.2, 0, s * 0.8); o.addColorStop(0, '#ffb340'); o.addColorStop(1, '#ff8a00');
    g.fillStyle = o; g.beginPath(); g.moveTo(s * 0.5, s * 0.2); g.lineTo(s * 0.84, s * 0.5); g.lineTo(s * 0.74, s * 0.5); g.lineTo(s * 0.74, s * 0.8); g.lineTo(s * 0.26, s * 0.8); g.lineTo(s * 0.26, s * 0.5); g.lineTo(s * 0.16, s * 0.5); g.closePath(); g.fill();
    g.fillStyle = W8; rr(g, s * 0.44, s * 0.6, s * 0.12, s * 0.2, s * 0.02); g.fill();
  },
};
function icon(g, name, x, y, s, label) {
  g.save(); g.shadowColor = 'rgba(0,0,0,.18)'; g.shadowBlur = s * 0.12; g.shadowOffsetY = s * 0.03;
  rr(g, x, y, s, s, s * 0.225); g.fillStyle = '#000'; g.fill(); g.restore();
  g.save(); g.translate(x, y); rr(g, 0, 0, s, s, s * 0.225); g.clip(); ICON[name](g, s); g.restore();
  if (label) text(g, label, x + s / 2, y + s + s * 0.27, font(600, s * 0.19), '#fff', 'center');
}
function text(g, t, x, y, f, c, align = 'left', shadow = true) {
  g.save(); g.font = f; g.fillStyle = c; g.textAlign = align;
  if (shadow) { g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = 12; g.shadowOffsetY = 2; g.fillText(t, x, y); g.shadowBlur = 3; g.shadowColor = 'rgba(0,0,0,.35)'; }
  g.fillText(t, x, y); g.restore();
}
function statusBar(g, W, y, sc = 1) {
  text(g, '10:24', 110 * sc, y, font(600, 40 * sc), '#fff');
  const x0 = W - 250 * sc; g.save(); g.fillStyle = '#fff'; g.shadowColor = 'rgba(0,0,0,.3)'; g.shadowBlur = 6;
  [10, 16, 22, 28].forEach((h, i) => { rr(g, x0 + i * 13 * sc, y - h * sc, 9 * sc, h * sc, 2 * sc); g.fill(); });
  g.strokeStyle = '#fff'; g.lineWidth = 5 * sc; g.lineCap = 'round';
  for (const r of [9, 19, 29]) { g.beginPath(); g.arc(x0 + 92 * sc, y + 2 * sc, r * sc, Math.PI * 1.25, Math.PI * 1.75); g.stroke(); }
  g.lineWidth = 3 * sc; rr(g, x0 + 140 * sc, y - 26 * sc, 64 * sc, 30 * sc, 9 * sc); g.globalAlpha = 0.6; g.stroke(); g.globalAlpha = 1;
  rr(g, x0 + 145 * sc, y - 21 * sc, 44 * sc, 20 * sc, 5 * sc); g.fill();
  rr(g, x0 + 208 * sc, y - 16 * sc, 5 * sc, 10 * sc, 2 * sc); g.globalAlpha = 0.6; g.fill();
  g.restore();
}

/* ================= จอใน (มองแบบแล็ปท็อป: บน = ฝา, ล่าง = ฐาน, รอยพับที่ y = H/2) ================= */
export function innerScreen() {
  const W = 1440, H = 2048, c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  dunes(g, W, H, 0.36);
  // ฟ้าช่วงฝาเข้มลงเล็กน้อย ให้ชื่อแอปสีขาวอ่านออก
  const top = g.createLinearGradient(0, 0, 0, 1000); top.addColorStop(0, 'rgba(34,46,62,.42)'); top.addColorStop(0.6, 'rgba(34,46,62,.16)'); top.addColorStop(1, 'rgba(34,46,62,0)');
  g.fillStyle = top; g.fillRect(0, 0, W, 1000);
  statusBar(g, W, 78);

  const S = 150, M = 118, P = (W - 2 * M - S) / 4, col = i => M + i * P, WS = P + S;
  // วิดเจ็ตสภาพอากาศ
  let x = col(0), y = 150;
  g.save(); g.shadowColor = 'rgba(0,0,0,.18)'; g.shadowBlur = 24; g.shadowOffsetY = 6;
  const wg = g.createLinearGradient(0, y, 0, y + WS); wg.addColorStop(0, '#5d9fe3'); wg.addColorStop(1, '#2e6fc4');
  rr(g, x, y, WS, WS, 52); g.fillStyle = wg; g.fill(); g.restore();
  text(g, 'กรุงเทพฯ', x + 34, y + 68, font(600, 36), '#fff', 'left', false);
  text(g, '32°', x + 28, y + 196, font(300, 128), '#fff', 'left', false);
  g.save(); g.fillStyle = '#ffd43b'; g.beginPath(); g.arc(x + 62, y + 262, 22, 0, TAU); g.fill();
  g.fillStyle = '#fff'; g.beginPath(); g.arc(x + 76, y + 280, 18, 0, TAU); g.arc(x + 98, y + 272, 22, 0, TAU); g.arc(x + 118, y + 284, 15, 0, TAU); g.fill(); rr(g, x + 60, y + 282, 74, 16, 8); g.fill(); g.restore();
  text(g, 'มีเมฆบางส่วน', x + 34, y + 342, font(600, 30), '#fff', 'left', false);
  text(g, 'สูง:34°  ต่ำ:26°', x + 34, y + 384, font(500, 28), 'rgba(255,255,255,.9)', 'left', false);
  text(g, 'สภาพอากาศ', x + WS / 2, y + WS + 42, font(600, 28), '#fff', 'center');
  // วิดเจ็ตปฏิทิน
  x = col(2);
  g.save(); g.shadowColor = 'rgba(0,0,0,.18)'; g.shadowBlur = 24; g.shadowOffsetY = 6;
  rr(g, x, y, WS, WS, 52); g.fillStyle = '#ffffff'; g.fill(); g.restore();
  text(g, 'เสาร์', x + 34, y + 68, font(600, 34), '#ff3b30', 'left', false);
  text(g, '26', x + 28, y + 196, font(400, 128), '#1c1c1e', 'left', false);
  g.fillStyle = '#34c759'; rr(g, x + 34, y + 244, 8, 96, 4); g.fill();
  text(g, 'เปิดพรีออเดอร์', x + 58, y + 282, font(600, 30), '#1c1c1e', 'left', false);
  text(g, 'iPhone Duo · 16 ต.ค.', x + 58, y + 326, font(500, 26), '#8e8e93', 'left', false);
  text(g, 'ปฏิทิน', x + WS / 2, y + WS + 42, font(600, 28), '#fff', 'center');
  // คอลัมน์ขวา + แถวใต้วิดเจ็ต
  icon(g, 'mail', col(4), y, S, 'เมล');
  icon(g, 'settings', col(4), y + P, S, 'การตั้งค่า');
  ['camera', 'photos', 'maps', 'clock', 'notes'].forEach((n, i) => icon(g, n, col(i), 680, S, ['กล้อง', 'รูปภาพ', 'แผนที่', 'นาฬิกา', 'โน้ต'][i]));
  // ฐาน
  ['health', 'wallet', 'stocks', 'calculator', 'moatrices'].forEach((n, i) => icon(g, n, col(i), 1110, S, ['สุขภาพ', 'Wallet', 'หุ้น', 'เครื่องคิดเลข', 'Moatrices'][i]));
  ['books', 'podcasts', 'home'].forEach((n, i) => icon(g, n, col(i), 1372, S, ['หนังสือ', 'พ็อดคาสท์', 'บ้าน'][i]));
  g.fillStyle = '#fff'; g.beginPath(); g.arc(W / 2 - 14, 1664, 7, 0, TAU); g.fill();
  g.globalAlpha = 0.45; g.beginPath(); g.arc(W / 2 + 14, 1664, 7, 0, TAU); g.fill(); g.globalAlpha = 1;
  // Dock
  rr(g, 70, 1726, W - 140, 256, 72); g.fillStyle = 'rgba(255,255,255,.3)'; g.fill();
  g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 2; g.stroke();
  ['phone', 'safari', 'messages', 'music'].forEach((n, i) => icon(g, n, W / 2 - 1.5 * 300 - S / 2 + i * 300, 1779, S));
  return c;
}

/* ================= จอนอก (แนวตั้ง = หน้าล็อก, รูกล้อง Center Stage ด้านบนกลาง) ================= */
export function outerScreen() {
  const W = 1000, H = 1466, c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  dunes(g, W, H, 0.42);
  const top = g.createLinearGradient(0, 0, 0, H * 0.55); top.addColorStop(0, 'rgba(30,40,54,.45)'); top.addColorStop(1, 'rgba(30,40,54,0)');
  g.fillStyle = top; g.fillRect(0, 0, W, H * 0.55);
  g.fillStyle = '#000'; g.beginPath(); g.arc(W / 2, 64, 26, 0, TAU); g.fill();
  text(g, 'วันเสาร์ที่ 26 กันยายน', W / 2, 250, font(600, 52), '#fff', 'center');
  text(g, '10:24', W / 2, 520, font(600, 290), '#fff', 'center');
  for (const [x, glyph] of [[130, 'torch'], [W - 130, 'cam']]) {
    g.fillStyle = 'rgba(30,34,40,.45)'; g.beginPath(); g.arc(x, H - 150, 62, 0, TAU); g.fill();
    g.strokeStyle = '#fff'; g.fillStyle = '#fff'; g.lineWidth = 7; g.lineJoin = 'round';
    if (glyph === 'torch') { rr(g, x - 13, H - 186, 26, 72, 8); g.stroke(); g.beginPath(); g.arc(x, H - 162, 6, 0, TAU); g.fill(); }
    else { rr(g, x - 30, H - 172, 60, 44, 9); g.stroke(); g.beginPath(); g.arc(x, H - 150, 12, 0, TAU); g.stroke(); }
  }
  rr(g, W / 2 - 90, H - 40, 180, 10, 5); g.fillStyle = 'rgba(255,255,255,.85)'; g.fill();
  return c;
}
