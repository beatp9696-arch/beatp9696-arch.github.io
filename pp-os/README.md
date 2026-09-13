# PP OS / Moatrices

แอปส่วนตัวและคลังพอร์ตสาธารณะ เขียนด้วย vanilla JavaScript (ES modules) ติดตั้งเป็น PWA และเปิดออฟไลน์ได้

## หน้าหลัก

แท็บแอปและแถบล่างบนเว็บไซต์ใช้ชุดเดียวกัน: **Moatrices / Money / Portfolio / Smart Money**

- **Moatrices** Research workspace: Thesis Monitor, Moat Matrix และ Earnings Diff พร้อมทางเข้าคลังบทความ
- **Money** บันทึกรายรับ รายจ่าย และงบประมาณในเครื่อง
- **Portfolio** Portfolio Health และ Matrices: The Living Thesis; พอร์ตส่วนตัวเดิมและการแก้ราคาอยู่ใน Holdings & allocation ข้อมูลยังอยู่ในเครื่อง
- **Smart Money** 16 รายการ: พอร์ตสาธารณะ 14 แห่งและเอกสารเปิดเผยของ Trump / Pelosi พร้อมค้นหา แยกประเภท และอ่านแหล่งอ้างอิง

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

## Matrices: The Living Thesis

Portfolio now opens to a business-focused thesis health overview. Open a holding for its original thesis, current assessment, seven moat pillars, evidence timeline, earnings comparison, adversarial review, sell conditions, and investigation questions.

This remains the existing vanilla JavaScript PWA. There is no new package manager, framework, database, or build dependency. Query routes follow the app's existing static hosting pattern:

```text
/pp-os/?mode=app&tab=portfolio
/pp-os/?mode=app&tab=portfolio&book=demo&symbol=MSFT
/pp-os/?mode=app&tab=portfolio&book=demo&symbol=MSFT&thesis=earnings
/pp-os/?mode=app&tab=portfolio&book=personal&portfolioView=allocation
/pp-os/?mode=desktop&open=portfolio&book=demo
```

- **My portfolio** adapts `pf.holdings` without changing positions or prices. Existing allocation, concentration, add/edit/remove holding, research coverage, and price updates remain in **Holdings & allocation**. The 16 supported companies receive dated, authored **Research drafts** from `data/living-thesis-library.json`; unsupported symbols remain **INSUFFICIENT DATA**. Demo analysis is never substituted for research. Drafts do not claim to be the investor’s original rationale: **Review & use draft** opens an editable adoption dialog. Existing private statements always take precedence.
- **Demo portfolio** contains fictional Microsoft, Visa and Costco scenarios in `data/living-thesis.json`. All financial figures, business events, scores and interpretations are sample data. Background source links are labeled as references, not substantiation for the fictional events.
- `js/features/living-thesis/model.js` documents the domain types with JSDoc and handles filtering, review freshness, missing values, and threshold evaluation. Margins/rates change in percentage points; monetary metrics change in percentages; missing data never becomes zero.
- `service.js` exports `analyzeThesis(holding, thesis, evidence, earningsData, context)` and the deterministic `demoAdapter`. Connect a real analysis provider at this boundary using a same-origin server endpoint. Keep API credentials on that server. The result contract is documented as `AnalysisResult` in the model; views do not call an AI API.
- Personal **Refresh research** reloads the packaged research library, preserving source dates and all investor edits. It does not run AI or retrieve new filings. Demo refresh runs the sample adapter, has loading/error/retry/success states, and retains old evidence dates. It does not fetch live financial research. An edited original statement gets flagged for reassessment; the fixed demo interpretation cannot evaluate a different thesis.
- Original statements, edited sell conditions, review records, question status, watchlist flags and investigation notes persist through the existing storage adapter. `pf.living.personal.v1` and `pf.living.demo.v1` are separate device-local namespaces, excluded from the sync allowlist and included in user-requested backups. Editors await `flushStorage()` before reporting a successful save.
- Reviews acknowledge an investor's review, without changing the thesis assessment or evidence dates. Measured sell rules evaluate available snapshots; qualitative rules record the investor's assessment. Neither executes trades. Evidence older than 30 days is visibly stale.
- Native dialogs restore keyboard focus; thesis tabs support arrow keys, Home and End. Container queries handle mobile and resizable desktop windows, with stacked holdings and earnings rows on small screens. No charting dependencies were added.
- The **Portfolio Health · Living Thesis** button above the allocation donut opens the thesis overview for your own holdings. To explore the fictional Microsoft, Visa and Costco scenarios, switch to **Demo portfolio** on that overview.
- Service worker `pp-os-v40` includes the modules, stylesheet, demo data, research library and all 16 local company logos for offline use. Source websites require a connection.

