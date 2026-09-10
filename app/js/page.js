// Bootstrap ของ "หน้าแอป" บนเว็บ Moatrices — money.html / portfolio.html / smart-money.html
//
// เดิมสามตัวนี้เป็นแอปใน PP OS: หน้าเดียวสลับแท็บในตัว มี window-manager + taskbar + desktop mode
// ตอนนี้เป็นหน้าเว็บของ Moatrices หน้าละหนึ่งแอป — แท็บล่างเปลี่ยนเป็นลิงก์จริงระหว่างหน้า
// สัญญาของแอปไม่เปลี่ยนเลย ยัง export default { id, name, icon, mount(body) } เหมือนตอนอยู่บน OS
//
// ชื่อฐานข้อมูลใน storage.js ยังเป็น "pp-os" เหมือนเดิม — ห้ามเปลี่ยน: ข้อมูลเงิน/พอร์ตที่ผู้ใช้
// มีอยู่ผูกกับชื่อนั้น (IndexedDB ผูกกับ origin ไม่ใช่ path ย้ายโฟลเดอร์จึงไม่กระทบข้อมูล)
import { initStorage } from "./core/storage.js";
import * as sync from "./core/sync.js";
import { openSettings } from "./core/app-shell.js";

const I = (d) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;

// ไอคอนชุดเดียวกับแถบล่างบนเว็บ (app.js) — สองแถบนี้คือแถบเดียวกัน ห้ามหลุดจากกัน
const TABS = [
  { id: "moatrices", label: "Moatrices", href: "index.html",
    icon: I('<path d="M4 20h16"/><rect x="5" y="12" width="3.4" height="6" rx="1"/><rect x="10.3" y="8" width="3.4" height="10" rx="1"/><rect x="15.6" y="4" width="3.4" height="14" rx="1"/>') },
  { id: "money", label: "Money", href: "money.html",
    icon: I('<rect x="3" y="6" width="18" height="13" rx="3"/><path d="M3 10h18"/><circle cx="16.5" cy="14.5" r="1.4"/><path d="M6.5 3.8 15 6"/>') },
  { id: "portfolio", label: "Portfolio", href: "portfolio.html",
    icon: I('<circle cx="12" cy="12" r="8.4"/><circle cx="12" cy="12" r="3.2"/><path d="M12 3.6v5.2M14.8 13.6l4.5 2.6M9.2 13.6l-4.5 2.6"/>') },
  { id: "smart-money", label: "Smart Money", href: "smart-money.html",
    icon: I('<path d="M9 18h6M10 21h4M8.2 14.4a6 6 0 1 1 7.6 0L15 17H9Z"/><path d="m8 10 2.5-2 2.5 2L16 7"/>') },
];

const APPS = {
  money: () => import("./apps/money.js"),
  portfolio: () => import("./apps/portfolio.js"),
  "smart-money": () => import("./apps/smart-money.js"),
};

const root = document.getElementById("app-root");
const id = root?.dataset.app;

buildTabbar(id);

// แอปคุยกับ shell เดิมผ่าน 2 event — หน้าเว็บรับเองแทน
document.addEventListener("pp-settings", () => openSettings());
document.addEventListener("pp-open-web", (e) => {
  // Portfolio เปิดบทความ deep-dive: เดิมเป็นหน้าซ้อน iframe ในแอป ตอนนี้เป็นเว็บอยู่แล้ว → ไปหน้านั้นตรงๆ
  const url = e.detail?.url;
  if (url) location.href = url;
});

if (root && APPS[id]) {
  try {
    // ต้องรอ storage โหลดเข้า cache ให้ครบก่อน mount ไม่งั้นหน้าวาดตอนยังไม่มีข้อมูล = เห็นเป็นศูนย์หมด
    await initStorage();
    sync.initSync(); // ดึงของใหม่จาก cloud ถ้าตั้ง sync ไว้ + auto-sync เมื่อข้อมูลเปลี่ยน
    const mod = await APPS[id]();
    mod.default.mount(root);
    root.dataset.state = "ready";
    registerTools(); // หลัง first paint แล้วค่อยโหลด ไม่ให้ถ่วงจอแรก
  } catch (err) {
    root.dataset.state = "error";
    root.innerHTML = '<p class="app-boot-error">เปิดแอปไม่สำเร็จ — ลองโหลดหน้าใหม่อีกครั้ง<br><small></small></p>';
    root.querySelector("small").textContent = String(err);
    throw err;
  }
}

function buildTabbar(current) {
  const bar = document.getElementById("tabbar");
  if (!bar) return;
  for (const t of TABS) {
    const a = document.createElement("a");
    a.className = "tab" + (t.id === current ? " on" : "");
    a.href = t.href;
    if (t.id === current) a.setAttribute("aria-current", "page");
    a.innerHTML = `${t.icon}<span>${t.label}</span>`;
    bar.append(a);
  }
}

// แอปที่ไม่มีแท็บของตัวเอง (Weather / Notes / To-do / Calculator / Discover)
// เดิม main.js ของ OS register ไว้ตอน boot — ตอนนี้ไม่มี main.js แล้ว แต่ Settings ยังมีปุ่มเปิด
// อยู่ ถ้าไม่ register ปุ่มจะกดแล้วเงียบ · โหลดแบบ dynamic หลัง mount = ไม่ถ่วงหน้าแรก
async function registerTools() {
  try {
    const { register } = await import("./core/app-registry.js");
    const mods = await Promise.all([
      import("./apps/weather.js"), import("./apps/notes.js"), import("./apps/todo.js"),
      import("./apps/calculator.js"), import("./apps/discover.js"),
    ]);
    for (const m of mods) register(m.default);
  } catch (e) {
    console.warn("โหลดแอปย่อยไม่สำเร็จ:", e);
  }
}
