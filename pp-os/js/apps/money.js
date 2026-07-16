import { load, save } from "../core/storage.js";
import { countUp, flush, stagger, money, money0, dateShort } from "../core/ui.js";

export const CATS = {
  out: [["Food", "🍜"], ["Transport", "🚗"], ["Home", "🛒"], ["Fun", "🎮"], ["Health", "💊"], ["Other", "📦"]],
  in: [["Salary", "💼"], ["Investments", "📈"], ["Other", "💵"]],
};

// วันที่ท้องถิ่น YYYY-MM-DD — quick-add ใน shell ก็ต้องใช้ให้ตรงกับที่ money.js บันทึก
export function localDate() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const RING_C = 2 * Math.PI * 30; // r=30 ใน viewBox 72 (วงแหวนอัตราออมใน Insights)
const DONUT_R = 44;
const DONUT_C = 2 * Math.PI * DONUT_R;

const GOAL_EMOJI = ["🚗", "💻", "🏝️", "🏠", "🎁", "💍", "📱", "🎓"];

// รายการที่บันทึกไว้ตอน UI ยังเป็นไทย ต้องย้ายชื่อหมวดมาเป็นอังกฤษ ไม่งั้นมันจะหลุดจาก CATS
// (โผล่เป็น • ไม่มี emoji และจับกลุ่มใน breakdown ไม่ตรง)
const LEGACY_CATS = {
  อาหาร: "Food",
  เดินทาง: "Transport",
  ของใช้: "Home",
  บันเทิง: "Fun",
  สุขภาพ: "Health",
  อื่นๆ: "Other",
  เงินเดือน: "Salary",
  ลงทุน: "Investments",
};

function migrate(entries) {
  let changed = false;
  for (const e of entries) {
    if (LEGACY_CATS[e.cat]) {
      e.cat = LEGACY_CATS[e.cat];
      changed = true;
    }
  }
  if (changed) save("money.entries", entries);
  return entries;
}

// วันที่ใน entry เป็น string YYYY-MM-DD — เติมเที่ยงวันกันเหลื่อม timezone ตอนแปลงเป็น Date
const noon = (s) => new Date(s + "T12:00:00");

const I = (d) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;

const NAV = [
  ["home", "Home", I('<path d="M4 11.2 12 4.4l8 6.8"/><path d="M6.2 9.8V19.6h11.6V9.8"/>')],
  ["save", "Save", I('<circle cx="12" cy="12" r="8.4"/><circle cx="12" cy="12" r="4.6"/><circle cx="12" cy="12" r="0.9"/>')],
  ["insights", "Insights", I('<path d="M4 20V11.5M10 20V4.5M16 20v-6M21.2 20H2.8"/>')],
  ["card", "Card", I('<rect x="3" y="6" width="18" height="13" rx="3"/><path d="M3 10h18"/><circle cx="16.5" cy="14.5" r="1.4"/>')],
];

const TITLES = { home: "Money", save: "Save & grow", insights: "Insights", card: "Card" };

// เงินก้อนหนึ่ง = แบ่งสามกระเป๋า — cash คือส่วนที่เหลือเสมอ (แบบเดียวกับ Cash App)
const SEGS = [
  ["cash", "Cash", "--c-cash"],
  ["savings", "Savings", "--c-save"],
  ["invest", "Invest", "--c-inv"],
];

