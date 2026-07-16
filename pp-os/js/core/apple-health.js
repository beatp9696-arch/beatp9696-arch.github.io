// นำเข้าข้อมูลจาก Apple Health
//
// ข้อจำกัดที่ต้องรู้: เว็บอ่าน HealthKit ตรงๆ ไม่ได้ (ไม่มี Web API — เฉพาะแอป native เท่านั้น)
// ทางที่ทำได้จริงมีสองทาง ไฟล์นี้รองรับทั้งคู่:
//   1. export.zip จากแอป "สุขภาพ" → แกะ zip + สตรีมอ่าน export.xml ในเครื่อง (ย้อนหลังทั้งหมด)
//   2. JSON จาก Shortcut (ไฟล์ หรือส่งมาทาง ?hk=<base64>) → อัปเดตรายวันแบบอัตโนมัติ
// ทุกอย่างทำในเครื่อง 100% ไม่มีการอัปโหลดไปไหน
//
// อ่านสองอย่างจาก export: <Record> (ยอดต่อวัน) และ <Workout> (พลังงานต่อครั้ง → เหรียญของ Health)

import { load, save } from "./storage.js";

const ML_PER_GLASS = 250;
const MAX_DAYS = 400; // ไม่ต้องอ่านย้อนหลังเกินนี้ — กันไฟล์ยักษ์กินเวลา

const TYPE_MAP = {
  HKQuantityTypeIdentifierStepCount: "steps",
  HKQuantityTypeIdentifierAppleExerciseTime: "ex",
  HKQuantityTypeIdentifierDietaryWater: "water",
  HKQuantityTypeIdentifierBodyMass: "weight",
  HKCategoryTypeIdentifierSleepAnalysis: "sleep",
  // resting HR = วัตถุดิบของธง "ควรไปหาหมอจริง" ของ Dr. Murph — ของแถม ถ้าไม่มีข้อมูลแอปต้องไม่พัง
  HKQuantityTypeIdentifierRestingHeartRate: "rhr",
};

const cutoffKey = () => {
  const d = new Date();
  d.setDate(d.getDate() - MAX_DAYS);
  return d.toISOString().slice(0, 10);
};

// Apple เขียนเวลาเป็น local time ของเครื่องอยู่แล้ว ("2026-07-14 08:12:03 +0700")
// เลยตัดวันจาก string ตรงๆ ได้ ไม่ต้องแปลง timezone (กันวันเพี้ยนตอนข้ามเที่ยงคืน)
const dayOf = (s) => s.slice(0, 10);

function toDate(s) {
  const m = /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}) ([+-]\d{2})(\d{2})$/.exec(s);
  if (!m) return new Date(s);
  return new Date(`${m[1]}T${m[2]}${m[3]}:${m[4]}`);
}

function toMl(value, unit) {
  if (unit === "L") return value * 1000;
  if (unit === "fl_oz_us") return value * 29.5735;
  return value; // mL
}

// ---- ตัวรวมยอดต่อวัน ----
// iPhone กับ Apple Watch นับก้าว/ออกกำลังกายซ้ำกัน ถ้า sum ทุกแหล่ง = ตัวเลขเบิ้ล
// เลยรวมแยกตาม source แล้วเอา "แหล่งที่มากที่สุด" ของวันนั้น (วิธีเดียวกับที่แอปสุขภาพเลือกแหล่งหลัก)
class DayAgg {
  constructor() {
    this.perSource = {}; // metric -> day -> source -> number
    this.latest = { weight: {}, rhr: {} }; // ค่าที่เอา "ครั้งล่าสุดของวัน" ไม่ใช่ผลรวม
  }

  add(metric, day, source, amount) {
    const bySrc = (this.perSource[metric] ??= {});
    const srcs = (bySrc[day] ??= {});
    srcs[source] = (srcs[source] ?? 0) + amount;
  }

  setLatest(metric, day, ts, v) {
    const cur = this.latest[metric][day];
    if (!cur || ts >= cur.ts) this.latest[metric][day] = { ts, v };
  }

  result() {
    const days = {};
    for (const [metric, byDay] of Object.entries(this.perSource)) {
      for (const [day, srcs] of Object.entries(byDay)) {
        const top = Math.max(...Object.values(srcs));
        (days[day] ??= {})[metric] = top;
      }
    }
    for (const [day, w] of Object.entries(this.latest.weight)) {
      (days[day] ??= {}).weight = Math.round(w.v * 10) / 10;
    }
    for (const [day, r] of Object.entries(this.latest.rhr)) {
      (days[day] ??= {}).rhr = Math.round(r.v);
    }
    // ปัดให้อยู่ในหน่วยที่แอปใช้: น้ำ = แก้ว, ออกกำลังกาย = นาที, ก้าว = จำนวนเต็ม
    for (const d of Object.values(days)) {
      if (d.water != null) d.water = Math.round((d.water / ML_PER_GLASS) * 10) / 10;
      if (d.ex != null) d.ex = Math.round(d.ex);
      if (d.steps != null) d.steps = Math.round(d.steps);
      if (d.sleep != null) d.sleep = Math.round(d.sleep * 10) / 10;
    }
    return days;
  }
}

