// App shell — โหมดแอปมือถือ: ไม่มี desktop/หน้าต่าง มีแค่ view เต็มจอ + แท็บล่าง
// ใช้ app contract เดิม { id, name, icon, mount(body) } เหมือน window manager ทุกประการ

import { getApp } from "./app-registry.js";
import { dumpAll, hasSnapshot, load, replaceAll, save, storageInfo, undoRestore } from "./storage.js";
import { CATS as MONEY_CATS, localDate } from "../apps/money.js";
import * as sync from "./sync.js";

const I = (d) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;

const ICONS = {
  // แท็บ Moatrices — ไอคอนกราฟแท่งให้ล้อกับโลโก้เว็บ
  moatrices: I('<path d="M4 20h16"/><rect x="5" y="12" width="3.4" height="6" rx="1"/><rect x="10.3" y="8" width="3.4" height="10" rx="1"/><rect x="15.6" y="4" width="3.4" height="14" rx="1"/>'),
  me: I('<circle cx="12" cy="8" r="3.6"/><path d="M4.8 20a7.2 7.2 0 0 1 14.4 0"/>'),
  health: I('<path d="M20.4 6.9a4.6 4.6 0 0 0-7.8-2L12 5.6l-.6-.7a4.6 4.6 0 0 0-7.8 2c-.5 2 .3 3.9 1.8 5.5L12 19l6.6-6.6c1.5-1.6 2.3-3.5 1.8-5.5Z"/><path d="M3.4 12h3.3l1.5-2.4 2 4.4 1.6-3 1.1 1h4.2"/>'),
  money: I('<rect x="3" y="6" width="18" height="13" rx="3"/><path d="M3 10h18"/><circle cx="16.5" cy="14.5" r="1.4"/><path d="M6.5 3.8 15 6"/>'),
  // แท็บ Portfolio — โดนัทสามชิ้น ล้อกับกราฟวงในแอปเอง
  portfolio: I('<circle cx="12" cy="12" r="8.4"/><circle cx="12" cy="12" r="3.2"/><path d="M12 3.6v5.2M14.8 13.6l4.5 2.6M9.2 13.6l-4.5 2.6"/>'),
  plus: I('<path d="M12 5v14M5 12h14"/>'),
  chev: I('<path d="M9 5l7 7-7 7"/>'),
  back: I('<path d="M15 5l-7 7 7 7"/>'),
  sync: I('<path d="M4 9a8 8 0 0 1 13.7-3.3L20 8"/><path d="M20 4v4h-4"/><path d="M20 15a8 8 0 0 1-13.7 3.3L4 16"/><path d="M4 20v-4h4"/>'),
};

// 5 ช่องคือของหายาก — ให้เฉพาะของที่เปิดทุกวันและตัดสินใจอะไรบางอย่าง
// Weather ไม่ได้อยู่ตรงนี้แล้ว (ดูวันละครั้ง ไม่ได้ตัดสินใจอะไรต่อ) → เข้าทางการ์ดในหน้า Me แทน
// หน้าเต็มของมันยังอยู่ครบเหมือนเดิม แค่เปิดเป็นหน้าซ้อน
const TABS = [
  { id: "moatrices", label: "Moatrices", app: null }, // แท็บแรก = เปิดหน้าเว็บ Moatrices ในแอปเต็มจอ
  { id: "health", label: "Health", app: "health" },
  { id: "money", label: "Money", app: "money" },
  { id: "portfolio", label: "Portfolio", app: "portfolio" },
  { id: "me", label: "Me", app: "me" },
];

