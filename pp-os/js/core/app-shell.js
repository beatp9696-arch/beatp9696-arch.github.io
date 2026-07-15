// App shell — โหมดแอปมือถือ: ไม่มี desktop/หน้าต่าง มีแค่ view เต็มจอ + แท็บล่าง
// ใช้ app contract เดิม { id, name, icon, mount(body) } เหมือน window manager ทุกประการ

import { getApp } from "./app-registry.js";
import { dumpAll, hasSnapshot, load, replaceAll, save, storageInfo, undoRestore } from "./storage.js";
import { CATS as MONEY_CATS, localDate } from "../apps/money.js";

const I = (d) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;

const ICONS = {
  me: I('<circle cx="12" cy="8" r="3.6"/><path d="M4.8 20a7.2 7.2 0 0 1 14.4 0"/>'),
  health: I('<path d="M20.4 6.9a4.6 4.6 0 0 0-7.8-2L12 5.6l-.6-.7a4.6 4.6 0 0 0-7.8 2c-.5 2 .3 3.9 1.8 5.5L12 19l6.6-6.6c1.5-1.6 2.3-3.5 1.8-5.5Z"/><path d="M3.4 12h3.3l1.5-2.4 2 4.4 1.6-3 1.1 1h4.2"/>'),
  money: I('<rect x="3" y="6" width="18" height="13" rx="3"/><path d="M3 10h18"/><circle cx="16.5" cy="14.5" r="1.4"/><path d="M6.5 3.8 15 6"/>'),
  weather: I('<circle cx="8.2" cy="8.2" r="3"/><path d="M8.2 2.4v1.3M8.2 12.7V14M2.4 8.2h1.3M12.7 8.2H14M4.1 4.1l.9.9M11.4 11.4l.9.9M12.3 4.1l-.9.9M5 11.4l-.9.9"/><path d="M9 20h8.5a3.5 3.5 0 0 0 .3-7 5 5 0 0 0-9.4-1.1A3.6 3.6 0 0 0 9 20Z"/>'),
  more: I('<path d="M4 7h16M4 12h16M4 17h16"/>'),
  back: I('<path d="M15 5l-7 7 7 7"/>'),
  chev: I('<path d="M9 5l7 7-7 7"/>'),
  ext: I('<path d="M14 4h6v6"/><path d="M20 4 11 13"/><path d="M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4"/>'),
  plus: I('<path d="M12 5v14M5 12h14"/>'),
  home: I('<path d="M4 11 12 4l8 7"/><path d="M6 10v9h12v-9"/><path d="M10 19v-5h4v5"/>'),
  articles: I('<path d="M5 4h10l4 4v12H5Z"/><path d="M8 9h6M8 13h8M8 17h5"/>'),
  stocks: I('<path d="M4 18 9 12l4 4 7-8"/><path d="M20 6h-4M20 6v4"/>'),
  tools: I('<path d="M14.6 5.6a3.5 3.5 0 0 0-4.8 4.3L4 15.6 6.4 18l5.7-5.7a3.5 3.5 0 0 0 4.3-4.8l-2.2 2.2-1.6-.4-.4-1.6Z"/>'),
  gauge: I('<path d="M4 15a8 8 0 0 1 16 0"/><path d="M12 15l4.5-4"/><circle cx="12" cy="15" r="1.2"/>'),
};

const TABS = [
  { id: "me", label: "Me", app: "me" },
  { id: "health", label: "Health", app: "health" },
  { id: "money", label: "Money", app: "money" },
  { id: "weather", label: "Weather", app: "weather" },
  { id: "more", label: "More", app: null },
];

// แอปที่ไม่มีแท็บของตัวเอง — ไปอยู่ใต้ More
const MORE_APPS = [
  ["notes", "A scratchpad that saves itself"],
  ["todo", "Every task (Me shows the first five)"],
  ["calculator", "Quick math"],
];

