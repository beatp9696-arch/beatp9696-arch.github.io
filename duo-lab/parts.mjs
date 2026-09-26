// ชิ้นส่วน 3D เสริมของ iPhone Duo — ภายนอก (กล้องหลัง ปุ่ม) + บานพับแยกชิ้น + ชิ้นส่วนภายใน + ชิป
// ชนิดชิ้นส่วนมาจาก Apple ส่วนรูปทรง/ตำแหน่งภายในเป็นภาพอธิบาย (ยังไม่มีการแกะเครื่องจริง)
// พิกัด: หน่วยฉาก = MM ต่อ มม. · ครึ่งฐาน: X = s, Y = -d (ความลึกจากผิวจอ), Z = z · ครึ่งฝา: แกน X วิ่งจากบานพับไปขอบฝา
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/RoundedBoxGeometry.js';

const TAU = Math.PI * 2;

function rrShape(w, h, r) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}
// แผ่นวางราบระนาบ XZ (กว้าง w ตาม X, ยาว len ตาม Z) หนาลงไปทาง -Y
function slab(w, len, thick, r, bevel = 0) {
  const g = new THREE.ExtrudeGeometry(rrShape(w, len, r), {
    depth: Math.max(1e-4, thick - 2 * bevel), bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel,
    bevelSegments: 3, curveSegments: 18,
  });
  g.translate(0, 0, bevel); g.rotateX(Math.PI / 2);
  return g;
}
function gearGeo(ro, ri, teeth, thick) {
  const s = new THREE.Shape();
  for (let i = 0; i < teeth * 4; i++) {
    const a = i / (teeth * 4) * TAU, r = (i % 4 < 2) ? ro : ri;
    i ? s.lineTo(Math.cos(a) * r, Math.sin(a) * r) : s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  const hole = new THREE.Path(); hole.absarc(0, 0, ri * 0.35, 0, TAU, true); s.holes.push(hole);
  const g = new THREE.ExtrudeGeometry(s, { depth: thick, bevelEnabled: false, curveSegments: 8 });
  g.translate(0, 0, -thick / 2);
  return g;
}
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}
const mat = o => new THREE.MeshPhysicalMaterial(o);

/* ================= วัสดุ ================= */
export function materials() {
  return {
    tiBlast: mat({ color: 0xc8c2b6, metalness: 1, roughness: 0.62 }),
    steel: mat({ color: 0x9aa0a6, metalness: 1, roughness: 0.3 }),
    steelDark: mat({ color: 0x5d636a, metalness: 1, roughness: 0.38 }),
    carbon: mat({ color: 0x2c3036, metalness: 0.5, roughness: 0.45, clearcoat: 0.4 }),
    magnet: mat({ color: 0x7b8087, metalness: 1, roughness: 0.28 }),
    copper: mat({ color: 0xc98552, metalness: 1, roughness: 0.28 }),
    pcb: mat({ color: 0x163a31, metalness: 0.1, roughness: 0.55, clearcoat: 0.5 }),
    chip: mat({ color: 0x16181b, metalness: 0.35, roughness: 0.32 }),
    chipLid: mat({ color: 0xb9bcc0, metalness: 1, roughness: 0.25 }),
    lensGlass: mat({ color: 0x07090d, metalness: 0, roughness: 0.04, clearcoat: 1, clearcoatRoughness: 0.02 }),
    lensInner: mat({ color: 0x1a2440, metalness: 0.2, roughness: 0.1, clearcoat: 1, emissive: 0x0b1633, emissiveIntensity: 0.6 }),
    plateau: mat({ color: 0xe4e0d8, metalness: 0, roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.15 }),
    sapphire: mat({ color: 0x3a3f46, metalness: 0.2, roughness: 0.08, clearcoat: 1 }),
    battery: mat({ color: 0xffffff, metalness: 0.25, roughness: 0.62,
      map: canvasTex(512, 768, (g, w, h) => {
        const l = g.createLinearGradient(0, 0, w, h); l.addColorStop(0, '#3a3f45'); l.addColorStop(1, '#23272c');
        g.fillStyle = l; g.fillRect(0, 0, w, h);
        g.strokeStyle = 'rgba(255,255,255,.08)'; g.lineWidth = 6; g.strokeRect(18, 18, w - 36, h - 36);
        g.fillStyle = 'rgba(255,255,255,.07)'; g.fillRect(w * 0.3, 40, w * 0.4, 26);
      }) }),
    coil: mat({ color: 0xffffff, metalness: 0.8, roughness: 0.35,
      map: canvasTex(512, 512, (g, w) => {
        g.fillStyle = '#1b1e22'; g.fillRect(0, 0, w, w);
        g.strokeStyle = '#c98552'; g.lineWidth = 7;
        for (let r = 60; r < 236; r += 13) { g.beginPath(); g.arc(w / 2, w / 2, r, 0, TAU); g.stroke(); }
        g.strokeStyle = '#5d636a'; g.lineWidth = 14; g.beginPath(); g.arc(w / 2, w / 2, 246, 0, TAU); g.stroke();
      }) }),
  };
}