Research library (13 September 2026): MELI, LLY, GOOGL, SNPS, NVDA, COST, BRK-B, MSFT, TSM, SPGI, UNH, AXP, AAPL, AMZN, NFLX and BAC. Each has a Thai thesis draft, seven moat pillars, five dated evidence observations, two labeled comparison periods, five opposing arguments, three suggested sell boundaries and three research questions. Library article dates identify when the source note was updated, not new business events. Company filings and earnings releases are linked directly where used. The library is a dated research snapshot, not a current-market assessment.

Scores are qualitative editorial estimates: overall moat is the unweighted mean of the seven pillars, and confidence is evidence completeness, not a probability of profit. Historical score charts and drift stay absent. Proposed qualitative boundaries have no checked date until the investor assesses them. Missing values remain null. BAC uses NIM and efficiency, UNH uses medical loss ratio, AXP avoids industrial FCF, and TSM figures preserve NTD units. Synopsys compares Q2 with the prior-year Q2 and labels non-GAAP metrics; Apple FCF is explicitly calculated from OCF minus cash PP&E. Numeric changes and thesis interpretations are separate so higher revenue or lower cash flow need not imply a stronger or weaker moat automatically.

`js/core/company-catalog.js` shares identities and same-origin logo URLs between Health and allocation. Research is matched to existing symbols; it never supplies or changes weights, shares, costs or prices. Saved statements, questions and custom conditions survive library reloads. Public source updates append newly introduced prompts by stable id without overwriting saved rows.

Validation (from the repository's parent directory):

```bash
node website/pp-os/test/living-thesis.test.mjs
.venv/bin/python website/pp-os/test/living-thesis-browser.test.py
```

The browser suite uses a disposable browser profile and temporary server. It checks all filters, sorting, thesis tabs, evidence expansion, edits and immediate reloads, question workflows, loading/error/retry states, actual Portfolio CRUD, source attributes, personal/demo separation, browser history, unknown symbols, 320–1440px layouts, desktop windows, and offline refresh. Screenshots are saved in `/private/tmp/matrices-*.png`.

The app has no separate bundling or lint script. Native ES module syntax and domain tests are checked with Node; existing Research, Smart Money, builder and sync tests remain available in `test/`. `website/build.py` is the publishing build for the surrounding article site. On 13 September 2026, both an isolated feature build and the unchanged baseline returned the same 10 shared-header/footer warnings in `_proto-plate-meli.html`, `_proto-plate-site.html`, and `situational-awareness.html`; the Portfolio changes add no article-site build warnings.

## Research Workspace

เปิด `http://localhost:8000/pp-os/?mode=app&tab=moatrices` หรือระบุบริษัทด้วย `&company=SNPS` ใน desktop ใช้ `?mode=desktop&open=research`

- `data/research.json` เป็น snapshot ของบทความ SNPS, TSM, NVDA ที่มีอยู่ในคลัง ไม่ใช่ข้อมูลล่าสุดจาก API หรือ transcript diff อัตโนมัติ แต่ละ observation เชื่อมไปยัง section ของบทความ
- `snapshotDate` คือวันแก้ไขบทความ ไม่ใช่วันที่ตรวจ filing ล่าสุด; `reviewDue` เป็นกำหนดทบทวนภายใน ไม่ใช่วันประกาศงบที่บริษัทรับรอง
- Matrix จัดหลักฐานตาม 7 Powers โดยไม่ให้คะแนนลงทุน ช่องว่างคือยังไม่ประเมิน ไม่ใช่ไม่มี moat
- Earnings เทียบงวดและสกุลเงินเดียวกัน ค่าที่ไม่มีเป็น `null` ไม่ใช่ศูนย์ และ margin change ใช้ percentage points; ส่งออก CSV พร้อมงวดและแหล่งที่มาได้
- Monitor ไม่ตัดสิน kill conditions อัตโนมัติเมื่อยังขาดข้อมูลลำดับไตรมาส ปัจจัยประกอบ หรือยังไม่ถึง deadline
- Follow / notes เก็บใน `research.watchlist` / `research.notes` เฉพาะเครื่อง ไม่อยู่ใน cloud sync allowlist แต่รวมอยู่ในการ export backup ที่ผู้ใช้สั่งเอง
- Portfolio อ่าน coverage จาก holdings ที่มีอยู่ ไม่เพิ่มหรือแก้ holdings; ไม่แสดง weight coverage หากมีหุ้นที่ยังไม่มีราคา และไม่ได้ตีความ coverage ว่า thesis ปลอดภัย
- Service worker โหลด snapshot แบบ network-first พร้อม fallback สำเนาที่มีวันที่เมื่อ offline; บทความนอก PWA scope ต้องใช้อินเทอร์เน็ต
- ไอคอน Research มาจาก Lucide `0.468.0` เก็บ license ใน `assets/icons/research/LICENSE`

```bash
node pp-os/test/research.test.mjs
../.venv/bin/python pp-os/test/research-browser.test.py
```

Browser tests ใช้ profile ชั่วคราว ทดสอบมือถือ/desktop, follow, note, matrix, แหล่งที่มา, CSV, portfolio privacy, retry และ offline โดยบันทึก screenshots ใน `/private/tmp/moatrices-research-*.png`

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