// ---- Moatrices ในแอป ----
// เว็บ (beatp9696-arch.github.io) กับแอป (…/pp-os/) อยู่ origin เดียวกัน และ GitHub Pages
// ไม่ส่ง X-Frame-Options → ฝังเป็น web view ในแอปได้เลย ไม่ต้องเด้งออกเบราว์เซอร์
// แอปถูกเสิร์ฟที่ <root>/pp-os/ เสมอ → เว็บคือระดับบนขึ้นไปหนึ่งชั้น (same origin จริงๆ)
// ถ้ารัน pp-os เดี่ยวๆ ตอน dev (ไม่มี /pp-os/ ใน path) ค่อย fallback ไปเว็บจริง
const SITE = location.pathname.includes("/pp-os/")
  ? location.pathname.replace(/pp-os\/.*$/, "")
  : "https://beatp9696-arch.github.io/";

const WEB_VIEWS = [
  ["Moatrices", "index.html", ICONS.home, "Home — latest pieces and series"],
  ["Articles", "articles.html", ICONS.articles, "Every deep dive in one list"],
  ["Stocks", "stocks.html", ICONS.stocks, "The portfolio companies"],
  ["Tools", "tools.html", ICONS.tools, "Reverse DCF and the rest"],
  ["Dashboard", "dashboard.html", ICONS.gauge, "Indices and the MAG7 tape"],
];

// สีแถบสถานะของมือถือ ให้กลืนกับพื้นหลังของแท็บที่เปิดอยู่
const THEME = { me: "#0f1215", more: "#0f1215", health: "#0c1014", money: "#0f120e", weather: "#14100b" };

let shell, view, bar, themeMeta;
let curIdx = 0; // แท็บที่เปิดอยู่ (index ใน TABS) — ใช้คำนวณทิศสไลด์เวลากดหรือปัด

export function initShell() {
  document.body.classList.add("mode-app");
  document.getElementById("desktop")?.remove();
  document.getElementById("taskbar")?.remove();
  document.getElementById("start-menu")?.remove();

  // theme-color แบบมี media ทำให้ override ด้วย JS ไม่ได้ — ถอดแล้วคุมเองตัวเดียว
  for (const m of document.querySelectorAll('meta[name="theme-color"]')) m.remove();
  themeMeta = document.createElement("meta");
  themeMeta.name = "theme-color";
  document.head.append(themeMeta);

  shell = document.createElement("div");
  shell.id = "shell";
  shell.innerHTML = `<main id="shell-view"></main><nav id="tabbar"></nav>`;
  document.body.append(shell);

  view = shell.querySelector("#shell-view");
  bar = shell.querySelector("#tabbar");

  for (const t of TABS) {
    const btn = document.createElement("button");
    btn.className = "tab";
    btn.dataset.tab = t.id;
    btn.innerHTML = `${ICONS[t.id]}<span>${t.label}</span>`;
    btn.addEventListener("click", () => goTab(t.id));
    bar.append(btn);
  }

  // การ์ดในหน้า Me กดแล้วเด้งไปแท็บที่ลึกกว่า
  document.addEventListener("pp-go", (e) => goTab(e.detail));

  buildQuickAdd();
  wireSwipe();

  const start = new URLSearchParams(location.search).get("tab");
  goTab(TABS.some((t) => t.id === start) ? start : "me");
}

function goTab(id, opts = {}) {
  const idx = TABS.findIndex((t) => t.id === id);
  const dir = opts.dir ?? (idx > curIdx ? 1 : idx < curIdx ? -1 : 0);
  if (idx >= 0) curIdx = idx;

  shell.classList.remove("in-sub"); // กลับมาที่แท็บหลัก = ออกจากหน้าซ้อน (FAB โผล่อีกครั้ง)
  shell.dataset.tab = id;
  for (const b of bar.children) b.classList.toggle("on", b.dataset.tab === id);

  themeMeta.content = THEME[id] ?? "#0f1215";

  const tab = TABS.find((t) => t.id === id);
  view.scrollTop = 0;
  view.dataset.dir = dir; // CSS อ่านไปเลือกทิศ animation (สไลด์ซ้าย/ขวา)
  view.innerHTML = "";

  if (!tab.app) {
    renderMore();
    return;
  }
  mountApp(tab.app);
}

