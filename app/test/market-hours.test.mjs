// ปฏิทินตลาดสหรัฐใน app.js — แถบ market clock (หน้าแรก) กับการ์ด TARS ต้องตอบเหมือนกัน
//
// เคยเป็นบั๊ค: สองส่วนนี้อยู่คนละ IIFE และเช็ควันหยุดไม่เหมือนกัน แถบนาฬิกาดูแค่
// เสาร์-อาทิตย์ ส่วน TARS ดูลิสต์วันหยุดด้วย ผลคือวันหยุดที่ตรงวันธรรมดา (Thanksgiving,
// Christmas, 4 ก.ค. ฯลฯ) หน้าแรกขึ้นจุดเขียว "US: เปิด" พร้อม TARS มุมจอบอก "ปิด"
// ตอนนี้ทั้งคู่ใช้ window.NYSE ตัวเดียวกัน — เทสต์นี้ล็อกไว้ว่าต้องไม่แยกกันอีก
//
// รัน: node app/test/market-hours.test.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const ROOT = new URL("../../", import.meta.url);

// ตัดบล็อกโค้ดออกมาด้วยการนับปีกกา — ใช้ได้ทั้ง app.js และ app.min.js ที่ indent ถูกตัดไปแล้ว
// (ไม่ได้เป็น parser จริง แต่โค้ดสองก้อนนี้ไม่มี { } ในสตริง/regex จึงนับตรง)
function block(src, needle, file) {
  const start = src.indexOf(needle);
  assert.notEqual(start, -1, `${file}: หา "${needle}" ไม่เจอ`);
  let depth = 0;
  for (let i = src.indexOf("{", start); i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}" && --depth === 0) return src.slice(start, i + 1);
  }
  assert.fail(`${file}: ปีกกาของ "${needle}" ไม่ครบ`);
}

function loadNYSE(file) {
  const src = readFileSync(new URL(file, ROOT), "utf8");
  const win = {};
  new Function("window", block(src, "window.NYSE = (function", file) + ")();")(win);
  assert.ok(win.NYSE, `${file}: โมดูลไม่ได้ผูกกับ window.NYSE`);
  return win;
}

function loadMktStatus(win, file) {
  const src = readFileSync(new URL(file, ROOT), "utf8");
  const body = block(src, "function getMktStatus(", file);
  return new Function("window", body + "; return getMktStatus;")(win);
}

const realNow = Date.now;
const at = (ms, fn) => { Date.now = () => ms; try { return fn(); } finally { Date.now = realNow; } };

// ---- 1. ลิสต์วันหยุดที่คำนวณได้ ต้องตรงกับปฏิทิน NYSE ที่ประกาศจริง ----
// 2026 คือลิสต์ที่เคย hardcode ไว้ในไฟล์ (ตรวจมือแล้ว) ใช้เป็น golden ของตัวคำนวณ
const EXPECTED = {
  2025: ["2025-01-01", "2025-01-20", "2025-02-17", "2025-04-18", "2025-05-26",
         "2025-06-19", "2025-07-04", "2025-09-01", "2025-11-27", "2025-12-25"],
  2026: ["2026-01-01", "2026-01-19", "2026-02-16", "2026-04-03", "2026-05-25",
         "2026-06-19", "2026-07-03", "2026-09-07", "2026-11-26", "2026-12-25"],
  2027: ["2027-01-01", "2027-01-18", "2027-02-15", "2027-03-26", "2027-05-31",
         "2027-06-18", "2027-07-05", "2027-09-06", "2027-11-25", "2027-12-24"],
  // 1 ม.ค. 2028 ตรงเสาร์ = ตลาดไม่ปิด (ศุกร์ก่อนอยู่คนละปี) จึงเหลือ 9 วัน
  2028: ["2028-01-17", "2028-02-21", "2028-04-14", "2028-05-29", "2028-06-19",
         "2028-07-04", "2028-09-04", "2028-11-23", "2028-12-25"],
};