/* ================= ภายนอก: กล้องหลัง + ปุ่ม ================= */
export function buildExterior({ W, H, T, MM, mTi }) {
  const M = materials(), base = new THREE.Group(), out = { base, mats: M };
  // แท่นกล้อง (หลังครึ่งฐาน มุมบนฝั่งขอบนอก) — เลนส์ใหญ่ 2 ตัวเรียงแนวนอนตามภาพข่าว Apple
  const pc = { s: -W / 2 + 22, z: H / 2 - 15 };
  const plate = new THREE.Mesh(slab(36 * MM, 19 * MM, 1.3 * MM, 9.5 * MM, 0.35 * MM), M.plateau);
  plate.position.set(pc.s * MM, -T * MM, pc.z * MM); base.add(plate);
  const lenses = new THREE.Group(); lenses.position.copy(plate.position); base.add(lenses);
  for (const ds of [-8.6, 8.6]) {
    const g = new THREE.Group(); g.position.set(ds * MM, -1.3 * MM, 0);
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(7 * MM, 7.2 * MM, 1.2 * MM, 48), mTi); ring.position.y = -0.6 * MM;
    const glass = new THREE.Mesh(new THREE.CylinderGeometry(6.1 * MM, 6.1 * MM, 1.25 * MM, 48), M.lensGlass); glass.position.y = -0.6 * MM;
    const inner = new THREE.Mesh(new THREE.CircleGeometry(3.3 * MM, 40), M.lensInner); inner.rotation.x = Math.PI / 2; inner.position.y = -1.24 * MM;
    g.add(ring, glass, inner); lenses.add(g);
  }
  const flash = new THREE.Mesh(new THREE.CylinderGeometry(1.6 * MM, 1.6 * MM, 0.2 * MM, 24), mat({ color: 0xf3ead2, roughness: 0.3, emissive: 0x2a2416 }));
  flash.position.set(pc.s * MM, -T * MM - 1.35 * MM, (pc.z + 6.4) * MM); base.add(flash);
  out.plateau = plate; out.lenses = lenses;
  // ปุ่ม: ขอบนอกครึ่งฐาน (s = -W/2) — ปุ่มข้าง Touch ID + Camera Control, ขอบบน (z = +H/2) — ปุ่มเสียง
  const btn = (len, m) => new THREE.Mesh(new RoundedBoxGeometry(0.9 * MM, 2.3 * MM, len * MM, 3, 0.4 * MM), m);
  out.btnTouch = btn(17, mTi); out.btnTouch.position.set((-W / 2 - 0.35) * MM, -T / 2 * MM, 26 * MM);
  const ring = new THREE.Mesh(new RoundedBoxGeometry(0.2 * MM, 1.5 * MM, 14.5 * MM, 2, 0.1 * MM), mat({ color: 0x9bc7b5, metalness: 1, roughness: 0.25 }));
  ring.position.x = -0.46 * MM; out.btnTouch.add(ring);
  out.btnCam = btn(11, M.sapphire); out.btnCam.position.set((-W / 2 - 0.35) * MM, -T / 2 * MM, -22 * MM);
  out.btnVol = new THREE.Group();
  for (const s of [-58, -42]) { const b = new THREE.Mesh(new RoundedBoxGeometry(12 * MM, 2.3 * MM, 0.9 * MM, 3, 0.4 * MM), mTi); b.position.set(s * MM, -T / 2 * MM, (H / 2 + 0.35) * MM); out.btnVol.add(b); }
  base.add(out.btnTouch, out.btnCam, out.btnVol);
  return out;
}