// ปัดซ้าย/ขวาเพื่อสลับแท็บ — เฉพาะตอนอยู่แท็บหลัก (ไม่ใช่หน้าซ้อน) และการเลื่อนเป็นแนวนอนจริงๆ
function wireSwipe() {
  let x0 = null, y0 = null, locked = false;
  const THRESH = 55; // px ที่ต้องปัดถึงจะนับ

  view.addEventListener("touchstart", (e) => {
    if (shell.classList.contains("in-sub") || e.touches.length !== 1) { x0 = null; return; }
    x0 = e.touches[0].clientX;
    y0 = e.touches[0].clientY;
    locked = false;
  }, { passive: true });

  view.addEventListener("touchmove", (e) => {
    if (x0 == null || locked) return;
    const dx = e.touches[0].clientX - x0;
    const dy = e.touches[0].clientY - y0;
    if (Math.abs(dy) > Math.abs(dx)) { x0 = null; return; } // ตั้งใจ scroll แนวตั้ง — ปล่อยผ่าน
    if (Math.abs(dx) > THRESH) {
      locked = true;
      const nextIdx = curIdx + (dx < 0 ? 1 : -1);
      if (nextIdx >= 0 && nextIdx < TABS.length) goTab(TABS[nextIdx].id, { dir: dx < 0 ? 1 : -1 });
    }
  }, { passive: true });
}

function mountApp(appId) {
  const app = getApp(appId);
  const pane = document.createElement("div");
  pane.className = "view";
  view.append(pane);
  app.mount(pane);
}

