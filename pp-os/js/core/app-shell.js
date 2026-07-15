// App shell — โหมดแอปมือถือ: ไม่มี desktop/หน้าต่าง มีแค่ view เต็มจอ + แท็บล่าง
// ใช้ app contract เดิม { id, name, icon, mount(body) } เหมือน window manager ทุกประการ

import { getApp } from "./app-registry.js";
import { dumpAll, load, save } from "./storage.js";
import { CATS as MONEY_CATS, localDate } from "../apps/money.js";

const I = (d) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;

const ICONS = {
  // แท็บ Moatrices — ไอคอนกราฟแท่งให้ล้อกับโลโก้เว็บ
  moatrices: I('<path d="M4 20h16"/><rect x="5" y="12" width="3.4" height="6" rx="1"/><rect x="10.3" y="8" width="3.4" height="10" rx="1"/><rect x="15.6" y="4" width="3.4" height="14" rx="1"/>'),
  me: I('<circle cx="12" cy="8" r="3.6"/><path d="M4.8 20a7.2 7.2 0 0 1 14.4 0"/>'),
  health: I('<path d="M20.4 6.9a4.6 4.6 0 0 0-7.8-2L12 5.6l-.6-.7a4.6 4.6 0 0 0-7.8 2c-.5 2 .3 3.9 1.8 5.5L12 19l6.6-6.6c1.5-1.6 2.3-3.5 1.8-5.5Z"/><path d="M3.4 12h3.3l1.5-2.4 2 4.4 1.6-3 1.1 1h4.2"/>'),
  money: I('<rect x="3" y="6" width="18" height="13" rx="3"/><path d="M3 10h18"/><circle cx="16.5" cy="14.5" r="1.4"/><path d="M6.5 3.8 15 6"/>'),
  weather: I('<circle cx="8.2" cy="8.2" r="3"/><path d="M8.2 2.4v1.3M8.2 12.7V14M2.4 8.2h1.3M12.7 8.2H14M4.1 4.1l.9.9M11.4 11.4l.9.9M12.3 4.1l-.9.9M5 11.4l-.9.9"/><path d="M9 20h8.5a3.5 3.5 0 0 0 .3-7 5 5 0 0 0-9.4-1.1A3.6 3.6 0 0 0 9 20Z"/>'),
  plus: I('<path d="M12 5v14M5 12h14"/>'),
};

const TABS = [
  { id: "moatrices", label: "Moatrices", app: null }, // แท็บแรก = เปิดหน้าเว็บ Moatrices ในแอปเต็มจอ
  { id: "health", label: "Health", app: "health" },
  { id: "money", label: "Money", app: "money" },
  { id: "weather", label: "Weather", app: "weather" },
  { id: "me", label: "Me", app: "me" },
];

// ---- Moatrices ในแอป ----
// เว็บ (beatp9696-arch.github.io) กับแอป (…/pp-os/) อยู่ origin เดียวกัน และ GitHub Pages
// ไม่ส่ง X-Frame-Options → ฝังเป็น web view ในแอปได้เลย ไม่ต้องเด้งออกเบราว์เซอร์
// แอปถูกเสิร์ฟที่ <root>/pp-os/ เสมอ → เว็บคือระดับบนขึ้นไปหนึ่งชั้น (same origin จริงๆ)
// ถ้ารัน pp-os เดี่ยวๆ ตอน dev (ไม่มี /pp-os/ ใน path) ค่อย fallback ไปเว็บจริง
const SITE = location.pathname.includes("/pp-os/")
  ? location.pathname.replace(/pp-os\/.*$/, "")
  : "https://beatp9696-arch.github.io/";

// สีแถบสถานะของมือถือ ให้กลืนกับพื้นหลังของแท็บที่เปิดอยู่
const THEME = { moatrices: "#0f1215", me: "#0f1215", health: "#0c1014", money: "#0f120e", weather: "#14100b" };

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
    renderMoatrices();
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

// ---- Moatrices: เปิดหน้าเว็บ Moatrices ในแอปเต็มจอ (iframe same-origin ใต้แท็บล่าง) ----
function renderMoatrices() {
  const url = SITE + "index.html";
  const pane = document.createElement("div");
  pane.className = "view web-pane moatrices-view";
  pane.innerHTML = `
    <div class="web-load">Loading Moatrices…</div>
    <iframe class="web-frame" src="${url}" title="Moatrices" referrerpolicy="no-referrer"></iframe>
  `;
  view.append(pane);

  const frame = pane.querySelector(".web-frame");
  frame.addEventListener("load", () => {
    pane.querySelector(".web-load")?.remove();
    frame.classList.add("ready");
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