for (const file of ["app.js", "app.min.js"]) {   // ตัว min คือไฟล์ที่เว็บเสิร์ฟจริง
  const win = loadNYSE(file);
  const NYSE = win.NYSE;

  for (const [year, days] of Object.entries(EXPECTED)) {
    assert.deepEqual([...NYSE.holidays(+year)].sort(), days, `${file}: วันหยุด ${year}`);
  }

  // วันหยุดต้องไม่ตกเสาร์-อาทิตย์เลย (กติกาเลื่อนวันทำงานถูก) และต้องมี 9-10 วันต่อปี
  for (let y = 2020; y <= 2040; y++) {
    const days = NYSE.holidays(y);
    assert.ok(days.length === 9 || days.length === 10, `${file}: ${y} ได้ ${days.length} วัน`);
    for (const d of days) {
      const dow = new Date(d + "T12:00:00Z").getUTCDay();
      assert.ok(dow !== 0 && dow !== 6, `${file}: ${d} ตกเสาร์/อาทิตย์`);
    }
  }

  // ---- 2. แถบนาฬิกากับ TARS ต้องตัดสินใจตรงกันทุกกรณี ----
  const getMktStatus = loadMktStatus(win, file);
  const tarsOpen = (p) => NYSE.isTradingDay(p) && p.min >= NYSE.OPEN && p.min < NYSE.CLOSE;

  const cases = [
    ["Thanksgiving 10:00 ET", Date.UTC(2026, 10, 26, 15, 0), false, "closed"],
    ["Christmas 10:00 ET", Date.UTC(2026, 11, 25, 15, 0), false, "closed"],
    ["4 ก.ค. เลื่อนมาศุกร์", Date.UTC(2026, 6, 3, 14, 0), false, "closed"],
    ["Juneteenth", Date.UTC(2026, 5, 19, 14, 0), false, "closed"],
    ["Good Friday 2027", Date.UTC(2027, 2, 26, 14, 0), false, "closed"],
    ["Christmas เลื่อนมาศุกร์ 2027", Date.UTC(2027, 11, 24, 15, 0), false, "closed"],
    ["1 ม.ค. ตรงเสาร์ → จันทร์เปิด", Date.UTC(2028, 0, 3, 15, 0), true, "open"],
    ["วันทำการปกติ 10:00 ET", Date.UTC(2026, 8, 14, 14, 0), true, "open"],
    ["วันทำการ 08:00 ET", Date.UTC(2026, 8, 14, 12, 0), false, "pre"],
    ["วันทำการ 17:00 ET", Date.UTC(2026, 8, 14, 21, 0), false, "after"],
    ["เสาร์", Date.UTC(2026, 8, 12, 14, 0), false, "closed"],
  ];

  for (const [name, ms, shouldBeOpen, cls] of cases) {
    const bar = at(ms, () => getMktStatus(NYSE.parts(0)));
    const tars = at(ms, () => tarsOpen(NYSE.parts(0)));
    assert.equal(bar.cls, cls, `${file}: ${name} → cls`);
    assert.equal(bar.cls === "open", shouldBeOpen, `${file}: ${name} → แถบนาฬิกา`);
    assert.equal(tars, shouldBeOpen, `${file}: ${name} → TARS`);
  }

  // ไม่มี Intl/timeZone = ไม่เดาสถานะ (ผู้เรียกซ่อนป้าย) ห้ามคืน "เปิด" ลอยๆ
  assert.equal(getMktStatus(null), null, `${file}: ไม่มี parts ต้องคืน null`);
}

// ---- 3. ต้องไม่มีลิสต์วันหยุด hardcode กลับมาใน app.js ----
// ลิสต์รายปีหมดอายุทุก 31 ธ.ค. แล้วสถานะตลาดผิดเงียบๆ ตลอดปีถัดไป
const app = readFileSync(new URL("app.js", ROOT), "utf8");
assert.equal(app.match(/"20\d\d-\d\d-\d\d"/g), null,
  "app.js มีวันที่ hardcode แบบ YYYY-MM-DD — วันหยุดต้องคำนวณจากกติกาเท่านั้น");
assert.equal((app.match(/window\.NYSE = \(function/g) ?? []).length, 1,
  "app.js ต้องมีโมดูล NYSE ชุดเดียว");
assert.ok(!app.includes("new Date(now.toLocaleString"),
  "อ่านเวลาข้ามโซนต้องใช้ Intl.formatToParts — new Date(สตริง toLocaleString) แต่ละเบราว์เซอร์ parse เองได้");

console.log("Market hours: ปฏิทิน NYSE 2020-2040, กติกาเลื่อนวัน, แถบนาฬิกา = TARS ทุกกรณี, " +
  "ทั้ง app.js และ app.min.js ผ่าน");