// ---- More: แอปที่เหลือ + ตั้งค่า ----
function renderMore() {
  const pane = document.createElement("div");
  pane.className = "view more-view";
  const name = load("os.name", "");
  const lastExport = load("os.lastExport");
  const backupAge = lastExport ? Math.floor((Date.now() - lastExport) / 86400000) : null;
  const backupNote =
    backupAge === null
      ? "Never backed up — this device is the only copy"
      : backupAge === 0
        ? "Backed up today"
        : `Last backup ${backupAge} day${backupAge > 1 ? "s" : ""} ago`;

  pane.innerHTML = `
    <h1 class="more-h">More</h1>

    <div class="more-sec">Moatrices</div>
    <div class="more-list">
      <button class="more-row disc-feature" data-act="discover">
        <span class="mr-ico mr-ico-sq">${ICONS.stocks}</span>
        <span class="mr-txt"><b>Discover stocks</b><small>Browse 20 deep dives by sector — read in-app</small></span>
        <span class="mr-chev">${ICONS.chev}</span>
      </button>
      ${WEB_VIEWS.map(
        ([title, path, ico, desc]) => `<button class="more-row" data-web="${path}" data-title="${title}">
          <span class="mr-ico">${ico}</span>
          <span class="mr-txt"><b>${title}</b><small>${desc}</small></span>
          <span class="mr-chev">${ICONS.chev}</span>
        </button>`
      ).join("")}
    </div>

    <div class="more-sec">Apps</div>
    <div class="more-list">
      ${MORE_APPS.map(([id, desc]) => {
        const a = getApp(id);
        return `<button class="more-row" data-app="${id}">
          <span class="mr-ico">${a.icon}</span>
          <span class="mr-txt"><b>${a.name}</b><small>${desc}</small></span>
          <span class="mr-chev">${ICONS.chev}</span>
        </button>`;
      }).join("")}
    </div>

    <div class="more-sec">Settings</div>
    <div class="more-list">
      <button class="more-row" data-act="hk">
        <span class="mr-ico">⌚</span>
        <span class="mr-txt"><b>Apple Health</b><small>Pull steps, sleep and workouts — stop logging by hand</small></span>
        <span class="mr-chev">${ICONS.chev}</span>
      </button>
      <div class="more-row static">
        <span class="mr-ico">🙂</span>
        <span class="mr-txt"><b>Name</b><small>${name || "Not set — add it on the Me tab"}</small></span>
      </div>
      <button class="more-row" data-act="desktop">
        <span class="mr-ico">🖥️</span>
        <span class="mr-txt"><b>Switch to desktop mode</b><small>Draggable windows and a taskbar</small></span>
        <span class="mr-chev">${ICONS.chev}</span>
      </button>
    </div>

    <div class="more-sec">Data</div>
    <div class="more-list">
      <button class="more-row" data-act="export">
        <span class="mr-ico">⬇️</span>
        <span class="mr-txt"><b>Back up to a file</b><small>${backupNote}</small></span>
        <span class="mr-chev">${ICONS.chev}</span>
      </button>
      <button class="more-row" data-act="restore">
        <span class="mr-ico">⬆️</span>
        <span class="mr-txt"><b>Restore from a backup</b><small>Shows you what's inside before it overwrites anything</small></span>
        <span class="mr-chev">${ICONS.chev}</span>
      </button>
      ${
        hasSnapshot()
          ? `<button class="more-row" data-act="undo">
              <span class="mr-ico">↩️</span>
              <span class="mr-txt"><b>Undo the last restore</b><small>Put back the data that was here before</small></span>
              <span class="mr-chev">${ICONS.chev}</span>
            </button>`
          : ""
      }
      <div class="more-row static">
        <span class="mr-ico">🗄️</span>
        <span class="mr-txt"><b>Storage</b><small class="store-info">checking…</small></span>
      </div>
    </div>

    <div class="more-foot">PP OS · Everything stays on this device. Nothing is sent to a server.</div>
    <div class="sheet-host"></div>
  `;
  view.append(pane);

  for (const row of pane.querySelectorAll("[data-app]")) {
    row.addEventListener("click", () => openSub(row.dataset.app));
  }
  for (const row of pane.querySelectorAll("[data-web]")) {
    row.addEventListener("click", () => openWeb(row.dataset.web, row.dataset.title));
  }
  pane.querySelector('[data-act="discover"]').addEventListener("click", openDiscover);
  pane.querySelector('[data-act="hk"]').addEventListener("click", () => {
    goTab("health"); // ชีตนำเข้าอยู่ในแอป Health — เด้งไปแล้วสั่งเปิดให้เลย
    document.dispatchEvent(new CustomEvent("pp-hk-open"));
  });
  pane.querySelector('[data-act="desktop"]').addEventListener("click", () => {
    save("os.mode", "desktop");
    location.replace(location.pathname);
  });
  pane.querySelector('[data-act="export"]').addEventListener("click", () => {
    exportData();
    goTab("more"); // วาดใหม่ให้เห็นว่า "Backed up today" แล้ว
  });
  pane.querySelector('[data-act="restore"]').addEventListener("click", () => openRestore(pane));
  pane.querySelector('[data-act="undo"]')?.addEventListener("click", () => {
    if (undoRestore()) {
      toast(pane, "✓ Restored the data that was here before");
      goTab("more");
    }
  });

  // ข้อมูลที่เก็บอยู่จริง + เบราว์เซอร์รับปากว่าจะไม่ลบทิ้งหรือยัง
  storageInfo().then((info) => {
    const el = pane.querySelector(".store-info");
    if (!el || !pane.isConnected) return;
    const size = info.usedKB == null ? "" : ` · ${info.usedKB < 1024 ? `${info.usedKB} KB` : `${(info.usedKB / 1024).toFixed(1)} MB`}`;
    el.textContent = info.persisted
      ? `${info.engine} · protected from auto-cleanup${size}`
      : `${info.engine} · not protected yet — install to the Home Screen${size}`;
    el.classList.toggle("warn", !info.persisted);
  });
}

// ---- Restore: ต้องเห็นก่อนว่าไฟล์มีอะไร แล้วค่อยตัดสินใจทับ ----
const plural = (n, one, many = one + "s") => `${n} ${n === 1 ? one : many}`;

