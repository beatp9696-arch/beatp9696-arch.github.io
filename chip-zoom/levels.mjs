// หนึ่งชิป ห้าด่าน — โลก 8 ชั้น ซ้อนกันแบบ "ซูมไม่ตัด"
// แต่ละชั้นสร้างในหน่วยของตัวเอง (unit = เมตรต่อ 1 หน่วย) · จุดกำเนิด (0,0,0) ของชั้น = ตำแหน่งที่ชั้นแม่ชี้ลงมา (focus ของแม่)
// ขนาด/ผังทุกชั้นเป็น "ภาพอธิบาย" — ไม่ใช่ผังจริงของ NVIDIA/TSMC/ASML
import * as THREE from 'three';
import * as T from './textures.mjs';

const BOX = new THREE.BoxGeometry(1, 1, 1);
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _e = new THREE.Euler(), _c = new THREE.Color();

function std(o = {}) {
  const m = new THREE.MeshStandardMaterial({ roughness: .5, metalness: .2, ...o });
  if (o.envMapIntensity == null) m.envMapIntensity = .8;
  return m;
}
const behind = m => { m.polygonOffset = true; m.polygonOffsetFactor = 2; m.polygonOffsetUnits = 4; return m; };

// เก็บกล่องไว้ก่อนแล้วค่อยสร้าง InstancedMesh ครั้งเดียว
class Boxes {
  constructor(mat, geo = BOX) { this.mat = mat; this.geo = geo; this.it = []; }
  add(x0, y0, z0, x1, y1, z1, col = null, ry = 0) {
    this.it.push([(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0), col, ry]);
    return this;
  }
  c(cx, cy, cz, sx, sy, sz, col = null, rx = 0, ry = 0, rz = 0) { this.it.push([cx, cy, cz, sx, sy, sz, col, ry, rx, rz]); return this; }
  build(parent, { cast = true, recv = true } = {}) {
    const n = this.it.length;
    if (!n) return null;
    const im = new THREE.InstancedMesh(this.geo, this.mat, n);
    const colored = this.it.some(i => i[6] != null);
    this.it.forEach((i, k) => {
      _p.set(i[0], i[1], i[2]); _s.set(i[3], i[4], i[5]);
      _q.setFromEuler(_e.set(i[8] || 0, i[7] || 0, i[9] || 0));
      im.setMatrixAt(k, _m.compose(_p, _q, _s));
      if (colored) im.setColorAt(k, _c.set(i[6] ?? '#ffffff'));
    });
    im.castShadow = cast; im.receiveShadow = recv;
    im.computeBoundingSphere();
    parent.add(im);
    return im;
  }
}
// กล่องมุมมน (วางราบ สูงตามแกน y) · uv บนหน้าบนฉายจากด้านบน 0..1
function rbox(w, h, d, r) {
  const sh = new THREE.Shape();
  const x0 = -w / 2, z0 = -d / 2;
  sh.moveTo(x0 + r, z0); sh.lineTo(-x0 - r, z0); sh.quadraticCurveTo(-x0, z0, -x0, z0 + r);
  sh.lineTo(-x0, -z0 - r); sh.quadraticCurveTo(-x0, -z0, -x0 - r, -z0); sh.lineTo(x0 + r, -z0);
  sh.quadraticCurveTo(x0, -z0, x0, -z0 - r); sh.lineTo(x0, z0 + r); sh.quadraticCurveTo(x0, z0, x0 + r, z0);
  const b = Math.min(.12, h * .2);
  const geo = new THREE.ExtrudeGeometry(sh, { depth: h - 2 * b, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 3, curveSegments: 6 });
  geo.rotateX(Math.PI / 2);
  geo.translate(0, h / 2 - b, 0);
  const p = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) + w / 2) / w, 1 - (p.getZ(i) + d / 2) / d);
  geo.computeVertexNormals();
  return geo;
}
function mesh(geo, mat, parent, { cast = true, recv = true } = {}) {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = cast; m.receiveShadow = recv;
  parent?.add(m);
  return m;
}
function slab(parent, mats, x0, y0, z0, x1, y1, z1, o) {
  const m = mesh(BOX, mats, parent, o);
  m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  m.scale.set(x1 - x0, y1 - y0, z1 - z0);
  return m;
}
// กล่องที่ไม่มีช่วงนี้อยู่ข้างใน → แตกเป็นช่วงย่อย (ใช้เจาะรูบนพื้น/แถบ)
function minus(a0, a1, holes) {
  let segs = [[a0, a1]];
  for (const [h0, h1] of holes) {
    const out = [];
    for (const [s0, s1] of segs) {
      if (h1 <= s0 || h0 >= s1) { out.push([s0, s1]); continue; }
      if (h0 > s0) out.push([s0, h0]);
      if (h1 < s1) out.push([h1, s1]);
    }
    segs = out;
  }
  return segs;
}
// พื้นสี่เหลี่ยมที่มีรูสี่เหลี่ยม: คืนรายการสี่เหลี่ยม [x0,z0,x1,z1]
function ringRects(X0, Z0, X1, Z1, h) {
  if (!h) return [[X0, Z0, X1, Z1]];
  const [hx0, hz0, hx1, hz1] = h;
  return [
    [X0, Z0, X1, hz0], [X0, hz1, X1, Z1],
    [X0, hz0, hx0, hz1], [hx1, hz0, X1, hz1],
  ].filter(r => r[2] - r[0] > 1e-9 && r[3] - r[1] > 1e-9);
}

/* ================================================================
   0 · ห้องดาต้าเซ็นเตอร์ (หน่วย: เมตร) — จุดกำเนิด = กลางถาดที่ถูกดึงออกมา
   ================================================================ */
