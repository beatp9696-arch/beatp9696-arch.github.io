// รากของเว็บ Moatrices เมื่อมองจากหน้าแอป — Portfolio ใช้ดึงโลโก้หุ้นและลิงก์บทความ deep-dive
// เดิมอยู่ใน app-shell.js ซึ่งถูกทิ้งไปพร้อม PP OS shell (แอปเป็นหน้าเว็บปกติแล้ว ไม่ใช่ OS)
// ตอนนี้หน้าแอปอยู่ระดับเดียวกับหน้าเว็บ (/money.html, /portfolio.html, …) → รากคือโฟลเดอร์เดียวกัน
export const SITE = location.pathname.replace(/[^/]*$/, "");