/* ================= บานพับแยกชิ้น (บท 03) ================= */
// ทุกชิ้นมี userData.explode = { dir, dist(มม.) } → lab.mjs เลื่อนตาม state.explode
export function buildHinge({ W, H, T, MM, SP, M }) {
  const base = new THREE.Group(), lid = new THREE.Group(), all = [];
  const ex = (o, dist, dir = new THREE.Vector3(0, -1, 0)) => { o.userData.rest = o.position.clone(); o.userData.explode = { dir, dist }; all.push(o); return o; };
  // ฝาครอบพิมพ์ 3D
  const cover = new THREE.Mesh(slab((2 * SP + 3.4) * MM, (H - 7) * MM, 1.7 * MM, 1.4 * MM, 0.3 * MM), M.tiBlast);
  cover.position.set(0, -(T - 1.7) * MM, 0); base.add(ex(cover, 24));
  // กลไก: โมดูลเฟืองคู่ + แผ่นเชื่อม เรียงตามแนวบานพับ
  const links = new THREE.Group(); links.position.set(0, -(T / 2 + 0.2) * MM, 0);
  const gear = gearGeo(1.7 * MM, 1.35 * MM, 12, 2.6 * MM), bridge = new RoundedBoxGeometry(7.2 * MM, 0.55 * MM, 3.4 * MM, 2, 0.2 * MM);
  const pin = new THREE.CylinderGeometry(0.35 * MM, 0.35 * MM, 3.6 * MM, 12);
  const N = 9;
  for (let i = 0; i < N; i++) {
    const z = (-H / 2 + 12 + i * (H - 24) / (N - 1)) * MM, g = new THREE.Group(); g.position.z = z;
    for (const s of [-1.75, 1.75]) {
      const ge = new THREE.Mesh(gear, i % 2 ? M.steel : M.steelDark); ge.position.x = s * MM; ge.rotation.z = s > 0 ? 0.13 : 0; g.add(ge);
      const p = new THREE.Mesh(pin, M.steel); p.rotation.x = Math.PI / 2; p.position.x = s * MM; g.add(p);
    }
    const br = new THREE.Mesh(bridge, M.steelDark); br.position.y = 1.9 * MM; g.add(br);
    links.add(g);
  }
  base.add(ex(links, 15));
  // ส่วนรองกลางจอ (แผ่นบางสองแผ่นข้างแนวพับ)
  const support = new THREE.Group(); support.position.set(0, -1.1 * MM, 0);
  for (const s of [-5.2, 5.2]) { const p = new THREE.Mesh(slab(8.6 * MM, (H - 12) * MM, 0.45 * MM, 1 * MM), M.carbon); p.position.x = s * MM; support.add(p); }
  base.add(ex(support, 7.5));
  // แม่เหล็กเรียงแถวใกล้ขอบนอกทั้งสองซีก
  const magGeo = new RoundedBoxGeometry(3 * MM, 1.4 * MM, 9 * MM, 2, 0.3 * MM);
  const magnets = [];
  for (const side of [base, lid]) {
    const g = new THREE.Group();
    for (let i = 0; i < 6; i++) { const m = new THREE.Mesh(magGeo, M.magnet); m.position.z = (-40 + i * 16) * MM; g.add(m); }
    // ฐาน: ขอบนอกที่ s = -W/2 · ฝา: ปลายฝา (แกน X ของฝาวิ่งออกจากบานพับ)
    g.position.set(side === base ? (-W / 2 + 5) * MM : (W / 2 - 5) * MM, -(T / 2) * MM, 0);
    side.add(ex(g, 11)); magnets.push(g);
  }
  return { base, lid, all, cover, links, support, magnets };
}