function handleRecord(attrs, agg, cutoff) {
  const metric = TYPE_MAP[attrs.type];
  if (!metric) return;

  const source = attrs.sourceName ?? "?";

  if (metric === "sleep") {
    // เอาเฉพาะช่วงที่ "หลับจริง" ไม่เอา InBed (นอนเล่นบนเตียงไม่ใช่การนอน)
    if (!/Asleep/.test(attrs.value ?? "")) return;
    const day = dayOf(attrs.endDate ?? ""); // นับเข้าวันที่ตื่น
    if (!day || day < cutoff) return;
    const hrs = (toDate(attrs.endDate) - toDate(attrs.startDate)) / 3600000;
    if (hrs > 0 && hrs < 24) agg.add("sleep", day, source, hrs);
    return;
  }

  const day = dayOf(attrs.startDate ?? "");
  if (!day || day < cutoff) return;
  const v = parseFloat(attrs.value);
  if (!Number.isFinite(v)) return;

  if (metric === "weight") {
    const kg = attrs.unit === "lb" ? v * 0.453592 : v;
    agg.setLatest("weight", day, toDate(attrs.startDate).getTime(), kg);
  } else if (metric === "rhr") {
    agg.setLatest("rhr", day, toDate(attrs.startDate).getTime(), v); // Apple ให้วันละค่า (count/min)
  } else if (metric === "water") {
    agg.add("water", day, source, toMl(v, attrs.unit));
  } else {
    agg.add(metric, day, source, v); // steps, ex
  }
}

// ---- แกะ zip เอง (ไม่มี library) แล้วสตรีมอ่าน export.xml ----
async function xmlTextStream(file) {
  if (file.name.endsWith(".xml")) return file.stream().pipeThrough(new TextDecoderStream("utf-8"));

  const tailLen = Math.min(file.size, 66_000); // EOCD อยู่ท้ายไฟล์ (comment ยาวสุด 64KB)
  const tail = new DataView(await file.slice(file.size - tailLen).arrayBuffer());
  let eocd = -1;
  for (let i = tail.byteLength - 22; i >= 0; i--) {
    if (tail.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("That doesn't look like a valid zip file");

  const cdSize = tail.getUint32(eocd + 12, true);
  const cdOffset = tail.getUint32(eocd + 16, true);
  const cd = new DataView(await file.slice(cdOffset, cdOffset + cdSize).arrayBuffer());

  let p = 0;
  let entry = null;
  const dec = new TextDecoder();
  while (p + 46 <= cd.byteLength && cd.getUint32(p, true) === 0x02014b50) {
    const nameLen = cd.getUint16(p + 28, true);
    const extraLen = cd.getUint16(p + 30, true);
    const commentLen = cd.getUint16(p + 32, true);
    const name = dec.decode(new Uint8Array(cd.buffer, cd.byteOffset + p + 46, nameLen));
    if (/export\.xml$/i.test(name) && !/cda/i.test(name)) {
      entry = {
        method: cd.getUint16(p + 10, true),
        compSize: cd.getUint32(p + 20, true),
        localOffset: cd.getUint32(p + 42, true),
      };
      break;
    }
    p += 46 + nameLen + extraLen + commentLen;
  }
  if (!entry) throw new Error("No export.xml inside this zip");

  // local header ยาวไม่คงที่ ต้องอ่าน nameLen/extraLen ของมันเองก่อนถึงจะรู้จุดเริ่มข้อมูล
  const lh = new DataView(await file.slice(entry.localOffset, entry.localOffset + 30).arrayBuffer());
  const dataStart = entry.localOffset + 30 + lh.getUint16(26, true) + lh.getUint16(28, true);
  const blob = file.slice(dataStart, dataStart + entry.compSize);

  const raw = entry.method === 8 ? blob.stream().pipeThrough(new DecompressionStream("deflate-raw")) : blob.stream();
  return raw.pipeThrough(new TextDecoderStream("utf-8"));
}

// จับทีละ token: <Record …/> หรือ <Workout …>…</Workout> ทั้งบล็อก
// (Workout เป็น element มีลูก — MetadataEntry/WorkoutEvent/WorkoutStatistics — ไม่ใช่ tag เดี่ยวแบบ Record
//  และตั้งแต่ iOS 16 พลังงานย้ายจาก attribute ไปอยู่ในลูก <WorkoutStatistics> เลยต้องเก็บทั้งบล็อก)
const TOKEN_RE = /<Record\s([^>]*?)\/?>|<Workout\s([^>]*?)(?:\/>|>([\s\S]*?)<\/Workout>)/g;
const ATTR_RE = /([\w-]+)="([^"]*)"/g;
const STAT_RE = /<WorkoutStatistics\s[^>]*?>/g;