// ---- Moatrices ในแอป ----
// เว็บ (beatp9696-arch.github.io) กับแอป (…/pp-os/) อยู่ origin เดียวกัน และ GitHub Pages
// ไม่ส่ง X-Frame-Options → ฝังเป็น web view ในแอปได้เลย ไม่ต้องเด้งออกเบราว์เซอร์
// แอปถูกเสิร์ฟที่ <root>/pp-os/ เสมอ → เว็บคือระดับบนขึ้นไปหนึ่งชั้น (same origin จริงๆ)
// ถ้ารัน pp-os เดี่ยวๆ ตอน dev (ไม่มี /pp-os/ ใน path) ค่อย fallback ไปเว็บจริง
// export ให้แอปอื่นใช้ต่อได้ (Portfolio ดึงโลโก้ + ลิงก์บทความ deep-dive จากเว็บเดียวกันนี้)
export const SITE = location.pathname.includes("/pp-os/")
  ? location.pathname.replace(/pp-os\/.*$/, "")
  : "https://beatp9696-arch.github.io/";

// สีแถบสถานะของมือถือ ให้กลืนกับพื้นหลังของแท็บ/หน้าซ้อนที่เปิดอยู่
const THEME = {
  moatrices: "#0f1215",
  me: "#0f1215",
  health: "#0c1014",
  money: "#0f120e",
  portfolio: "#0b0e13",
  weather: "#14100b",
};

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
  // ปุ่มเฟืองในหน้า Me เปิดหน้า Settings (Sync / Data / Device)
  document.addEventListener("pp-settings", openSettings);
  // แอปที่ไม่มีแท็บของตัวเอง (Weather) เปิดเป็นหน้าซ้อนจากการ์ดในหน้า Me
  document.addEventListener("pp-open", (e) => openAppOverlay(e.detail));
  // หน้าเว็บ Moatrices ที่เปิดจากในแอป (บทความ deep-dive จากหน้า Portfolio)
  document.addEventListener("pp-open-web", (e) => openWebOverlay(e.detail));

  buildQuickAdd();
  wireSwipe();

  // sync ดึงของใหม่มาแล้ว → วาดแท็บปัจจุบันใหม่ ให้แอปทิ้ง closure เก่าแล้วอ่าน storage รอบใหม่
  // (ไม่งั้นจอโชว์เลขเก่า และการกดแก้ครั้งถัดไปจะเอาข้อมูลเก่าใน closure ไป save ทับของที่เพิ่ง pull)
  // เว้นจังหวะที่กำลังพิมพ์/เปิดชีตอยู่ — อย่ารื้อฟอร์มใต้มือผู้ใช้ แท็บจะสดเองตอนสลับครั้งถัดไป
  document.addEventListener("pp-sync-pulled", () => {
    if (!shell?.isConnected) return;
    if (document.querySelector(".app-ov, .settings-ov, .pf-sheet, .hk-sheet:not(.hidden)")) return;
    if (qaHost?.childElementCount) return;
    const ae = document.activeElement;
    if (ae && /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName)) return;
    goTab(shell.dataset.tab, { dir: 0 });
  });

  sync.initSync(); // ดึงของใหม่จาก cloud ถ้าตั้ง sync ไว้ + ตั้ง auto-sync เวลาข้อมูลเปลี่ยน

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

// ---- หน้าซ้อนเต็มจอ: แอปที่ไม่มีแท็บของตัวเอง (Weather) และหน้าเว็บที่เปิดจากในแอป ----
// โครงเดียวกับ Settings ทุกอย่าง — สไลด์มาจากขวา มีปุ่มย้อนกลับ ปิดด้วย Esc
// ตัวแท็บล่างไม่หายไปไหน แค่ถูกทับ กดย้อนกลับก็อยู่แท็บเดิมที่ค้างไว้
function overlay({ title, tone, fill }) {
  if (document.querySelector(".app-ov")) return; // กันเปิดซ้อนกันเอง

  const ov = document.createElement("div");
  ov.className = "app-ov settings-ov";
  if (tone) ov.dataset.tone = tone;
  ov.innerHTML = `
    <header class="set-bar">
      <button class="set-close" aria-label="Back">${ICONS.back}</button>
      <span class="set-title">${title}</span>
    </header>
    <div class="ov-body"></div>`;
  document.body.append(ov);
  requestAnimationFrame(() => ov.classList.add("open"));

  const prevTheme = themeMeta.content;
  if (THEME[tone]) themeMeta.content = THEME[tone];

  const close = () => {
    removeEventListener("keydown", onKey);
    themeMeta.content = prevTheme;
    ov.classList.remove("open");
    setTimeout(() => ov.remove(), 220);
  };
  const onKey = (e) => e.key === "Escape" && close();
  addEventListener("keydown", onKey);
  ov.querySelector(".set-close").addEventListener("click", close);

  fill(ov.querySelector(".ov-body"), close);
}

