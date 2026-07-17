import { load, save } from "../core/storage.js";
import { parseAppleExport, parseHealthJSON, mergeDays, mergeWorkouts } from "../core/apple-health.js";
import { countUp, flush, stagger, num, dateLong, dateShort, timeShort } from "../core/ui.js";

// ============================================================
// Health 2.0 — coin economy: 1 เหรียญ = 1 kcal จริง
// เหรียญเข้า = พลังงานของ workout ที่บันทึก (Watch วัด หรือ log มือ)
// เหรียญออก = kcal ของ treat · มื้อปกติฟรี (BMR ครอบคลุมอยู่แล้ว)
// ไม่มี bonus/multiplier ทุกชนิด — สร้าง kcal จาก streak ไม่ได้
// ยอดคงเหลือไม่ store — derive จาก sum(workouts) − sum(treats) เสมอ (ไม่มีวัน desync)
// ทำไมนับจาก workout ไม่ใช่ active energy หัก baseline: PP เลือกเอง 16 ก.ค. 2026 —
// baseline 30 วันต้อง import สม่ำเสมอ (พฤติกรรมจริงคือแทบไม่ import) และ log มือไม่มีที่เข้าโมเดลนั้น
// ============================================================

// ไอคอนเส้น (stroke) แทนอิโมจิ — โทน monochrome เดียวกับของเดิม
const ic = (p) =>
  `<svg class="hi" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;

const IC = {
  steps: ic('<path d="M4 16v-2.4C4 11.5 3 10.5 3 8c0-2.7 1.5-6 4.5-6C9.4 2 10 3.8 10 5.5c0 3.1-2 5.7-2 8.7V16a2 2 0 1 1-4 0Z"/><path d="M20 20v-2.4c0-2.1 1-3.1 1-5.6 0-2.7-1.5-6-4.5-6C14.6 6 14 7.8 14 9.5c0 3.1 2 5.7 2 8.7V20a2 2 0 1 0 4 0Z"/><path d="M16 17h4M4 13h4"/>'),
  water: ic('<path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7Z"/>'),
  ex: ic('<path d="M22 12h-3.5l-2.5 7L11 5l-2.5 7H2"/>'),
  sleep: ic('<path d="M12 3a6.4 6.4 0 0 0 9 9 9 9 0 1 1-9-9Z"/>'),
  weight: ic('<circle cx="12" cy="6.5" r="2.8"/><path d="M6.9 9.3h10.2a2 2 0 0 1 1.95 1.55l1.8 8A2 2 0 0 1 18.9 21.3H5.1a2 2 0 0 1-1.95-2.45l1.8-8A2 2 0 0 1 6.9 9.3Z"/>'),
  watch: ic('<rect x="7" y="7" width="10" height="10" rx="2.6"/><path d="M9 7l.5-3a2 2 0 0 1 2-1.7h1a2 2 0 0 1 2 1.7L15 7M15 17l.5 3a2 2 0 0 1-2 1.7h-1a2 2 0 0 1-2-1.7L9 17"/>'),
  coin: ic('<circle cx="12" cy="12" r="8.4"/><circle cx="12" cy="12" r="4.6"/>'),
  sun: ic('<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.5 1.5M16.9 16.9l1.5 1.5M18.4 5.6l-1.5 1.5M7.1 16.9l-1.5 1.5"/>'),
  bowl: ic('<path d="M4 12a8 8 0 0 0 16 0Z"/><path d="M9 3l2 6M15 2l-2 7M8 20h8"/>'),
  bars: ic('<path d="M4 20V11.5M10 20V4.5M16 20v-6M21.2 20H2.8"/>'),
  murph: ic('<path d="M6 3v5.5a4.5 4.5 0 0 0 9 0V3"/><path d="M10.5 13v2a4.5 4.5 0 0 0 9 0v-1.1"/><circle cx="19.5" cy="11.5" r="2.3"/>'),
};

const METRICS = [
  { m: "steps", ico: IC.steps, lbl: "Steps", step: 500 },
  { m: "water", ico: IC.water, lbl: "Water", unit: "glasses", step: 1 },
  { m: "ex", ico: IC.ex, lbl: "Exercise", unit: "min", step: 10 },
  { m: "sleep", ico: IC.sleep, lbl: "Sleep", unit: "hrs", step: 0.5 },
];

// MET จาก Compendium of Physical Activities (Ainsworth 2011) — ใช้เฉพาะตอน "ประเมิน" ที่ไม่มีค่าวัด
// kcal/นาที = MET × 3.5 × น้ำหนัก(kg) ÷ 200 (สูตรมาตรฐาน ACSM) — ผลที่ได้ติดป้าย ~ เสมอ ห้ามปนกับค่าวัด
const WORKOUT_TYPES = [
  ["Walk", 4.3], // เดินเร็ว 5.6 กม./ชม. (17200)
  ["Run", 8.3], // วิ่ง 8 กม./ชม. (12030)
  ["Cycle", 6.8], // ปั่น 16–19 กม./ชม. (01040)
  ["Strength", 5.0], // เวทหนักปานกลาง–จริงจัง (02054)
  ["HIIT", 8.0], // circuit training vigorous (02040)
  ["Swim", 5.8], // ฟรีสไตล์เบา–กลาง (18240)
  ["Yoga", 2.5], // hatha (02150)
  ["Sport", 7.0], // ฟุตบอล/บาสเล่นทั่วไป (15605)
];
const MET = Object.fromEntries(WORKOUT_TYPES);
const CARDIO = new Set(["Walk", "Run", "Cycle", "Swim", "HIIT", "Sport", "Hike", "Row", "Elliptical", "Stairs", "Soccer", "Basketball"]);

// ตารางราคาตั้งต้น — PP อนุมัติ 16 ก.ค. 2026 · ทุกใบบอกขนาดที่สมมติ + ที่มาของ kcal
// (portion คือตัวแปรใหญ่สุดของ kcal ไม่ใช่ชนิดอาหาร) แก้/เพิ่ม/ลบในแอปได้ เก็บใน health.treatMenu
const DEFAULT_MENU = [
  { id: "t01", name: "ผลไม้", portion: "แอปเปิลกลาง 1 ลูก (~180g)", kcal: 95, src: "USDA" },
  { id: "t02", name: "น้ำอัดลม", portion: "โค้กกระป๋อง 325ml", kcal: 139, src: "ฉลาก Coca-Cola" },
  { id: "t03", name: "ไอศกรีม", portion: "2 สกู๊ป (~120g)", kcal: 250, src: "USDA 207/100g" },
  { id: "t04", name: "ช็อกโกแลต", portion: "แท่งนม 45g", kcal: 240, src: "USDA 535/100g" },
  { id: "t05", name: "เบเกอรี่", portion: "ครัวซองต์เนย 1 ชิ้น (~67g)", kcal: 272, src: "USDA" },
  { id: "t06", name: "แซนด์วิช", portion: "แฮมชีสโทสต์ 1 ชิ้น", kcal: 280, src: "ฉลาก 7-Eleven โดยประมาณ" },
  { id: "t07", name: "เฟรนช์ฟรายส์", portion: "ขนาดกลาง 114g", kcal: 320, src: "McDonald's nutrition" },
  { id: "t08", name: "ชานมไข่มุก", portion: "16oz หวานปกติ + ไข่มุก", kcal: 350, src: "HealthHub SG (~335–370)" },
  { id: "t09", name: "ฟราปปูชิโน่", portion: "คาราเมล Grande 16oz + วิป", kcal: 380, src: "Starbucks nutrition" },
  { id: "t10", name: "ซูชิ", portion: "นิกิริแซลมอน 8 คำ", kcal: 385, src: "~48 kcal/คำ" },
  { id: "t11", name: "คอหมูย่าง", portion: "จาน ~150g", kcal: 440, src: "กรมอนามัย ~296/100g" },
  { id: "t12", name: "พิซซ่า", portion: "1 ชิ้น ถาดใหญ่ 14\" ชีส", kcal: 285, src: "USDA" },
  { id: "t13", name: "พาสต้า", portion: "คาร์โบนาราจานร้าน", kcal: 600, src: "ค่าเฉลี่ยเชนร้านอาหาร" },
  { id: "t14", name: "ป๊อปคอร์นโรง", portion: "ถังกลาง ไม่เติมเนย", kcal: 600, src: "CSPI/AMC (~590–650)" },
  { id: "t15", name: "ข้าวแกงกะหรี่", portion: "หมู + ข้าวมาตรฐาน", kcal: 755, src: "เมนู CoCo Ichibanya" },
  { id: "t16", name: "BBQ ยากินิกุ", portion: "เซ็ตเนื้อ ~200g + ข้าว", kcal: 800, src: "ประมาณจากเนื้อย่าง ~300/100g" },
  { id: "t17", name: "Fast food", portion: "ชุดเบอร์เกอร์ + ฟรายส์กลาง + โค้ก", kcal: 1022, src: "McDonald's 563+320+139" },
];

const MEAL_NAMES = ["เช้า", "เที่ยง", "เย็น", "ว่าง"];

// ช่วงเวลาของกราฟแนวโน้ม — วันสั้นดูรายวัน, ยาวขึ้นจับกลุ่มเป็นสัปดาห์/เดือน ไม่งั้นแท่งบางจนอ่านไม่ออก
const RANGE_BUCKET = { 7: "day", 30: "day", 90: "week", 365: "month" };

function dayKey(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() - offset);
  return fmtKey(d);
}
const fmtKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const shiftDay = (key, delta) => {
  const d = new Date(key + "T12:00:00");
  d.setDate(d.getDate() + delta);
  return fmtKey(d);
};
const mondayOf = (d) => {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
};
const fmtSigned = (n) => `${n < 0 ? "−" : "+"}${num(Math.abs(Math.round(n)))}`;
const sumKcal = (arr) => arr.reduce((s, x) => s + x.kcal, 0);

// รวมค่ารายเมตริกในช่วงที่เลือก → คืนแท่งพร้อม avg (จับกลุ่มตาม bucket) เฉลี่ยเฉพาะวันที่มีข้อมูล
function bucketize(days, m, rangeDays, val) {
  const bucket = RANGE_BUCKET[rangeDays];
  const avg = (arr) => (arr.length ? arr.reduce((s, x) => s + x, 0) / arr.length : null);
  const out = [];

  if (bucket === "day") {
    for (let off = rangeDays - 1; off >= 0; off--) {
      const key = dayKey(off);
      const rec = days[key];
      const v = rec ? val(rec, m) : null;
      out.push({ v, title: `${key}: ${v == null ? "no data" : v}`, last: off === 0 });
    }
  } else if (bucket === "week") {
    for (let start = rangeDays - 1; start >= 0; start -= 7) {
      const vals = [];
      let head = dayKey(start), tail = dayKey(Math.max(0, start - 6));
      for (let off = start; off > start - 7 && off >= 0; off--) {
        const rec = days[dayKey(off)];
        if (rec) vals.push(val(rec, m));
      }
      const v = avg(vals);
      out.push({ v, title: `${tail} – ${head}: ${v == null ? "no data" : "avg " + Math.round(v)}`, last: start < 7 });
    }
  } else {
    const map = new Map();
    for (let off = rangeDays - 1; off >= 0; off--) {
      const key = dayKey(off);
      const ym = key.slice(0, 7);
      if (!map.has(ym)) map.set(ym, []);
      const rec = days[key];
      if (rec) map.get(ym).push(val(rec, m));
    }
    const arr = [...map.entries()];
    arr.forEach(([ym, vals], i) => {
      const v = avg(vals);
      out.push({ v, title: `${ym}: ${v == null ? "no data" : "avg " + Math.round(v)}`, last: i === arr.length - 1 });
    });
  }
  return out;
}

const SHEET = `
  <div class="hk-sheet hidden">
    <div class="hk-card">
      <div class="hk-h">
        <span>${IC.watch} Import from Apple Health</span>
        <button class="hk-x" title="Close" aria-label="Close">✕</button>
      </div>
      <p class="hk-p">The web can't read your Apple Watch or Health app directly — Apple only opens HealthKit to native apps. But everything your Series 5 records lands in the Health app, and Moatrices reads it from there — <b>including workouts, which mint your coins</b>. Pick a file or paste it — parsed on this device, never uploaded.</p>

      <label class="hk-drop">
        <input type="file" accept=".zip,.xml,.json" class="hk-file" hidden>
        <b>Choose a file</b>
        <small>export.zip from the Health app · or .json from a Shortcut</small>
      </label>
      <button type="button" class="hk-paste">Paste JSON from clipboard</button>
      <div class="hk-status"></div>

      <details class="hk-how">
        <summary>Option 1 — Backfill everything (one time, ~2 min)</summary>
        <ol>
          <li>Open the <b>Health</b> app on iPhone → tap your profile picture</li>
          <li>Scroll to the bottom → <b>Export All Health Data</b> → wait a moment</li>
          <li>Choose <b>Save to Files</b> (you get <code>export.zip</code>)</li>
          <li>Come back here → <b>Choose a file</b> → pick that zip</li>
        </ol>
        <p>Imports workouts (coins from day one — up to 400 days back), steps, exercise, sleep, water, weight and resting HR.</p>
      </details>

      <details class="hk-how">
        <summary>Option 2 — Daily auto-update (Shortcut)</summary>
        <ol>
          <li>Open <b>Shortcuts</b> → new shortcut</li>
          <li>Add <b>Find Health Samples</b> for each metric (Steps / Sleep / Water / Weight), filter <i>Today</i>, then <b>Calculate Statistics → Sum</b> — and <b>Find Workouts</b> for today's workouts</li>
          <li>Add a <b>Text</b> action with this JSON (drag the variables in place of the numbers):<br>
            <code>{"days":{"YYYY-MM-DD":{"steps":8210,"sleep":7.5,"water":6,"weight":70.5}},"workouts":[{"date":"YYYY-MM-DD","type":"Run","minutes":32,"kcal":310}]}</code></li>
          <li>Finish with <b>Save File</b> → overwrite <code>pp-health.json</code> in iCloud Drive</li>
          <li>Set an <b>Automation</b> to run it daily at 10pm — then just pick that file here whenever you want to sync</li>
        </ol>
        <p>On Safari (not installed as an app), have the Shortcut <b>Open URL</b> instead:<br>
          <code>…/pp-os/?hk=&lt;base64-encoded JSON&gt;</code> — data lands the moment the page opens, no file picking.</p>
      </details>
    </div>
  </div>