function buildHall() {
  const g = new THREE.Group();
  const FLOOR = -1.1;
  const front = T.rackFront(), frontE = T.rackFront({ emptyU: T.PULLED_U });
  const side = T.rackSide(), back = T.rackBack(), top = T.rackTop();
  const mSide = std({ map: side, roughness: .55, metalness: .45 });
  const mTop = std({ map: top, roughness: .6, metalness: .4 });
  const mFront = std({ map: front.map, emissiveMap: front.emissive, emissive: '#ffffff', emissiveIntensity: 1.6, roughness: .45, metalness: .4 });
  const mFrontE = std({ map: frontE.map, emissiveMap: frontE.emissive, emissive: '#ffffff', emissiveIntensity: 1.6, roughness: .45, metalness: .4 });
  const mBack = std({ map: back, roughness: .55, metalness: .35 });
  const rackMats = [mSide, mSide, mTop, mSide, mFront, mBack];
  const rackMatsE = [mSide, mSide, mTop, mSide, mFrontE, mBack];

  // แถวตู้: [z กลางแถว, หันหน้า +z?]
  const ROWS = [[-6.2, true], [-3.2, false], [-0.8, true], [2.2, false], [4.6, true], [7.6, false], [10.0, true]];
  const NX = 10, RW = 0.6;
  const racks = new Boxes(rackMats), racksE = new Boxes(rackMatsE);
  for (const [zc, fwd] of ROWS) for (let i = -NX; i <= NX; i++) {
    const x = i * RW;
    const tgt = (zc === -0.8 && i === 0) ? racksE : racks;
    tgt.c(x, 0, zc, RW - .012, 2.2, 1.2, null, 0, fwd ? 0 : Math.PI, 0);
  }
  racks.build(g); racksE.build(g);

  // ตู้ CDU หัว-ท้ายแถว (ระบบหล่อเย็น)
  const cduMat = std({ color: '#141b19', roughness: .45, metalness: .5 });
  const cdu = new Boxes(cduMat), cduStripe = new Boxes(std({ color: '#1f8f86', emissive: '#0b3a36', roughness: .4, metalness: .3 }));
  for (const [zc] of ROWS) for (const s of [-1, 1]) {
    const x = s * (NX * RW + .75);
    cdu.c(x, 0, zc, .9, 2.2, 1.2);
    cduStripe.c(x, .75, zc, .92, .05, 1.22);
  }
  cdu.build(g); cduStripe.build(g);

  // พื้น + แผ่นมีรูในทางเดินเย็น
  const floor = mesh(new THREE.PlaneGeometry(64, 64), std({ map: T.floorTex([64 / 2.4, 64 / 2.4]), roughness: .42, metalness: .35 }), g, { cast: false });
  floor.rotation.x = -Math.PI / 2; floor.position.y = FLOOR;
  const perfMat = std({ map: T.perfTile([21, 3]), roughness: .5, metalness: .3 });
  for (const z of [0.7, 7.3 - 1.2, -4.7]) {
    const p = mesh(new THREE.PlaneGeometry(12.6, 1.8), perfMat, g, { cast: false });
    p.rotation.x = -Math.PI / 2; p.position.set(0, FLOOR + .002, z);
  }
  // เส้นขอบทางเดินเรืองแสงจางๆ
  const edge = new Boxes(std({ color: '#0c2a20', emissive: '#3ddc97', emissiveIntensity: .35 }));
  for (const z of [-0.2 + .03, 1.6 - .03, 5.2 + .03, 7.0 - .03, -3.8 - .03, -5.6 + .03]) edge.add(-6.3, FLOOR, z - .015, 6.3, FLOOR + .004, z + .015);
  edge.build(g, { cast: false });

  // เหนือแถวตู้: รางสาย · ท่อน้ำเย็น (ฟ้าอมเขียว) / น้ำร้อนกลับ (อำพัน) · รางไฟ
  const L = (NX * 2 + 1) * RW + 1.8;
  const trayM = std({ color: '#1a2220', roughness: .6, metalness: .6 });
  const cables = [std({ color: '#155445', roughness: .7 }), std({ color: '#1f3149', roughness: .7 }), std({ color: '#2d3237', roughness: .75 })];
  const cold = std({ color: '#1f7d74', roughness: .34, metalness: .5 });
  const hot = std({ color: '#9c6230', roughness: .36, metalness: .5 });
  const busM = std({ color: '#262c2b', roughness: .5, metalness: .6 });
  const tapM = std({ color: '#7a4f28', roughness: .5, metalness: .4 });
  const pipeG = new THREE.CylinderGeometry(1, 1, 1, 18);
  const trays = new Boxes(trayM), bus = new Boxes(busM), taps = new Boxes(tapM);
  const cabI = cables.map(m => new Boxes(m, pipeG));
  const pipeC = new Boxes(cold, pipeG), pipeH = new Boxes(hot, pipeG);
  for (const [zc] of ROWS) {
    trays.add(-L / 2, 1.42, zc - .22, L / 2, 1.47, zc + .22);
    trays.add(-L / 2, 1.47, zc - .22, L / 2, 1.56, zc - .2);
    trays.add(-L / 2, 1.47, zc + .2, L / 2, 1.56, zc + .22);
    cabI.forEach((b, k) => b.c(0, 1.515, zc + (k - 1) * .12, .045, L - .1, .045, null, 0, 0, Math.PI / 2));
    pipeC.c(0, 1.8, zc - .14, .042, L, .042, null, 0, 0, Math.PI / 2);
    pipeH.c(0, 1.8, zc + .14, .042, L, .042, null, 0, 0, Math.PI / 2);
    bus.add(-L / 2, 2.05, zc - .09, L / 2, 2.17, zc + .09);
    for (let i = -NX; i <= NX; i++) {
      const x = i * RW;
      if (i % 2 === 0) taps.c(x, 1.98, zc, .22, .14, .16);
    }
  }
  trays.build(g); bus.build(g); taps.build(g); cabI.forEach(b => b.build(g)); pipeC.build(g); pipeH.build(g);

  // แสงบนพื้นใต้ถาดที่ถูกดึงออกมา (บอกตาว่าจะซูมไปตรงไหน)
  {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const x = c.getContext('2d');
    const gr = x.createRadialGradient(128, 128, 0, 128, 128, 128);
    gr.addColorStop(0, 'rgba(61,220,151,.55)'); gr.addColorStop(.45, 'rgba(61,220,151,.16)'); gr.addColorStop(1, 'rgba(61,220,151,0)');
    x.fillStyle = gr; x.fillRect(0, 0, 256, 256);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const glow = mesh(new THREE.PlaneGeometry(2.4, 2.4), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }), g, { cast: false, recv: false });
    glow.rotation.x = -Math.PI / 2; glow.position.set(0, FLOOR + .004, 0.25);
  }

  // เสาโครงสร้าง
  const col = new Boxes(std({ color: '#1b2120', roughness: .8, metalness: .1 }));
  for (const z of [-2.0, 3.4, 8.8, -7.4]) for (const x of [-8.4, 8.4]) col.add(x - .3, FLOOR, z - .3, x + .3, 4.2, z + .3);
  col.build(g);

  return {
    key: 'hall', unit: 1, group: g, focus: [0, 0, 0],
    show: [Infinity, 0.15],
    labels: [
      { p: [0, 1.15, -0.8], text: 'ตู้ GB200 NVL72', sub: 'GPU 72 · CPU 36 ต่อตู้', show: [40, 2.2] },
      { p: [0.2, 0.05, 0.4], text: 'ถาดที่ดึงออกมา', sub: '1 ใน 18 ถาดคอมพิวต์', show: [9, 1.3] },
      { p: [3.6, 1.78, -0.64], text: 'ท่อน้ำเย็น → น้ำร้อนกลับ', sub: 'ระบายความร้อนด้วยของเหลว', show: [40, 3] },
    ],
  };
}

/* ================================================================
   1 · ถาดคอมพิวต์ (หน่วย: ซม.) — จุดกำเนิด = กลางถาด ระดับพื้นถาด
   ================================================================ */