function parseAttrs(s) {
  const attrs = {};
  ATTR_RE.lastIndex = 0;
  let a;
  while ((a = ATTR_RE.exec(s))) attrs[a[1]] = a[2];
  return attrs;
}

// ชื่อที่คนอ่านรู้เรื่องสำหรับ HKWorkoutActivityType ที่เจอบ่อย — ที่เหลือถอด camelCase เป็นคำ
const WORKOUT_NAMES = {
  Running: "Run",
  Walking: "Walk",
  Hiking: "Hike",
  Cycling: "Cycle",
  Swimming: "Swim",
  TraditionalStrengthTraining: "Strength",
  FunctionalStrengthTraining: "Functional",
  HighIntensityIntervalTraining: "HIIT",
  CoreTraining: "Core",
  CrossTraining: "Cross-training",
  Elliptical: "Elliptical",
  Rowing: "Row",
  StairClimbing: "Stairs",
  Yoga: "Yoga",
  Pilates: "Pilates",
  Soccer: "Soccer",
  Basketball: "Basketball",
  Badminton: "Badminton",
  Tennis: "Tennis",
  MartialArts: "Martial arts",
  Dance: "Dance",
};
const workoutName = (t) => {
  const raw = (t ?? "").replace("HKWorkoutActivityType", "");
  return WORKOUT_NAMES[raw] ?? (raw ? raw.replace(/([a-z])([A-Z])/g, "$1 $2") : "Workout");
};

function handleWorkout(attrs, inner, out, cutoff) {
  const day = dayOf(attrs.startDate ?? "");
  if (!day || day < cutoff) return;

  // export เก่า: totalEnergyBurned เป็น attribute · iOS 16+: อยู่ใน <WorkoutStatistics …ActiveEnergyBurned sum="…">
  let kcal = parseFloat(attrs.totalEnergyBurned);
  let unit = attrs.totalEnergyBurnedUnit;
  if (!Number.isFinite(kcal) && inner) {
    STAT_RE.lastIndex = 0;
    let s;
    while ((s = STAT_RE.exec(inner))) {
      const sa = parseAttrs(s[0]);
      if (/ActiveEnergyBurned/.test(sa.type ?? "")) {
        kcal = parseFloat(sa.sum);
        unit = sa.unit;
        break;
      }
    }
  }
  if (!Number.isFinite(kcal) || kcal <= 0) return; // ไม่มีพลังงานที่วัดจริง = ไม่มีเหรียญให้ตี
  if (unit === "kJ") kcal /= 4.184; // ปกติ Apple ให้ kcal/Cal อยู่แล้ว

  let min = parseFloat(attrs.duration);
  if (Number.isFinite(min)) {
    if (/^sec/.test(attrs.durationUnit ?? "")) min /= 60;
    else if (/^h/.test(attrs.durationUnit ?? "")) min *= 60;
  } else min = 0;

  out.push({
    id: attrs.startDate, // เวลาเริ่มเป็นเอกลักษณ์พอ → import ไฟล์เดิมซ้ำไม่เบิ้ลรายการ
    date: day,
    type: workoutName(attrs.workoutActivityType),
    minutes: Math.round(min),
    kcal: Math.round(kcal),
    source: "watch",
  });
}

export async function parseAppleExport(file, onProgress) {
  const stream = await xmlTextStream(file);
  const reader = stream.getReader();
  const agg = new DayAgg();
  const workouts = [];
  const cutoff = cutoffKey();
  let buf = "";
  let bytes = 0;
  let records = 0;

  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    bytes += value.length;
    buf += value;

    TOKEN_RE.lastIndex = 0;
    let m;
    let last = 0;
    while ((m = TOKEN_RE.exec(buf))) {
      if (m[1] != null) handleRecord(parseAttrs(m[1]), agg, cutoff);
      else handleWorkout(parseAttrs(m[2]), m[3] ?? "", workouts, cutoff);
      records++;
      last = TOKEN_RE.lastIndex;
    }
    // เหลือท้าย buffer ไว้เสมอ — <Workout> ที่ยังไม่เจอ </Workout> จะถูกอ่านต่อรอบหน้า
    buf = buf.slice(last);
    if (buf.length > 2_000_000) buf = buf.slice(-4000); // กันบัฟเฟอร์บวมถ้าเจอบล็อกที่ไม่ใช่ token ที่รู้จัก

    onProgress?.({ mb: bytes / 1e6, records });
    await new Promise((r) => setTimeout(r)); // คืนคิวให้ UI ได้วาด progress
  }

  return { days: agg.result(), workouts };
}

