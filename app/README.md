# PP OS / Moatrices

แอปส่วนตัวและคลังพอร์ตสาธารณะ เขียนด้วย vanilla JavaScript (ES modules) ติดตั้งเป็น PWA และเปิดออฟไลน์ได้

## หน้าหลัก

แท็บแอปและแถบล่างบนเว็บไซต์ใช้ชุดเดียวกัน: **Moatrices / Money / Portfolio / Smart Money**

- **Moatrices** เปิด Research workspace: Thesis Monitor, Moat Matrix และ Earnings Diff
- **Money** บันทึกรายรับ รายจ่าย และงบประมาณในเครื่อง
- **Portfolio** พอร์ตส่วนตัวเดิม ข้อมูลถือครองและราคาที่กรอกยังอยู่ในเครื่อง
- **Smart Money** 16 รายการ: พอร์ตสาธารณะ 14 แห่งและเอกสารเปิดเผยของ Trump / Pelosi พร้อมค้นหา แยกประเภท และอ่านแหล่งอ้างอิง

Research อยู่ที่ `research.html` และใช้ snapshot ของบทความ SNPS, TSM, NVDA ใน `data/research.json` ไม่ใช่ live feed; ค่าที่ไม่มีจะแสดงเป็น `Not recorded` และหลักฐานทุกจุดลิงก์กลับไปยัง section ของบทความเดิม ส่วน Follow และ thesis notes เก็บในเครื่อง ไม่อยู่ใน cloud sync

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

`data/smart-money.json` เป็น catalog สาธารณะ schema 2 ที่บรรจุมากับแอป ไม่เรียก API ราคาหุ้นหรือเก็บ token ของผู้ใช้ รายละเอียด 13F อยู่ใน `data/smart-money/<id>-<content-hash>.json` และโหลดเมื่อเปิดพอร์ต เพื่อไม่ให้หน้าแรกต้องดาวน์โหลดรายงานสถาบันทุกแห่ง

| กลุ่ม | รายการ |
| --- | --- |
| นักลงทุน | Berkshire Hathaway, Ray Dalio / Bridgewater, Cathie Wood / ARK, Charlie Munger / Daily Journal (ย้อนหลัง), George Soros / Soros Fund Management, Pershing Square |
| สถาบัน | BlackRock, Vanguard Capital Management, State Street, JPMorgan Chase, Morgan Stanley, Invesco |
| บริษัท | NVIDIA, Temasek |
| บุคคลสาธารณะ | Donald Trump, Nancy Pelosi |

- แต่ละพอร์ตมีวันที่ถือครอง วันที่ยื่น ลิงก์ SEC และข้อมูลรอบก่อน
- จำนวนและมูลค่าแยกตามหลักทรัพย์ รวมแถวของผู้จัดการรายย่อยตาม CUSIP + หน่วย + ประเภทออปชัน ตรวจจำนวนแถวและยอดรวมกับหน้าปกรายงานก่อนสร้าง catalog
- โดนัทแสดงเฉพาะหุ้นหลักไม่เกิน 5 อันดับ คิดกลุ่มที่แสดงเป็น 100% พร้อมป้ายกำกับทั้งการ์ดและรายละเอียด หน้ารายละเอียดระบุด้วยว่ากลุ่มนี้รวมกี่เปอร์เซ็นต์ของพอร์ตจริง ตารางถือครองยังแสดงทุกรายการและสัดส่วนเทียบยอดรวมเดิม ส่วนข้อมูล catalog ยังคงยอดรายการอื่นไว้เพื่อตรวจสอบความครบถ้วน
- การเปลี่ยนแปลงเป็นจำนวนหุ้นที่รายงาน ไม่ใช่รายการซื้อขายหรือผลตอบแทน และยังไม่ได้ปรับผลของ corporate actions
- รายการที่รอบก่อนมีจำนวนศูนย์ยังนับเป็นรายการเดิม หากจำนวนเพิ่มจะใช้ป้ายจำนวนเพิ่มและแสดง `—` แทนเปอร์เซ็นต์ที่คำนวณไม่ได้ ไม่ใช้ป้าย New
- Pershing Square เป็น Q1 2026; Daily Journal เป็น Q3 2023 ก่อน Munger เสียชีวิต และมีป้ายย้อนหลังทั้งการ์ดและหน้ารายละเอียด; อีก 12 พอร์ตเป็น Q2 2026
- Ray Dalio / Soros เชื่อมกับสถาบันที่ก่อตั้ง ไม่กล่าวอ้างว่าเป็นพอร์ตส่วนตัวหรือการตัดสินใจปัจจุบันของบุคคล; ARK เป็นรายงานรวมผู้จัดการ ไม่ใช่เฉพาะ ARKK
- Vanguard ใช้ Vanguard Capital Management LLC (CIK 2100119) ทั้งสองไตรมาส ไม่รวมผู้จัดการ Vanguard รายอื่นหรือเปรียบเทียบข้ามกับ The Vanguard Group เดิม
- รายงานฉบับ RESTATEMENT แทนตารางเก่า ส่วน NEW HOLDINGS บวกรายการเพิ่มเติมตามลำดับ ฉบับที่ใช้ทั้งหมดเปิดดูได้ในหน้ารายละเอียด
- Invesco Q1 2026: ผลรวมตารางเดิมต่ำกว่ายอดหน้าปก $897 และฉบับเพิ่มรายการต่ำกว่า $1 จึงใช้ผลรวมตารางรวม $1,023,963,243,529 พร้อมแสดงส่วนต่าง $898 ในรายละเอียด ต้องระบุ `reviewedTableDifference` ตรงกับส่วนต่างที่ตรวจแล้วใน manifest; ส่วนต่างอื่นทำให้ build ไม่ผ่าน
- เอกสาร 13F ไม่ครอบคลุมพอร์ตทั้งหมด รายละเอียดขอบเขตแสดงในหน้าพอร์ต
- สถาบันรายงานหลักทรัพย์ภายใต้ดุลยพินิจ ซึ่งอาจเป็นของกองทุนและลูกค้า ไม่ใช่พอร์ตเงินลงทุนของบริษัทเองหรือ AUM ทั้งหมด