function buildTray() {
  const g = new THREE.Group();
  const steel = std({ color: '#7d8785', roughness: .38, metalness: .78 });
  const steelDark = std({ color: '#454d4b', roughness: .45, metalness: .7 });
  const pcbMats = [std({ color: '#0f1d17', roughness: .7 }), std({ color: '#0f1d17', roughness: .7 }),
    std({ map: T.pcb(), roughness: .62, metalness: .15 }), std({ color: '#0f1d17' }), std({ color: '#0f1d17' }), std({ color: '#0f1d17' })];
  const fp = T.frontPanel();
  const frontMats = [steelDark, steelDark, steelDark, steelDark, std({ map: fp, roughness: .5, metalness: .5 }), steelDark];

  // ตัวถาด (ถอดฝาบน)
  slab(g, steel, -22, -0.3, -40, 22, 0, 40);
  slab(g, steel, -22, 0, -40, -21.6, 4.2, 40);
  slab(g, steel, 21.6, 0, -40, 22, 4.2, 40);
  slab(g, steel, -21.6, 0, -40, 21.6, 4.2, -39.6);
  slab(g, frontMats, -22, -0.3, 39.2, 22, 4.2, 40);
  // รางเลื่อน
  const rail = new Boxes(steelDark);
  for (const s of [-1, 1]) rail.add(s * 22, 1.2, -60, s * 22.9, 2.6, 36);
  rail.build(g);

  // บอร์ด 2 แผ่น (Grace + Blackwell ×2 ต่อแผ่น)
  const BT = 0.76;
  slab(g, pcbMats, -21, 0.6, -30, -0.6, BT, 26);
  slab(g, pcbMats, 0.6, 0.6, -30, 21, BT, 26);

  const GPU = [[11, 6], [11, -12], [-11, 6], [-11, -12]];
  const CPU = [[11, -24.5], [-11, -24.5]];

  // ชิ้นส่วนบนบอร์ด
  const ind = new Boxes(std({ color: '#2a2e31', roughness: .55, metalness: .4 }));
  const capG = new THREE.CylinderGeometry(1, 1, 1, 12);
  const caps = new Boxes(std({ color: '#3b4046', roughness: .35, metalness: .7 }), capG);
  const chips = new Boxes(std({ color: '#15181b', roughness: .45, metalness: .3 }));
  const conn = new Boxes(std({ color: '#26292d', roughness: .6, metalness: .3 }));
  const pins = new Boxes(std({ color: '#c48a52', roughness: .3, metalness: .9 }));
  for (const [gx, gz] of GPU) {
    for (const s of [-1, 1]) for (let k = 0; k < 9; k++) {
      ind.c(gx + s * 5.1, BT + .3, gz - 3.4 + k * .85, .62, .6, .62);
      caps.c(gx + s * 6.0, BT + .3, gz - 3.3 + k * .85, .18, .6, .18);
    }
  }
  for (const [cx, cz] of CPU) {
    for (let k = 0; k < 4; k++) for (const s of [-1, 1]) chips.c(cx + s * 3.9, BT + .08, cz - 2.1 + k * 1.4, 1.4, .16, 1.1);
    for (let k = 0; k < 6; k++) ind.c(cx - 2.5 + k * 1, BT + .3, cz + 3.7, .62, .6, .62);
  }
  for (const s of [-1, 1]) {
    conn.c(s * 6, BT + .8, -28.6, 8, 1.6, 1.5); pins.c(s * 6, BT + 1.62, -28.6, 7.6, .06, .5);
    conn.c(s * 16, BT + .8, -28.6, 7, 1.6, 1.5); pins.c(s * 16, BT + 1.62, -28.6, 6.6, .06, .5);
  }
  // การ์ดเครือข่าย/DPU ด้านหน้า
  const nic = new Boxes(std({ color: '#0e2019', roughness: .6 }));
  const fin = new Boxes(std({ color: '#9aa4a2', roughness: .35, metalness: .85 }));
  for (const x0 of [-20, -9.5, 1, 11.5]) {
    nic.add(x0, 1.2, 28, x0 + 8.8, 1.36, 38.6);
    for (let k = 0; k < 16; k++) fin.add(x0 + 1.2 + k * .42, 1.36, 30, x0 + 1.36 + k * .42, 2.8, 36.5);
  }
  ind.build(g); caps.build(g); chips.build(g); conn.build(g); pins.build(g); nic.build(g); fin.build(g);

  // แผ่นระบายความร้อน (ทองแดงชุบนิกเกิล ผิวกลึง) + ท่อ
  const copper = std({ map: T.coldPlate(), color: '#ffffff', roughness: .28, metalness: .9, envMapIntensity: 1.2 });
  const gpuPlate = rbox(8.2, 1.3, 7.6, .45), cpuPlate = rbox(5.6, 1.3, 5.6, .4);
  const plateG = new Boxes(copper, gpuPlate), plateC = new Boxes(copper, cpuPlate);
  const fitG = new THREE.CylinderGeometry(1, 1, 1, 16);
  const fitC = new Boxes(std({ color: '#2bb3a3', roughness: .3, metalness: .6 }), fitG);
  const fitH = new Boxes(std({ color: '#d9893a', roughness: .3, metalness: .6 }), fitG);
  const hoseM = std({ color: '#1a211f', roughness: .45, metalness: .2 });
  for (const [gx, gz] of [...GPU.slice(1), ...CPU]) {
    const isCPU = CPU.some(c => c[0] === gx && c[1] === gz);
    (isCPU ? plateC : plateG).c(gx, BT + 1.05, gz, 1, 1, 1);
    fitC.c(gx - 1.6, BT + 2.1, gz - 1.5, .5, .9, .5);
    fitH.c(gx + 1.6, BT + 2.1, gz - 1.5, .5, .9, .5);
    for (const [dx, mz] of [[-1.6, -37.2], [1.6, -35.6]]) {
      const a = new THREE.Vector3(gx + dx, BT + 2.5, gz - 1.5);
      const b = new THREE.Vector3(gx * .8 + dx * 1.6, BT + 2.9, gz - 5);
      const c = new THREE.Vector3(gx * .55 + dx * 2.2, BT + 2.9, (gz + mz) / 2);
      const d = new THREE.Vector3(gx * .45 + dx * 2, 3.4, mz);
      mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([a, b, c, d]), 40, .28, 10), hoseM, g);
    }
  }
  plateG.build(g); plateC.build(g); fitC.build(g); fitH.build(g);
  // แมนิโฟลด์ท้ายถาด
  slab(g, steelDark, -20, 0.1, -38.8, 20, 3.0, -34.2);
  const man = new Boxes(std({ color: '#2bb3a3', roughness: .3, metalness: .6 }), fitG), manH = new Boxes(std({ color: '#d9893a', roughness: .3, metalness: .6 }), fitG);
  man.c(0, 3.4, -37.2, .7, 39, .7, null, 0, 0, Math.PI / 2); manH.c(0, 3.4, -35.6, .7, 39, .7, null, 0, 0, Math.PI / 2);
  man.build(g); manH.build(g);

  // แผ่นระบายความร้อนของ GPU ตัวที่เราจะซูม — ยกขึ้นแล้วจางหาย
  const lidMat = std({ map: T.coldPlate(), color: '#ffffff', roughness: .28, metalness: .9, envMapIntensity: 1.2, transparent: true });
  const lid = new THREE.Group();
  mesh(gpuPlate, lidMat, lid);
  const qdM = std({ color: '#2bb3a3', roughness: .3, metalness: .6, transparent: true });
  const qdH = std({ color: '#d9893a', roughness: .3, metalness: .6, transparent: true });
  const q1 = mesh(fitG, qdM, lid); q1.scale.set(.5, .9, .5); q1.position.set(-1.6, 1.05, -1.5);
  const q2 = mesh(fitG, qdH, lid); q2.scale.set(.5, .9, .5); q2.position.set(1.6, 1.05, -1.5);
  lid.position.set(11, BT + 1.05, 6);
  g.add(lid);
  const lidMats = [lidMat, qdM, qdH];

  return {
    key: 'tray', unit: 0.01, group: g, focus: [11, BT, 6],
    show: [Infinity, 0.02],
    move: [0.5, 0.09],
    labels: [
      { p: [-11, 3.2, -24.5], text: 'CPU Grace', sub: '', show: [1.1, 0.18] },
      { p: [-11, 3.2, 6], text: 'GPU Blackwell', sub: 'ใต้แผ่นน้ำเย็น', show: [1.1, 0.18] },
      { p: [11, 9, 6], text: 'ยกแผ่นระบายความร้อนออก', sub: '', show: [0.42, 0.14] },
    ],
    update(S) {
      // ยก 0 → 5.5 ซม. ระหว่าง S 1.4 → 0.4 ม. แล้วจางระหว่าง 0.3 → 0.12 ม.
      const lift = smooth(Math.log10(1.4), Math.log10(0.4), Math.log10(S));
      lid.position.y = BT + 1.05 + lift * 5.5;
      lid.rotation.z = lift * -0.06;
      const op = 1 - smooth(Math.log10(0.3), Math.log10(0.12), Math.log10(S));
      for (const m of lidMats) { m.opacity = op; m.depthWrite = op > .98; }
      lid.visible = op > .01;
    },
  };
}
let DIE_TEX = null;
const dieTex = () => DIE_TEX || (DIE_TEX = T.dieTexture({ size: 2048 }));
export function smooth(a, b, x) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/* ================================================================
   2 · แพ็กเกจ GPU (หน่วย: มม.) — จุดกำเนิด = กลางแพ็กเกจ ใต้ซับสเตรต
   ================================================================ */
