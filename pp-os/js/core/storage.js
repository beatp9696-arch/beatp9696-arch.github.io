// Storage ของ OS — API เหมือนเดิมทุกอย่าง (load/save/remove แบบ sync) แต่ไส้ในเป็น IndexedDB แล้ว
//
// ทำไมต้องย้ายจาก localStorage:
//   1. Safari (ITP) ลบ localStorage ของเว็บที่ไม่ได้เปิดเกิน 7 วันทิ้ง — ข้อมูลสุขภาพ/เงินหายเงียบๆ ได้
//      IndexedDB + navigator.storage.persist() ขอให้เบราว์เซอร์ "อย่าลบ" ได้ (localStorage ขอไม่ได้)
//   2. localStorage เพดาน ~5MB — Apple Health 400 วันชนได้
//
// ทำยังไงให้ API ยัง sync: preload ทุก key เข้า memory cache ตอน boot (initStorage)
// แล้ว save() = เขียน cache ทันที + เขียนลง IndexedDB เบื้องหลัง (write-behind)
// → แอปทุกตัวเรียก load()/save() เหมือนเดิม ไม่ต้องแก้อะไรเลย

const DB_NAME = "pp-os";
const STORE = "kv";
const LS_PREFIX = "pp-os:"; // ของเดิมใน localStorage — migrate ครั้งเดียว แล้วเก็บไว้เป็นสำเนาสำรอง

let db = null; // null = ใช้ localStorage ล้วน (เบราว์เซอร์บล็อก IndexedDB / โหมดส่วนตัวบางตัว)
const cache = new Map();
const pending = new Map(); // key -> value | DELETE
const DELETE = Symbol("delete");
let flushTimer = null;

// ---- sync bookkeeping ----
// จำ "แก้ครั้งล่าสุดเมื่อไหร่" ต่อ key ไว้ทำ merge แบบ last-write-wins ตอน sync ข้ามเครื่อง
// เก็บใน key ระบบ "_syncmeta" (ขึ้นต้น _ → ไม่ติดไปกับ backup และไม่ถูก sync เอง)
const syncMeta = new Map();
const changeListeners = new Set();

// key ที่ควร sync/แปะ timestamp: ข้ามของระบบ (_), cache ที่สร้างใหม่ได้ (.cache) และความลับของ sync (sync.*)
const isSyncable = (k) => !k.startsWith("_") && !k.endsWith(".cache") && !k.startsWith("sync.");

function stampMeta(key) {
  if (!isSyncable(key)) return;
  syncMeta.set(key, Date.now());
  const obj = Object.fromEntries(syncMeta);
  cache.set("_syncmeta", obj);
  queue("_syncmeta", obj);
  for (const cb of changeListeners) {
    try {
      cb(key);
    } catch {}
  }
}

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    setTimeout(() => reject(new Error("indexedDB timeout")), 3000); // กันค้างในโหมดส่วนตัว
  });
}

function readAll() {
  return new Promise((resolve, reject) => {
    const out = new Map();
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).openCursor();
    req.onsuccess = () => {
      const cur = req.result;
      if (!cur) return resolve(out);
      out.set(cur.key, cur.value);
      cur.continue();
    };
    req.onerror = () => reject(req.error);
  });
}

function flush() {
  flushTimer = null;
  if (!db || !pending.size) return;
  const batch = [...pending];
  pending.clear();
  const tx = db.transaction(STORE, "readwrite");
  const store = tx.objectStore(STORE);
  for (const [k, v] of batch) {
    if (v === DELETE) store.delete(k);
    else store.put(v, k);
  }
  tx.onerror = () => {
    // เขียนไม่ผ่าน → คืนเข้าคิวไว้ลองรอบหน้า ดีกว่ากลืนเงียบๆ แล้วข้อมูลหาย
    for (const [k, v] of batch) if (!pending.has(k)) pending.set(k, v);
    console.error("storage: เขียน IndexedDB ไม่สำเร็จ", tx.error);
  };
}

function queue(key, value) {
  if (!db) {
    // fallback: ไม่มี IndexedDB ก็ยังเขียน localStorage ให้เหมือนเดิม
    try {
      if (value === DELETE) localStorage.removeItem(LS_PREFIX + key);
      else localStorage.setItem(LS_PREFIX + key, JSON.stringify(value));
    } catch {}
    return;
  }
  pending.set(key, value);
  flushTimer ??= setTimeout(flush, 0);
}

function legacyEntries() {
  const out = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k?.startsWith(LS_PREFIX)) continue;
    try {
      out.push([k.slice(LS_PREFIX.length), JSON.parse(localStorage.getItem(k))]);
    } catch {}
  }
  return out;
}

