# PP OS / Moatrices

แอปส่วนตัวและคลังพอร์ตสาธารณะ เขียนด้วย vanilla JavaScript (ES modules) ติดตั้งเป็น PWA และเปิดออฟไลน์ได้

## หน้าหลัก

แท็บแอปและแถบล่างบนเว็บไซต์ใช้ชุดเดียวกัน: **Moatrices / Money / Portfolio / Smart Money**

- **Moatrices** เปิดเว็บบทความในแอป
- **Money** บันทึกรายรับ รายจ่าย และงบประมาณในเครื่อง
- **Portfolio** พอร์ตส่วนตัวเดิม ข้อมูลถือครองและราคาที่กรอกยังอยู่ในเครื่อง
- **Smart Money** การ์ดพอร์ตสาธารณะ กราฟสัดส่วน รายการถือครอง และการเปลี่ยนแปลงของจำนวนหุ้นจากรายงาน SEC

หน้า Me และ Health ถูกถอดออกจากทะเบียนแอป เมนู ทางลัด และการโหลดข้อมูลสุขภาพอัตโนมัติแล้ว ลิงก์แท็บเก่าจะเปิด Smart Money ข้อมูลเดิมใน storage ยังสำรองออกได้

**Settings** เปิดจากปุ่มเฟืองใน Smart Money หรือปุ่ม Settings บน desktop มี Sync / Backup / Restore / Device และทางเข้า Weather, Notes, To-do, Calculator, Discover

## รันในเครื่อง

```bash
cd website
python3 -m http.server 8000
```

เปิด `http://localhost:8000/pp-os/?mode=app&tab=smart-money`

- มือถือและ PWA ใช้ app mode เป็นค่าเริ่มต้น; หน้าจอกว้างใช้ desktop mode
- บังคับโหมดด้วย `?mode=app` หรือ `?mode=desktop&open=smart-money`
- ไฟล์แอปอยู่ใน repo เว็บเดียวกัน เผยแพร่ตามกระบวนการ push ของเว็บไซต์

## ข้อมูล Smart Money

`data/smart-money.json` เป็น snapshot สาธารณะที่บรรจุมากับแอป ไม่เรียก API ราคาหุ้นหรือเก็บ token ของผู้ใช้

- แต่ละพอร์ตมีวันที่ถือครอง วันที่ยื่น ลิงก์ SEC และข้อมูลรอบก่อน
- จำนวนและมูลค่าแยกตามหลักทรัพย์ รวมแถวของผู้จัดการรายย่อยตาม CUSIP + หน่วย + ประเภทออปชัน และตรวจยอดรวมกับหน้าปกรายงาน
- กราฟแสดง 5 อันดับแรกและรายการอื่นครบตามยอดรวม ไม่มีการขยายหุ้น 5 ตัวให้กลายเป็น 100% ของพอร์ต
- การเปลี่ยนแปลงเป็นจำนวนหุ้นที่รายงาน ไม่ใช่รายการซื้อขายหรือผลตอบแทน และยังไม่ได้ปรับผลของ corporate actions
- Pershing Square ชุดที่ตรวจสอบได้เป็น Q1 2026 ส่วนอีกสามพอร์ตเป็น Q2 2026 วันที่ระบุแยกในแต่ละการ์ด
- เอกสาร 13F ไม่ครอบคลุมพอร์ตทั้งหมด รายละเอียดขอบเขตแสดงในหน้าพอร์ต

อัปเดตข้อมูลโดยดาวน์โหลด cover XML และ Information Table XML จาก SEC พร้อม manifest ตาม docstring ใน `tools/build-smart-money.py` จากนั้นรัน:

```bash
python3 pp-os/tools/build-smart-money.py /path/to/sources.json
node pp-os/test/smart-money.test.mjs
```

ตรวจรายงานแก้ไข ขอบเขตการรายงาน และ corporate actions ก่อนเปลี่ยนชุดข้อมูล แล้ว bump `VERSION` ใน `sw.js` เมื่อเผยแพร่ข้อมูลหรือไฟล์แอปใหม่ ไฟล์ใน `SHELL` ต้องมีอยู่ครบ

โลโก้ใน `assets/brands/` ใช้สำเนาโลโก้เดิมของเว็บไซต์เพื่อให้แสดงออฟไลน์ได้

## ข้อมูลส่วนตัว

เก็บใน IndexedDB พร้อม fallback localStorage การเพิ่ม Smart Money ไม่อ่านหรือเปลี่ยน `pf.holdings` และไม่ส่งพอร์ตส่วนตัวออกไป ระบบ Sync เดิมเป็นออปชันผ่าน GitHub Gist ของผู้ใช้ ส่วน Backup รวมข้อมูลในเครื่องตามกติกาเดิม

## โครงสร้าง

- `js/main.js` — ทะเบียนแอปและการเริ่มระบบ
- `js/core/app-shell.js` — แท็บ Settings และหน้าซ้อน
- `js/core/smart-money-model.js` — ตรวจข้อมูล สัดส่วน และการเปลี่ยนแปลง
- `js/apps/smart-money.js`, `css/smart-money.css` — หน้า Smart Money
- `js/core/storage.js`, `js/core/sync.js` — ข้อมูลส่วนตัวและ Sync
- `manifest.webmanifest`, `sw.js` — ติดตั้งแอป ทางลัด และ offline cache