function buildPackage() {
  const g = new THREE.Group();
  const subMats = std({ map: T.substrate(), roughness: .6, metalness: .15 });
  const edgeM = std({ color: '#1b2a23', roughness: .7 });
  slab(g, [edgeM, edgeM, subMats, edgeM, edgeM, edgeM], -38, 0, -35, 38, 1.8, 35);
  // วงแหวนเสริมแรง
  const ring = new Boxes(std({ color: '#a7afac', roughness: .32, metalness: .9 }));
  ring.add(-38, 1.8, -35, 38, 3.0, -32.6).add(-38, 1.8, 32.6, 38, 3.0, 35).add(-38, 1.8, -32.6, -35.6, 3.0, 32.6).add(35.6, 1.8, -32.6, 38, 3.0, 32.6);
  ring.build(g);
  // แผ่นรองซิลิคอน (interposer)
  const chanTex = T.blockTexture('chan', { size: 512, repeat: [18, 16], seed: 9 });
  const inter = std({ map: chanTex, color: '#9fb0b8', roughness: .28, metalness: .7 });
  const siSide = std({ color: '#20272c', roughness: .3, metalness: .6 });
  slab(g, [siSide, siSide, inter, siSide, siSide, siSide], -27.6, 1.8, -26, 27.6, 2.6, 26);
  // ไดฝั่งซ้าย (ภาพเดียวกับไดขวา กลับด้าน)
  const dtL = dieTex().clone(); dtL.wrapS = THREE.RepeatWrapping; dtL.repeat.x = -1; dtL.offset.x = 1; dtL.needsUpdate = true;
  const dieTop = std({ map: dtL, roughness: .32, metalness: .55 });
  slab(g, [siSide, siSide, dieTop, siSide, siSide, siSide], -26.3, 2.65, -15, -0.3, 3.4, 15);
  // HBM 8 กอง (ไดซ้อน 12 ชั้น + ไดฐาน)
  const lay = new Boxes(std({ roughness: .4, metalness: .45 }));
  const hTop = std({ map: T.hbmTop(), roughness: .25, metalness: .6, envMapIntensity: 1.2 });
  const hbmTops = new Boxes(hTop);
  const HBM = [];
  for (const xd of [-13.3, 13.3]) for (const [x0, x1] of [[xd - 12, xd - 1], [xd + 1, xd + 12]]) for (const [z0, z1] of [[-24.9, -15.6], [15.6, 24.9]]) HBM.push([x0, z0, x1, z1]);
  for (const [x0, z0, x1, z1] of HBM) {
    let y = 2.65;
    for (let k = 0; k < 13; k++) {
      const h = k === 0 ? .1 : .05;
      lay.add(x0, y, z0, x1, y + h - .004, z1, k % 2 ? '#2b3038' : '#1c2027');
      lay.add(x0 + .02, y + h - .004, z0 + .02, x1 - .02, y + h, z1 - .02, '#0a0c0f');
      y += h;
    }
    hbmTops.add(x0, y, z0, x1, y + .001, z1);
  }
  lay.build(g); hbmTops.build(g);
  // ตัวเก็บประจุรอบๆ
  const capM = std({ roughness: .4, metalness: .55 });
  const capB = new Boxes(capM);
  const r = T.rng(77);
  // แถวตัวเก็บประจุเรียบร้อยรอบแผ่นรองซิลิคอน
  for (let row = 0; row < 3; row++) {
    const off = 29.2 + row * 1.5;
    for (let x = -32; x <= 32.01; x += 1.25) for (const s of [-1, 1]) if (r() < .92) capB.c(x, 2.05, s * (off - 1.4), 1.0, .5, .5, row === 1 ? '#7b6c52' : '#8e7d5c');
    for (let z = -26; z <= 26.01; z += 1.25) for (const s of [-1, 1]) if (r() < .92) capB.c(s * (off + 1.6), 2.05, z, .5, .5, 1.0, row === 1 ? '#7b6c52' : '#8e7d5c');
  }
  // บล็อกตัวเก็บประจุใหญ่ที่มุม
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) capB.c(sx * (33.8 - a * 1.4), 2.1, sz * (30.4 - b * 1.4), 1.1, .6, 1.1, '#5f666b');
  capB.build(g);
  return {
    key: 'package', unit: 0.001, group: g, focus: [13.3, 3.4, 0],
    show: [12, 0.004],
    move: [0.075, 0.034],
    labels: [
      { p: [-19, 3.45, -20.2], text: 'HBM ×8', sub: 'หน่วยความจำซ้อน 12 ชั้น', show: [0.2, 0.045] },
      { p: [0, 3.45, 0], text: 'ได 2 ชิ้น · ลิงก์ 10 TB/s', sub: '208,000 ล้านทรานซิสเตอร์', show: [0.2, 0.05] },
      { p: [-24, 2.6, 23], text: 'แผ่นรองซิลิคอน (CoWoS)', sub: 'TSMC ประกอบบนผืนเดียว', show: [0.15, 0.05] },
    ],
  };
}

/* ================================================================
   3 · ได 1 ชิ้น (หน่วย: มม.) — จุดกำเนิด = กลางได ผิวบน
   ================================================================ */
const SMC = T.smCenters();
const FSM = SMC.find(s => s.i === T.FOCUS_SM.i && s.j === T.FOCUS_SM.j && s.half === T.FOCUS_SM.half);
const REGION = { x0: FSM.x - 1.5 * T.SMG.px, x1: FSM.x + 1.5 * T.SMG.px, z0: FSM.z - 1.5 * T.SMG.pz, z1: FSM.z + 1.5 * T.SMG.pz };
const BAR_Z = { x0: -12.9, pitch: 0.6, w: 0.022, y0: 0.006, y1: 0.0085 };   // แถบไฟเลี้ยงชั้นบนสุด (วิ่งตามแกน z)
const BAR_X = { z0: -14.1, pitch: 0.8, w: 0.02, y0: 0.010, y1: 0.012 };   // (วิ่งตามแกน x)

function buildDie() {
  const g = new THREE.Group();
  const siSide = std({ color: '#1c2226', roughness: .3, metalness: .6 });
  const top = behind(std({ map: dieTex(), roughness: .34, metalness: .5 }));
  slab(g, [siSide, siSide, top, siSide, siSide, siSide], -13, -0.75, -15, 13, 0, 15);
  // วงแหวนซีลรอบได
  const seal = new Boxes(std({ color: '#c9d2cf', roughness: .25, metalness: .95 }));
  seal.add(-13, 0, -15, 13, .004, -14.94).add(-13, 0, 14.94, 13, .004, 15).add(-13, 0, -14.94, -12.94, .004, 14.94).add(12.94, 0, -14.94, 13, .004, 14.94);
  seal.build(g);
  // แถบไฟเลี้ยงชั้นบน (ทองแดง) — เว้นบริเวณ 3×3 SM ที่ระดับถัดไปวาดเอง
  const cu = std({ color: '#9c6a44', roughness: .36, metalness: .9 });
  const bars = new Boxes(cu);
  for (let x = BAR_Z.x0; x <= 12.95; x += BAR_Z.pitch) {
    const inR = x > REGION.x0 && x < REGION.x1;
    for (const [z0, z1] of inR ? minus(-14.9, 14.9, [[REGION.z0, REGION.z1]]) : [[-14.9, 14.9]]) bars.add(x - BAR_Z.w / 2, BAR_Z.y0, z0, x + BAR_Z.w / 2, BAR_Z.y1, z1);
  }
  bars.build(g, { cast: false });
  return {
    key: 'die', unit: 0.001, group: g, focus: [FSM.x, 0, FSM.z],
    show: [5, 0.0004],
    move: [0.028, 0.006],
    labels: [
      { p: [0, 0.01, 0], text: 'L2 cache', sub: 'หน่วยความจำ SRAM บนชิป', show: [0.045, 0.012] },
      { p: [-10.3, 0.01, 10.2], text: 'SM ×80 ต่อได', sub: 'ภาพอธิบาย ไม่ใช่ผังจริง', show: [0.045, 0.012] },
      { p: [-12.65, 0.01, -9], text: 'ขอบต่อไดคู่', sub: '10 TB/s', show: [0.04, 0.014] },
    ],
  };
}

/* ================================================================
   4 · SM 3×3 หน่วย (หน่วย: µm) — จุดกำเนิด = กลาง SM ที่โฟกัส ระดับผิวซิลิคอน
   ================================================================ */