function openAppOverlay(id) {
  const app = getApp(id);
  if (!app) return;
  overlay({
    title: app.name,
    tone: id,
    fill: (host) => {
      const pane = document.createElement("div");
      host.append(pane);
      app.mount(pane); // contract เดิม — แอปไม่รู้เลยว่าตัวเองอยู่ในแท็บหรือหน้าซ้อน
    },
  });
}

function openWebOverlay({ url, title }) {
  overlay({
    title,
    fill: (host) => {
      host.classList.add("ov-web");
      host.innerHTML = `<div class="web-load">Loading…</div>
        <iframe class="web-frame" src="${url}" title="${title}" referrerpolicy="no-referrer"></iframe>`;
      const frame = host.querySelector(".web-frame");
      frame.addEventListener("load", () => {
        host.querySelector(".web-load")?.remove();
        frame.classList.add("ready");
      });
    },
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

// ---- Settings: หน้าซ้อนเต็มจอ เปิดจากปุ่มเฟืองในหน้า Me (Sync / Data / Device) ----
// More ถูกตัดออกไปแล้ว — ของตั้งค่าที่ยังจำเป็น (โดยเฉพาะ Restore ตามหลัก P0 "backup ที่ restore
// ไม่ได้ = ไม่ใช่ backup") ย้ายมาอยู่ที่นี่ พร้อม Sync ข้ามเครื่อง

function timeAgo(ts) {
  if (!ts) return "never";
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 45) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function openSettings() {
  if (document.querySelector(".settings-ov")) return; // กันเปิดซ้อน

  const ov = document.createElement("div");
  ov.className = "settings-ov";
  ov.innerHTML = `
    <header class="set-bar">
      <button class="set-close" aria-label="Back">${ICONS.back}</button>
      <span class="set-title">Settings</span>
    </header>
    <div class="set-body">
      <div class="more-sec">Sync across devices</div>
      <div class="more-list" id="set-sync"></div>

      <div class="more-sec">Data</div>
      <div class="more-list" id="set-data"></div>

      <div class="more-sec">Device</div>
      <div class="more-list">
        <button class="more-row" data-act="desktop">
          <span class="mr-ico">🖥️</span>
          <span class="mr-txt"><b>Switch to desktop mode</b><small>Draggable windows and a taskbar</small></span>
          <span class="mr-chev">${ICONS.chev}</span>
        </button>
      </div>

      <div class="more-foot">Moatrices · Your data lives on your own devices. Sync uses a private GitHub Gist that you own — there is no Moatrices server.</div>
      <div class="sheet-host"></div>
    </div>
  `;
  document.body.append(ov);
  requestAnimationFrame(() => ov.classList.add("open"));

  let unsub = null;
  const close = () => {
    unsub?.();
    removeEventListener("keydown", onKey);
    ov.classList.remove("open");
    setTimeout(() => ov.remove(), 220);
  };
  const onKey = (e) => e.key === "Escape" && close();
  addEventListener("keydown", onKey);
  ov.querySelector(".set-close").addEventListener("click", close);

  ov.querySelector('[data-act="desktop"]').addEventListener("click", () => {
    save("os.mode", "desktop");
    location.replace(location.pathname);
  });

  // ---- Data (backup / restore / undo / storage) ----
  const dataEl = ov.querySelector("#set-data");
  const renderData = () => {
    const lastExport = load("os.lastExport");
    const age = lastExport ? Math.floor((Date.now() - lastExport) / 86400000) : null;
    const note = age === null ? "Never backed up to a file" : age === 0 ? "Backed up today" : `Last file backup ${age} day${age > 1 ? "s" : ""} ago`;
    dataEl.innerHTML = `
      <button class="more-row" data-d="export">
        <span class="mr-ico">⬇️</span>
        <span class="mr-txt"><b>Back up to a file</b><small>${note}</small></span>
        <span class="mr-chev">${ICONS.chev}</span>
      </button>
      <button class="more-row" data-d="restore">
        <span class="mr-ico">⬆️</span>
        <span class="mr-txt"><b>Restore from a backup</b><small>Shows what's inside before it overwrites anything</small></span>
        <span class="mr-chev">${ICONS.chev}</span>
      </button>
      ${
        hasSnapshot()
          ? `<button class="more-row" data-d="undo">
              <span class="mr-ico">↩️</span>
              <span class="mr-txt"><b>Undo the last change</b><small>Put back the data from before the last sync or restore</small></span>
              <span class="mr-chev">${ICONS.chev}</span>
            </button>`
          : ""
      }
      <div class="more-row static">
        <span class="mr-ico">🗄️</span>
        <span class="mr-txt"><b>Storage</b><small class="store-info">checking…</small></span>
      </div>`;
    dataEl.querySelector('[data-d="export"]').addEventListener("click", () => {
      exportData();
      renderData();
    });
    dataEl.querySelector('[data-d="restore"]').addEventListener("click", () => openRestore(ov, renderData));
    dataEl.querySelector('[data-d="undo"]')?.addEventListener("click", () => {
      if (undoRestore()) {
        toast(ov, "✓ Restored the previous data");
        renderData();
      }
    });
    storageInfo().then((info) => {
      const el = dataEl.querySelector(".store-info");
      if (!el || !dataEl.isConnected) return;
      const size = info.usedKB == null ? "" : ` · ${info.usedKB < 1024 ? `${info.usedKB} KB` : `${(info.usedKB / 1024).toFixed(1)} MB`}`;
      el.textContent = info.persisted
        ? `${info.engine} · protected from auto-cleanup${size}`
        : `${info.engine} · not protected — install to the Home Screen${size}`;
      el.classList.toggle("warn", !info.persisted);
    });
  };
  renderData();

  // ---- Sync (วาดตามสถานะแบบ live) ----
  const syncEl = ov.querySelector("#set-sync");
  unsub = sync.onSyncStatus((st) => renderSync(syncEl, st, ov));
}

function renderSync(el, st, ov) {
  if (!sync.isConfigured()) {
    el.innerHTML = `
      <button class="more-row" data-s="connect">
        <span class="mr-ico">${ICONS.sync}</span>
        <span class="mr-txt"><b>Connect this device</b><small>${
          st.error ? "⚠ " + st.error : "Keep every device on the same data — via a private GitHub Gist you own"
        }</small></span>
        <span class="mr-chev">${ICONS.chev}</span>
      </button>`;
    el.querySelector('[data-s="connect"]').addEventListener("click", () => openConnect(ov));
    return;
  }

  const line = st.busy
    ? "Syncing…"
    : st.error
      ? "⚠ " + st.error
      : `Last synced ${timeAgo(st.at)}${st.device ? " · " + st.device : ""}${st.pulled ? ` · pulled ${st.pulled}` : ""}`;
  el.innerHTML = `
    <div class="more-row static">
      <span class="mr-ico${st.busy ? " spin" : ""}">${ICONS.sync}</span>
      <span class="mr-txt"><b>Sync is on</b><small class="${st.error ? "warn" : ""}">${line}</small></span>
    </div>
    <button class="more-row" data-s="now">
      <span class="mr-ico">⟳</span>
      <span class="mr-txt"><b>Sync now</b><small>Pull the latest, push your changes</small></span>
      <span class="mr-chev">${ICONS.chev}</span>
    </button>
    <button class="more-row" data-s="off">
      <span class="mr-ico">🔌</span>
      <span class="mr-txt"><b>Disconnect this device</b><small>Removes the token here — your data stays put</small></span>
      <span class="mr-chev">${ICONS.chev}</span>
    </button>`;
  el.querySelector('[data-s="now"]').addEventListener("click", () => sync.syncNow().catch(() => {}));
  el.querySelector('[data-s="off"]').addEventListener("click", () => sync.disconnect());
}

function openConnect(ov) {
  const host = ov.querySelector(".sheet-host");
  const tokenUrl = "https://github.com/settings/tokens/new?scopes=gist&description=PP+OS+sync";
  host.innerHTML = `
    <div class="sheet">
      <div class="sheet-card">
        <div class="sheet-h"><span>${ICONS.sync} Connect sync</span><button class="sheet-x" aria-label="Close">✕</button></div>
        <p class="sheet-p">Sync keeps your devices on one set of data using a <b>private GitHub Gist</b> that only you can see. You need a token with the <code>gist</code> scope.</p>
        <ol class="set-steps">
          <li><a href="${tokenUrl}" target="_blank" rel="noopener">Create a token</a> — tick only <code>gist</code>, then copy it.</li>
          <li>Paste it below. It's kept on this device only — never synced or backed up.</li>
          <li>On your other device, connect the same way — it finds this Gist automatically.</li>
        </ol>
        <form class="qa-form set-connect">
          <input name="token" type="password" placeholder="github_pat_… or ghp_…" autocomplete="off" spellcheck="false" required>
          <button class="qa-submit" type="submit">Connect</button>
        </form>
        <div class="sheet-status"></div>
      </div>
    </div>`;

  const sheet = host.querySelector(".sheet");
  const status = host.querySelector(".sheet-status");
  const form = host.querySelector("form");
  const close = () => (host.innerHTML = "");

  sheet.addEventListener("click", (e) => e.target === sheet && close());
  host.querySelector(".sheet-x").addEventListener("click", close);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const token = form.token.value.trim();
    if (!token) return;
    const btn = form.querySelector("button");
    btn.disabled = true;
    status.className = "sheet-status";
    status.textContent = "Connecting…";
    const r = await sync.connect(token);
    if (r.ok) {
      close(); // renderSync อัปเดตเองผ่าน onSyncStatus
    } else {
      status.className = "sheet-status err";
      status.textContent = r.error || "Couldn't connect";
      btn.disabled = false;
    }
  });
  form.token.focus();
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

function openRestore(ov, afterChange) {
  const host = ov.querySelector(".sheet-host");
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
          <small>Exported from Moatrices on any device</small>
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
      const data = raw?.data && typeof raw.data === "object" ? raw.data : raw;
      if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("unexpected shape");

      const known = summarize(data);
      if (!known.length) throw new Error("no Moatrices data inside");

      payload = data;
      const when = raw.exported
        ? new Date(raw.exported).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })
        : "unknown date";
      status.className = "sheet-status ok";
      status.textContent = `Backup from ${when}\n${known.map((l) => "· " + l).join("\n")}\n\nThis replaces everything currently on this device.`;
      actions.classList.remove("hidden");
    } catch (err) {
      status.className = "sheet-status err";
      status.textContent = `That file isn't a Moatrices backup — ${err.message}`;
    }
  });

  host.querySelector(".sheet-go").addEventListener("click", () => {
    if (!payload) return;
    replaceAll(payload);
    close();
    afterChange?.();
    toast(ov, "✓ Data restored — you can undo this from Data");
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
  // ปิดทางไหนก็ต้องถอด keydown เสมอ — เดิมถอดเฉพาะทาง Escape/finish ปิดด้วย ✕ หรือแตะฉากหลัง
  // listener ค้างและสะสมทุกครั้งที่เปิดชีตใหม่
  const onEsc = (e) => e.key === "Escape" && close();
  const close = () => {
    qaHost.innerHTML = "";
    removeEventListener("keydown", onEsc);
  };

  sheet.addEventListener("click", (e) => e.target === sheet && close());
  qaHost.querySelector(".sheet-x").addEventListener("click", close);
  addEventListener("keydown", onEsc);

  const finish = (msg) => {
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