Trump ใช้ 8 ธุรกรรมที่คัดจากหน้า 2 ของ [OGE Form 278-T ที่ White House เผยแพร่](https://www.whitehouse.gov/wp-content/uploads/2026/06/President-Donald-J.-Trump-Periodic-Transaction-Report-0.6.25.26-2.pdf) (OGE รับ 29 มิ.ย. 2026) ส่วน Pelosi ใช้หุ้นสามัญ ST ที่มีมูลค่าระบุ 22 รายการจาก Schedule A ของ [Annual Report 2025](https://disclosures-clerk.house.gov/public_disc/financial-pdfs/2025/10075701.pdf) ยื่น 15 พ.ค. 2026 ทุกแถวที่แสดงเป็นของคู่สมรส (SP) ข้อมูลคัดไว้ใน `data/smart-money-disclosures.json` พร้อมหน้าอ้างอิง ไม่รวมช่วงมูลค่าเป็นยอดแน่นอน ไม่คำนวณสัดส่วน และไม่ใช้รายการซื้อขายแทนยอดถือครอง

หน้า Trump เปิดแท็บถือครองประมาณการเป็นค่าเริ่มต้น โดยใช้ 145 แถวที่อ่านตัวเลขได้ครบในภาพ Trump Portfolio ที่ผู้ใช้ให้มา (% Portfolio และ Shares Held มีป้าย Est.) เก็บเป็น `estimatedHoldings` แยกจาก `disclosure` ทั้งใน catalog และต้นทางสำหรับ builder ภาพไม่ระบุวันที่จึงใช้ `asOf: null` และไม่แสดงเป็นพอร์ตปัจจุบันที่ยืนยันแล้ว โดนัทแสดง 5 อันดับแรกตามเปอร์เซ็นต์ในภาพ (AAPL, NVDA, AVGO, AMZN, MSFT รวม 20.83%) โดยคิดเฉพาะกลุ่มนี้เป็น 100% ไม่คำนวณมูลค่า USD หรือแปลงธุรกรรม OGE ให้เป็นยอดถือครอง ภาพอ้างอิงทั้งหมดอยู่ใน `assets/references/` โดยไม่แสดงลิงก์เปิดภาพในหน้าแอป ถือครองและธุรกรรม OGE สลับดูได้คนละแท็บ

หน้าถือครอง 13F มีการค้นหาภายในพอร์ตและเพิ่มทีละ 50 รายการ แฟ้มหลัก ภาพอ้างอิง และเอกสารบุคคลสาธารณะเปิดออฟไลน์ได้ ส่วนรายงาน 13F ฉบับเต็มเก็บใน cache หลังเปิดอ่านครั้งแรก แสดงสถานะให้เชื่อมต่อเมื่อยังไม่เคยดาวน์โหลด และกลับหน้ารวมได้แม้โหลดไม่สำเร็จ

รุ่น `pp-os-v33` เพิ่มถือครองประมาณการ Trump 145 รายการและ Pelosi 22 รายการ การค้นหาและเพิ่มครั้งละ 50 รายการ พร้อมสัดส่วนอุตสาหกรรมจากภาพอ้างอิงหรือ metadata ของ Nasdaq สำหรับพอร์ต 13F พร้อมเปลี่ยนโลโก้ JPMorgan และ Morgan Stanley เป็น SVG จากเว็บไซต์ทางการบนพื้นขาว (เครดิตอยู่ใน `assets/credits.html`) ตรวจด้วย browser test ทั้ง 16 โปรไฟล์ หน้าถือครองประมาณการทั้งสองพอร์ต การค้นหาและโหลดรายการเพิ่ม การสลับแท็บเอกสารทางการ และออฟไลน์

อัปเดตข้อมูลโดยดาวน์โหลด cover XML และ Information Table XML จาก SEC พร้อม manifest ตาม docstring ใน `tools/build-smart-money.py` จากนั้นรัน:

```bash
python3 pp-os/tools/build-smart-money.py /path/to/sources.json
node pp-os/test/smart-money.test.mjs
python3 pp-os/test/smart-money-builder.test.py
```

ตรวจหน้าแอปด้วย Python environment ที่มี Playwright และ Chromium:

```bash
../.venv/bin/python pp-os/test/smart-money-browser.test.py
```

ชุด browser test เปิด server ชั่วคราวในเครื่องและใช้ browser profile ทดสอบ ตรวจทั้ง 16 โปรไฟล์ การค้นหาและเพิ่มรายการในพอร์ตขนาดใหญ่ หน้าจอ 320–1280px โหมด desktop และการเปิดรายงานแบบออฟไลน์/ลองใหม่ บันทึกภาพหน้าจอใน temporary directory ของระบบ

ตรวจเสร็จ 10 ก.ย. 2026: ข้อมูลทั้ง 28 รอบตรงกับ XML ที่ดาวน์โหลดไว้, catalog/detail และ disclosure checks ผ่าน, builder tests 11 รายการผ่าน, browser test ผ่าน และ sync merge tests เดิมผ่าน 37 รายการ วันที่ `checkedAt` ยังเป็น 9 ก.ย. ตามวันที่ตรวจแหล่งข้อมูล ชุดขยาย 16 โปรไฟล์พร้อมโลโก้หุ้นและภาพ Donald Trump ใช้ app cache รุ่น `pp-os-v29`

ตรวจรายงานแก้ไข ขอบเขตการรายงาน และ corporate actions ก่อนเปลี่ยนชุดข้อมูล ใน manifest แนบ `amendments` ของแต่ละไตรมาสเรียงตามเลขฉบับ ห้ามตัดข้ามฉบับ แล้ว bump `VERSION` ใน `sw.js` เมื่อเผยแพร่ข้อมูลหรือไฟล์แอปใหม่ ไฟล์ใน `SHELL` ต้องมีอยู่ครบ เก็บไฟล์รายละเอียดที่ hash เปลี่ยนของรุ่นที่เผยแพร่แล้วไว้เพื่อให้ catalog เก่ายังเปิดรายงานตรงรุ่นได้

โลโก้ใน `assets/brands/` ใช้สำเนาโลโก้เดิมของเว็บไซต์ และเพิ่ม KO, BAC, INTC, BLK, BN, AMZN, UBER, QSR, SPY, IVV, TSLA, WFC, BABA จาก [Parqet Assets](https://assets.parqet.com) ผ่าน URL `https://assets.parqet.com/logos/symbol/<SYMBOL>?format=png` เมื่อ 10 ก.ย. 2026 ส่วน SpaceX ใช้ SVG เดิมของเว็บไซต์ แสดงเป็นรูปในกราฟและเก็บใน offline cache

ภาพ Donald Trump ใน `assets/people/donald-trump.jpg` ดาวน์โหลดจากภาพ official portrait ของ [White House](https://www.whitehouse.gov/administration/donald-j-trump/) ([ไฟล์ภาพ](https://www.whitehouse.gov/wp-content/uploads/2026/01/President-Donald-Trump-Official-Presidential-Portrait.png-1-1.jpg?resize=541,600)) เมื่อ 10 ก.ย. 2026 ใช้ CSS จัดกรอบและตำแหน่งภาพ พร้อมเก็บไฟล์ใน offline cache

อัปเดตภาพและโดนัท 10 ก.ย. 2026: ทุกโปรไฟล์ใช้ภาพถ่ายบุคคลหรือโลโก้จริงแทนตัวย่อ เพิ่มภาพ Charlie Munger, Ray Dalio, Cathie Wood, George Soros และ Nancy Pelosi จาก Wikimedia Commons รวมถึงโลโก้สถาบัน และโลโก้หุ้นหลัก CRWV, NOK, V, AVGO, AMD, TEM, HOOD, USB, TSM, GPN, MU จาก Parqet Assets เครดิตผู้ถ่าย แหล่งต้นฉบับ และใบอนุญาตอยู่ใน [หน้าเครดิต](assets/credits.html) ที่ลิงก์จากท้ายหน้ารวม ใช้ app cache `pp-os-v30` เพื่อเก็บรูปทั้ง 16 โปรไฟล์และหน้าเครดิตสำหรับออฟไลน์

## ข้อมูลส่วนตัว

เก็บใน IndexedDB พร้อม fallback localStorage การเพิ่ม Smart Money ไม่อ่านหรือเปลี่ยน `pf.holdings` และไม่ส่งพอร์ตส่วนตัวออกไป ระบบ Sync เดิมเป็นออปชันผ่าน GitHub Gist ของผู้ใช้ ส่วน Backup รวมข้อมูลในเครื่องตามกติกาเดิม

## โครงสร้าง

- `js/main.js` — ทะเบียนแอปและการเริ่มระบบ
- `js/core/app-shell.js` — แท็บ Settings และหน้าซ้อน
- `js/core/smart-money-model.js` — ตรวจข้อมูล สัดส่วน และการเปลี่ยนแปลง
- `js/apps/smart-money.js`, `css/smart-money.css` — หน้า Smart Money
- `js/core/storage.js`, `js/core/sync.js` — ข้อมูลส่วนตัวและ Sync
- `manifest.webmanifest`, `sw.js` — ติดตั้งแอป ทางลัด และ offline cache

รุ่น `pp-os-v34`: หน้าถือครองประมาณการและกราฟอุตสาหกรรมใช้ภาษาอังกฤษ เอาส่วนเปิดภาพอ้างอิงออก และแสดงโลโก้หุ้นในกรอบมุมมนพร้อมพื้นที่รอบภาพเพื่อไม่ตัดขอบโลโก้

Berkshire Hathaway ใช้ภาพ Warren Buffett ทั้งการ์ดและรายละเอียดในรุ่น `pp-os-v34` พร้อมเครดิตและ offline cache

รุ่น `pp-os-v35`: แสดงโลโก้หุ้นในทุกรายการถือครอง 13F รวมรายการเปลี่ยนแปลง/ขายออกและเอกสารบุคคลสาธารณะ ใช้ไฟล์ในแอปก่อน แล้วโหลดจาก Parqet ตาม symbol ที่มีหรือจับคู่ CUSIP ได้ หากโหลดไม่ได้หรือไม่มี symbol จะแสดงตัวย่อ

## Stock details (`pp-os-v36`)

Click a security name or logo in any holdings list to see its reported portfolio weights, current and previous share counts, absolute and percentage changes, holding dates, comparison dates, and filing links across the catalog. Back restores the original list, search, filter, focus, and scroll position.

13F positions match by CUSIP + unit + option type. Symbol-only entries match explicitly mapped ordinary shares; logo and sector issuer aliases are never used for ownership matching. Historical reports, exits, and undated estimates appear separately. Estimates do not show invented changes, and disclosure transactions are never converted into holdings. Counts describe the reports loaded, not all investors or a live market snapshot.

The first stock view loads uncached detail reports with up to four concurrent requests and a 20-second timeout per request. Subsequent views reuse validated reports. Missing reports produce partial results with a retry button. Downloaded reports remain available through the existing service-worker cache; this may download about 12 MB on first use. No private portfolio data is read.

Validation:

```bash
node pp-os/test/smart-money-stock.test.mjs
../.venv/bin/python pp-os/test/smart-money-stock-browser.test.py
```