const COUNTS = [
  ["health.days", (v) => `${plural(Object.keys(v).length, "day")} of health data`],
  ["money.entries", (v) => `${plural(v.length, "money entry", "money entries")}`],
  ["todo.items", (v) => plural(v.length, "task")],
  ["notes.text", (v) => `${plural(v.length, "character")} of notes`],
  ["os.name", (v) => `name: ${v}`],
];

function summarize(data) {
  const lines = [];
  for (const [key, fmt] of COUNTS) {
    const v = data[key];
    if (v == null) continue;
    try {
      lines.push(fmt(v));
    } catch {}
  }
  return lines;
}

function openRestore(morePane) {
  const host = morePane.querySelector(".sheet-host");
  host.innerHTML = `
    <div class="sheet">
      <div class="sheet-card">
        <div class="sheet-h">
          <span>⬆️ Restore from a backup</span>
          <button class="sheet-x" aria-label="Close">✕</button>
        </div>
        <p class="sheet-p">Pick a <code>pp-os-backup-*.json</code> file. Nothing is overwritten until you confirm — and you can undo it afterwards.</p>
        <label class="sheet-drop">
          <input type="file" accept=".json,application/json" hidden>
          <b>Choose a backup file</b>
          <small>Exported from PP OS on any device</small>
        </label>
        <div class="sheet-status"></div>
        <div class="sheet-actions hidden">
          <button class="btn-ghost sheet-cancel">Cancel</button>
          <button class="btn sheet-go">Overwrite my data</button>
        </div>
      </div>
    </div>
  `;

  const sheet = host.querySelector(".sheet");
  const status = host.querySelector(".sheet-status");
  const actions = host.querySelector(".sheet-actions");
  const close = () => (host.innerHTML = "");
  let payload = null;

  sheet.addEventListener("click", (e) => e.target === sheet && close());
  host.querySelector(".sheet-x").addEventListener("click", close);
  host.querySelector(".sheet-cancel").addEventListener("click", close);

  host.querySelector('input[type="file"]').addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    payload = null;
    actions.classList.add("hidden");

    try {
      const raw = JSON.parse(await file.text());
      // ไฟล์ที่ export ไปคือ { exported, data: {...} } — แต่รับไฟล์ที่เป็น data ล้วนด้วย
      const data = raw?.data && typeof raw.data === "object" ? raw.data : raw;
      if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("unexpected shape");

      const known = summarize(data);
      if (!known.length) throw new Error("no PP OS data inside");

      payload = data;
      const when = raw.exported ? new Date(raw.exported).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }) : "unknown date";
      status.className = "sheet-status ok";
      status.textContent = `Backup from ${when}\n${known.map((l) => "· " + l).join("\n")}\n\nThis replaces everything currently on this device.`;
      actions.classList.remove("hidden");
    } catch (err) {
      status.className = "sheet-status err";
      status.textContent = `That file isn't a PP OS backup — ${err.message}`;
    }
  });

  host.querySelector(".sheet-go").addEventListener("click", () => {
    if (!payload) return;
    replaceAll(payload);
    close();
    goTab("more");
    toast(document.querySelector(".more-view"), "✓ Data restored — you can undo this from More");
  });
}

function toast(root, text) {
  if (!root) return;
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = text;
  root.append(el);
  setTimeout(() => el.remove(), 4000);
}

// โครงหน้าซ้อนของ More: แถบบน (ย้อนกลับ + ชื่อ + ปุ่มเสริม) แล้วคืน pane ว่างให้เอาไปใส่อะไรก็ได้
// ปุ่ม back ของเครื่อง (Android / ปัดขอบจอ) ใช้ได้ด้วย เพราะดัน state เข้า history
function subShell(id, titleHTML, actionHTML = "") {
  shell.classList.add("in-sub"); // ซ่อน FAB + ปิดปัดสลับแท็บระหว่างอยู่หน้าซ้อน
  view.scrollTop = 0;
  view.dataset.dir = 1; // เข้าหน้าซ้อน = สไลด์มาจากขวาเสมอ
  view.innerHTML = "";

  const wrap = document.createElement("div");
  wrap.className = "sub-wrap";
  wrap.innerHTML = `
    <header class="sub-bar">
      <button class="sub-back" aria-label="Back">${ICONS.back}</button>
      <span class="sub-title">${titleHTML}</span>
      ${actionHTML}
    </header>
  `;
  const pane = document.createElement("div");
  pane.className = "view";
  wrap.append(pane);
  view.append(wrap);

  history.pushState({ sub: id }, "");
  const onPop = () => {
    removeEventListener("popstate", onPop);
    if (shell.dataset.tab === "more") goTab("more");
  };
  addEventListener("popstate", onPop);

  wrap.querySelector(".sub-back").addEventListener("click", () => {
    if (history.state?.sub === id) history.back(); // popstate จะพากลับเอง
    else {
      removeEventListener("popstate", onPop);
      goTab("more");
    }
  });

  return { wrap, pane };
}