export default {
  id: "money",
  name: "Money",
  icon: "💰",
  defaultSize: { w: 430, h: 740 },
  mount(body) {
    body.classList.add("app-pane", "app-money");
    let entries = migrate(load("money.entries", []));
    let budgets = load("money.budgets", {}); // { Food: 3000, ... } เพดานต่อหมวด/เดือน (THB)
    // สัดส่วนแบ่งรายรับ — snapshot ลงทุก income entry ตอนบันทึก แก้ % ทีหลังไม่เขียนประวัติย้อนหลัง
    let split = load("money.split", { savings: 20, invest: 10 });
    let goals = load("money.goals", []);
    let card = load("money.card", { locked: true, roundups: false });

    const now0 = new Date();
    let ym = { y: now0.getFullYear(), m: now0.getMonth() };
    let cur = "home";
    let range = 0; // เดือนย้อนหลังของกราฟ (0 = ALL)
    let filter = "all";
    let shown = 8;
    let firstPaint = true;

    body.innerHTML = `
      <header class="page-head">
        <div>
          <div class="eyebrow">Moatrices · Money</div>
          <h1 class="page-title m-title">Money</h1>
        </div>
        <div class="head-actions">
          <div class="month-pick hidden">
            <button class="prev" aria-label="Previous month">‹</button>
            <span class="m"></span>
            <button class="next" aria-label="Next month">›</button>
          </div>
        </div>
      </header>

      <!-- ============ HOME ============ -->
      <section class="m-view" data-v="home">
        <div class="card hero nw">
          <div class="k">Total balance</div>
          <div class="big nw-big"></div>
          <div class="delta"></div>
          <div class="nw-chart">
            <svg class="nwc" aria-hidden="true">
              <defs>
                <linearGradient id="m-nwfill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stop-color="#cdf463" stop-opacity="0.26"/>
                  <stop offset="1" stop-color="#cdf463" stop-opacity="0"/>
                </linearGradient>
              </defs>
              <path class="area" fill="url(#m-nwfill)"></path>
              <path class="line"></path>
              <line class="guide hidden"></line>
              <circle class="dot-scrub hidden" r="4"></circle>
              <circle class="dot-end" r="3.5"></circle>
            </svg>
            <div class="scrub-tip hidden"></div>
            <div class="nwc-empty hidden">Add income or expenses to see your balance grow</div>
          </div>
          <div class="seg seg-sm ranges">
            <button type="button" data-r="1">1M</button>
            <button type="button" data-r="3">3M</button>
            <button type="button" data-r="6">6M</button>
            <button type="button" data-r="12">1Y</button>
            <button type="button" data-r="0" class="on">ALL</button>
          </div>
        </div>

        <div class="card accounts"></div>

        <div class="sec">Quick add</div>
        <div class="quick-row">
          <button type="button" class="q-btn q-in"><span class="q-ic">↓</span>Add income</button>
          <button type="button" class="q-btn q-out"><span class="q-ic">↑</span>Add expense</button>
        </div>

        <form class="card money-form hidden">
          <div class="card-head">
            <div class="card-title f-title">New expense</div>
            <button type="button" class="x-btn f-close" aria-label="Close form">✕</button>
          </div>
          <div class="row">
            <input name="amount" type="number" min="0.01" step="0.01" placeholder="Amount (THB)" required style="flex:1" aria-label="Amount">
            <select name="cat" style="flex:1" aria-label="Category"></select>
          </div>
          <div class="row">
            <input name="note" placeholder="Note (optional)" autocomplete="off" style="flex:1">
            <button class="btn" type="submit">Add</button>
          </div>
          <div class="split-note"></div>
        </form>

        <div class="sec">Activity</div>
        <div class="card">
          <div class="seg m-tabs">
            <button type="button" data-f="all" class="on">All</button>
            <button type="button" data-f="out">Expense</button>
            <button type="button" data-f="in">Income</button>
          </div>
          <div class="list entries"></div>
          <button type="button" class="btn-ghost more-btn hidden">Show more</button>
        </div>
      </section>

      <!-- ============ SAVE ============ -->
      <section class="m-view hidden" data-v="save">
        <div class="card dist">
          <div class="card-head">
            <div class="card-title">Distribute income</div>
            <div class="card-meta">applies to new income</div>
          </div>
          <div class="dist-wrap">
            <svg viewBox="0 0 120 120">
              <g transform="rotate(-90 60 60)">
                <circle class="dist-track" cx="60" cy="60" r="${DONUT_R}"></circle>
                <circle class="dist-arc" data-s="cash" cx="60" cy="60" r="${DONUT_R}"></circle>
                <circle class="dist-arc" data-s="savings" cx="60" cy="60" r="${DONUT_R}"></circle>
                <circle class="dist-arc" data-s="invest" cx="60" cy="60" r="${DONUT_R}"></circle>
              </g>
            </svg>
            <div class="dist-center"><b class="dc-pct"></b><span class="dc-lbl">to cash</span></div>
          </div>
          <div class="dist-rows"></div>
        </div>

        <div class="sec">Savings goals</div>
        <div class="card goals-card">
          <div class="g-avail"></div>
          <div class="list goals"></div>
          <form class="g-form">
            <div class="row">
              <select name="emoji" aria-label="Goal icon">${GOAL_EMOJI.map((e) => `<option>${e}</option>`).join("")}</select>
              <input name="name" placeholder="Goal name" required style="flex:1.4" autocomplete="off">
              <input name="target" type="number" min="1" step="0.01" placeholder="Target ฿" required style="flex:1">
              <button class="btn" type="submit">Add</button>
            </div>
          </form>
        </div>
      </section>

      <!-- ============ INSIGHTS ============ -->
      <section class="m-view hidden" data-v="insights">
        <div class="card hero mo">
          <div class="hero-top">
            <div>
              <div class="k">Left this month</div>
              <div class="big mo-big"></div>
              <div class="note"></div>
            </div>
            <div class="dial-sm">
              <svg viewBox="0 0 72 72">
                <circle class="ring-track" cx="36" cy="36" r="30"></circle>
                <circle class="ring-val" cx="36" cy="36" r="30" stroke-dasharray="0 ${RING_C}"></circle>
              </svg>
              <div class="c"></div>
            </div>
          </div>
          <div class="hero-split">
            <div class="io in"><div class="k"><span class="dot">↓</span>Income</div><div class="v"></div></div>
            <div class="io out"><div class="k"><span class="dot">↑</span>Spent</div><div class="v"></div></div>
          </div>
        </div>

        <div class="sec">Income vs spending · 6 months</div>
        <div class="card trend">
          <div class="trend-bars"></div>
          <div class="trend-legend">
            <span><i class="lg in"></i>Income</span>
            <span><i class="lg out"></i>Spending</span>
          </div>
        </div>

        <div class="sec">Spending by category</div>
        <div class="card breakdown"></div>

        <div class="sec">Monthly budgets</div>
        <div class="card budgets"></div>

        <div class="sec">For you</div>
        <div class="card feed"></div>
      </section>

      <!-- ============ CARD ============ -->
      <section class="m-view hidden" data-v="card">
        <div class="vcard">
          <div class="vc-row">
            <span class="vc-brand">PP·OS</span>
            <svg class="vc-nfc" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round">
              <path d="M6 9a9 9 0 0 1 0 6M10 7a12 12 0 0 1 0 10M14 5a15.5 15.5 0 0 1 0 14"/>
            </svg>
          </div>
          <svg class="vc-chip" viewBox="0 0 34 24">
            <rect x="1" y="1" width="32" height="22" rx="5"></rect>
            <path d="M1 9h10M1 15h10M23 9h10M23 15h10M17 1v22" fill="none"></path>
          </svg>
          <div class="vc-num">•••• 9696</div>
          <div class="vc-row vc-foot"><span class="vc-name">PP</span><span class="vc-tag">$pp</span></div>
          <div class="vc-lockover"><span class="lk">🔒</span><span class="lk-t">Card locked</span></div>
        </div>
        <div class="row vc-actions">
          <button type="button" class="btn vc-toggle">Unlock</button>
          <span class="chip vc-chip-lbl">Virtual · debit</span>
        </div>

        <div class="card">
          <div class="card-head">
            <div class="card-title">Round Ups</div>
            <label class="sw"><input type="checkbox" class="ru-toggle" aria-label="Round Ups"><span class="knob"></span></label>
          </div>
          <p class="p-note">Every expense rounds up to the next ฿ 10 — the spare change moves to savings automatically.</p>
          <div class="ru-stat"></div>
        </div>

        <div class="card">
          <div class="card-head">
            <div class="card-title">Spending</div>
            <div class="card-meta cs-month"></div>
          </div>
          <div class="cs-big"></div>
          <div class="list cs-recent"></div>
        </div>
      </section>

      <nav class="m-nav">
        ${NAV.map(([v, label, ic], i) => `<button type="button" data-v="${v}" class="${i === 0 ? "on" : ""}" aria-label="${label}">${ic}<span>${label}</span></button>`).join("")}
      </nav>
    `;

    /* ---------- refs ---------- */
    const $ = (s) => body.querySelector(s);
    const $$ = (s) => [...body.querySelectorAll(s)];
    const form = $(".money-form");
    const catSel = form.cat;
    const nwBig = $(".nw-big");
    const chartWrap = $(".nw-chart");
    const svg = $(".nwc");
    const monthPick = $(".month-pick");

    /* ---------- persistence ---------- */
    const persist = () => save("money.entries", entries);
    const persistSplit = () => save("money.split", split);
    const persistGoals = () => save("money.goals", goals);
    const persistCard = () => save("money.card", card);

    /* ---------- money math ---------- */
    const cashPct = () => 100 - split.savings - split.invest;

    // ยอดสามกระเป๋า — income เก่าที่ไม่มี split ถือเป็นเงินสดล้วน (ประวัติก่อนอัปเกรดไม่ถูกเขียนใหม่)
    const balances = () => {
      let cash = 0, savings = 0, invest = 0;
      for (const e of entries) {
        if (e.type === "in") {
          const s = e.split ? (e.amount * e.split.savings) / 100 : 0;
          const v = e.split ? (e.amount * e.split.invest) / 100 : 0;
          savings += s;
          invest += v;
          cash += e.amount - s - v;
        } else {
          const ru = e.roundup || 0;
          cash -= e.amount + ru;
          savings += ru;
        }
      }
      return { cash, savings, invest, total: cash + savings + invest };
    };

    // เส้นทางยอดรวมรายวัน (สะสม) — ใช้วาดกราฟ + หา balance ณ วันใดๆ
    const seriesPoints = () => {
      const evs = entries.slice().sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.id - b.id));
      let v = 0;
      const byDay = new Map();
      for (const e of evs) {
        v += e.type === "in" ? e.amount : -e.amount;
        byDay.set(e.date, v);
      }
      return [...byDay.entries()].map(([d, val]) => ({ t: noon(d), v: val }));
    };

    const valueAt = (pts, t) => {
      let v = 0;
      for (const p of pts) {
        if (p.t > t) break;
        v = p.v;
      }
      return v;
    };

    const inMonthOf = (e, y, m) => {
      const d = noon(e.date);
      return d.getFullYear() === y && d.getMonth() === m;
    };
    const inMonth = (e) => inMonthOf(e, ym.y, ym.m);

    const monthSums = (y, m) => {
      let sin = 0, sout = 0;
      for (const e of entries) {
        if (!inMonthOf(e, y, m)) continue;
        if (e.type === "in") sin += e.amount;
        else sout += e.amount;
      }
      return { in: sin, out: sout };
    };

    // เงินไหลเข้ากระเป๋าออมเฉลี่ย/เดือน (3 เดือนล่าสุด) — ใช้ประมาณ ETA ของ goal
    const monthlySavingsInflow = () => {
      const start = new Date(now0.getFullYear(), now0.getMonth() - 2, 1);
      let s = 0;
      for (const e of entries) {
        if (noon(e.date) < start) continue;
        if (e.type === "in" && e.split) s += (e.amount * e.split.savings) / 100;
        if (e.type === "out" && e.roundup) s += e.roundup;
      }
      return s / 3;
    };

    const goalAllocated = () => goals.reduce((s, g) => s + g.saved, 0);

    /* ---------- HOME: hero + chart ---------- */
    const renderHero = () => {
      const b = balances();
      if (firstPaint) countUp(nwBig, b.total, { fmt: money0 });
      else nwBig.textContent = money0(b.total);
      nwBig.classList.toggle("neg", b.total < 0);

      const pts = seriesPoints();
      const deltaEl = $(".nw .delta");
      if (!pts.length) {
        deltaEl.textContent = "Your money HQ — add your first entry below";
        deltaEl.className = "delta";
        return;
      }
      const base = valueAt(pts, new Date(Date.now() - 30 * 864e5));
      const d = b.total - base;
      const pct = base !== 0 ? ` (${Math.abs((d / Math.abs(base)) * 100).toFixed(1)}%)` : "";
      deltaEl.textContent = `${d >= 0 ? "▲" : "▼"} ${money0(Math.abs(d))}${pct} past 30 days`;
      deltaEl.className = `delta ${d >= 0 ? "up" : "down"}`;
    };

    let plotPts = []; // จุดบนกราฟเป็นพิกัด px — ให้ scrub หาจุดใกล้เมาส์ได้เร็ว
    const drawChart = () => {
      const pts = seriesPoints();
      const empty = $(".nwc-empty");
      svg.classList.toggle("hidden", !pts.length);
      empty.classList.toggle("hidden", !!pts.length);
      if (!pts.length) return;

      const W = Math.max(chartWrap.clientWidth, 220);
      const H = 110;
      svg.setAttribute("viewBox", `0 0 ${W} ${H}`);

      const now = new Date();
      const start = range ? new Date(now.getFullYear(), now.getMonth() - range, now.getDate()) : pts[0].t;
      const win = pts.filter((p) => p.t > start && p.t <= now);
      const plot = [{ t: start, v: valueAt(pts, start) }, ...win];
      if (plot[plot.length - 1].t < now) plot.push({ t: now, v: pts[pts.length - 1].v });

      let lo = Math.min(...plot.map((p) => p.v));
      let hi = Math.max(...plot.map((p) => p.v));
      if (hi === lo) { hi += 1; lo -= 1; }
      const padY = (hi - lo) * 0.1;
      lo -= padY; hi += padY;

      const t0 = start.getTime();
      const t1 = Math.max(now.getTime(), t0 + 1);
      const X = (t) => 2 + ((t.getTime() - t0) / (t1 - t0)) * (W - 4);
      const Y = (v) => 8 + (1 - (v - lo) / (hi - lo)) * (H - 16);

      plotPts = plot.map((p) => ({ x: X(p.t), y: Y(p.v), t: p.t, v: p.v }));
      const line = plotPts.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join("");
      $(".nwc .line").setAttribute("d", line);
      $(".nwc .area").setAttribute("d", `${line}L${W - 2},${H}L2,${H}Z`);
      const last = plotPts[plotPts.length - 1];
      const dot = $(".nwc .dot-end");
      dot.setAttribute("cx", last.x);
      dot.setAttribute("cy", last.y);
    };

    // ลากบนกราฟเพื่อดูยอด ณ วันนั้น (แบบ Robinhood)
    const tip = $(".scrub-tip");
    const guide = $(".nwc .guide");
    const dotScrub = $(".nwc .dot-scrub");
    chartWrap.addEventListener("pointermove", (ev) => {
      if (!plotPts.length) return;
      const r = svg.getBoundingClientRect();
      const x = ev.clientX - r.left;
      let best = plotPts[0];
      for (const p of plotPts) if (Math.abs(p.x - x) < Math.abs(best.x - x)) best = p;
      guide.setAttribute("x1", best.x); guide.setAttribute("x2", best.x);
      guide.setAttribute("y1", 0); guide.setAttribute("y2", 110);
      dotScrub.setAttribute("cx", best.x); dotScrub.setAttribute("cy", best.y);
      [guide, dotScrub].forEach((el) => el.classList.remove("hidden"));
      tip.classList.remove("hidden");
      tip.textContent = `${money0(best.v)} · ${dateShort(best.t)}`;
      const half = tip.offsetWidth / 2;
      tip.style.left = `${Math.min(Math.max(best.x, half), r.width - half)}px`;
    });
    chartWrap.addEventListener("pointerleave", () => {
      [guide, dotScrub, tip].forEach((el) => el.classList.add("hidden"));
    });
    new ResizeObserver(() => drawChart()).observe(chartWrap);

    $(".ranges").addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-r]");
      if (!btn) return;
      range = +btn.dataset.r;
      $$(".ranges button").forEach((b) => b.classList.toggle("on", b === btn));
      drawChart();
    });

    /* ---------- HOME: accounts ---------- */
    const ACCT = [
      ["cash", "💵", "Cash", "Everyday spending"],
      ["savings", "🎯", "Savings", ""],
      ["invest", "📈", "Invest", "Set aside for the market"],
    ];
    const renderAccounts = () => {
      const b = balances();
      $(".accounts").innerHTML = ACCT.map(([id, ic, name, sub]) => {
        const desc = id === "savings" ? (goals.length ? `${goals.length} goal${goals.length > 1 ? "s" : ""}` : "Round Ups land here") : sub;
        return `<button type="button" class="acct" data-acct="${id}">
          <span class="acct-ic ${id}">${ic}</span>
          <span class="acct-info"><b>${name}</b><small>${desc}</small></span>
          <span class="acct-v ${b[id] < 0 ? "neg" : ""}">${money(b[id])}</span>
          <span class="acct-chev">›</span>
        </button>`;
      }).join("");
    };
    $(".accounts").addEventListener("click", (e) => {
      const btn = e.target.closest(".acct");
      if (!btn) return;
      go(btn.dataset.acct === "cash" ? "insights" : "save");
    });

    /* ---------- HOME: quick add + form ---------- */
    const fillCats = (type) => {
      catSel.innerHTML = CATS[type].map(([c, e]) => `<option value="${c}">${e} ${c}</option>`).join("");
    };
    let formType = "out";
    const openForm = (type) => {
      formType = type;
      fillCats(type);
      $(".f-title").textContent = type === "in" ? "New income" : "New expense";
      const note = $(".split-note");
      if (type === "in") {
        note.textContent = `Auto-split · ${cashPct()}% cash · ${split.savings}% savings · ${split.invest}% invest`;
        note.classList.remove("hidden");
      } else if (card.roundups) {
        note.textContent = "Round Ups on · spare change goes to savings";
        note.classList.remove("hidden");
      } else note.classList.add("hidden");
      form.classList.remove("hidden");
      form.amount.focus();
    };
    $(".q-in").addEventListener("click", () => openForm("in"));
    $(".q-out").addEventListener("click", () => openForm("out"));
    $(".f-close").addEventListener("click", () => form.classList.add("hidden"));

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const amount = parseFloat(form.amount.value);
      if (!Number.isFinite(amount) || amount <= 0) return;
      const entry = {
        id: Date.now(),
        date: localDate(),
        type: formType,
        amount,
        cat: form.cat.value,
        note: form.note.value.trim(),
      };
      if (formType === "in") entry.split = { savings: split.savings, invest: split.invest };
      else if (card.roundups) {
        const ru = Math.round((Math.ceil(amount / 10) * 10 - amount) * 100) / 100;
        if (ru > 0) entry.roundup = ru;
      }
      entries.push(entry);
      form.amount.value = "";
      form.note.value = "";
      persist();
      update();
    });

    /* ---------- HOME: activity ---------- */
    const renderActivity = () => {
      const list = $(".entries");
      list.innerHTML = "";
      const visible = entries
        .filter((e) => filter === "all" || e.type === filter)
        .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.id - a.id));
      for (const e of visible.slice(0, shown)) {
        const row = document.createElement("div");
        row.className = "entry";
        const emoji = (CATS[e.type].find(([c]) => c === e.cat) ?? ["", "•"])[1];
        row.innerHTML = `
          <span class="d">${dateShort(noon(e.date))}</span>
          <span class="what"></span>
          <span class="amt ${e.type}">${e.type === "in" ? "+" : "−"}${money(e.amount)}</span>
          <button class="x-btn" title="Delete" aria-label="Delete entry">✕</button>
        `;
        const bits = [`${emoji} ${e.cat}`];
        if (e.note) bits.push(e.note);
        if (e.roundup) bits.push(`↻ ${money(e.roundup)}`);
        row.querySelector(".what").textContent = bits.join(" · ");
        row.querySelector(".x-btn").addEventListener("click", () => {
          entries = entries.filter((x) => x.id !== e.id);
          persist();
          update();
        });
        list.append(row);
      }
      if (!visible.length) list.innerHTML = `<div class="empty">Nothing here yet</div>`;
      $(".more-btn").classList.toggle("hidden", visible.length <= shown);
    };
    $(".m-tabs").addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-f]");
      if (!btn) return;
      filter = btn.dataset.f;
      shown = 8;
      $$(".m-tabs button").forEach((b) => b.classList.toggle("on", b === btn));
      renderActivity();
    });
    $(".more-btn").addEventListener("click", () => {
      shown += 12;
      renderActivity();
    });

    /* ---------- SAVE: donut ---------- */
    const renderDonut = () => {
      const fr = { cash: cashPct() / 100, savings: split.savings / 100, invest: split.invest / 100 };
      const live = SEGS.filter(([id]) => fr[id] > 0);
      const gap = live.length > 1 ? 7 : 0;
      let acc = 0;
      for (const [id] of SEGS) {
        const arc = $(`.dist-arc[data-s="${id}"]`);
        const len = Math.max(fr[id] * DONUT_C - gap, 0.01);
        arc.style.opacity = fr[id] > 0 ? 1 : 0;
        arc.setAttribute("stroke-dasharray", `${len} ${DONUT_C}`);
        arc.setAttribute("stroke-dashoffset", -(acc + gap / 2));
        acc += fr[id] * DONUT_C;
      }
      $(".dc-pct").textContent = `${cashPct()}%`;

      $(".dist-rows").innerHTML = SEGS.map(([id, name]) => {
        const pct = id === "cash" ? cashPct() : split[id];
        const ctrl =
          id === "cash"
            ? `<span class="d-lock" title="Cash is whatever's left">🔒</span>`
            : `<span class="d-step"><button type="button" data-seg="${id}" data-d="-5" aria-label="Less to ${name}">−</button><button type="button" data-seg="${id}" data-d="5" aria-label="More to ${name}">＋</button></span>`;
        return `<div class="d-row"><i class="d-dot ${id}"></i><span class="d-name">${name}</span>${ctrl}<b class="d-pct">${pct}%</b></div>`;
      }).join("");
    };
    $(".dist").addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-seg]");
      if (!btn) return;
      const { seg, d } = btn.dataset;
      const next = split[seg] + +d;
      const other = seg === "savings" ? split.invest : split.savings;
      if (next < 0 || next + other > 95) return; // เหลือ cash อย่างน้อย 5%
      split[seg] = next;
      persistSplit();
      renderDonut();
      if (formType === "in" && !form.classList.contains("hidden")) openForm("in");
    });

    /* ---------- SAVE: goals ---------- */
    const renderGoals = () => {
      const avail = balances().savings - goalAllocated();
      $(".g-avail").innerHTML = `<b>${money(avail)}</b> available to put toward goals`;
      const rate = monthlySavingsInflow();
      const wrap = $(".goals");
      wrap.innerHTML = "";
      if (!goals.length) wrap.innerHTML = `<div class="empty">No goals yet — a car? a trip? name it below</div>`;
      for (const g of goals) {
        const pct = Math.min((g.saved / g.target) * 100, 100);
        const done = g.saved >= g.target;
        const left = Math.max(g.target - g.saved, 0);
        const eta = done ? "" : rate > 0 ? `≈ ${Math.min(Math.ceil(left / rate), 99)} mo` : "";
        const row = document.createElement("div");
        row.className = `goal${done ? " done" : ""}`;
        row.innerHTML = `
          <div class="g-top">
            <span class="g-emoji">${g.emoji}</span>
            <div class="g-info">
              <div class="g-name">${g.name} ${done ? `<span class="g-badge">✓ Funded</span>` : eta ? `<span class="g-eta">${eta}</span>` : ""}</div>
              <div class="g-nums">${money(g.saved)} / ${money(g.target)} · ${Math.round((g.saved / g.target) * 100)}%</div>
            </div>
            <button type="button" class="btn-soft g-open">＋</button>
            <button type="button" class="x-btn" title="Delete goal" aria-label="Delete goal">✕</button>
          </div>
          <div class="track"><span class="fill" style="width:${pct}%"></span></div>
          <div class="g-add hidden">
            <input type="number" min="0.01" step="0.01" placeholder="Amount" aria-label="Amount">
            <button type="button" class="btn-soft g-put">Add</button>
            <button type="button" class="btn-ghost g-take">Take out</button>
          </div>
        `;
        row.querySelector(".g-open").addEventListener("click", () => {
          row.querySelector(".g-add").classList.toggle("hidden");
          row.querySelector(".g-add input").focus();
        });
        row.querySelector(".g-put").addEventListener("click", () => {
          const amt = parseFloat(row.querySelector(".g-add input").value);
          const free = balances().savings - goalAllocated();
          if (!Number.isFinite(amt) || amt <= 0) return;
          g.saved = Math.round((g.saved + Math.min(amt, Math.max(free, 0))) * 100) / 100;
          persistGoals();
          update();
        });
        row.querySelector(".g-take").addEventListener("click", () => {
          const amt = parseFloat(row.querySelector(".g-add input").value);
          if (!Number.isFinite(amt) || amt <= 0) return;
          g.saved = Math.round(Math.max(g.saved - amt, 0) * 100) / 100;
          persistGoals();
          update();
        });
        row.querySelector(".x-btn").addEventListener("click", () => {
          goals = goals.filter((x) => x.id !== g.id);
          persistGoals();
          update();
        });
        wrap.append(row);
      }
    };
    $(".g-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const f = e.target;
      const target = parseFloat(f.target.value);
      const name = f.name.value.trim();
      if (!name || !Number.isFinite(target) || target <= 0) return;
      goals.push({ id: Date.now(), name, emoji: f.emoji.value, target, saved: 0 });
      f.name.value = "";
      f.target.value = "";
      persistGoals();
      update();
    });

    /* ---------- INSIGHTS ---------- */
    const renderMonth = () => {
      monthPick.querySelector(".m").textContent = new Date(ym.y, ym.m, 1).toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      });
      const rows = entries.filter(inMonth);
      const { in: sumIn, out: sumOut } = monthSums(ym.y, ym.m);
      const net = sumIn - sumOut;

      const big = $(".mo-big");
      big.classList.toggle("neg", net < 0);
      big.textContent = money(net);
      $(".mo .io.in .v").textContent = money(sumIn);
      $(".mo .io.out .v").textContent = money(sumOut);

      // วงแหวน "เก็บได้กี่ % ของรายรับ" — เดือนที่ไม่มีรายรับก็ไม่มีอะไรให้วัด
      const dial = $(".mo .dial-sm");
      const noteEl = $(".mo .note");
      if (sumIn > 0) {
        const rate = net / sumIn;
        dial.classList.remove("hidden");
        dial.classList.toggle("over", net < 0);
        dial.querySelector(".ring-val").setAttribute(
          "stroke-dasharray",
          `${Math.max(0.02, Math.min(Math.abs(rate), 1)) * RING_C} ${RING_C}`
        );
        dial.querySelector(".c").textContent = `${Math.round(rate * 100)}%`;
        noteEl.textContent =
          net >= 0
            ? `Saved ${money(net)} of ${money(sumIn)} earned`
            : `Overspent by ${money(-net)} — see the breakdown below`;
      } else {
        dial.classList.add("hidden");
        noteEl.textContent = rows.length ? "No income recorded this month" : "Nothing recorded this month yet";
      }

      // แท่งคู่ 6 เดือนล่าสุด (นับถึงเดือนที่เลือก)
      const months = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(ym.y, ym.m - i, 1);
        months.push({ y: d.getFullYear(), m: d.getMonth(), ...monthSums(d.getFullYear(), d.getMonth()) });
      }
      const maxV = Math.max(1, ...months.flatMap((x) => [x.in, x.out]));
      $(".trend-bars").innerHTML = months
        .map((x, i) => {
          const lbl = new Date(x.y, x.m, 1).toLocaleDateString("en-US", { month: "short" });
          const on = x.y === ym.y && x.m === ym.m;
          return `<div class="tm${on ? " on" : ""}" title="${lbl} — In ${money0(x.in)} · Out ${money0(x.out)}">
            <div class="bars">
              <i class="bi" style="height:${(x.in / maxV) * 100}%; animation-delay:${i * 50}ms"></i>
              <i class="bo" style="height:${(x.out / maxV) * 100}%; animation-delay:${i * 50 + 25}ms"></i>
            </div>
            <span>${lbl[0]}</span>
          </div>`;
        })
        .join("");

      // breakdown — แท่งสีเดียว เรียงมาก→น้อย (identity อยู่ที่ label ไม่ใช่สี)
      const byCat = {};
      for (const e of rows) if (e.type === "out") byCat[e.cat] = (byCat[e.cat] ?? 0) + e.amount;
      const cats = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
      const maxCat = cats[0]?.[1] ?? 1;
      $(".breakdown").innerHTML = cats.length
        ? cats
            .map(
              ([c, a], i) => `<div class="cat-row">
                <span class="name">${c}</span>
                <span class="track"><span class="fill" style="width:${(a / maxCat) * 100}%; animation-delay:${i * 45}ms"></span></span>
                <span class="amt">${money(a)} · ${Math.round((a / sumOut) * 100)}%</span>
              </div>`
            )
            .join("")
        : `<div class="empty">No spending this month</div>`;

      renderBudgets(byCat);
      renderFeed(sumIn, sumOut, cats, byCat);
    };

    // ---- งบต่อหมวด: แถบเทียบจ่ายจริง/เพดาน เปลี่ยนสีตอนใกล้เต็ม (>80%) และเกิน (>100%) ----
    const renderBudgets = (byCat) => {
      const budgetBox = $(".budgets");
      budgetBox.innerHTML = CATS.out
        .map(([c, emoji]) => {
          const spent = byCat[c] ?? 0;
          const cap = budgets[c] ?? 0;
          const pct = cap > 0 ? spent / cap : 0;
          const state = cap === 0 ? "" : pct >= 1 ? "over" : pct >= 0.8 ? "warn" : "ok";
          const capBtn =
            cap > 0
              ? `${Math.round(pct * 100)}%`
              : `<span class="b-set">Set</span>`;
          return `<div class="budget-row ${state}" data-cat="${c}">
            <span class="b-emoji">${emoji}</span>
            <div class="b-main">
              <div class="b-top">
                <span class="b-name">${c}</span>
                <span class="b-fig">${cap > 0 ? `${money0(spent)} / ${money0(cap)}` : money0(spent)}</span>
              </div>
              <span class="b-track"><span class="b-fill" style="width:${Math.min(pct, 1) * 100}%"></span></span>
            </div>
            <button class="b-cap" title="Set monthly budget for ${c}">${capBtn}</button>
          </div>`;
        })
        .join("");

      budgetBox.querySelectorAll(".b-cap").forEach((btn) => {
        btn.addEventListener("click", () => {
          const cat = btn.closest(".budget-row").dataset.cat;
          const input = document.createElement("input");
          input.type = "number";
          input.min = "0";
          input.step = "100";
          input.className = "b-cap-input";
          input.value = budgets[cat] ?? "";
          input.placeholder = "฿ / mo";
          const commit = () => {
            const v = parseFloat(input.value);
            if (Number.isFinite(v) && v > 0) budgets[cat] = Math.round(v);
            else delete budgets[cat];
            save("money.budgets", budgets);
            update();
          };
          input.addEventListener("blur", commit);
          input.addEventListener("keydown", (ev) => {
            if (ev.key === "Enter") input.blur();
            if (ev.key === "Escape") {
              input.value = budgets[cat] ?? "";
              input.blur();
            }
          });
          btn.replaceWith(input);
          input.focus();
          input.select();
        });
      });
    };

    // ประโยคสั้นๆ ที่คำนวณจากข้อมูลจริงของเดือนนั้น (สไตล์ feed ของ Robinhood Strategies)
    const renderFeed = (sumIn, sumOut, cats, byCat) => {
      const prevD = new Date(ym.y, ym.m - 1, 1);
      const prev = monthSums(prevD.getFullYear(), prevD.getMonth());
      const items = [];

      if (sumIn > 0 && prev.in > 0) {
        const r = Math.round(((sumIn - sumOut) / sumIn) * 100);
        const rPrev = Math.round(((prev.in - prev.out) / prev.in) * 100);
        items.push({
          tone: r >= rPrev ? "up" : "down",
          text: `Savings rate ${r}% — ${r === rPrev ? "same as" : r > rPrev ? "up from" : "down from"} ${rPrev}% last month.`,
        });
      }
      // งบที่ทะลุเพดาน — เตือนก่อนเรื่องอื่น
      const over = CATS.out
        .map(([c]) => ({ c, cap: budgets[c] ?? 0, spent: byCat[c] ?? 0 }))
        .filter((x) => x.cap > 0 && x.spent > x.cap);
      if (over.length) {
        const worst = over.sort((a, b) => b.spent / b.cap - a.spent / a.cap)[0];
        items.push({
          tone: "down",
          text: `${worst.c} is ${Math.round((worst.spent / worst.cap - 1) * 100)}% over its ${money0(worst.cap)} budget.`,
        });
      }
      if (cats.length) {
        const [c, a] = cats[0];
        items.push({ tone: "flat", text: `${c} was your biggest expense (${money0(a)} · ${Math.round((a / sumOut) * 100)}% of spending).` });
      }
      // หมวดที่ขยับแรงสุดเทียบเดือนก่อน (ดูเฉพาะหมวดที่มีนัย ≥ ฿500 ฝั่งใดฝั่งหนึ่ง)
      const prevCat = {};
      for (const e of entries)
        if (e.type === "out" && inMonthOf(e, prevD.getFullYear(), prevD.getMonth()))
          prevCat[e.cat] = (prevCat[e.cat] ?? 0) + e.amount;
      let mover = null;
      for (const c of new Set([...Object.keys(byCat), ...Object.keys(prevCat)])) {
        const a = byCat[c] ?? 0, b = prevCat[c] ?? 0;
        if (Math.max(a, b) < 500 || b === 0) continue;
        const chg = (a - b) / b;
        if (!mover || Math.abs(chg) > Math.abs(mover.chg)) mover = { c, chg };
      }
      if (mover && Math.abs(mover.chg) >= 0.15)
        items.push({
          tone: mover.chg > 0 ? "down" : "up",
          text: `${mover.c} spending ${mover.chg > 0 ? "up" : "down"} ${Math.round(Math.abs(mover.chg) * 100)}% vs last month.`,
        });
      const ru = entries.filter((e) => inMonth(e) && e.roundup).reduce((s, e) => s + e.roundup, 0);
      if (ru > 0) items.push({ tone: "gold", text: `Round Ups quietly moved ${money(ru)} into savings this month.` });
      const rate = monthlySavingsInflow();
      const next = goals.filter((g) => g.saved < g.target).sort((a, b) => a.target - a.saved - (b.target - b.saved))[0];
      if (next && rate > 0)
        items.push({ tone: "gold", text: `At this pace, ${next.emoji} ${next.name} is ≈ ${Math.min(Math.ceil((next.target - next.saved) / rate), 99)} months away.` });

      $(".feed").innerHTML = items.length
        ? items.slice(0, 4).map((x) => `<div class="ins"><i class="ins-dot ${x.tone}"></i><span>${x.text}</span></div>`).join("")
        : `<div class="empty">Add a few entries and insights show up here</div>`;
    };

    monthPick.querySelector(".prev").addEventListener("click", () => {
      ym = ym.m === 0 ? { y: ym.y - 1, m: 11 } : { y: ym.y, m: ym.m - 1 };
      renderMonth();
    });
    monthPick.querySelector(".next").addEventListener("click", () => {
      ym = ym.m === 11 ? { y: ym.y + 1, m: 0 } : { y: ym.y, m: ym.m + 1 };
      renderMonth();
    });

    /* ---------- CARD ---------- */
    const vcard = $(".vcard");
    const renderCard = () => {
      vcard.classList.toggle("locked", card.locked);
      $(".vc-toggle").textContent = card.locked ? "Unlock" : "Lock card";
      $(".ru-toggle").checked = card.roundups;
      const total = entries.reduce((s, e) => s + (e.roundup || 0), 0);
      $(".ru-stat").innerHTML = card.roundups || total > 0 ? `Saved so far: <b>${money(total)}</b>` : "";

      const y = now0.getFullYear(), m = now0.getMonth();
      const spent = monthSums(y, m).out;
      $(".cs-month").textContent = new Date(y, m, 1).toLocaleDateString("en-US", { month: "long" });
      $(".cs-big").textContent = money(spent);
      const recent = entries
        .filter((e) => e.type === "out")
        .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.id - a.id))
        .slice(0, 3);
      $(".cs-recent").innerHTML = recent.length
        ? recent
            .map((e) => {
              const emoji = (CATS.out.find(([c]) => c === e.cat) ?? ["", "•"])[1];
              return `<div class="entry"><span class="d">${dateShort(noon(e.date))}</span><span class="what">${emoji} ${e.cat}</span><span class="amt out">−${money(e.amount)}</span></div>`;
            })
            .join("")
        : `<div class="empty">No card spending yet</div>`;
    };
    $(".vc-toggle").addEventListener("click", () => {
      card.locked = !card.locked;
      persistCard();
      renderCard();
    });
    vcard.addEventListener("click", () => {
      if (card.locked) return;
      card.locked = true;
      persistCard();
      renderCard();
    });
    $(".ru-toggle").addEventListener("change", (e) => {
      card.roundups = e.target.checked;
      persistCard();
      renderCard();
      if (formType === "out" && !form.classList.contains("hidden")) openForm("out");
    });

    /* ---------- nav ---------- */
    const go = (v) => {
      cur = v;
      $$(".m-view").forEach((s) => s.classList.toggle("hidden", s.dataset.v !== v));
      $$(".m-nav button").forEach((b) => b.classList.toggle("on", b.dataset.v === v));
      monthPick.classList.toggle("hidden", v !== "insights");
      $(".m-title").textContent = TITLES[v];
      (body.parentElement ?? body).scrollTop = 0;
      if (v === "home") drawChart(); // กราฟวาดตอน view ถูกซ่อนจะได้ width 0
    };
    $(".m-nav").addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-v]");
      if (btn) go(btn.dataset.v);
    });

    /* ---------- boot ---------- */
    const update = () => {
      renderHero();
      drawChart();
      renderAccounts();
      renderDonut();
      renderGoals();
      renderMonth();
      renderCard();
      renderActivity();
      firstPaint = false;
    };

    $$(".m-view").forEach((v) => stagger(v));
    flush(body);
    update();
  },
};