/** เรียกครั้งเดียวตอน boot ก่อนแอปเริ่มวาด — หลังจากนี้ load/save เป็น sync ตามปกติ */
export async function initStorage() {
  try {
    db = await openDB();
    for (const [k, v] of await readAll()) cache.set(k, v);
  } catch {
    db = null;
  }

  // ครั้งแรกหลังอัปเกรด: ย้ายของเก่าจาก localStorage เข้ามา (ไม่ลบของเดิม — เก็บไว้เป็นสำเนาสำรอง)
  // เช็คด้วย marker ไม่ใช่ "IDB ว่างไหม" — ถ้ามี key อะไรถูกเขียนไปก่อน (เช่น weather.cache)
  // เงื่อนไข "ว่าง" จะเป็นเท็จ แล้วข้อมูลเก่าไม่ถูกย้ายเลย = ผู้ใช้เปิดมาเจอข้อมูลหายทั้งที่ยังอยู่
  if (db && !cache.has("_migratedAt")) {
    const old = legacyEntries();
    let moved = 0;
    for (const [k, v] of old) {
      if (cache.has(k)) continue; // ของใน IDB ใหม่กว่าเสมอ — ห้ามให้ของเก่าทับ
      cache.set(k, v);
      queue(k, v);
      moved++;
    }
    cache.set("_migratedAt", Date.now());
    queue("_migratedAt", Date.now());
    flush();
    if (moved) console.info(`storage: ย้าย ${moved} key จาก localStorage → IndexedDB`);
  }

  if (!db) {
    for (const [k, v] of legacyEntries()) cache.set(k, v);
  }

  // โหลด timestamp ต่อ key ที่เก็บไว้ กลับเข้า memory (ต้องหลัง cache ครบทั้ง IDB และ fallback)
  const savedMeta = cache.get("_syncmeta");
  if (savedMeta && typeof savedMeta === "object") {
    for (const [k, t] of Object.entries(savedMeta)) syncMeta.set(k, t);
  }

  // ขอให้เบราว์เซอร์อย่าลบข้อมูลนี้ทิ้ง (Safari ให้เมื่อแอปถูกติดตั้งบนหน้าจอโฮม / ถูกใช้บ่อย)
  try {
    await navigator.storage?.persist?.();
  } catch {}
}

export function load(key, fallback = null) {
  return cache.has(key) ? cache.get(key) : fallback;
}

export function save(key, value) {
  cache.set(key, value);
  queue(key, value);
  stampMeta(key);
}

export function remove(key) {
  cache.delete(key);
  queue(key, DELETE);
  stampMeta(key);
}

// ---- backup / restore ----
// key ที่ขึ้นต้นด้วย "_" เป็นของระบบ (snapshot, migratedAt) ไม่ติดไปกับไฟล์ backup

export function dumpAll() {
  const out = {};
  // ข้าม cache ที่สร้างใหม่ได้เอง (พยากรณ์อากาศ) — ไฟล์ backup จะได้ไม่บวม
  // และ restore จะได้ไม่เอาอากาศเมื่อวานของอีกเครื่องมาแปะ
  for (const [k, v] of cache) if (!k.startsWith("_") && !k.endsWith(".cache")) out[k] = v;
  return out;
}

/** ทับข้อมูลทั้งหมดด้วยชุดใหม่ + เก็บ snapshot ของเดิมไว้ให้กดย้อนได้ */
export function replaceAll(data) {
  const snapshot = dumpAll();
  for (const k of [...cache.keys()]) if (!k.startsWith("_")) remove(k);
  for (const [k, v] of Object.entries(data)) save(k, v);
  save("_snapshot", { at: Date.now(), data: snapshot });
  flush();
}

/** ย้อน restore ครั้งล่าสุด */
export function undoRestore() {
  const snap = load("_snapshot");
  if (!snap) return false;
  for (const k of [...cache.keys()]) if (!k.startsWith("_")) remove(k);
  for (const [k, v] of Object.entries(snap.data)) save(k, v);
  remove("_snapshot");
  flush();
  return true;
}

export const hasSnapshot = () => !!load("_snapshot");

// ---- sync API (ใช้โดย js/core/sync.js) ----

/** subscribe การเปลี่ยนข้อมูลผู้ใช้ (เรียก cb(key) ทุกครั้งที่ save/remove key ที่ sync ได้) */
export function onDataChange(cb) {
  changeListeners.add(cb);
  return () => changeListeners.delete(cb);
}

/** ภาพรวมข้อมูลที่ sync ได้ + เวลาที่แก้ล่าสุดต่อ key (ฝั่ง local ตอน merge / payload ส่งขึ้น cloud) */
export function syncSnapshot() {
  const data = {};
  const meta = {};
  for (const [k, v] of cache) {
    if (!isSyncable(k)) continue;
    data[k] = v;
    // baseline 1 = ข้อมูลเก่าก่อนมี sync ให้ push ขึ้น cloud ครั้งแรกได้ แต่แพ้การแก้จริง (now()) เสมอ
    meta[k] = syncMeta.get(k) ?? 1;
  }
  return { data, meta };
}

/** เขียนผล merge ลงเครื่อง — เก็บ snapshot ของเดิมไว้ให้กด Undo ได้ (กัน merge พลาดทำข้อมูลหาย) */
export function applySync(data, meta) {
  save("_snapshot", { at: Date.now(), data: dumpAll(), reason: "sync" });
  for (const [k, v] of Object.entries(data)) {
    if (!isSyncable(k)) continue;
    cache.set(k, v); // เขียนตรง ไม่ผ่าน save() เพื่อไม่ให้ stampMeta ตีตรา now() แล้ว echo push วน
    queue(k, v);
    syncMeta.set(k, meta[k] ?? Date.now());
  }
  const obj = Object.fromEntries(syncMeta);
  cache.set("_syncmeta", obj);
  queue("_syncmeta", obj);
  flush();
}

export async function storageInfo() {
  const est = (await navigator.storage?.estimate?.()) ?? {};
  return {
    engine: db ? "IndexedDB" : "localStorage",
    persisted: (await navigator.storage?.persisted?.()) ?? false,
    usedKB: est.usage ? Math.round(est.usage / 1024) : null,
    keys: [...cache.keys()].filter((k) => !k.startsWith("_")).length,
  };
}