// ---- JSON จาก Shortcut ----
// รับได้ทั้ง {days:{...}}, {"2026-07-14":{...}} และ [{date, sleep, ...}]
// เสริม: {workouts:[{date, type, minutes, kcal}]} — Shortcut อ่าน workout จาก HealthKit ได้ตรงๆ
export function parseHealthJSON(text) {
  const raw = JSON.parse(text);
  const src = raw.days ?? raw;
  const out = {};

  const put = (day, o) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return;
    const d = {};
    for (const k of ["water", "ex", "sleep", "steps", "weight", "rhr"]) {
      const v = Number(o[k]);
      if (Number.isFinite(v)) d[k] = Math.round(v * 10) / 10;
    }
    if (Object.keys(d).length) out[day] = d;
  };

  if (Array.isArray(src)) for (const row of src) put(row.date ?? row.day, row);
  else if (src && typeof src === "object") for (const [day, o] of Object.entries(src)) put(day, o ?? {});

  const workouts = [];
  if (Array.isArray(raw.workouts)) {
    for (const w of raw.workouts) {
      const date = w.date ?? w.day;
      const kcal = Math.round(Number(w.kcal));
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? "") || !Number.isFinite(kcal) || kcal <= 0) continue;
      workouts.push({
        id: w.id ?? `${date} ${w.type ?? "Workout"} ${kcal}`, // ยิงซ้ำวันเดิม = รายการเดิม ไม่เบิ้ล
        date,
        type: String(w.type ?? "Workout"),
        minutes: Math.round(Number(w.minutes)) || 0,
        kcal,
        source: "watch", // มาจาก HealthKit ผ่าน Shortcut = ค่าวัด ไม่ใช่ค่าประเมิน
      });
    }
  }

  if (!Object.keys(out).length && !workouts.length) throw new Error("No days with data found in this file");
  return { days: out, workouts };
}

// ---- เขียนลง storage ----
// Apple = แหล่งความจริงสำหรับตัวเลขที่มันวัดได้ ทับของเดิมได้เลย
// แต่ห้ามแตะสิ่งที่ Apple ไม่มี (อารมณ์ที่ PP กดเอง) — ไม่งั้นบันทึกมือหายเงียบๆ
export function mergeDays(imported) {
  const days = load("health.days", {});
  let touched = 0;
  const filled = { water: 0, ex: 0, sleep: 0, steps: 0, weight: 0 };

  for (const [day, vals] of Object.entries(imported)) {
    const rec = (days[day] ??= { water: 0, ex: 0, sleep: 0, steps: 0, weight: null, mood: null });
    let any = false;
    for (const [k, v] of Object.entries(vals)) {
      if (v == null) continue;
      rec[k] = v;
      filled[k] = (filled[k] ?? 0) + 1;
      any = true;
    }
    if (any) touched++;
  }

  save("health.days", days);
  save("health.lastImport", { at: Date.now(), days: touched });

  const keys = Object.keys(imported).sort();
  return { days: touched, from: keys[0], to: keys.at(-1), filled };
}

// workout จาก Watch ทับ/เติมเข้าลิสต์เดิมโดย dedupe ด้วย id (= startDate ของ Apple)
// รายการที่ PP log มือ (id เป็น timestamp ตอนกด) ไม่มีวันชนกับ id ของ Apple → ไม่หาย
export function mergeWorkouts(imported) {
  if (!imported?.length) return 0;
  const list = load("health.workouts", []);
  const seen = new Set(list.map((w) => w.id));
  let added = 0;
  for (const w of imported) {
    if (seen.has(w.id)) continue;
    seen.add(w.id);
    list.push(w);
    added++;
  }
  if (added) {
    list.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    save("health.workouts", list);
  }
  return added;
}

// ---- Shortcut ส่งข้อมูลมาทาง URL: ?hk=<base64 ของ JSON> ----
export function importFromURL() {
  const url = new URL(location.href);
  const raw = url.searchParams.get("hk") ?? (location.hash.startsWith("#hk=") ? location.hash.slice(4) : null);
  if (!raw) return null;

  try {
    const json = decodeURIComponent(escape(atob(decodeURIComponent(raw).replace(/-/g, "+").replace(/_/g, "/"))));
    const parsed = parseHealthJSON(json);
    const res = mergeDays(parsed.days);
    res.workoutsAdded = mergeWorkouts(parsed.workouts);
    url.searchParams.delete("hk");
    history.replaceState(null, "", url.pathname + url.search); // ล้าง URL ไม่ให้ import ซ้ำตอน refresh
    return res;
  } catch {
    return null;
  }
}