function openSub(appId) {
  const app = getApp(appId);
  const { pane } = subShell(appId, `${app.icon} ${app.name}`);
  app.mount(pane);
}

// Discover เปิดเป็นหน้าซ้อน (ชื่อล้วน ไม่มีไอคอนนำ) — ตัวมันจัดหัวเรื่อง/reader เอง
function openDiscover() {
  const app = getApp("discover");
  const { pane } = subShell("discover", "Discover");
  app.mount(pane);
}

// Moatrices เปิด "ในแอป" — iframe เต็มจอใต้แถบบน แท็บล่างยังอยู่ ไม่เด้งออกเบราว์เซอร์
function openWeb(path, title) {
  const url = SITE + path;
  const { wrap, pane } = subShell(
    `web:${path}`,
    `📈 ${title}`,
    `<a class="sub-ext" href="${url}" target="_blank" rel="noopener" title="Open in browser" aria-label="Open in browser">${ICONS.ext}</a>`
  );

  pane.classList.add("web-pane");
  pane.innerHTML = `
    <div class="web-load">Loading ${title}…</div>
    <iframe class="web-frame" src="${url}" title="${title}" referrerpolicy="no-referrer"></iframe>
  `;

  const frame = pane.querySelector(".web-frame");
  frame.addEventListener("load", () => {
    pane.querySelector(".web-load")?.remove();
    frame.classList.add("ready");
    // เว็บอยู่ origin เดียวกันตอนรันจริง → อ่านชื่อหน้าที่ผู้ใช้กดเข้าไปข้างในมาโชว์บนแถบได้
    try {
      const t = frame.contentDocument?.title;
      if (t) wrap.querySelector(".sub-title").textContent = `📈 ${t.replace(/\s*[·|—-]\s*Moatrices.*$/i, "")}`;
    } catch {
      /* ต่าง origin (ตอนรัน localhost) — ไม่เป็นไร ใช้ชื่อเดิม */
    }
  });
}

// ---- Quick add: ปุ่มลอย + ชีตบันทึกเร็วจากทุกแท็บ (จ่าย/งาน/น้ำ ใน 2 แตะ) ----
let qaHost;

function buildQuickAdd() {
  const fab = document.createElement("button");
  fab.id = "quick-fab";
  fab.type = "button";
  fab.setAttribute("aria-label", "Quick add");
  fab.innerHTML = ICONS.plus;
  fab.addEventListener("click", openQuickAdd);
  shell.append(fab);

  qaHost = document.createElement("div");
  qaHost.className = "qa-host";
  shell.append(qaHost);
}

