// Sync ข้ามเครื่องผ่าน GitHub Gist ส่วนตัว (secret) — ไม่มีเซิร์ฟเวอร์ของเราเอง
//
// ทำไม Gist: ฟรี, ไม่ต้องดูแลเซิร์ฟเวอร์, มี version history ให้ย้อนได้, ใช้ Personal Access Token
// (scope: gist อย่างเดียว) ที่เก็บ "ในเครื่องนี้เท่านั้น" — token อยู่ใน key "sync.token" ซึ่ง
// storage กันไม่ให้ติดไปกับ backup หรือถูก sync ขึ้น cloud (isSyncable() คัด prefix "sync." ออก)
//
// กลยุทธ์ conflict = last-write-wins "ต่อ key" ด้วย timestamp ที่ storage แปะให้ทุกครั้งที่ save
// (merge เป็นฟังก์ชัน pure ทดสอบแยกได้) + ก่อนเขียนผลลง เครื่องเก็บ snapshot ให้กดย้อนได้เสมอ
//   → เครื่องที่ "แก้ key นั้นล่าสุด" ชนะ key นั้น; แก้คนละ key คนละเครื่อง = รวมกันครบ ไม่ทับ
//   → ข้อจำกัด: ถ้าแก้ "key เดียวกัน" สองเครื่องในช่วงที่ยังไม่ได้ sync ตัวที่ push ทีหลังชนะ
//     (แต่ของเดิมไม่หายจริง — อยู่ใน snapshot กด Undo คืนได้) ตอนตั้งครั้งแรกให้เริ่มที่เครื่องหลักก่อน

import { load, save, remove, syncSnapshot, applySync, onDataChange } from "./storage.js";

const API = "https://api.github.com";
const FILE = "pp-os.json";
const DESC = "Moatrices — private sync (do not edit by hand)";
const PUSH_DEBOUNCE = 4000; // รอ 4 วิหลังหยุดพิมพ์/แก้ ค่อย sync — กันยิงถี่

// เฉพาะข้อมูลผู้ใช้จริงที่ควรข้ามเครื่อง (allowlist — ปลอดภัยกว่า denylist: ของใหม่ที่ยังไม่ตั้งใจ
// sync จะไม่หลุดขึ้น cloud เอง) เพิ่ม key ใหม่ที่นี่เมื่ออยากให้ sync
const SYNC_KEYS = new Set([
  "health.days",
  "health.goals",
  "health.workouts",
  "health.treats",
  "health.meals",
  "health.treatMenu",
  "money.entries",
  "money.budgets",
  "money.recurring",
  "todo.items",
  "notes.text",
  "os.name",
]);
const pick = (obj = {}) => {
  const o = {};
  for (const k in obj) if (SYNC_KEYS.has(k)) o[k] = obj[k];
  return o;
};

// ---- สถานะ (ให้ UI subscribe มาวาดตาม) ----
let status = { state: "off", busy: false, at: null, device: null, error: null, pulled: 0 };
const listeners = new Set();
function setStatus(patch) {
  status = { ...status, ...patch };
  for (const cb of listeners) {
    try {
      cb(status);
    } catch {}
  }
}
export function onSyncStatus(cb) {
  listeners.add(cb);
  cb(status);
  return () => listeners.delete(cb);
}
export const getStatus = () => status;
export const isConfigured = () => !!load("sync.token") && !!load("sync.gistId");

export function deviceName() {
  const saved = load("sync.deviceName");
  if (saved) return saved;
  const ua = navigator.userAgent || "";
  return /iPhone/.test(ua)
    ? "iPhone"
    : /iPad/.test(ua)
      ? "iPad"
      : /Android/.test(ua)
        ? "Android"
        : /Macintosh|Mac OS/.test(ua)
          ? "Mac"
          : /Windows/.test(ua)
            ? "PC"
            : "this device";
}

// ---- GitHub REST ----
async function gh(path, opts = {}) {
  const token = load("sync.token");
  if (!token) throw new Error("Not connected");
  const res = await fetch(API + path, {
    ...opts,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(opts.headers || {}),
    },
  });
  if (res.status === 401) throw new Error("Token ไม่ถูกต้อง/หมดอายุ — ต้องเป็น token ที่มี scope: gist");
  if (res.status === 403) throw new Error("โดน GitHub จำกัดชั่วคราว (403) — รอสักครู่แล้วลองใหม่");
  if (!res.ok) throw new Error(`GitHub error ${res.status}`);
  return res;
}

