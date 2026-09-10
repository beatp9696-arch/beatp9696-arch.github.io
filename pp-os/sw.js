// Service worker — precache app shell ทั้งหมด ใช้ offline ได้เต็มตัว
// เปลี่ยนไฟล์เมื่อไหร่ให้ bump VERSION เพื่อบังคับ cache ใหม่

const VERSION = "pp-os-v29";

const SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./css/base.css",
  "./css/desktop.css",
  "./css/window.css",
  "./css/taskbar.css",
  "./css/shell.css",
  "./css/apps.css",
  "./css/smart-money.css",
  "./js/main.js",
  "./js/core/window-manager.js",
  "./js/core/taskbar.js",
  "./js/core/app-shell.js",
  "./js/core/app-registry.js",
  "./js/core/storage.js",
  "./js/core/sync.js",
  "./js/core/ui.js",
  "./js/apps/notes.js",
  "./js/apps/todo.js",
  "./js/apps/weather.js",
  "./js/apps/money.js",
  "./js/apps/portfolio.js",
  "./js/apps/smart-money.js",
  "./js/core/smart-money-model.js",
  "./data/smart-money.json",
  "./js/apps/calculator.js",
  "./js/apps/discover.js",
  "./assets/brands/AAPL.svg",
  "./assets/brands/AXP.png",
  "./assets/brands/GOOGL.png",
  "./assets/brands/NVDA.png",
  "./assets/brands/MSFT.png",
  "./assets/brands/COHR.png",
  "./assets/brands/SNPS.png",
  "./assets/brands/KO.png",
  "./assets/brands/BAC.png",
  "./assets/brands/INTC.png",
  "./assets/brands/SPACEX.svg",
  "./assets/brands/BLK.png",
  "./assets/brands/BN.png",
  "./assets/brands/AMZN.png",
  "./assets/brands/UBER.png",
  "./assets/brands/QSR.png",
  "./assets/brands/SPY.png",
  "./assets/brands/IVV.png",
  "./assets/brands/TSLA.png",
  "./assets/brands/WFC.png",
  "./assets/brands/BABA.png",
  "./assets/people/donald-trump.jpg",
  "./assets/icons/favicon.svg",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/icons/apple-touch-icon.png",
  "./assets/fonts/inter-var-latin.woff2",
  "./assets/fonts/instrument-serif-400-latin.woff2",
  "./assets/fonts/ibm-plex-mono-500-latin.woff2",
  "./assets/fonts/sarabun-400-thai.woff2",
  "./assets/fonts/sarabun-600-thai.woff2",
  "./assets/fonts/ibm-plex-sans-thai-600-thai.woff2",
  "./assets/fonts/ibm-plex-sans-thai-700-thai.woff2",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("pp-os-") && k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin) return;

  // Moatrices ถูกฝังเป็น iframe ใน More และอยู่ origin เดียวกัน — ถ้าไม่กันไว้
  // ทุกหน้าที่เปิดในเว็บจะไหลเข้ามาอยู่ใน cache ของแอป (บวม + เสิร์ฟหน้าเก่าตอนออฟไลน์)
  const scope = new URL(self.registration.scope).pathname;
  if (!url.pathname.startsWith(scope)) return;

  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then(
      (hit) =>
        hit ??
        fetch(req).then((res) => {
          // เก็บเฉพาะ response ที่ใช้ได้จริง — 404/500 ระหว่าง deploy ถ้าถูก cache
          // จะค้างถาวรจนกว่าจะ bump VERSION (ผู้ใช้เห็นหน้าพังโดยรีเฟรชเท่าไหร่ก็ไม่หาย)
          if (res.ok && res.type === "basic") {
            const copy = res.clone();
            caches.open(VERSION).then((c) => c.put(req, copy));
          }
          return res;
        })
    )
  );
});