function openQuickAdd() {
  let mode = "expense";
  qaHost.innerHTML = `
    <div class="sheet qa-sheet">
      <div class="sheet-card">
        <div class="sheet-h"><span>Quick add</span><button class="sheet-x" aria-label="Close">✕</button></div>
        <div class="qa-seg">
          <button type="button" data-q="expense" class="on">💸 Expense</button>
          <button type="button" data-q="task">✅ Task</button>
          <button type="button" data-q="water">💧 Water</button>
        </div>
        <div class="qa-body"></div>
      </div>
    </div>`;

  const sheet = qaHost.querySelector(".qa-sheet");
  const bodyEl = qaHost.querySelector(".qa-body");
  const close = () => (qaHost.innerHTML = "");
  const onEsc = (e) => {
    if (e.key === "Escape") { close(); removeEventListener("keydown", onEsc); }
  };

  sheet.addEventListener("click", (e) => e.target === sheet && close());
  qaHost.querySelector(".sheet-x").addEventListener("click", close);
  addEventListener("keydown", onEsc);

  const finish = (msg) => {
    removeEventListener("keydown", onEsc);
    close();
    // อยู่แท็บหลักตัวไหน วาดใหม่ให้เห็นเลขที่เพิ่งเพิ่ม (Me/Money/Health อัปเดตทันที)
    if (!shell.classList.contains("in-sub")) goTab(shell.dataset.tab, { dir: 0 });
    toast(document.querySelector("#shell-view .view"), msg);
  };

  const renderBody = () => {
    if (mode === "expense") {
      bodyEl.innerHTML = `
        <form class="qa-form">
          <input name="amount" type="number" min="0.01" step="0.01" inputmode="decimal" placeholder="Amount (THB)" required>
          <select name="cat">${MONEY_CATS.out.map(([c, e]) => `<option value="${c}">${e} ${c}</option>`).join("")}</select>
          <button class="qa-submit" type="submit">Add expense</button>
        </form>`;
      const form = bodyEl.querySelector("form");
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        const amt = parseFloat(form.amount.value);
        if (!Number.isFinite(amt) || amt <= 0) return;
        const entries = load("money.entries", []);
        entries.push({ id: Date.now(), date: localDate(), type: "out", amount: amt, cat: form.cat.value, note: "" });
        save("money.entries", entries);
        finish(`✓ Added ${form.cat.value} expense`);
      });
      form.amount.focus();
    } else if (mode === "task") {
      bodyEl.innerHTML = `
        <form class="qa-form">
          <input name="text" placeholder="What needs doing?" autocomplete="off" required>
          <button class="qa-submit" type="submit">Add task</button>
        </form>`;
      const form = bodyEl.querySelector("form");
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        const text = form.text.value.trim();
        if (!text) return;
        const items = load("todo.items", []);
        items.unshift({ id: Date.now(), text, done: false });
        save("todo.items", items);
        finish("✓ Task added");
      });
      form.text.focus();
    } else {
      const water = load("health.days", {})[localDate()]?.water ?? 0;
      bodyEl.innerHTML = `
        <div class="qa-water">
          <div class="qa-water-now"><b>${water}</b><small>of 8 glasses today</small></div>
          <div class="qa-water-btns">
            <button type="button" data-w="-1" aria-label="Remove a glass">−</button>
            <button type="button" data-w="1" class="add">＋ 1 glass</button>
          </div>
        </div>`;
      bodyEl.querySelectorAll("[data-w]").forEach((b) =>
        b.addEventListener("click", () => {
          const days = load("health.days", {});
          const rec = (days[localDate()] ??= { steps: 0, water: 0, ex: 0, sleep: 0, weight: null, mood: null });
          rec.water = Math.max(0, (rec.water ?? 0) + Number(b.dataset.w));
          save("health.days", days);
          if (Number(b.dataset.w) > 0) finish("✓ Logged a glass of water");
          else renderBody(); // ลบแก้ว = ยังอยู่ในชีต แค่ปรับเลข
        })
      );
    }
  };

  qaHost.querySelector(".qa-seg").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-q]");
    if (!btn) return;
    mode = btn.dataset.q;
    qaHost.querySelectorAll(".qa-seg button").forEach((b) => b.classList.toggle("on", b === btn));
    renderBody();
  });

  renderBody();
}

// export อ่านจาก storage (ไม่ใช่ localStorage ตรงๆ อีกแล้ว — ข้อมูลจริงอยู่ใน IndexedDB)
export function exportData() {
  const data = dumpAll();
  const blob = new Blob([JSON.stringify({ app: "pp-os", exported: new Date().toISOString(), data }, null, 2)], {
    type: "application/json",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `pp-os-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  save("os.lastExport", Date.now());
}