// merge แบบ pure — last-write-wins ต่อ key (ทดสอบแยกได้ ไม่แตะ storage/เน็ต)
// local/remote = { data:{key:value}, meta:{key:timestamp} }
export function mergeState(local, remote) {
  const data = {};
  const meta = {};
  const pulled = []; // key ที่ดึงจาก remote มาทับ local (ของ remote ใหม่กว่า)
  let localAhead = false; // มี key ที่ local ใหม่กว่า/remote ไม่มี → ต้อง push กลับ
  const keys = new Set(
    [...Object.keys(local.data || {}), ...Object.keys(remote.data || {})].filter((k) => SYNC_KEYS.has(k))
  );
  for (const k of keys) {
    const lt = local.meta?.[k] ?? 0;
    const rt = remote.meta?.[k] ?? 0;
    const inL = k in (local.data || {});
    const inR = k in (remote.data || {});
    if (inR && (!inL || rt > lt)) {
      data[k] = remote.data[k];
      meta[k] = rt;
      pulled.push(k);
    } else {
      if (inL) {
        data[k] = local.data[k];
        meta[k] = lt;
      }
      if (!inR || lt > rt) localAhead = true;
    }
  }
  return { data, meta, pulled, localAhead };
}

function localState() {
  const snap = syncSnapshot();
  return { data: pick(snap.data), meta: snap.meta };
}

function bodyFor(data, meta) {
  return { v: 1, device: deviceName(), at: Date.now(), data, meta };
}

async function readRemote(gistId) {
  const res = await gh(`/gists/${gistId}`);
  const json = await res.json();
  const file = json.files?.[FILE];
  if (!file) return null;
  let content = file.content;
  if (file.truncated && file.raw_url) {
    content = await (await fetch(file.raw_url, { headers: { Authorization: `Bearer ${load("sync.token")}` } })).text();
  }
  try {
    return JSON.parse(content);
  } catch {
    return null;
  }
}

async function writeRemote(gistId, body) {
  await gh(`/gists/${gistId}`, {
    method: "PATCH",
    body: JSON.stringify({ files: { [FILE]: { content: JSON.stringify(body, null, 2) } } }),
  });
}

async function findGist() {
  // หา gist เดิมที่เคยสร้าง (จากเครื่องนี้หรืออีกเครื่อง) จะได้ไม่สร้างซ้ำ
  const res = await gh(`/gists?per_page=100`);
  const list = await res.json();
  return list.find((g) => g.files && g.files[FILE] && g.description === DESC)?.id ?? null;
}

async function createGist(body) {
  const res = await gh(`/gists`, {
    method: "POST",
    body: JSON.stringify({ description: DESC, public: false, files: { [FILE]: { content: JSON.stringify(body, null, 2) } } }),
  });
  return (await res.json()).id;
}

/** ตั้งค่าครั้งแรก: ตรวจ token → หา/สร้าง gist → sync รอบแรก */
export async function connect(token) {
  save("sync.token", (token || "").trim());
  setStatus({ busy: true, error: null });
  try {
    await (await gh(`/user`)).json(); // ตรวจว่า token ใช้ได้จริงก่อน
    let gistId = load("sync.gistId") || (await findGist());
    if (!gistId) {
      const l = localState();
      gistId = await createGist(bodyFor(l.data, l.meta));
    }
    save("sync.gistId", gistId);
    await syncNow();
    setStatus({ state: "on", busy: false });
    return { ok: true };
  } catch (e) {
    remove("sync.token");
    remove("sync.gistId");
    setStatus({ state: "off", busy: false, error: e.message });
    return { ok: false, error: e.message };
  }
}

/** เลิกใช้ sync บนเครื่องนี้ — ลบ token/gistId ทิ้ง (ข้อมูลในเครื่องอยู่ครบเหมือนเดิม) */
export function disconnect() {
  remove("sync.token");
  remove("sync.gistId");
  remove("sync.lastSync");
  setStatus({ state: "off", busy: false, at: null, device: null, error: null, pulled: 0 });
}

let inflight = null;
/** pull → merge → เขียนกลับถ้าจำเป็น (กันยิงซ้อน) */
export async function syncNow() {
  if (!isConfigured()) return null;
  if (inflight) return inflight;
  inflight = (async () => {
    setStatus({ busy: true, error: null });
    try {
      const gistId = load("sync.gistId");
      const remoteRaw = (await readRemote(gistId)) ?? { data: {}, meta: {} };
      const remote = { data: pick(remoteRaw.data), meta: remoteRaw.meta || {} };
      const merged = mergeState(localState(), remote);
      if (merged.pulled.length) applySync(merged.data, merged.meta);
      if (merged.localAhead) await writeRemote(gistId, bodyFor(merged.data, merged.meta));
      const at = Date.now();
      save("sync.lastSync", at);
      setStatus({
        state: "on",
        busy: false,
        at,
        device: remoteRaw.device || deviceName(),
        error: null,
        pulled: merged.pulled.length,
      });
      return merged;
    } catch (e) {
      setStatus({ state: "error", busy: false, error: e.message });
      throw e;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

let pushTimer = null;
function scheduleSync() {
  if (!isConfigured()) return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(() => syncNow().catch(() => {}), PUSH_DEBOUNCE);
}

/** เรียกครั้งเดียวตอน boot — ดึงของใหม่จาก cloud + ตั้ง auto-sync เวลาข้อมูลเปลี่ยน */
export function initSync() {
  setStatus({ state: isConfigured() ? "on" : "off", at: load("sync.lastSync") ?? null, device: deviceName() });
  onDataChange(scheduleSync);
  if (isConfigured()) syncNow().catch(() => {});
}