const PIT = 12;                    // ครึ่งความกว้างหลุมที่ขุดลงไปใน Tensor Core
function buildSM() {
  const g = new THREE.Group();
  const side = std({ color: '#141a1b', roughness: .45, metalness: .5 });
  const chan = behind(std({ map: T.blockTexture('chan', { size: 1024, repeat: [40, 30], seed: 13 }), roughness: .4, metalness: .6 }));
  const W = 1.5 * T.SMG.px * 1000, D = 1.5 * T.SMG.pz * 1000;
  const hx = T.TC_FOCUS.x, hz = T.TC_FOCUS.z;
  for (const [x0, z0, x1, z1] of ringRects(-W, -D, W, D, [hx - PIT, hz - PIT, hx + PIT, hz + PIT])) slab(g, [side, side, chan, side, side, side], x0, -8, z0, x1, 0, z1);
  const kinds = ['sram', 'tensor', 'logic', 'ctrl'];
  const mats = {}, sets = {};
  const seeds = { sram: 3, tensor: 4, logic: 5, ctrl: 6 };
  for (const k of kinds) {
    const topM = behind(std({ map: T.blockTexture(k, { size: k === 'tensor' ? 2048 : 1024, seed: seeds[k] }), roughness: .36, metalness: .5 }));
    const sm = behind(std({ color: T.SILICON[k].base, roughness: .5, metalness: .4 }));
    mats[k] = [sm, sm, topM, sm, sm, sm];
    sets[k] = new Boxes(mats[k]);
  }
  for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) {
    const ox = di * T.SMG.px * 1000, oz = dj * T.SMG.pz * 1000;
    for (const [x0, z0, x1, z1, kind, h, name, part] of T.SM_BLOCKS) {
      const focusBlock = di === 0 && dj === 0 && name === 'tc' && part === 2;
      // บล็อกใหญ่แบ่งเป็นแบงก์ย่อยให้มีมิติ
      const nx = kind === 'sram' ? Math.max(2, Math.round((x1 - x0) / 170)) : kind === 'tensor' ? 2 : 1;
      const nz = kind === 'tensor' ? 2 : 1;
      const bw = (x1 - x0) / nx, bd = (z1 - z0) / nz, gap = kind === 'logic' || kind === 'ctrl' ? 0 : 8;
      for (let a = 0; a < nx; a++) for (let b = 0; b < nz; b++) {
        const X0 = ox + x0 + a * bw + (a ? gap / 2 : 0), X1 = ox + x0 + (a + 1) * bw - (a < nx - 1 ? gap / 2 : 0);
        const Z0 = oz + z0 + b * bd + (b ? gap / 2 : 0), Z1 = oz + z0 + (b + 1) * bd - (b < nz - 1 ? gap / 2 : 0);
        const hole = focusBlock ? [T.TC_FOCUS.x - PIT, T.TC_FOCUS.z - PIT, T.TC_FOCUS.x + PIT, T.TC_FOCUS.z + PIT] : null;
        const inHole = hole && X0 < hole[2] && X1 > hole[0] && Z0 < hole[3] && Z1 > hole[1];
        for (const [a0, b0, a1, b1] of inHole ? ringRects(X0, Z0, X1, Z1, hole) : [[X0, Z0, X1, Z1]]) sets[kind].add(a0, 0, b0, a1, h, b1);
      }
    }
  }
  for (const k of kinds) sets[k].build(g);
  // แถบไฟเลี้ยงชั้นบนสุด ต่อเนื่องจากระดับได
  const cu = std({ color: '#9c6a44', roughness: .36, metalness: .9 });
  const bars = new Boxes(cu);
  for (let x = BAR_Z.x0; x <= 12.95; x += BAR_Z.pitch) {
    if (!(x > REGION.x0 && x < REGION.x1)) continue;
    const X = (x - FSM.x) * 1000;
    bars.add(X - BAR_Z.w * 500, BAR_Z.y0 * 1000, -D, X + BAR_Z.w * 500, BAR_Z.y1 * 1000, D);
  }
  bars.build(g, { cast: false });
  return {
    key: 'sm', unit: 1e-6, group: g, focus: [T.TC_FOCUS.x, 0, T.TC_FOCUS.z],
    show: [0.6, 1.5e-6],
    move: [0.0045, 0.0003],
    labels: [
      { p: [-1050, 4.2, -300], text: 'Tensor Core', sub: 'คูณเมทริกซ์ให้ AI', show: [0.009, 0.0016] },
      { p: [-1050, 3, -870], text: 'Register file', sub: 'SRAM', show: [0.009, 0.0016] },
      { p: [-420, 3.4, 770], text: 'L1 / Shared memory', sub: '', show: [0.009, 0.0016] },
      { p: [T.TC_FOCUS.x, 4.4, T.TC_FOCUS.z], text: 'ขุดลงไปตรงนี้', sub: '', show: [0.0012, 0.00008] },
    ],
  };
}

/* ================================================================
   5 · เซลล์ + สายทองแดงหลายชั้น (หน่วย: µm) — จุดกำเนิด = เซลล์ NAND2 ที่ก้นหลุม ระดับผิวซิลิคอน
   ================================================================ */