`;

const I = (d) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;

const NAV = [
  ["today", "Today", I('<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.5 1.5M16.9 16.9l1.5 1.5M18.4 5.6l-1.5 1.5M7.1 16.9l-1.5 1.5"/>')],
  ["fit", "Fit", I('<path d="M22 12h-3.5l-2.5 7L11 5l-2.5 7H2"/>')],
  ["food", "Food", I('<path d="M4 12a8 8 0 0 0 16 0Z"/><path d="M9 3l2 6M15 2l-2 7M8 20h8"/>')],
  ["trends", "Trends", I('<path d="M4 20V11.5M10 20V4.5M16 20v-6M21.2 20H2.8"/>')],
];
const TITLES = { today: "Today", fit: "Fit", food: "Food", trends: "Trends" };

export default {
  id: "health",
  name: "Health",
  icon: "❤️",
  defaultSize: { w: 430, h: 740 },
  mount(body) {
    body.classList.add("app-pane", "app-health");
    const days = load("health.days", {});
    let workouts = load("health.workouts", []);
    let treats = load("health.treats", []);
    let meals = load("health.meals", []);
    let treatMenu = load("health.treatMenu", null);
    if (!treatMenu) {
      treatMenu = structuredClone(DEFAULT_MENU);
      save("health.treatMenu", treatMenu);
    }

    const today = () => (days[dayKey()] ??= { steps: 0, water: 0, ex: 0, sleep: 0, weight: null, mood: null });
    const val = (rec, m) => rec?.[m] ?? 0; // วันเก่าที่บันทึกก่อนมี key นี้จะไม่มีค่า

    body.innerHTML = `
      <header class="page-head">
        <div>
          <div class="eyebrow">Moatrices · Health</div>
          <h1 class="page-title h-title">Today</h1>
          <div class="page-sub">${dateLong()}</div>
        </div>
        <div class="head-actions">
          <button class="btn-soft h-import">${IC.watch} Apple Health</button>
        </div>
      </header>

      <!-- ============ TODAY ============ -->
      <section class="m-view" data-v="today">
        <div class="card hero coin">
          <div class="k">${IC.coin} Coin balance · 1 เหรียญ = 1 kcal</div>
          <div class="big coin-big"></div>
          <div class="coin-day"></div>
          <div class="coin-src"></div>
          <div class="coin-note">ไม่มีโบนัส ไม่มีตัวคูณ — เหรียญเข้าเท่าพลังงานที่เผาจริงเท่านั้น และยอดติดลบได้</div>
        </div>

        <div class="card murph">
          <div class="murph-head">
            <span class="murph-ava">${IC.murph}</span>
            <div><div class="murph-name">Dr. Murph</div><div class="murph-role">อ่านงบการเงินของร่างกาย — ไม่วินิจฉัย</div></div>
          </div>
          <div class="murph-say"></div>
          <div class="murph-quest"></div>
        </div>

        <div class="chips h-chips"></div>

        <div class="sec">Today's ledger</div>
        <div class="card"><div class="list today-list"></div></div>

        <div class="sec">Chart review — รายสัปดาห์</div>
        <div class="card"><div class="list murph-week"></div></div>
      </section>

      <!-- ============ FIT ============ -->
      <section class="m-view hidden" data-v="fit">
        <form class="card wo-form">
          <div class="card-head">
            <div class="card-title">Log workout</div>
            <div class="card-meta">${dateShort(new Date())}</div>
          </div>
          <div class="row">
            <select name="type" aria-label="Workout type" style="flex:1">${WORKOUT_TYPES.map(([t]) => `<option>${t}</option>`).join("")}</select>
            <input name="minutes" type="number" min="1" step="1" placeholder="นาที" required style="flex:1" aria-label="Minutes">
          </div>
          <div class="row">
            <input name="kcal" type="number" min="1" step="1" placeholder="kcal (active energy)" required style="flex:1" aria-label="kcal">
            <button class="btn" type="submit">Add</button>
          </div>
          <div class="wo-est"></div>
        </form>

        <div class="sec">Coin flow · 30 days</div>
        <div class="card flow-card">
          <div class="flow-bars"></div>
          <div class="trend-legend">
            <span><i class="lg in"></i>Earned</span>
            <span><i class="lg out"></i>Spent</span>
          </div>
          <div class="flow-cap"></div>
        </div>

        <div class="sec">History</div>
        <div class="card">
          <div class="list wo-list"></div>
          <button type="button" class="btn-ghost wo-more hidden">Show more</button>
        </div>
      </section>

      <!-- ============ FOOD ============ -->
      <section class="m-view hidden" data-v="food">
        <div class="card shop">
          <div class="card-head">
            <div class="card-title">Treat shop</div>
            <button type="button" class="btn-soft shop-edit">Edit</button>
          </div>
          <div class="shop-bal">ยอดคงเหลือ <b></b></div>
          <div class="list shop-list"></div>
          <form class="row shop-custom">
            <input name="item" placeholder="Treat นอกเมนู" required style="flex:1.4" autocomplete="off">
            <input name="kcal" type="number" min="1" step="1" placeholder="kcal" required style="flex:0.8">
            <button class="btn" type="submit">จ่าย</button>
          </form>
          <form class="row shop-add hidden">
            <input name="name" placeholder="ชื่อเมนูใหม่" required style="flex:1.2" autocomplete="off">
            <input name="portion" placeholder="ขนาด เช่น 16oz" required style="flex:1" autocomplete="off">
            <input name="kcal" type="number" min="1" step="1" placeholder="kcal" required style="flex:0.7">
            <button class="btn" type="submit">Add</button>
          </form>
        </div>

        <div class="sec">Meals — มื้อปกติ ฟรี ไม่คิดเหรียญ</div>
        <div class="card">
          <form class="row meal-form">
            <select name="meal" aria-label="Meal">${MEAL_NAMES.map((m) => `<option>${m}</option>`).join("")}</select>
            <input name="text" placeholder="กินอะไร เช่น ข้าวกะเพรา" required style="flex:1" autocomplete="off">
            <button class="btn" type="submit">Add</button>
          </form>
          <div class="list meal-list"></div>
        </div>

        <div class="sec">Treats this week</div>
        <div class="card"><div class="list treat-list"></div></div>
      </section>

      <!-- ============ TRENDS ============ -->
      <section class="m-view hidden" data-v="trends">
        <div class="sec">Log today</div>
        <div class="card">
          <div class="list">
            ${METRICS.map(
              ({ m, ico, lbl, unit }) => `
              <div class="metric-row" data-m="${m}">
                <span class="ico">${ico}</span>
                <span class="lbl">${lbl}${unit ? ` <span class="unit">${unit}</span>` : ""}</span>
                <button class="step-btn" data-d="-1" aria-label="Decrease ${lbl}">−</button>
                <span class="val"></span>
                <button class="step-btn" data-d="1" aria-label="Increase ${lbl}">+</button>
              </div>`
            ).join("")}
            <div class="metric-row">
              <span class="ico">${IC.weight}</span><span class="lbl">Weight <span class="unit">kg</span></span>
              <input class="weight-input" type="number" min="0" step="0.1" placeholder="—" aria-label="Weight">
            </div>
          </div>
        </div>

        <div class="sec">Trends</div>
        <div class="card trends-card">
          <div class="seg range-seg">
            <button type="button" data-d="7" class="on">7D</button>
            <button type="button" data-d="30">30D</button>
            <button type="button" data-d="90">90D</button>
            <button type="button" data-d="365">1Y</button>
          </div>

          <div class="weight-block">
            <div class="wt-head"><span class="wt-lbl">${IC.weight} Weight</span><span class="wt-stat"></span></div>
            <div class="wt-chart"></div>
          </div>

          <div class="metric-trends">
            ${METRICS.map(
              ({ m, ico, lbl }) => `
              <div class="trend" data-m="${m}">
                <div class="trend-head"><span>${ico} ${lbl}</span><span class="cap"></span></div>
                <div class="bars"></div>
              </div>`
            ).join("")}
          </div>
        </div>

        <div class="h-src"></div>
      </section>

      <nav class="m-nav">
        ${NAV.map(([v, label, icon], i) => `<button type="button" data-v="${v}" class="${i === 0 ? "on" : ""}" aria-label="${label}">${icon}<span>${label}</span></button>`).join("")}
      </nav>
      ${SHEET}
    `;

    /* ---------- refs / persistence ---------- */
    const $ = (s) => body.querySelector(s);
    const $$ = (s) => [...body.querySelectorAll(s)];
    const persistDays = () => save("health.days", days);
    const persistW = () => save("health.workouts", workouts);
    const persistT = () => save("health.treats", treats);
    const persistM = () => save("health.meals", meals);
    const persistMenu = () => save("health.treatMenu", treatMenu);

    let rangeDays = 7;
    let shownW = 10;
    let editShop = false;
    let firstPaint = true;
    let estUsed = false; // kcal ในฟอร์มมาจากปุ่ม "ใช้ค่าประเมิน" (ไม่ใช่เลขที่ PP กรอกเอง)

    /* ============================================================
       Dr. Murph — สองชั้นตายตัว: ledgerFacts() คืน "ข้อเท็จจริงล้วน" จาก ledger
       แล้ว murphDaily()/murphWeekly() แปลงเป็นถ้อยคำ — ชั้นถ้อยคำสลับเป็น LLM ทีหลังได้
       (GitHub Action → Claude → Gist, ดู ROADMAP) โดยไม่แตะชั้นข้อเท็จจริง
       เส้นที่ห้ามข้าม: Murph ไม่วินิจฉัย ไม่สั่งยา ไม่ทำนายโรค — เขาอ่านตัวเลข บอกความจริง
       และบอกว่าเมื่อไหร่ควรไปหาหมอคนจริง (สังเกตความผิดปกติจาก baseline ≠ วินิจฉัยสาเหตุ)
       ============================================================ */

    const balance = () => sumKcal(workouts) - sumKcal(treats); // ห้าม store — derive เสมอ

    const streakOf = (set) => {
      // สตรีค = วันที่มีรายการใน ledger ติดกัน (นับ "วันที่บันทึก" ไม่ใช่วันออกกำลังกาย — วันพักไม่โดนลงโทษ)
      let s = 0;
      const start = set.has(dayKey()) ? 0 : 1;
      while (set.has(dayKey(start + s))) s++;
      return s;
    };

    const longestRun = (set) => {
      let best = 0;
      for (const d of set) {
        if (set.has(shiftDay(d, -1))) continue; // เดินเฉพาะจากวันเริ่ม run
        let len = 1, cur = d;
        while (set.has((cur = shiftDay(cur, 1)))) len++;
        best = Math.max(best, len);
      }
      return best;
    };

    const median = (arr) => {
      const s = [...arr].sort((a, b) => a - b);
      const m = s.length >> 1;
      return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
    };

    // ธง "ควรพบหมอจริง" — สังเกตจาก baseline ของ PP เอง ไม่ใช่เกณฑ์การแพทย์
    const doctorFlags = () => {
      const flags = [];

      // resting HR: 7 วันล่าสุดมีค่าครบ และทุกวันสูงกว่า median 30 วันก่อนหน้า (ต้องมี ≥ 14 ค่า) เกิน 10 bpm
      const rhrAt = (off) => days[dayKey(off)]?.rhr ?? null;
      const last7 = Array.from({ length: 7 }, (_, i) => rhrAt(i));
      const base = [];
      for (let off = 7; off < 37; off++) {
        const v = rhrAt(off);
        if (v != null) base.push(v);
      }
      if (last7.every((v) => v != null) && base.length >= 14) {
        const med = median(base);
        if (last7.every((v) => v > med + 10))
          flags.push(
            `Resting HR ${Math.min(...last7)}–${Math.max(...last7)} bpm สูงกว่า baseline 30 วันของคุณ (${Math.round(med)}) เกิน 10 ติดกัน 7 วัน — ผมบอกไม่ได้ว่าทำไม นั่นเป็นงานของหมอจริง`
          );
      }

      // น้ำหนัก: ค่าเฉลี่ยช่วงนี้ (0–13 วัน) ต่ำกว่าค่าเฉลี่ยเมื่อ ~30 วันก่อน (27–45 วัน) ≥ 5%
      const wAvg = (fromOff, toOff) => {
        const vals = [];
        for (let off = fromOff; off <= toOff; off++) {
          const w = days[dayKey(off)]?.weight;
          if (w != null) vals.push(w);
        }
        return vals.length >= 3 ? vals.reduce((s, x) => s + x, 0) / vals.length : null;
      };
      const nowW = wAvg(0, 13), oldW = wAvg(27, 45);
      if (nowW && oldW && (oldW - nowW) / oldW >= 0.05)
        flags.push(
          `น้ำหนักเฉลี่ยลด ${Math.round(((oldW - nowW) / oldW) * 100)}% ใน ~30 วัน (${oldW.toFixed(1)} → ${nowW.toFixed(1)} kg) — ถ้าไม่ได้ตั้งใจลดอยู่ ควรให้หมอจริงตรวจ`
        );

      return flags;
    };

    const pickQuest = (loggedSet) => {
      const wLast7 = workouts.filter((w) => w.date >= dayKey(6));
      if (!wLast7.length)
        return { text: "บันทึก workout แรกของสัปดาห์ — เดินเร็ว 30 นาทีก็นับ", why: "7 วันล่าสุดไม่มี workout ใน ledger" };

      const cardioIn = (newOff, oldOff) =>
        workouts.filter((w) => w.date >= dayKey(oldOff) && w.date <= dayKey(newOff) && CARDIO.has(w.type)).length;
      if (cardioIn(0, 6) < 2 && cardioIn(7, 13) < 2 && cardioIn(14, 20) < 2)
        return { text: "Cardio ให้ครบ 2 ครั้งในสัปดาห์นี้", why: "3 สัปดาห์ติดที่ cardio ไม่ถึง 2 ครั้ง/สัปดาห์" };

      let hasW = false;
      for (let off = 0; off < 14; off++) if (days[dayKey(off)]?.weight != null) { hasW = true; break; }
      if (!hasW)
        return { text: "ชั่งน้ำหนัก 1 ครั้ง (แท็บ Trends)", why: "ไม่มีบันทึกน้ำหนัก 14 วัน — MA7 กับธงเฝ้าระวังใช้เลขนี้" };

      const cur = streakOf(loggedSet);
      const next = [7, 30, 100, 365].find((m) => m > cur) ?? cur + 100;
      return { text: `รักษาสตรีคบันทึกให้ถึง ${next} วัน (ตอนนี้ ${cur})`, why: "สตรีคนับวันที่บันทึก ไม่ใช่วันออกกำลังกาย" };
    };

    const ledgerFacts = () => {
      const todayK = dayKey();
      const wIn = (from, to) => workouts.filter((w) => w.date >= from && w.date <= to);
      const tIn = (from, to) => treats.filter((t) => t.date >= from && t.date <= to);

      const loggedSet = new Set([...workouts, ...treats, ...meals].map((x) => x.date));

      const monKey = fmtKey(mondayOf(new Date()));
      const wkW = wIn(monKey, todayK);
      const week = {
        from: monKey,
        in: sumKcal(wkW),
        out: sumKcal(tIn(monKey, todayK)),
        inManualEst: sumKcal(wkW.filter((w) => w.source !== "watch")),
      };
      week.net = week.in - week.out;

      // 4 สัปดาห์เต็มก่อนหน้า — นับเฉพาะสัปดาห์ที่มีรายการจริง (สัปดาห์ก่อนเริ่มใช้แอปไม่ใช่ศูนย์ที่วัดได้)
      const prevWeeks = [];
      for (let i = 1; i <= 4; i++) {
        const from = shiftDay(monKey, -7 * i);
        const to = shiftDay(from, 6);
        const win = wIn(from, to), tin = tIn(from, to);
        if (win.length || tin.length) prevWeeks.push(sumKcal(win) - sumKcal(tin));
      }

      const tw = workouts.filter((w) => w.date === todayK);
      const tt = treats.filter((t) => t.date === todayK);

      return {
        daysLogged: loggedSet.size,
        balance: balance(),
        earnedWatch: sumKcal(workouts.filter((w) => w.source === "watch")),
        earnedManual: sumKcal(workouts.filter((w) => w.source !== "watch")),
        spentAll: sumKcal(treats),
        today: { in: sumKcal(tw), out: sumKcal(tt), net: sumKcal(tw) - sumKcal(tt), workouts: tw, treats: tt },
        week,
        prevWeeks,
        topTreat: tIn(monKey, todayK).sort((a, b) => b.kcal - a.kcal)[0] ?? null,
        streak: streakOf(loggedSet),
        pins: [7, 30, 100].filter((m) => longestRun(loggedSet) >= m),
        quest: pickQuest(loggedSet),
        flags: doctorFlags(),
      };
    };

    // ---- ชั้นถ้อยคำ: อ้างตัวเลขจาก facts เท่านั้น ห้ามพูดลอย ห้ามประจบ ห้ามอิโมจิเชียร์ ----
    const murphDaily = (f) => {
      if (!f.daysLogged)
        return "ยังไม่มีอะไรให้อ่าน — ledger ว่างอยู่ เริ่มจากบันทึก workout แรก หรือ import จาก Apple Health (ปุ่มขวาบน) แล้วผมถึงจะทำงานได้";
      const t = f.today;
      const bits = [];
      if (t.workouts.length)
        bits.push(`เข้า +${num(t.in)} (${t.workouts.map((w) => `${w.type}${w.minutes ? ` ${w.minutes} นาที` : ""}`).join(", ")})`);
      if (t.treats.length) bits.push(`ออก −${num(t.out)} (${t.treats.map((x) => x.item).join(", ")})`);
      let line = bits.length ? `วันนี้ ${bits.join(" · ")} · สุทธิ ${fmtSigned(t.net)}` : "วันนี้ยังไม่มีรายการในบัญชี";
      line += ` · ยอดสะสม ${fmtSigned(f.balance)} kcal`;
      if (f.daysLogged < 7)
        line += ` — ข้อมูลมีแค่ ${f.daysLogged} วัน ยังอ่านเชิงสัปดาห์ไม่ได้ ขออีก ${7 - f.daysLogged} วัน`;
      return line;
    };

    const murphWeekly = (f) => {
      if (f.daysLogged < 7)
        return [{
          k: "Chart review",
          t: `ยังเปิดงบรายสัปดาห์ไม่ได้ — ข้อมูลมี ${f.daysLogged} วัน ขออีก ${7 - f.daysLogged} วัน ตัวเลขที่ยังไม่มีความหมาย ผมไม่อ่าน`,
        }];
      const rows = [];
      const w = f.week;
      let l1 = `เข้า +${num(w.in)} / ออก −${num(w.out)} / สุทธิ ${fmtSigned(w.net)} kcal`;
      if (w.inManualEst > 0) l1 += ` (ฝั่งเข้ามี ~${num(w.inManualEst)} จากบันทึกมือ)`;
      rows.push({ k: "งบสัปดาห์นี้ · จ–วันนี้", t: l1 });

      if (f.prevWeeks.length) {
        const avg = Math.round(f.prevWeeks.reduce((s, x) => s + x, 0) / f.prevWeeks.length);
        const d = w.net - avg;
        rows.push({
          k: `เทียบ ${f.prevWeeks.length} สัปดาห์ก่อน`,
          t: `ค่าเฉลี่ยสุทธิ ${fmtSigned(avg)}/สัปดาห์ — สัปดาห์นี้${d === 0 ? "เท่าค่าเฉลี่ย" : `${d > 0 ? "สูงกว่า" : "ต่ำกว่า"}ค่าเฉลี่ย ${num(Math.abs(d))}`}`,
        });
      } else rows.push({ k: "เทียบสัปดาห์ก่อน", t: "ยังไม่มีสัปดาห์ก่อนหน้าให้เทียบ" });

      rows.push(
        f.topTreat
          ? { k: "Treat แพงสุดสัปดาห์นี้", t: `${f.topTreat.item} −${num(f.topTreat.kcal)}` }
          : { k: "Treat", t: "สัปดาห์นี้ยังไม่มี treat ในบัญชี" }
      );
      rows.push({ k: "Quest ถัดไป", t: `${f.quest.text} — ${f.quest.why} · รางวัล = หมุด ไม่ใช่เหรียญ` });
      for (const fl of f.flags) rows.push({ k: "ควรพบหมอจริง", t: fl, warn: true });
      return rows;
    };

    /* ---------- TODAY ---------- */
    const renderToday = (f) => {
      const balEl = $(".coin-big");
      if (firstPaint) countUp(balEl, f.balance, { fmt: (n) => fmtSigned(n) });
      else balEl.textContent = fmtSigned(f.balance);
      balEl.classList.toggle("neg", f.balance < 0);
      $(".coin-day").textContent = `วันนี้ เข้า +${num(f.today.in)} · ออก −${num(f.today.out)}`;
      $(".coin-src").textContent =
        `เข้าสะสม: วัดจริง (watch) ${num(f.earnedWatch)} · บันทึกมือ ~${num(f.earnedManual)} — ออกสะสม ${num(f.spentAll)}`;

      $(".murph-say").textContent = murphDaily(f);
      $(".murph-quest").textContent = `Quest: ${f.quest.text} — รางวัล = หมุด ไม่ใช่เหรียญ`;

      $(".h-chips").innerHTML = [
        `<span class="chip ${f.streak > 0 ? "on" : ""}">Streak <b>${f.streak} วัน</b></span>`,
        ...f.pins.map((m) => `<span class="chip on">หมุด <b>${m} วัน</b></span>`),
        `<span class="chip">บันทึกแล้ว <b>${f.daysLogged} วัน</b></span>`,
      ].join("");

      const list = $(".today-list");
      list.innerHTML = "";
      const rows = [
        ...f.today.workouts.map((w) => ({ kind: "w", ref: w })),
        ...f.today.treats.map((t) => ({ kind: "t", ref: t })),
        ...meals.filter((m) => m.date === dayKey()).map((m) => ({ kind: "m", ref: m })),
      ];
      if (!rows.length) {
        list.innerHTML = `<div class="empty">ยังไม่มีบันทึกวันนี้ — workout อยู่แท็บ Fit, ของกินอยู่แท็บ Food</div>`;
        return;
      }
      for (const { kind, ref } of rows) {
        const row = document.createElement("div");
        row.className = "entry";
        const what = document.createElement("span");
        what.className = "what";
        const amt = document.createElement("span");
        if (kind === "w") {
          what.append(`${ref.type}${ref.minutes ? ` · ${ref.minutes} นาที` : ""} `);
          what.insertAdjacentHTML("beforeend", srcTag(ref));
          amt.className = "amt in";
          amt.textContent = `+${ref.est ? "~" : ""}${num(ref.kcal)}`;
        } else if (kind === "t") {
          what.textContent = ref.item;
          amt.className = "amt out";
          amt.textContent = `−${num(ref.kcal)}`;
        } else {
          what.textContent = `${ref.meal} · ${ref.text} `;
          what.insertAdjacentHTML("beforeend", `<span class="tag-src free">free</span>`);
          amt.className = "amt";
          amt.textContent = "0";
        }
        const del = document.createElement("button");
        del.className = "x-btn";
        del.title = "Delete";
        del.setAttribute("aria-label", "Delete entry");
        del.textContent = "✕";
        del.addEventListener("click", () => removeEntry(kind, ref.id));
        row.append(what, amt, del);
        list.append(row);
      }

      const weekEl = $(".murph-week");
      weekEl.innerHTML = "";
      for (const r of murphWeekly(f)) {
        const row = document.createElement("div");
        row.className = `mw-row${r.warn ? " warn" : ""}`;
        const k = document.createElement("span");
        k.className = "mw-k";
        k.textContent = r.k;
        const t = document.createElement("span");
        t.className = "mw-t";
        t.textContent = r.t;
        row.append(k, t);
        weekEl.append(row);
      }
    };

    const removeEntry = (kind, id) => {
      if (kind === "w") { workouts = workouts.filter((x) => x.id !== id); persistW(); }
      if (kind === "t") { treats = treats.filter((x) => x.id !== id); persistT(); }
      if (kind === "m") { meals = meals.filter((x) => x.id !== id); persistM(); }
      update();
    };

    const srcTag = (w) =>
      w.source === "watch" ? `<span class="tag-src watch">watch</span>` : `<span class="tag-src">มือ${w.est ? " ~est" : ""}</span>`;

    /* ---------- FIT: log form ---------- */
    const woForm = $(".wo-form");

    const latestWeight = () => {
      const keys = Object.keys(days).filter((k) => days[k]?.weight != null).sort();
      const k = keys.at(-1);
      return k ? { kg: days[k].weight, date: k } : null;
    };

    const renderEst = () => {
      const est = $(".wo-est");
      const w = latestWeight();
      if (!w) {
        est.textContent = "ยังไม่มีน้ำหนักในระบบ — ใส่น้ำหนักที่แท็บ Trends ก่อนถึงจะประเมิน kcal ให้ได้ หรือกรอกเลขจากเครื่อง/ลู่เอง";
        return;
      }
      const min = parseFloat(woForm.minutes.value);
      if (!Number.isFinite(min) || min <= 0) {
        est.textContent = `กรอกนาทีแล้วจะประเมิน kcal ให้ (MET × ${w.kg} kg — น้ำหนักล่าสุด ${dateShort(new Date(w.date + "T12:00:00"))})`;
        return;
      }
      const met = MET[woForm.type.value];
      const kcal = Math.round(((met * 3.5 * w.kg) / 200) * min);
      est.innerHTML = `ประเมิน ~${num(kcal)} kcal (MET ${met} × ${w.kg} kg × ${min} นาที) <button type="button" class="use-est">ใช้ค่านี้</button> — ค่าประเมินติดป้าย ~ เสมอ ไม่ปนกับค่าวัด`;
      est.querySelector(".use-est").addEventListener("click", () => {
        woForm.kcal.value = kcal;
        estUsed = true;
      });
    };
    woForm.type.addEventListener("change", renderEst);
    woForm.minutes.addEventListener("input", renderEst);
    woForm.kcal.addEventListener("input", () => (estUsed = false)); // พิมพ์เอง = ไม่ใช่ค่าประเมิน MET

    woForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const minutes = Math.round(parseFloat(woForm.minutes.value));
      const kcal = Math.round(parseFloat(woForm.kcal.value));
      if (!Number.isFinite(minutes) || minutes <= 0 || !Number.isFinite(kcal) || kcal <= 0) return;
      workouts.push({
        id: `m${Date.now()}`,
        date: dayKey(),
        type: woForm.type.value,
        minutes,
        kcal,
        source: "manual",
        est: estUsed,
      });
      woForm.minutes.value = "";
      woForm.kcal.value = "";
      estUsed = false;
      persistW();
      update();
    });

    /* ---------- FIT: coin flow 30 วัน ----------
       แท่งบน = เหรียญเข้า (workout), แท่งล่าง = เหรียญออก (treat) — สเกลเดียวกันทั้งสองทิศ
       สี: เข้า var(--a) / ออก var(--neg) — ตรวจ CVD แล้ว (ΔE 13.1) + ทิศทางแยกความหมายซ้ำอีกชั้น */
    const renderFlow = () => {
      const eBy = {}, sBy = {};
      for (const w of workouts) eBy[w.date] = (eBy[w.date] ?? 0) + w.kcal;
      for (const t of treats) sBy[t.date] = (sBy[t.date] ?? 0) + t.kcal;

      const cols = [];
      let maxE = 0, maxS = 0, totE = 0, totS = 0;
      for (let off = 29; off >= 0; off--) {
        const k = dayKey(off);
        const e = eBy[k] ?? 0, s = sBy[k] ?? 0;
        cols.push({ k, e, s, last: off === 0 });
        maxE = Math.max(maxE, e);
        maxS = Math.max(maxS, s);
        totE += e;
        totS += s;
      }

      const W = 300, H = 132, padT = 6, padB = 6;
      const span = Math.max(maxE + maxS, 1);
      const scale = (H - padT - padB) / span;
      const y0 = padT + maxE * scale; // เส้นศูนย์อยู่ตามสัดส่วนจริงของสองฝั่ง
      const colW = W / 30, barW = colW - 2.6; // เว้น ≥ 2px ระหว่างแท่ง

      const bars = cols
        .map((c, i) => {
          const x = (i * colW + 1.3).toFixed(1);
          const hE = c.e ? Math.max(c.e * scale, 1.5) : 0;
          const hS = c.s ? Math.max(c.s * scale, 1.5) : 0;
          const label = `${dateShort(new Date(c.k + "T12:00:00"))} · +${num(c.e)} / −${num(c.s)}`;
          return `<g class="fc${c.last ? " today" : ""}"><title>${label}</title>
            ${c.e ? `<rect class="in" x="${x}" y="${(y0 - hE).toFixed(1)}" width="${barW.toFixed(1)}" height="${hE.toFixed(1)}" rx="1.5"/>` : ""}
            ${c.s ? `<rect class="out" x="${x}" y="${y0.toFixed(1)}" width="${barW.toFixed(1)}" height="${hS.toFixed(1)}" rx="1.5"/>` : ""}
            <rect class="hit" x="${(i * colW).toFixed(1)}" y="0" width="${colW.toFixed(1)}" height="${H}"/>
          </g>`;
        })
        .join("");

      $(".flow-bars").innerHTML = `<svg viewBox="0 0 ${W} ${H}" class="flow-svg" role="img" aria-label="Coin flow 30 days">
        <line class="zero" x1="0" x2="${W}" y1="${y0.toFixed(1)}" y2="${y0.toFixed(1)}"/>
        ${bars}
      </svg>`;
      $(".flow-cap").textContent = `30 วัน: เข้า +${num(totE)} · ออก −${num(totS)} · สุทธิ ${fmtSigned(totE - totS)}`;
    };

    /* ---------- FIT: history ---------- */
    const renderHistory = () => {
      const list = $(".wo-list");
      list.innerHTML = "";
      const sorted = [...workouts].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.id < b.id ? 1 : -1));
      for (const w of sorted.slice(0, shownW)) {
        const row = document.createElement("div");
        row.className = "entry";
        const d = document.createElement("span");
        d.className = "d";
        d.textContent = dateShort(new Date(w.date + "T12:00:00"));
        const what = document.createElement("span");
        what.className = "what";
        what.append(`${w.type}${w.minutes ? ` · ${w.minutes} นาที` : ""} `);
        what.insertAdjacentHTML("beforeend", srcTag(w));
        const amt = document.createElement("span");
        amt.className = "amt in";
        amt.textContent = `+${w.est ? "~" : ""}${num(w.kcal)}`;
        const del = document.createElement("button");
        del.className = "x-btn";
        del.title = "Delete";
        del.setAttribute("aria-label", "Delete workout");
        del.textContent = "✕";
        del.addEventListener("click", () => removeEntry("w", w.id));
        row.append(d, what, amt, del);
        list.append(row);
      }
      if (!sorted.length) list.innerHTML = `<div class="empty">ยังไม่มี workout — log ข้างบน หรือ import จาก Apple Health</div>`;
      $(".wo-more").classList.toggle("hidden", sorted.length <= shownW);
    };
    $(".wo-more").addEventListener("click", () => {
      shownW += 20;
      renderHistory();
    });

    /* ---------- FOOD: treat shop ---------- */
    const buyTreat = (item, kcal) => {
      // ห้ามบล็อกการบันทึกเด็ดขาด — ยอดติดลบได้ (ถ้าบล็อก PP จะกินอยู่ดีแล้วไม่บันทึก = ledger เป็นนิยาย)
      treats.push({ id: `t${Date.now()}`, date: dayKey(), item, kcal });
      persistT();
      update();
      const bal = $(".shop-bal");
      bal.classList.remove("flash");
      flush(bal);
      bal.classList.add("flash");
    };

    const renderShop = () => {
      const bal = balance();
      const balB = $(".shop-bal b");
      balB.textContent = fmtSigned(bal);
      balB.classList.toggle("neg", bal < 0);
      $(".shop-edit").textContent = editShop ? "Done" : "Edit";
      $(".shop-add").classList.toggle("hidden", !editShop);

      const list = $(".shop-list");
      list.innerHTML = "";
      for (const item of treatMenu) {
        if (!editShop) {
          const row = document.createElement("button");
          row.type = "button";
          row.className = "shop-item";
          const info = document.createElement("span");
          info.className = "s-info";
          const b = document.createElement("b");
          b.textContent = item.name;
          const small = document.createElement("small");
          small.textContent = `${item.portion} · ${item.src}`;
          info.append(b, small);
          const price = document.createElement("span");
          price.className = "s-price";
          price.textContent = `−${num(item.kcal)}`;
          row.append(info, price);
          row.addEventListener("click", () => buyTreat(item.name, item.kcal));
          list.append(row);
        } else {
          const row = document.createElement("div");
          row.className = "shop-item edit";
          const name = document.createElement("input");
          name.value = item.name;
          name.setAttribute("aria-label", "Name");
          const portion = document.createElement("input");
          portion.value = item.portion;
          portion.setAttribute("aria-label", "Portion");
          const kcal = document.createElement("input");
          kcal.type = "number";
          kcal.min = "1";
          kcal.value = item.kcal;
          kcal.className = "s-kcal";
          kcal.setAttribute("aria-label", "kcal");
          const commit = () => {
            item.name = name.value.trim() || item.name;
            item.portion = portion.value.trim();
            const v = Math.round(parseFloat(kcal.value));
            if (Number.isFinite(v) && v > 0 && v !== item.kcal) {
              item.kcal = v;
              item.src = "PP แก้เอง"; // เลขไม่ตรงที่มาเดิมแล้ว — ห้ามแปะที่มาเดิมค้างไว้
            }
            persistMenu();
          };
          for (const el of [name, portion, kcal]) el.addEventListener("change", commit);
          const del = document.createElement("button");
          del.className = "x-btn";
          del.title = "Delete";
          del.setAttribute("aria-label", "Delete menu item");
          del.textContent = "✕";
          del.addEventListener("click", () => {
            treatMenu = treatMenu.filter((x) => x.id !== item.id);
            persistMenu();
            renderShop();
          });
          const line1 = document.createElement("div");
          line1.className = "s-edit-row";
          line1.append(name, kcal, del);
          const line2 = document.createElement("div");
          line2.className = "s-edit-row";
          line2.append(portion);
          row.append(line1, line2);
          list.append(row);
        }
      }
    };

    $(".shop-edit").addEventListener("click", () => {
      editShop = !editShop;
      renderShop();
    });

    $(".shop-add").addEventListener("submit", (e) => {
      e.preventDefault();
      const f = e.target;
      const kcal = Math.round(parseFloat(f.kcal.value));
      const name = f.name.value.trim();
      if (!name || !Number.isFinite(kcal) || kcal <= 0) return;
      treatMenu.push({ id: `u${Date.now()}`, name, portion: f.portion.value.trim(), kcal, src: "PP กำหนดเอง" });
      f.reset();
      persistMenu();
      renderShop();
    });

    $(".shop-custom").addEventListener("submit", (e) => {
      e.preventDefault();
      const f = e.target;
      const kcal = Math.round(parseFloat(f.kcal.value));
      const item = f.item.value.trim();
      if (!item || !Number.isFinite(kcal) || kcal <= 0) return;
      buyTreat(item, kcal);
      f.reset();
    });

    /* ---------- FOOD: meals (ฟรี) + treat list ---------- */
    $(".meal-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const f = e.target;
      const text = f.text.value.trim();
      if (!text) return;
      meals.push({ id: `f${Date.now()}`, date: dayKey(), meal: f.meal.value, text });
      f.text.value = "";
      persistM();
      update();
    });

    const renderFood = () => {
      renderShop();

      const weekFrom = dayKey(6);
      const mealList = $(".meal-list");
      mealList.innerHTML = "";
      const weekMeals = meals.filter((m) => m.date >= weekFrom).sort((a, b) => (a.date < b.date ? 1 : -1));
      for (const m of weekMeals) {
        const row = document.createElement("div");
        row.className = "entry";
        const d = document.createElement("span");
        d.className = "d";
        d.textContent = dateShort(new Date(m.date + "T12:00:00"));
        const what = document.createElement("span");
        what.className = "what";
        what.textContent = `${m.meal} · ${m.text} `;
        what.insertAdjacentHTML("beforeend", `<span class="tag-src free">free</span>`);
        const del = document.createElement("button");
        del.className = "x-btn";
        del.title = "Delete";
        del.setAttribute("aria-label", "Delete meal");
        del.textContent = "✕";
        del.addEventListener("click", () => removeEntry("m", m.id));
        row.append(d, what, del);
        mealList.append(row);
      }
      if (!weekMeals.length) mealList.innerHTML = `<div class="empty">มื้อปกติบันทึกฟรี — BMR ครอบคลุมอยู่แล้ว เศรษฐกิจนี้คุมเฉพาะส่วนเกิน</div>`;

      const treatList = $(".treat-list");
      treatList.innerHTML = "";
      const weekTreats = treats.filter((t) => t.date >= weekFrom).sort((a, b) => (a.date < b.date ? 1 : -1));
      for (const t of weekTreats) {
        const row = document.createElement("div");
        row.className = "entry";
        const d = document.createElement("span");
        d.className = "d";
        d.textContent = dateShort(new Date(t.date + "T12:00:00"));
        const what = document.createElement("span");
        what.className = "what";
        what.textContent = t.item;
        const amt = document.createElement("span");
        amt.className = "amt out";
        amt.textContent = `−${num(t.kcal)}`;
        const del = document.createElement("button");
        del.className = "x-btn";
        del.title = "Delete";
        del.setAttribute("aria-label", "Delete treat");
        del.textContent = "✕";
        del.addEventListener("click", () => removeEntry("t", t.id));
        row.append(d, what, amt, del);
        treatList.append(row);
      }
      if (!weekTreats.length) treatList.innerHTML = `<div class="empty">สัปดาห์นี้ยังไม่มี treat</div>`;
    };

    /* ---------- TRENDS (ยกของเดิมมา — 7/30/90/365 + น้ำหนัก MA7) ---------- */
    const renderTrends = () => {
      for (const { m } of METRICS) {
        const trend = $(`.trend[data-m="${m}"]`);
        const buckets = bucketize(days, m, rangeDays, val);
        const max = Math.max(1, ...buckets.map((b) => b.v ?? 0));
        trend.querySelector(".bars").innerHTML = buckets
          .map((b) => `<div class="bar${b.last ? " today" : ""}" style="height:${((b.v ?? 0) / max) * 100}%" title="${b.title}"></div>`)
          .join("");
        const logged = buckets.filter((b) => b.v !== null);
        const avg = logged.length ? Math.round((logged.reduce((s, b) => s + b.v, 0) / logged.length) * 10) / 10 : 0;
        const unit = rangeDays <= 30 ? "avg/day" : RANGE_BUCKET[rangeDays] === "week" ? "avg/wk" : "avg/mo";
        trend.querySelector(".cap").textContent = logged.length ? `${num(avg)} ${unit}` : "no data";
      }
      renderWeight();

      for (const { m } of METRICS) {
        $(`.metric-row[data-m="${m}"] .val`).textContent = num(val(today(), m));
      }
      $(".weight-input").value = today().weight ?? "";

      const last = load("health.lastImport");
      $(".h-src").textContent = last
        ? `Last synced from Apple Health ${dateShort(new Date(last.at))}, ${timeShort(new Date(last.at))} · ${last.days} days`
        : "Never synced with Apple Health — tap Apple Health above to stop logging by hand";
    };

    // กราฟน้ำหนัก — จุดดิบ + เส้นเฉลี่ยเคลื่อนที่ (น้ำหนักรายวัน noise เยอะ ดูเส้นดิบไม่มีประโยชน์)
    const renderWeight = () => {
      const chart = $(".wt-chart");
      const statEl = $(".wt-stat");
      const pts = [];
      for (let off = rangeDays - 1; off >= 0; off--) {
        const rec = days[dayKey(off)];
        if (rec && rec.weight != null) pts.push({ x: rangeDays - 1 - off, w: rec.weight });
      }

      if (pts.length < 2) {
        chart.innerHTML = `<div class="wt-empty">${pts.length ? `${pts[0].w} kg logged — one more day draws the line` : "Log your weight to see the trend"}</div>`;
        statEl.textContent = pts.length ? `${pts[0].w} kg` : "";
        return;
      }

      const ma = pts.map((p, i) => {
        const win = pts.slice(Math.max(0, i - 6), i + 1);
        return { x: p.x, w: win.reduce((s, q) => s + q.w, 0) / win.length };
      });

      const first = pts[0].w, latest = pts[pts.length - 1].w;
      const delta = Math.round((latest - first) * 10) / 10;
      statEl.textContent = `${latest} kg · ${delta >= 0 ? "+" : ""}${delta} over ${rangeDays <= 30 ? rangeDays + "d" : rangeDays === 90 ? "90d" : "1y"}`;

      const W = 300, H = 92, padX = 8, padT = 10, padB = 12;
      const xs = Math.max(1, rangeDays - 1);
      const ws = pts.map((p) => p.w).concat(ma.map((p) => p.w));
      let lo = Math.min(...ws), hi = Math.max(...ws);
      if (hi - lo < 1) { hi += 0.5; lo -= 0.5; }
      const px = (x) => padX + (x / xs) * (W - padX * 2);
      const py = (w) => padT + (1 - (w - lo) / (hi - lo)) * (H - padT - padB);

      const linePath = ma.map((p, i) => `${i ? "L" : "M"}${px(p.x).toFixed(1)} ${py(p.w).toFixed(1)}`).join(" ");
      const areaPath = `${linePath} L${px(ma[ma.length - 1].x).toFixed(1)} ${H - padB} L${px(ma[0].x).toFixed(1)} ${H - padB} Z`;
      const dots = pts.map((p) => `<circle cx="${px(p.x).toFixed(1)}" cy="${py(p.w).toFixed(1)}" r="1.5"/>`).join("");

      chart.innerHTML = `<svg viewBox="0 0 ${W} ${H}" class="wt-svg" role="img" aria-label="Weight trend, ${latest} kg">
        <path class="wt-area" d="${areaPath}"/>
        <path class="wt-line" d="${linePath}"/>
        <g class="wt-dots">${dots}</g>
      </svg>`;
    };

    $(".range-seg").addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-d]");
      if (!btn) return;
      rangeDays = Number(btn.dataset.d);
      $$(".range-seg button").forEach((b) => b.classList.toggle("on", b === btn));
      renderTrends();
    });

    body.addEventListener("click", (e) => {
      const stepBtn = e.target.closest(".step-btn");
      if (stepBtn) {
        const { m } = stepBtn.closest(".metric-row").dataset;
        const { step } = METRICS.find((x) => x.m === m);
        const next = val(today(), m) + step * Number(stepBtn.dataset.d);
        today()[m] = Math.max(0, Math.round(next * 10) / 10);
        persistDays();
        update();
      }
    });

    $(".weight-input").addEventListener("change", (e) => {
      const v = parseFloat(e.target.value);
      today().weight = Number.isFinite(v) && v > 0 ? v : null;
      persistDays();
      update();
    });

    /* ---------- Apple Health import ---------- */
    const sheet = $(".hk-sheet");
    const status = $(".hk-status");
    const openSheet = () => sheet.classList.remove("hidden");
    const closeSheet = () => sheet.classList.add("hidden");

    $(".h-import").addEventListener("click", openSheet);
    $(".hk-x").addEventListener("click", closeSheet);
    sheet.addEventListener("click", (e) => e.target === sheet && closeSheet());
    // global listener ต้องถอดตัวเองเมื่อ pane ถูกถอด — ไม่งั้นสลับแท็บกลับมาแต่ละครั้งจะสะสมเพิ่ม
    const onEsc = (e) => {
      if (!body.isConnected) return removeEventListener("keydown", onEsc);
      if (e.key === "Escape") closeSheet();
    };
    addEventListener("keydown", onEsc);
    const onHkOpen = () => {
      if (!body.isConnected) return document.removeEventListener("pp-hk-open", onHkOpen);
      openSheet();
    };
    document.addEventListener("pp-hk-open", onHkOpen);

    // นำผลที่ parse แล้วเข้าระบบ — ใช้ร่วมกันทั้งเลือกไฟล์และวางจากคลิปบอร์ด
    const applyImport = (parsed) => {
      const res = mergeDays(parsed.days);
      const wAdded = mergeWorkouts(parsed.workouts);
      Object.assign(days, load("health.days", {})); // days ใน closure เป็นสำเนาเก่า ต้องดึงของที่ merge แล้วมาทับ
      workouts = load("health.workouts", []);

      status.className = "hk-status ok";
      const got = Object.entries(res.filled)
        .filter(([, n]) => n > 0)
        .map(([k, n]) => `${{ steps: "steps", water: "water", ex: "exercise", sleep: "sleep", weight: "weight", rhr: "resting HR" }[k] ?? k} ${n}d`)
        .join(" · ");
      const parts = [];
      if (res.days) parts.push(`${res.days} days (${res.from} → ${res.to})`);
      if (wAdded) parts.push(`${wAdded} workouts → เหรียญ`);
      status.textContent = `✓ Imported ${parts.join(" · ") || "nothing new"}\n${got || ""}`;
      update();
    };

    $(".hk-file").addEventListener("change", async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      e.target.value = "";
      status.className = "hk-status busy";
      status.textContent = "Reading file…";

      try {
        const parsed = file.name.endsWith(".json")
          ? parseHealthJSON(await file.text())
          : await parseAppleExport(file, ({ mb, records }) => {
              status.textContent = `Reading ${mb.toFixed(1)} MB · ${num(records)} records…`;
            });
        applyImport(parsed);
      } catch (err) {
        status.className = "hk-status err";
        status.textContent = `Import failed — ${err.message}`;
      }
    });

    // วาง JSON จาก Shortcut โดยตรง (2 แตะ ไม่ต้องเปิด Files) — Shortcut อ่าน Apple Watch → คัดลอก → วางที่นี่
    $(".hk-paste").addEventListener("click", async () => {
      status.className = "hk-status busy";
      status.textContent = "Reading clipboard…";
      try {
        const text = await navigator.clipboard.readText();
        if (!text || !text.trim()) throw new Error("clipboard is empty");
        applyImport(parseHealthJSON(text));
      } catch (err) {
        status.className = "hk-status err";
        status.textContent = `Paste failed — ${err.message}`;
      }
    });

    /* ---------- nav ---------- */
    const go = (v) => {
      $$(".m-view").forEach((s) => s.classList.toggle("hidden", s.dataset.v !== v));
      $$(".m-nav button").forEach((b) => b.classList.toggle("on", b.dataset.v === v));
      $(".h-title").textContent = TITLES[v];
      (body.parentElement ?? body).scrollTop = 0;
    };
    $(".m-nav").addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-v]");
      if (btn) go(btn.dataset.v);
    });

    /* ---------- boot ---------- */
    const update = () => {
      const f = ledgerFacts();
      renderToday(f);
      renderEst();
      renderFlow();
      renderHistory();
      renderFood();
      renderTrends();
      firstPaint = false;
    };

    $$(".m-view").forEach((v) => stagger(v));
    flush(body);
    update();
  },
};
