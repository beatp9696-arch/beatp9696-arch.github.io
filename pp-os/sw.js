// Kill switch — service worker ตัวเก่าของ PP OS ถูกปลดระวางแล้ว
//
// แอป Money / Portfolio / Smart Money ย้ายไปเป็นหน้าเว็บของ Moatrices แล้ว
// (/money.html, /portfolio.html, /smart-money.html) — ไม่มี OS shell ไม่มี SW ของตัวเอง
//
// ห้ามลบไฟล์นี้ทิ้งเฉยๆ: เครื่องที่เคยติดตั้ง PWA ตัวเก่ายังมี SW เวอร์ชัน pp-os-v36 ค้างอยู่
// พร้อม cache หน้าเดิมทั้งชุด ถ้าไฟล์นี้หายไป (404) เบราว์เซอร์จะ "คง" ตัวเก่าไว้ต่อ
// = เปิดแอปแล้วยังเจอ PP OS เวอร์ชันแช่แข็งตลอดไป ไฟล์นี้จึงต้องอยู่เพื่อสั่งให้มันถอนตัวเอง
self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (e) => {
  e.waitUntil(
    (async () => {
      for (const key of await caches.keys()) await caches.delete(key);
      await self.registration.unregister();
      for (const client of await self.clients.matchAll({ type: "window" })) {
        client.navigate(client.url); // โหลดใหม่โดยไม่ผ่าน SW → ได้หน้า redirect ตัวจริง
      }
    })()
  );
});