// ชั้นโลหะ: y บนพื้นฉนวน, ความหนา, ความกว้างเส้น, ระยะห่าง, ทิศ, ขอบในของขั้นบันได
const METAL = [
  { n: 'M1', y: .26, t: .05, w: .02, p: .04, dir: 'x', r: .7 },
  { n: 'M2', y: .48, t: .07, w: .022, p: .044, dir: 'z', r: 1.1 },
  { n: 'M3', y: .8, t: .1, w: .03, p: .064, dir: 'x', r: 1.9 },
  { n: 'M4', y: 1.25, t: .15, w: .04, p: .08, dir: 'z', r: 2.9 },
  { n: 'M5', y: 1.8, t: .22, w: .06, p: .128, dir: 'x', r: 4.2 },
  { n: 'M6', y: 2.5, t: .35, w: .16, p: .36, dir: 'z', r: 6.0 },
  { n: 'M7', y: 3.3, t: .5, w: .8, p: 2.0, dir: 'x', r: 8.5 },
];
const TOP = 4.2;                   // ผิวบนของ Tensor Core = ขอบหลุม
const FOCUS_CELL = { x0: -0.4, x1: 0.6, z0: -0.3, z1: 0.3 };   // ช่องที่ระดับทรานซิสเตอร์วาดเอง (+ร่องด้านหน้า)
function wallTexture(yTop) {
  const c = document.createElement('canvas'); c.width = 64; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#10181a'; g.fillRect(0, 0, 64, 256);
  const Y = y => 256 - (y / yTop) * 256;
  for (const L of METAL) {
    if (L.y + L.t > yTop + 1e-6) continue;
    g.fillStyle = '#1b2a2c'; g.fillRect(0, Y(L.y), 64, 2);
    g.fillStyle = '#b8794a';
    const pw = Math.max(2, 64 * L.w / Math.max(L.p * 3, .2));
    for (let x = 2; x < 64; x += pw * 2.2) g.fillRect(x, Y(L.y + L.t), pw, Math.max(1.5, (L.t / yTop) * 256));
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function buildCells() {
  const g = new THREE.Group();
  const r = T.rng(101);
  const diel = std({ color: '#0f1719', roughness: .22, metalness: .35, envMapIntensity: 1.2 });
  const floorM = std({ color: '#1a2322', roughness: .5, metalness: .3 });

  // ขั้นบันไดฉนวน: ขั้น k กินวงแหวน [r_k, r_{k+1}] สูงถึงผิวชั้นโลหะ k
  const edges = [...METAL.map(m => m.r), PIT];
  METAL.forEach((L, k) => {
    const ri = L.r, ro = edges[k + 1];
    const wt = wallTexture(L.y);
    const wall = std({ map: wt, roughness: .45, metalness: .35 });
    const mats = [wall, wall, diel, diel, wall, wall];
    for (const [x0, z0, x1, z1] of ringRects(-ro, -ro, ro, ro, [-ri, -ri, ri, ri])) slab(g, mats, x0, 0, z0, x1, L.y, z1);
  });
  // ขอบหลุมชั้นบนสุด (M7 → ผิว Tensor Core) — ผนังเท่านั้น
  {
    const wall = std({ map: wallTexture(TOP), roughness: .45, metalness: .35 });
    const mats = [wall, wall, diel, diel, wall, wall];
    const t = .02;
    for (const [x0, z0, x1, z1] of ringRects(-PIT, -PIT, PIT, PIT, [-PIT + t, -PIT + t, PIT - t, PIT - t])) slab(g, mats, x0, 0, z0, x1, TOP - .001, z1);
  }

  // เส้นโลหะบนแต่ละขั้น (ตัดเป็นท่อนสุ่ม มีเส้นเว้น)
  const cu = std({ color: '#c48150', roughness: .26, metalness: .95, envMapIntensity: 1.2 });
  const cuHi = std({ color: '#d99a62', roughness: .22, metalness: .95, envMapIntensity: 1.2 });
  const via = new Boxes(std({ color: '#c9ccd0', roughness: .3, metalness: .9 }));
  METAL.forEach((L, k) => {
    const set = new Boxes(k >= 5 ? cuHi : cu);
    const ri = L.r, ro = edges[k + 1] + (k < METAL.length - 1 ? .02 : 0);
    const along = L.dir === 'x';
    for (let c = -ro + L.p / 2; c < ro; c += L.p) {
      if (r() < .1) continue;
      const spans = Math.abs(c) >= ri ? [[-ro, ro]] : [[-ro, -ri], [ri, ro]];
      for (const [s0, s1] of spans) {
        let a = s0;
        while (a < s1) {
          const len = (.6 + r() * 3.2) * L.p * 6, gap = (r() < .6 ? .3 : 1.6) * L.p * 2;
          const b = Math.min(s1, a + len);
          if (b - a > L.p) {
            if (along) set.add(a, L.y, c - L.w / 2, b, L.y + L.t, c + L.w / 2);
            else set.add(c - L.w / 2, L.y, a, c + L.w / 2, L.y + L.t, b);
            if (r() < .35 && k > 0) {
              const v = L.w * .9, vx = along ? a + v : c, vz = along ? c : a + v;
              via.c(vx, L.y + L.t + .004, vz, v, .008, v);
            }
          }
          a = b + gap;
        }
      }
    }
    set.build(g);
  });
  via.build(g, { cast: false });

  // พื้นก้นหลุม (ผิวซิลิคอน) — เว้นช่องให้ระดับทรานซิสเตอร์
  const FR = 1.35;
  for (const [x0, z0, x1, z1] of ringRects(-FR, -FR, FR, FR, [FOCUS_CELL.x0, FOCUS_CELL.z0, FOCUS_CELL.x1, FOCUS_CELL.z1])) slab(g, floorM, x0, -0.3, z0, x1, 0, z1);

  // แถวเซลล์มาตรฐาน: สูง 0.2 µm, เกตห่าง 0.05 µm (CPP)
  const cellCols = ['#3b4d63', '#2f5a52', '#5a4a33', '#43405e', '#2e4f5f'];
  const cellB = new Boxes(std({ roughness: .5, metalness: .25 }));
  const gate = new Boxes(std({ color: '#b9c2c9', roughness: .3, metalness: .75 }));
  const rail = new Boxes(std({ color: '#c9cfd4', roughness: .28, metalness: .9 }));
  const ctc = new Boxes(std({ color: '#d7b184', roughness: .3, metalness: .9 }));
  const inFocus = (x0, x1, z0, z1) => x1 > FOCUS_CELL.x0 && x0 < FOCUS_CELL.x1 && z1 > FOCUS_CELL.z0 && z0 < FOCUS_CELL.z1;
  for (let z0 = -1.3; z0 < 1.3 - 1e-6; z0 += 0.2) {
    const z1 = z0 + 0.2;
    for (const [a0, a1] of minus(-FR, FR, [])) {
      let x = a0;
      while (x < a1 - .1) {
        const w = Math.min(a1 - x, .05 * (3 + Math.floor(r() * 12)));
        const cx0 = x, cx1 = x + w;
        x += w;
        const segs = z0 < FOCUS_CELL.z1 && z1 > FOCUS_CELL.z0 ? minus(cx0, cx1, [[FOCUS_CELL.x0, FOCUS_CELL.x1]]) : [[cx0, cx1]];
        for (const [s0, s1] of segs) {
          if (s1 - s0 < .02) continue;
          cellB.add(s0 + .004, 0, z0 + .016, s1 - .004, .04, z1 - .016, cellCols[Math.floor(r() * cellCols.length)]);
          for (let gx = Math.ceil((s0 - .025) / .05) * .05 + .025; gx < s1 - .01; gx += .05) gate.add(gx - .008, .04, z0 + .03, gx + .008, .1, z1 - .03);
          if (r() < .8) ctc.add(s0 + .02, .1, z0 + .08, s0 + .034, .14, z0 + .12);
        }
      }
    }
    for (const [s0, s1] of z0 + .2 > FOCUS_CELL.z0 && z0 + .2 < FOCUS_CELL.z1 ? minus(-FR, FR, [[FOCUS_CELL.x0, FOCUS_CELL.x1]]) : [[-FR, FR]]) rail.add(s0, .1, z1 - .014, s1, .135, z1 + .014);
  }
  cellB.build(g); gate.build(g); rail.build(g); ctc.build(g);

  return {
    key: 'cells', unit: 1e-6, group: g, focus: [0, 0, 0],
    show: [0.1, 8e-8],
    labels: [
      { p: [-7.2, 3.8, 0], text: 'M7 · ไฟเลี้ยง', sub: 'ชั้นบนหนาและห่าง', show: [4.2e-5, 5e-6] },
      { p: [-3.4, 1.4, 0], text: 'M4', sub: '', show: [1.6e-5, 3e-6] },
      { p: [-1.5, .55, 0], text: 'M2', sub: 'เส้นห่างกัน 44 nm', show: [9e-6, 1.6e-6] },
      { p: [0.1, .16, -0.14], text: 'เซลล์ NAND 2 ขา', sub: 'ทรานซิสเตอร์ 4 ตัว', show: [5e-6, 6e-7] },
    ],
  };
}

/* ================================================================
   6 · FinFET (หน่วย: nm) — จุดกำเนิด = กลางเซลล์ NAND2 ระดับผิว STI · ผ่าตัดขวางที่ x = 23.8
   ================================================================ */
export const CUT = 23.8;
function buildTransistor() {
  const g = new THREE.Group();
  const X0 = -400, Z0 = -300, Z1 = 300;
  const si = std({ color: '#56677a', roughness: .45, metalness: .3 });
  const siCut = std({ color: '#9db8d6', roughness: .4, metalness: .25 });
  const sti = std({ color: '#1b3440', roughness: .3, metalness: .15, envMapIntensity: 1 });
  const metalG = std({ color: '#b0904f', roughness: .32, metalness: .85, envMapIntensity: 1.1 });
  const hk = std({ color: '#8a74c9', roughness: .4, metalness: .15 });
  const spacer = std({ color: '#71879a', roughness: .38, metalness: .15 });
  const cap = std({ color: '#a3adb6', roughness: .5, metalness: .05 });
  const tung = std({ color: '#aeb6bd', roughness: .25, metalness: .95 });
  const m0 = std({ color: '#c98553', roughness: .25, metalness: .95, envMapIntensity: 1.2 });

  // พื้นผิวซิลิคอน + ร่องด้านหน้าให้เห็นหน้าตัด
  slab(g, si, X0, -220, Z0, CUT, -60, Z1);
  slab(g, si, CUT, -240, Z0, 600, -220, Z1);            // ก้นร่อง

  // ตำแหน่งครีบ: 3 แถว สลับทิศ (VDD/VSS ใช้ร่วมกัน)
  const FINS = [];
  for (const [zc, flip] of [[-200, true], [0, false], [200, true]]) {
    const vdd = flip ? zc + 100 : zc - 100, dir = flip ? -1 : 1;
    for (const d of [36, 64]) FINS.push({ z: vdd + dir * d, p: true });
    for (const d of [36, 64]) FINS.push({ z: (flip ? zc - 100 : zc + 100) - dir * d, p: false });
  }
  FINS.sort((a, b) => a.z - b.z);
  const FW = 6, FT = 50, HK = 2.4;
  const finB = new Boxes(siCut);
  for (const f of FINS) finB.add(X0, -60, f.z - FW / 2, CUT, FT, f.z + FW / 2);
  finB.build(g);
  // STI ระหว่างครีบ
  const stiB = new Boxes(sti);
  for (const [a, b] of minus(Z0, Z1, FINS.map(f => [f.z - FW / 2, f.z + FW / 2]))) stiB.add(X0, -60, a, CUT, 0, b);
  stiB.build(g);

  // เกต: x = 25 + 50k (ผ่าเกตสุดท้ายตรงกลาง)
  const gates = [];
  for (let k = -8; k <= 0; k++) gates.push(25 + 50 * k);
  const GL = 16, GH = 72, SPW = 6, CAPH = 18;
  const gm = new Boxes(metalG), hkB = new Boxes(hk), spB = new Boxes(spacer), capB = new Boxes(cap);
  const finHoles = FINS.map(f => [f.z - FW / 2 - HK, f.z + FW / 2 + HK]);
  for (const xg of gates) {
    const x0 = xg - GL / 2, x1 = Math.min(CUT, xg + GL / 2);
    for (const [zc] of [[-200], [0], [200]]) {
      const za = zc - 100 + 8, zb = zc + 100 - 8;
      // ชั้นฉนวน high-k บนผิว STI ระหว่างครีบ + โลหะเกตเหนือขึ้นไป
      for (const [a, b] of minus(za, zb, finHoles)) {
        hkB.add(x0, 0, a, x1, HK, b);
        gm.add(x0, HK, a, x1, GH, b);
      }
      for (const f of FINS) {
        if (f.z < za || f.z > zb) continue;
        const L0 = f.z - FW / 2, R0 = f.z + FW / 2;
        hkB.add(x0, 0, L0 - HK, x1, FT + HK, L0);
        hkB.add(x0, 0, R0, x1, FT + HK, R0 + HK);
        hkB.add(x0, FT, L0 - HK, x1, FT + HK, R0 + HK);
        gm.add(x0, FT + HK, L0 - HK, x1, GH, R0 + HK);
      }
      capB.add(x0, GH, za, x1, GH + CAPH, zb);
      spB.add(x0 - SPW, 0, za, x0, GH + CAPH, zb);
      if (xg + GL / 2 + SPW <= CUT) spB.add(xg + GL / 2, 0, za, xg + GL / 2 + SPW, GH + CAPH, zb);
    }
  }
  gm.build(g); hkB.build(g); spB.build(g); capB.build(g);

  // ซอร์ส/เดรน (epi) รูปเพชรบนครีบ ระหว่างเกต
  const hexS = new THREE.Shape();
  [[0, 22], [9.5, 36], [11, 50], [0, 64], [-11, 50], [-9.5, 36]].forEach(([z, y], i) => i ? hexS.lineTo(z, y) : hexS.moveTo(z, y));
  const epiL = 50 - GL - 2 * SPW - 2;
  const epiG = new THREE.ExtrudeGeometry(hexS, { depth: epiL, bevelEnabled: true, bevelThickness: 1.2, bevelSize: 1.2, bevelSegments: 2 });
  epiG.rotateY(Math.PI / 2);   // ความยาวไปตามแกน x
  const epi = new Boxes(std({ roughness: .38, metalness: .25 }), epiG);
  const ct = new Boxes(tung);
  for (let k = 0; k < gates.length - 1; k++) {
    const xa = gates[k] + GL / 2 + SPW + 1;
    for (const f of FINS) epi.c(xa, 0, f.z, 1, 1, 1, f.p ? '#d49a45' : '#3fb6a4');
    for (const zc of [-200, 0, 200]) for (const pz of [-1, 1]) {
      if (T.rng(k * 7 + zc + pz * 3 + 999)() < .3) continue;
      const pairs = FINS.filter(f => Math.abs(f.z - (zc + pz * 50)) < 30);
      if (!pairs.length) continue;
      const zmin = Math.min(...pairs.map(f => f.z)) - 10, zmax = Math.max(...pairs.map(f => f.z)) + 10;
      ct.add(xa + epiL / 2 - 6, 58, zmin, xa + epiL / 2 + 6, 112, zmax);
    }
  }
  epi.build(g); ct.build(g);
  // จุดต่อเกต + เส้น M0 + รางไฟ
  const m0B = new Boxes(m0), rails = new Boxes(m0);
  for (const xg of gates) if (xg < CUT - 10) for (const zc of [-200, 0, 200]) if ((xg + zc) % 100 === 25 || xg === -25) ct.add(xg - 5, GH + CAPH, zc - 6, xg + 5, 124, zc + 6);
  const rr = T.rng(303);
  for (const zc of [-200, 0, 200]) {
    for (const dz of [-54, -27, 0, 27, 54]) {
      let a = X0;
      while (a < CUT) {
        const b = Math.min(CUT, a + 40 + rr() * 170);
        if (b - a > 20) m0B.add(a, 124, zc + dz - 7, b, 142, zc + dz + 7);
        a = b + 18 + rr() * 30;
      }
    }
  }
  for (const zb of [-300, -100, 100, 300]) rails.add(X0, 124, zb - 13, CUT, 146, zb + 13);
  m0B.build(g); rails.build(g);

  // ไม้บรรทัด: ความยาวคลื่นแสง EUV 13.5 nm
  const euv = new THREE.Group();
  const glow = new THREE.MeshBasicMaterial({ color: '#c3a4ff' });
  const bar = mesh(BOX, glow, euv, { cast: false, recv: false }); bar.scale.set(1.4, 1.4, 13.5);
  for (const s of [-1, 1]) { const tick = mesh(BOX, glow, euv, { cast: false, recv: false }); tick.scale.set(1.4, 7, 1.4); tick.position.z = s * 6.75; }
  euv.position.set(CUT + 7, 60, 36);
  g.add(euv);

  return {
    key: 'transistor', unit: 1e-9, group: g, focus: [CUT + 1.1, 40, 36],
    show: [1e-3, 0],
    move: [2.6e-7, 3.5e-8],
    labels: [
      { p: [CUT + 7, 64, 43], text: 'EUV λ = 13.5 nm', sub: 'ไม้บรรทัดของ ASML', show: [6e-7, 4e-8], tone: 'violet' },
      { p: [CUT, 58, -8], text: 'เกต (gate)', sub: 'โลหะคร่อมครีบ 3 ด้าน', show: [9e-7, 5e-8] },
      { p: [CUT, 20, -36], text: 'ครีบซิลิคอน (fin)', sub: 'กว้าง 6 nm', show: [7e-7, 5e-8] },
      { p: [-100, 150, 0], text: 'สาย M0', sub: '', show: [9e-7, 1.2e-7] },
    ],
  };
}

/* ================================================================
   7 · อะตอม (หน่วย: Å) — จุดกำเนิด = หน้าตัดครีบ ใต้ยอดครีบ 10 nm
   ================================================================ */
const ATOM_VS = `
attribute vec3 iPos; attribute float iRad; attribute vec3 iCol;
varying vec2 vUv; varying vec3 vCol; varying vec3 vC; varying float vR;
void main(){
  vec4 c = modelViewMatrix * vec4(iPos, 1.0);
  float r = iRad * length(modelMatrix[0].xyz);
  vUv = position.xy * 1.08; vCol = iCol; vC = c.xyz; vR = r;
  gl_Position = projectionMatrix * vec4(c.xyz + vec3(position.xy * r * 1.08, r), 1.0);
}`;
const ATOM_FS = `
uniform mat4 projectionMatrix;
uniform vec3 uLight; uniform vec3 fogColor; uniform float fogNear; uniform float fogFar;
varying vec2 vUv; varying vec3 vCol; varying vec3 vC; varying float vR;
void main(){
  float d2 = dot(vUv, vUv);
  if (d2 > 1.0) discard;
  vec3 n = vec3(vUv, sqrt(1.0 - d2));
  vec3 pos = vC + n * vR;
  vec4 clip = projectionMatrix * vec4(pos, 1.0);
  gl_FragDepth = clip.z / clip.w * 0.5 + 0.5;
  float dif = max(dot(n, uLight), 0.0);
  vec3 h = normalize(uLight + vec3(0.0, 0.0, 1.0));
  float sp = pow(max(dot(n, h), 0.0), 36.0);
  float rim = pow(1.0 - n.z, 2.5);
  vec3 col = vCol * (0.22 + 0.9 * dif) + vec3(sp * 0.45) + rim * 0.18 * vec3(0.55, 0.85, 1.0);
  float f = smoothstep(fogNear, fogFar, -pos.z);
  gl_FragColor = vec4(mix(col, fogColor, f), 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;
export const atomUniforms = {
  uLight: { value: new THREE.Vector3(.35, .7, .62).normalize() },
  fogColor: { value: new THREE.Color() }, fogNear: { value: 10 }, fogFar: { value: 100 },
};
function atomCloud(atoms) {
  const n = atoms.length;
  const geo = new THREE.InstancedBufferGeometry();
  const q = new THREE.PlaneGeometry(2, 2);
  geo.index = q.index; geo.setAttribute('position', q.getAttribute('position'));
  const P = new Float32Array(n * 3), R = new Float32Array(n), C = new Float32Array(n * 3);
  atoms.forEach((a, i) => {
    P.set([a.x, a.y, a.z], i * 3); R[i] = a.r;
    _c.set(a.c); C.set([_c.r, _c.g, _c.b], i * 3);
  });
  geo.setAttribute('iPos', new THREE.InstancedBufferAttribute(P, 3));
  geo.setAttribute('iRad', new THREE.InstancedBufferAttribute(R, 1));
  geo.setAttribute('iCol', new THREE.InstancedBufferAttribute(C, 3));
  geo.instanceCount = n;
  const mat = new THREE.ShaderMaterial({ vertexShader: ATOM_VS, fragmentShader: ATOM_FS, uniforms: atomUniforms });
  const m = new THREE.Mesh(geo, mat);
  m.frustumCulled = false;
  return m;
}
function buildAtoms() {
  const g = new THREE.Group();
  const A = 5.431;                         // ค่าคงที่แลตทิซซิลิคอน (Å)
  const BOND = A * Math.sqrt(3) / 4;       // 2.35 Å
  const FWh = 30, FTOP = 100, YB = -95, XD = -10.9;
  const OX = 8, HF = 16;                   // ออกไซด์ชั้นกั้น / HfO₂ (Å)
  const atoms = [], si = [];
  const basis = [[0, 0, 0], [0, .5, .5], [.5, 0, .5], [.5, .5, 0]];
  const rot = Math.PI / 4, cr = Math.cos(rot), sr = Math.sin(rot);
  const N = 20;
  for (let i = -N; i <= N; i++) for (let j = -N; j <= N * 1.4; j++) for (let k = -N; k <= N; k++) for (const b of basis) for (const o of [0, .25]) {
    const u = (i + b[0] + o) * A, v = (j + b[1] + o) * A, w = (k + b[2] + o) * A;
    // หมุนรอบแกน y ให้แนวครีบ = [110]
    const x = u * cr - w * sr, z = u * sr + w * cr, y = v - 3;
    if (x > 0.2 || x < XD || Math.abs(z) > FWh || y > FTOP || y < YB) continue;
    si.push(new THREE.Vector3(x, y, z));
  }
  for (const p of si) atoms.push({ x: p.x, y: p.y, z: p.z, r: .62, c: p.x > -1.6 ? '#b9c7d6' : '#8c9bab' });
  // พันธะ Si–Si
  const bonds = new Boxes(std({ color: '#7f8d9c', roughness: .4, metalness: .5 }), new THREE.CylinderGeometry(1, 1, 1, 7, 1, true));
  const grid = new Map(), key = (x, y, z) => `${Math.floor(x / 3)},${Math.floor(y / 3)},${Math.floor(z / 3)}`;
  si.forEach((p, i) => { const k = key(p.x, p.y, p.z); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(i); });
  const up = new THREE.Vector3(0, 1, 0), dv = new THREE.Vector3();
  si.forEach((p, i) => {
    const [gx, gy, gz] = [Math.floor(p.x / 3), Math.floor(p.y / 3), Math.floor(p.z / 3)];
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let c = -1; c <= 1; c++) {
      for (const j of grid.get(`${gx + a},${gy + b},${gz + c}`) || []) {
        if (j <= i) continue;
        const q = si[j];
        const d = p.distanceTo(q);
        if (Math.abs(d - BOND) > .12) continue;
        dv.subVectors(q, p).normalize();
        _q.setFromUnitVectors(up, dv);
        _e.setFromQuaternion(_q);
        bonds.c((p.x + q.x) / 2, (p.y + q.y) / 2, (p.z + q.z) / 2, .16, d, .16, null, _e.x, _e.y, _e.z);
      }
    }
  });
  bonds.build(g, { cast: false, recv: false });

  // ชั้นอสัณฐาน: SiO₂ บาง → HfO₂ (ฉนวนเกต) ห่อครีบ 3 ด้าน
  const rr = T.rng(505);
  const shellDist = (y, z) => {           // ระยะออกจากผิวครีบ (<0 = ในครีบ)
    const dz = Math.abs(z) - FWh, dy = y - FTOP;
    if (dy <= 0) return dz;
    if (dz <= 0) return dy;
    return Math.hypot(dz, dy);
  };
  const S = 2.05;
  for (let y = YB; y < FTOP + OX + HF + 2; y += S) for (let z = -(FWh + OX + HF + 2); z < FWh + OX + HF + 2; z += S) for (let x = XD; x < 0; x += S) {
    const jy = y + (rr() - .5) * 1.3, jz = z + (rr() - .5) * 1.3, jx = x + (rr() - .5) * 1.3;
    const d = shellDist(jy, jz);
    if (d < .9 || d > OX + HF) continue;
    if (jx > 0.3 || jx < XD) continue;
    if (d < OX) { if (rr() < .52) atoms.push({ x: jx, y: jy, z: jz, r: rr() < .34 ? .6 : .5, c: rr() < .34 ? '#9fb0c2' : '#e2735e' }); }
    else { if (rr() < .62) { const hf = rr() < .34; atoms.push({ x: jx, y: jy, z: jz, r: hf ? .86 : .5, c: hf ? '#d9b35a' : '#e2735e' }); } }
  }
  g.add(atomCloud(atoms));
  return {
    key: 'atoms', unit: 1e-10, group: g, focus: [0, 0, 0],
    show: [1.5e-7, 0],
    labels: [
      { p: [0.4, 8, -14], text: 'ผลึกซิลิคอน', sub: 'อะตอมห่างกัน 0.235 nm', show: [3e-8, 1e-9] },
      { p: [0.4, 22, FWh + 14], text: 'ฉนวนเกต HfO₂', sub: 'หนาไม่กี่ชั้นอะตอม', show: [3e-8, 1e-9], tone: 'gold' },
    ],
  };
}

export function buildLevels() {
  return [buildHall(), buildTray(), buildPackage(), buildDie(), buildSM(), buildCells(), buildTransistor(), buildAtoms()];
}