/* ================= ชิ้นส่วนภายใน (บท 05) ================= */
export function buildInside({ W, H, T, MM, M, lensPos }) {
  const base = new THREE.Group(), lid = new THREE.Group(), all = [];
  const ex = (o, dist) => { o.userData.rest = o.position.clone(); o.userData.explode = { dir: new THREE.Vector3(0, -1, 0), dist }; all.push(o); return o; };
  // แบตเตอรี่ข้างละก้อน
  const batGeo = (w, l) => new RoundedBoxGeometry(w * MM, 3.1 * MM, l * MM, 3, 0.5 * MM);
  const batB = new THREE.Mesh(batGeo(46, 98), M.battery); batB.position.set(-31 * MM, -3.0 * MM, -2 * MM); base.add(ex(batB, 5));
  const batL = new THREE.Mesh(batGeo(60, 98), M.battery); batL.position.set(40 * MM, -3.0 * MM, -2 * MM); lid.add(ex(batL, 5));
  // แผงวงจรหลักแนวขอบนอกฐาน + ชิปบนแผง
  const board = new THREE.Group(); board.position.set(-68 * MM, -3.4 * MM, 0);
  const pcb = new THREE.Mesh(new RoundedBoxGeometry(21 * MM, 0.8 * MM, 100 * MM, 2, 0.3 * MM), M.pcb); board.add(pcb);
  const chip = (w, l, h, z, m = M.chip) => { const c = new THREE.Mesh(new RoundedBoxGeometry(w * MM, h * MM, l * MM, 2, Math.min(w, l, h) * 0.2 * MM), m); c.position.set(0, -(0.4 + h / 2) * MM, z * MM); board.add(c); return c; };
  const soc = chip(13, 13, 1.1, 8);
  const c2 = chip(8, 8, 0.8, -14); c2.position.x = -3 * MM;
  const n1 = chip(6, 6, 0.7, -27); n1.position.x = 3.5 * MM;
  const nand = chip(11, 13, 0.9, 30);
  // ชิ้นเล็กประดับแผง
  const tiny = new THREE.InstancedMesh(new THREE.BoxGeometry(1 * MM, 0.5 * MM, 0.6 * MM), M.steelDark, 70);
  const d = new THREE.Object3D(), rnd = (() => { let s = 11; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
  for (let i = 0; i < 70; i++) {
    let z; do { z = (rnd() - 0.5) * 94; } while (Math.abs(z - 8) < 8 || Math.abs(z + 14) < 5.5 || Math.abs(z + 27) < 4.5 || Math.abs(z - 30) < 8);
    d.position.set((rnd() - 0.5) * 17 * MM, -0.65 * MM, z * MM); d.rotation.y = rnd() > 0.5 ? Math.PI / 2 : 0; d.updateMatrix(); tiny.setMatrixAt(i, d.matrix);
  }
  board.add(tiny);
  base.add(ex(board, 9));
  // เวเปอร์แชมเบอร์เหนือชิป
  const vapor = new THREE.Mesh(slab(24 * MM, 64 * MM, 0.55 * MM, 3 * MM), M.copper);
  vapor.position.set(-66 * MM, -4.35 * MM, 12 * MM); base.add(ex(vapor, 15));
  // ขดลวด MagSafe กลางหลังครึ่งฐาน
  const coil = new THREE.Mesh(new THREE.CylinderGeometry(22 * MM, 22 * MM, 0.5 * MM, 72), [M.steelDark, M.coil, M.coil]);
  coil.position.set(-31 * MM, -4.75 * MM, -4 * MM); base.add(ex(coil, 21));
  // โมดูลกล้องใต้แท่นกล้อง
  const cam = new THREE.Group(); cam.position.set(lensPos.s * MM, -3.2 * MM, lensPos.z * MM);
  for (const ds of [-8.6, 8.6]) {
    const body = new THREE.Mesh(new RoundedBoxGeometry(12 * MM, 3.6 * MM, 12 * MM, 3, 1 * MM), M.chip); body.position.x = ds * MM; cam.add(body);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(4.6 * MM, 4.6 * MM, 2.2 * MM, 36), M.steelDark); barrel.position.set(ds * MM, -2.6 * MM, 0); cam.add(barrel);
  }
  base.add(ex(cam, 12));
  return { base, lid, all, batB, batL, board, soc, c2, n1, vapor, coil, cam };
}

/* ================= ชิป A20 Pro (บท 06) — ผังอธิบาย ไม่ใช่ภาพ die จริง ================= */
export function buildChip({ M }) {
  const g = new THREE.Group(), all = [];
  // ฝาชิปกับเวเปอร์แชมเบอร์ยกขึ้นแล้วถอยไปด้านหลัง จะได้ไม่บังผัง die จากมุมกล้อง
  const ex = (o, dist, back) => { o.userData.rest = o.position.clone(); o.userData.explode = { dir: new THREE.Vector3(0, 1, -back).normalize(), dist }; all.push(o); return o; };
  const sub = new THREE.Mesh(new RoundedBoxGeometry(8, 0.36, 7, 3, 0.1), M.pcb); g.add(sub);
  // ขาบัดกรีรอบแพ็กเกจ
  const pads = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.09, 0.09, 0.06, 10), M.copper, 4 * 22);
  const o = new THREE.Object3D(); let k = 0;
  for (let i = 0; i < 22; i++) for (const [x, z] of [[-3.8 + i * 0.362, -3.35], [-3.8 + i * 0.362, 3.35], [-3.85, -3.2 + i * 0.3], [3.85, -3.2 + i * 0.3]]) {
    o.position.set(x, 0.2, z); o.updateMatrix(); pads.setMatrixAt(k++, o.matrix);
  }
  g.add(pads);
  // die พร้อมผังบล็อก (ภาพอธิบาย)
  const dieW = 4.4, dieD = 4.0;
  const BL = {           // บล็อกบน die (หน่วยพิกัด 0–1 บน texture) — ใช้ทั้งวาดและวางป้าย
    super: [0.05, 0.06, 0.40, 0.30], effic: [0.49, 0.06, 0.20, 0.30], gpu: [0.05, 0.42, 0.52, 0.30],
    ane: [0.62, 0.42, 0.33, 0.30], slc: [0.74, 0.06, 0.21, 0.30], io: [0.05, 0.78, 0.90, 0.16],
  };
  const tex = canvasTex(1100, 1000, (c, w, h) => {
    c.fillStyle = '#101418'; c.fillRect(0, 0, w, h);
    c.strokeStyle = 'rgba(255,255,255,.035)'; c.lineWidth = 2;
    for (let x = 0; x < w; x += 22) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); }
    const box = (k, col, cells, label) => {
      const [x, y, bw, bh] = BL[k], X = x * w, Y = y * h, BW = bw * w, BH = bh * h;
      c.fillStyle = col + '22'; c.fillRect(X, Y, BW, BH); c.strokeStyle = col; c.lineWidth = 4; c.strokeRect(X, Y, BW, BH);
      const [cx, cy] = cells; c.lineWidth = 3;
      for (let i = 0; i < cx; i++) for (let j = 0; j < cy; j++) {
        const cw = (BW - 24) / cx, ch = (BH - 56) / cy;
        c.fillStyle = col + '55'; c.fillRect(X + 12 + i * cw + 4, Y + 44 + j * ch + 4, cw - 8, ch - 8);
      }
      c.fillStyle = col; c.font = '600 30px ui-monospace, "IBM Plex Mono", monospace'; c.fillText(label, X + 14, Y + 34);
    };
    box('super', '#ffb454', [2, 1], 'CPU · 2 SUPER');
    box('effic', '#5ee0c1', [2, 2], 'CPU · 4 EFF.');
    box('gpu', '#a78bfa', [7, 1], 'GPU · 7 CORES');
    box('ane', '#3ddc97', [8, 4], 'NEURAL ENGINE ×2');
    box('slc', '#9aa4ad', [1, 3], 'CACHE');
    box('io', '#6b7680', [10, 1], 'MEMORY · I/O');
  });
  const die = new THREE.Mesh(new THREE.BoxGeometry(dieW, 0.14, dieD), [M.chip, M.chip, mat({ map: tex, roughness: 0.35, metalness: 0.2, clearcoat: 0.6 }), M.chip, M.chip, M.chip]);
  die.position.set(-1.2, 0.25, 0); g.add(die);
  // หน่วยความจำข้าง die (ภาพอธิบายแพ็กเกจแบบชิป M)
  const mem = [];
  for (const z of [-1.05, 1.05]) { const m = new THREE.Mesh(new RoundedBoxGeometry(1.8, 0.22, 1.8, 2, 0.05), M.chip); m.position.set(2.35, 0.3, z); g.add(m); mem.push(m); }
  // ฝาครอบ + เวเปอร์แชมเบอร์ด้านบน
  const lidM = new THREE.Mesh(new RoundedBoxGeometry(7.2, 0.14, 6.2, 2, 0.05), M.chipLid); lidM.position.y = 0.52; g.add(ex(lidM, 5.2, 0.95));
  const vc = new THREE.Mesh(new RoundedBoxGeometry(9.6, 0.26, 8.4, 3, 0.1), M.copper); vc.position.y = 0.8; g.add(ex(vc, 9, 1.05));
  // จุดยึดป้าย: ตำแหน่งกลางบล็อกบนผิว die (พิกัดโลกของกลุ่มชิป)
  const at = k => { const [x, y, bw, bh] = BL[k]; return new THREE.Vector3(-1.2 - dieW / 2 + (x + bw / 2) * dieW, 0.33, -dieD / 2 + (y + bh / 2) * dieD); };
  return { g, all, die, mem, lid: lidM, vc, at };
}
