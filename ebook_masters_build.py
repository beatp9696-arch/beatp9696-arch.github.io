#!/usr/bin/env python3
"""ประกอบ e-book Buffett × Munger จาก 12 บทบนเว็บ Moatrices → _ebook_masters.html (print master, A4)

โครงเล่ม 5 ภาคตาม "เส้นทางตัดสินใจของนักลงทุน" (PP อนุมัติ 21 ก.ค. 2026):
  ภาค 1 รากฐาน — ทำไมตลาดถึงแพ้ได้        (superinvestors, 4-pillars)
  ภาค 2 หัวที่คิด — ซ่อมสมองก่อนดูธุรกิจ    (worldly-wisdom, poor-charlies, misjudgment)
  ภาค 3 ธุรกิจแบบไหนที่ควรซื้อ             (notre-dame, practical-thought, florida-mba)
  ภาค 4 ราคาที่ควรจ่าย + วินัย             (stock-market-1999, punch-card)
  ภาค 5 ชีวิตที่รองรับวิธีคิดนี้            (guaranteed-misery, usc-law)

ขั้นตอนออกเล่มเต็ม (master `_ebook_masters.html` ห้าม commit — เหมือน _ebook_7powers.html):
1. python3 ebook_masters_build.py
2. เสิร์ฟผ่าน localhost (python3 -m http.server) — ฟอนต์ไทย self-hosted ไม่โหลดผ่าน file://
3. headless Chrome CDP `Page.printToPDF` {printBackground, preferCSSPageSize, generateDocumentOutline}
   (เปิดแท็บด้วย HTTP PUT /json/new — Chrome ใหม่ปฏิเสธ GET)
4. finalize ด้วย pymupdf: ทาพื้นครีม draw_rect overlay=False ทุกหน้า + เลขหน้า (ข้ามปก) +
   set_metadata → moatrices-buffett-munger.pdf

freeze ฉาก = animation-delay:-999s + paused (ห้าม animation:none — ดู ebook_build.py)
"""
import re, pathlib

SITE = pathlib.Path(__file__).resolve().parent
OUT = SITE / "_ebook_masters.html"
BASE = "https://beatp9696-arch.github.io"

# (num, file, speaker, year, title สั้นในเล่ม, hook 1 บรรทัด)
CH = [
    (1, "buffett-talks-01-superinvestors.html", "Buffett", "1984",
     "The Superinvestors of Graham-and-Doddsville",
     "หลักฐานที่พิสูจน์ว่า value investing ไม่ใช่โชค — ลิง 40 ตัวจากสวนสัตว์เดียวกันในโอมาฮา"),
    (2, "buffett-4-pillars.html", "Buffett", "4 เล่ม",
     "4 เสาหลักความคิดการลงทุน",
     "หนังสือ 4 เล่มที่เป็นโครงสร้างรับน้ำหนักของอาณาจักรแสนล้าน — ไม่ใช่ลิสต์หนังสือแนะนำ"),
    (3, "munger-talks-01-worldly-wisdom.html", "Munger", "1994",
     "Elementary, Worldly Wisdom",
     "ค้อนอันเดียว vs ตาข่ายโมเดล 80–90 ตัว — เลกเชอร์ mental models ที่กลายเป็นตำรานอกหลักสูตร"),
    (4, "poor-charlies-almanack.html", "Munger", "ตำรา",
     "Poor Charlie's Almanack",
     "Latticework, Invert, อคติ 25 ข้อ, Lollapalooza — ตำราความคิดทั้งเล่มของ Charlie Munger"),
    (5, "munger-talks-03-misjudgment-1995.html", "Munger", "1995",
     "The Psychology of Human Misjudgment",
     "อคติไม่ได้บวกกัน มันคูณกัน — เลกเชอร์สดต้นฉบับของจิตวิทยาการตัดสินใจพลาด"),
    (6, "buffett-talks-04-notre-dame-1991.html", "Buffett", "1991",
     "Notre Dame — ธุรกิจที่ต่อให้บริหารห่วยก็ยังรอด",
     "See's Candies: กำไรก่อนภาษีปีเดียวมากกว่าราคาซื้อทั้งบริษัท — หน้าตาของธุรกิจในฝัน"),
    (7, "munger-talks-02-practical-thought.html", "Munger", "1996",
     "Practical Thought About Practical Thought?",
     "สร้าง Coca-Cola $2 ล้านล้านจากศูนย์ — วิธีแตกเป้าบ้าคลั่งเป็นตัวเลขที่เถียงได้ทีละตัว"),
    (8, "buffett-talks-02-florida-mba-1998.html", "Buffett", "1998",
     "Florida MBA — คูเมือง และเกมซื้อเพื่อน 10%",
     "LTCM, วงแห่งความสามารถ และเหตุผลที่นิสัยชนะพรสวรรค์ — โซ่ที่เบาจนไม่รู้สึก"),
    (9, "buffett-talks-03-stock-market-1999.html", "Buffett", "1999",
     "Mr. Buffett on the Stock Market",
     "ปริศนา 17 ปี × 2 กับแรงโน้มถ่วงชื่อดอกเบี้ย — คำเตือนกลางไข้ dot-com ที่ตลาดไม่ฟัง"),
    (10, "buffett-talks-05-punch-card.html", "Buffett", "วินัย",
     "Punch Card — บัตรเจาะ 20 ช่อง",
     "เมื่อการตัดสินใจมีต้นทุนเป็นโควตาชีวิต มาตรฐานจะสูงขึ้นเอง — วินัยรอ fat pitch"),
    (11, "munger-talks-04-guaranteed-misery.html", "Munger", "1986",
     "Prescriptions for Guaranteed Misery",
     "สูตรการันตีชีวิตพังทั้ง 7 ข้อ — สอนทางไปนรกอย่างละเอียด เพื่อให้ทางสวรรค์ชัดขึ้นเอง"),
    (12, "munger-talks-05-usc-law-2007.html", "Munger", "2007",
     "USC Law Commencement — พินัยกรรมทางความคิด",
     "อยากได้อะไร จงทำตัวให้สมควรได้สิ่งนั้น — และเว็บไร้รอยต่อของความไว้ใจที่สมควรได้"),
]

# (เลขภาค, ชื่อภาค, คำโปรยภาค, [เลขบท])
PARTS = [
    (1, "รากฐาน", "ทำไมตลาดถึงแพ้ได้ — และแพ้ให้ใคร",
     "ก่อนเชื่ออะไรสักอย่าง ต้องมีหลักฐานว่ามันไม่ใช่โชค ภาคนี้เปิดด้วยสุนทรพจน์ที่ตอบโต้ไม่ได้มา 40 ปี "
     "แล้วตามด้วยชั้นหนังสือที่วิธีคิดทั้งระบบสร้างขึ้นบนนั้น", [1, 2]),
    (2, "หัวที่คิด", "ซ่อมสมองก่อน แล้วค่อยดูธุรกิจ",
     "เครื่องมือวิเคราะห์ที่ดีที่สุดไร้ค่า ถ้าเครื่องที่ใช้มันเต็มไปด้วยบั๊ก — ตาข่ายโมเดล การคิดกลับด้าน "
     "และแผนที่อคติ 25 ข้อ คือชุดแพตช์ของสมองนักลงทุน", [3, 4, 5]),
    (3, "ธุรกิจแบบไหนที่ควรซื้อ", "หน้าตาของธุรกิจในฝัน — และวิธีสร้างมันจากศูนย์",
     "See's สอนให้รู้จัก pricing power, โจทย์ $2 ล้านล้านสอนวิธีแตกเป้าใหญ่เป็นตัวเลขที่เถียงได้ "
     "และเกมซื้อเพื่อน 10% สอนว่าคุณภาพที่แท้จริงวัดจากอะไร", [6, 7, 8]),
    (4, "ราคาที่ควรจ่าย + วินัย", "แรงโน้มถ่วงของมูลค่า และบัตรเจาะ 20 ช่อง",
     "ธุรกิจดีในราคาผิดคือการลงทุนที่แย่ — ดอกเบี้ยคือแรงโน้มถ่วงที่ตลาดปี 1999 มองข้าม "
     "และบัตรเจาะ 20 ช่องคือกติกาที่บังคับให้รอราคาที่ถูกต้อง", [9, 10]),
    (5, "ชีวิตที่รองรับวิธีคิดนี้", "เพราะพอร์ตที่ดี สร้างไม่ได้บนชีวิตที่พัง",
     "สองสุนทรพจน์ปิดเล่ม: สูตรการันตีความทุกข์ (จงอ่านกลับด้าน) และพินัยกรรมทางความคิดของ Munger — "
     "ความน่าเชื่อถือ การเรียนรู้ไม่หยุด และความไว้ใจที่สมควรได้", [11, 12]),
]

FILES = {f for _, f, *_ in CH}
NUM_OF = {f: n for n, f, *_ in CH}


def extract(num, fname):
    html = (SITE / "articles" / fname).read_text(encoding="utf-8")
    m = re.search(r"<!-- TOC-END -->(.*?)</div>\s*</main>", html, re.S)
    assert m, f"{fname}: body slice not found"
    body = m.group(1)
    assert body.count("<h2") >= 4, f"{fname}: only {body.count('<h2')} h2 sections"
    # namespace ids ต่อบท กัน id ชนกันข้ามบท
    body = body.replace('id="sec-', f'id="ch{num}-sec-')
    body = body.replace('href="#sec-', f'href="#ch{num}-sec-')
    # ลิงก์ระหว่าง 12 บทในเล่ม → anchor ในเล่ม
    def xchap(mm):
        tgt = mm.group(1)
        if tgt in FILES:
            return f'href="#ch{NUM_OF[tgt]}"'
        return f'href="{BASE}/articles/{tgt}"'
    body = re.sub(r'href="([a-z0-9-]+\.html)(?:#[^"]*)?"', xchap, body)
    body = re.sub(r'href="\.\./([^"]+)"', rf'href="{BASE}/\1"', body)
    return body


chapters = {}
for num, fname, speaker, year, title, hook in CH:
    chapters[num] = dict(num=num, speaker=speaker, year=year, title=title, hook=hook,
                         body=extract(num, fname))
    print(f"  ch{num:02d} [{speaker} {year}] {title[:44]}: {len(chapters[num]['body'])//1000}k")

# ---------- cover motif: เส้นทางตัดสินใจ 5 สถานี 12 จุด ----------
STN_X = [70, 216, 362, 508, 654]
dots_per = [2, 3, 3, 2, 2]
motif = []
motif.append('<path d="M70 210 C 180 130, 260 290, 362 210 C 460 135, 560 285, 654 210" fill="none" stroke="#2a3a32" stroke-width="2"/>')
k = 0
for i, (x, nd) in enumerate(zip(STN_X, dots_per)):
    y = [210, 210, 210, 210, 210][i]
    last = (i == 4)
    motif.append(f'<circle cx="{x}" cy="{y}" r="17" fill="{"#16341f" if last else "#12211a"}" stroke="{"#22c55e" if last else "#2a3a32"}" stroke-width="1.6"/>')
    motif.append(f'<text x="{x}" y="{y+6}" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="15" font-weight="700" fill="{"#22c55e" if last else "#8fb3a2"}">{i+1}</text>')
    for j in range(nd):
        k += 1
        dx = x - 20 + j * 20 + (10 if nd == 2 else 0)
        motif.append(f'<circle cx="{dx}" cy="{y+44}" r="5.5" fill="#12211a" stroke="#3a5a48" stroke-width="1.2"/>')
COVER_SVG = ('<svg viewBox="0 0 740 300" role="img" aria-label="เส้นทางตัดสินใจห้าสถานี สิบสองบทเรียน — '
             'จากรากฐาน หัวที่คิด ธุรกิจ ราคา จนถึงชีวิต">' + "".join(motif) +
             '<text x="70" y="290" font-family="IBM Plex Mono, monospace" font-size="12" fill="#5c6f66">รากฐาน → หัวที่คิด → ธุรกิจ → ราคา+วินัย → ชีวิต</text></svg>')

CSS = """
  @page { size: A4; margin: 14mm 14mm 16mm; }
  html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  html, body { background: var(--bg) !important; }
  .eb a { color: var(--accent) !important; }
  .eb .eb-dark a { color: #4ecaa0 !important; }
  .eb { max-width: none; margin: 0; padding: 0; font-size: 15px; }
  .eb p, .eb li { orphans: 3; widows: 3; }
  .eb h2 { break-after: avoid-page; }
  .eb figure.ph-fig, .eb blockquote, .eb table { break-inside: avoid; }

  .ph-panel .sa, .ph-panel .sa.n {
    animation-play-state: paused !important;
    animation-delay: -999s !important;
  }

  .eb-dark { height: 265mm; border-radius: 12px; background: #0a0e0c;
    border: 1px solid #1e2a24; color: #e8eaed; position: relative;
    display: flex; flex-direction: column; padding: 18mm 16mm; box-sizing: border-box; }
  .eb-cover { break-after: page; }
  .eb-brand { font-family: "IBM Plex Mono", monospace; font-size: 13px; letter-spacing: .42em; color: #8fb3a2; }
  .eb-cover-title { font-family: var(--font-head); font-weight: 700; font-size: 72px; line-height: 1.06;
    color: #f2f4f3; margin: 18mm 0 6mm; letter-spacing: -.01em; }
  .eb-cover-title .accent { color: #22c55e; }
  .eb-cover-sub { font-family: var(--font-head); font-weight: 600; font-size: 22px; color: #cdd6d1; margin: 0 0 4mm; }
  .eb-cover-desc { font-size: 15.5px; line-height: 1.8; color: #8b968f; max-width: 130mm; }
  .eb-cover-cases { margin-top: 6mm; font-family: "IBM Plex Mono", monospace; font-size: 11.5px;
    letter-spacing: .06em; color: #5c6f66; }
  .eb-cover-art { margin-top: auto; }
  .eb-cover-foot { display: flex; justify-content: space-between; margin-top: 8mm;
    font-family: "IBM Plex Mono", monospace; font-size: 11.5px; color: #5c6f66; }

  .eb-page { break-before: page; }
  .eb-kick { font-family: "IBM Plex Mono", monospace; font-size: 12px; letter-spacing: .3em;
    color: var(--accent); text-transform: uppercase; margin-bottom: 10mm; }

  .eb-colo h3 { font-family: var(--font-head); font-size: 17px; margin: 9mm 0 2.5mm; }
  .eb-colo p { color: var(--text); margin: 0 0 2.5mm; line-height: 1.85; }
  .eb-colo .dim { color: var(--muted); font-size: 13.5px; }

  .eb-toc-part { font-family: var(--font-head); font-weight: 700; font-size: 15px; color: var(--accent);
    margin: 6mm 0 1mm; }
  .eb-toc-item { display: flex; gap: 6mm; align-items: baseline; padding: 3.4mm 0;
    border-bottom: 1px solid var(--border); text-decoration: none; }
  .eb-toc-item .n { font-family: "IBM Plex Mono", monospace; font-size: 18px; font-weight: 700; color: var(--accent); min-width: 10mm; }
  .eb-toc-item .t { flex: 1; }
  .eb-toc-item .t .en { font-family: var(--font-head); font-weight: 700; font-size: 15.5px; color: var(--text); display: block; }
  .eb-toc-item .t .th { color: var(--muted); font-size: 12.5px; line-height: 1.6; display: block; margin-top: .6mm; }
  .eb-toc-item .tk { font-family: "IBM Plex Mono", monospace; font-size: 11.5px; color: var(--accent); }

  .eb-div { break-before: page; break-after: page; height: 258mm; display: flex;
    flex-direction: column; justify-content: center; position: relative; }
  .eb-dots { display: flex; gap: 2.6mm; margin-bottom: 10mm; }
  .eb-dots span { width: 3.2mm; height: 3.2mm; border-radius: 50%; background: var(--border); }
  .eb-dots span.on { background: var(--accent); }
  .eb-div .big { font-family: var(--font-head); font-weight: 700; font-size: 130px; line-height: .9;
    color: var(--accent-tint); -webkit-text-stroke: 1.5px var(--accent); letter-spacing: -.02em; }
  .eb-div .power { font-family: var(--font-head); font-weight: 700; font-size: 40px; color: var(--text);
    margin: 8mm 0 3mm; letter-spacing: -.01em; }
  .eb-div .hook { font-family: var(--font-head); font-weight: 600; font-size: 18px; color: var(--muted);
    line-height: 1.6; max-width: 150mm; margin-bottom: 10mm; }
  .eb-div .desc { font-size: 14.5px; color: var(--text); line-height: 1.85; max-width: 150mm; margin-bottom: 10mm; }
  .eb-pl { border-top: 1px solid var(--border); max-width: 150mm; }
  .eb-pl .row { display: flex; gap: 5mm; padding: 3.4mm 0; border-bottom: 1px solid var(--border);
    align-items: baseline; }
  .eb-pl .no { font-family: "IBM Plex Mono", monospace; font-size: 13px; font-weight: 700; color: var(--accent); min-width: 9mm; }
  .eb-pl .ti { font-family: var(--font-head); font-weight: 600; font-size: 14.5px; color: var(--text); flex: 1; }
  .eb-pl .sp { font-family: "IBM Plex Mono", monospace; font-size: 11px; color: var(--muted); }

  .eb-ch h2 { font-size: 21px; margin-top: 9mm; }
  .eb-ch .lead { font-size: 16.5px; }
  .eb-ch-head { font-family: "IBM Plex Mono", monospace; font-size: 11.5px; letter-spacing: .22em;
    color: var(--accent); border-bottom: 1px solid var(--border); padding-bottom: 2.6mm; margin-bottom: 7mm; }
  .eb-ch-head .r { float: right; color: var(--muted); letter-spacing: .06em; }
  .eb-ch-title { font-family: var(--font-head); font-weight: 700; font-size: 26px; color: var(--text);
    margin: 0 0 2mm; line-height: 1.3; }
  .eb-ch-hook { font-family: var(--font-head); font-weight: 600; font-size: 14.5px; color: var(--muted);
    margin: 0 0 7mm; line-height: 1.65; }

  .eb-essay p { line-height: 1.95; margin: 0 0 4mm; color: var(--text); }
  .eb-essay .big-q { font-family: var(--font-head); font-weight: 700; font-size: 21px; line-height: 1.6;
    color: var(--text); border-left: 4px solid var(--accent); padding-left: 6mm; margin: 8mm 0; }

  .eb-map { border: 1px solid var(--border); border-radius: 10px; padding: 6mm 7mm; margin: 6mm 0; }
  .eb-map .st { font-family: "IBM Plex Mono", monospace; font-size: 11.5px; letter-spacing: .18em;
    color: var(--accent); margin-bottom: 2mm; }
  .eb-map .q { font-family: var(--font-head); font-weight: 700; font-size: 16.5px; color: var(--text); margin-bottom: 1.6mm; }
  .eb-map p { margin: 0; color: var(--muted); font-size: 13.5px; line-height: 1.8; }

  .eb-back { break-before: page; }
  .eb-back .bigq { font-family: var(--font-head); font-weight: 700; font-size: 36px; line-height: 1.45;
    color: #f2f4f3; margin: 20mm 0 0; max-width: 152mm; }
  .eb-back .bigq .accent { color: #22c55e; }
  .eb-back .bot { margin-top: auto; }
  .eb-back .wm { font-family: var(--font-head); font-weight: 700; font-size: 46px; color: #f2f4f3; margin-bottom: 3mm; }
  .eb-back p { color: #8b968f; line-height: 1.85; max-width: 128mm; margin: 0 0 3mm; }
  .eb-back .fine { font-size: 12px; color: #5c6f66; }
"""

dots = lambda k: "".join(f'<span class="{"on" if i < k else ""}"></span>' for i in range(5))

# ---------- TOC จัดกลุ่มตามภาค ----------
toc = []
for pno, pname, ptag, pdesc, chs in PARTS:
    toc.append(f'<div class="eb-toc-part">ภาค {pno} · {pname} — {ptag}</div>')
    for cn in chs:
        c = chapters[cn]
        toc.append(f'''<a class="eb-toc-item" href="#ch{cn}">
      <span class="n">{cn:02d}</span>
      <span class="t"><span class="en">{c["title"]}</span><span class="th">{c["hook"]}</span></span>
      <span class="tk">{c["speaker"].upper()} · {c["year"]}</span></a>''')
toc.append('''<a class="eb-toc-item" href="#closing">
      <span class="n">★</span>
      <span class="t"><span class="en">บทปิด — แผนที่รวมทั้งเส้นทาง</span><span class="th">คำถาม 5 สถานีก่อนกดซื้อ + สามเสียงร่วมของสองปรมาจารย์</span></span>
      <span class="tk">MAP</span></a>''')
toc_html = "\n".join(toc)

# ---------- บทนำเล่ม ----------
INTRO = """
  <section class="eb-page eb-essay" id="intro">
    <div class="eb-kick">INTRODUCTION</div>
    <div class="eb-ch-title">ทำไมต้องอ่านสองคนนี้ — และทำไมต้องอ่านตามลำดับนี้</div>
    <p>
      Warren Buffett กับ Charlie Munger ใช้เวลาร่วมกันกว่าหกสิบปีพิสูจน์ข้อเสนอเดียว:
      การลงทุนที่ดีไม่ได้เริ่มที่การเลือกหุ้น มันเริ่มที่การเลือก<strong>วิธีคิด</strong>
      — และวิธีคิดนั้นเรียนได้ สอนได้ ส่งต่อได้ ทั้งคู่ทิ้งหลักฐานไว้เป็นสุนทรพจน์และเลกเชอร์
      ที่นักลงทุนทั้งโลกถ่ายเอกสารส่งต่อกันมาหลายทศวรรษ — เล่มนี้รวบ 12 ชิ้นที่สำคัญที่สุด
      มาเรียบเรียงใหม่เป็นภาษาไทย พร้อมภาพประกอบที่วาดจากตัวเลขจริงของแต่ละเรื่อง
    </p>
    <p>
      แต่เล่มนี้ไม่ได้เรียงตามปี และไม่ได้แยกตามคนพูด — มันเรียงตาม
      <strong>เส้นทางตัดสินใจของนักลงทุนหนึ่งคน</strong>: ก่อนอื่นต้องมีหลักฐานว่าเกมนี้ชนะได้จริง
      (ภาค 1) แล้วต้องซ่อมเครื่องมือชิ้นแรกคือสมองของเราเอง (ภาค 2)
      จากนั้นจึงถามว่าธุรกิจแบบไหนคู่ควร (ภาค 3) ราคาเท่าไหร่ถึงถูกต้อง และวินัยแบบไหน
      ทำให้รอราคานั้นไหว (ภาค 4) — และสุดท้าย เพราะพอร์ตที่ดีสร้างไม่ได้บนชีวิตที่พัง
      เล่มจึงปิดด้วยสองสุนทรพจน์ที่ว่าด้วยการใช้ชีวิต (ภาค 5)
    </p>
    <p class="big-q">อ่านจบแล้วคำถามในหัวควรเปลี่ยนจาก "หุ้นตัวนี้น่าสนไหม"
      เป็น "ธุรกิจนี้คู่ควรกับ 1 ใน 20 ช่องของทั้งชีวิตไหม — และอะไรจะพิสูจน์ว่าเราคิดผิด"</p>
    <p>
      ทุกบทจบในตัวเอง กระโดดอ่านได้ — แต่ถ้าอ่านเรียงตามภาค เสียงของสองคนจะเริ่มสอดประสานกัน:
      Buffett สอนด้วยเรื่องเล่าและตัวเลข Munger สอนด้วยโครงสร้างและการกลับด้าน
      คนหนึ่งบอกว่า "ซื้อธุรกิจ ไม่ใช่ซื้อหุ้น" อีกคนบอกว่า "บอกผมว่าจะตายที่ไหน
      แล้วผมจะไม่ไปที่นั่น" — สองประโยคนี้คือเล่มทั้งเล่มในสองบรรทัด
    </p>
  </section>
"""

# ---------- บทปิด ----------
CLOSING = """
  <section class="eb-page eb-essay" id="closing">
    <div class="eb-kick">THE MAP</div>
    <div class="eb-ch-title">บทปิด — แผนที่รวมทั้งเส้นทาง</div>
    <p>
      สิบสองบทเรียนในเล่มนี้ยุบเหลือคำถาม 5 ข้อ — ถามเรียงตามลำดับ ก่อนกดซื้อทุกครั้ง:
    </p>
    <div class="eb-map"><div class="st">STATION 1 · รากฐาน</div>
      <div class="q">เรากำลังเล่นเกมของ Graham-and-Doddsville หรือเกมโยนเหรียญ?</div>
      <p>ถ้าคำตอบของเราอิงราคาที่คนอื่นจะจ่ายพรุ่งนี้ = โยนเหรียญ ถ้าอิงมูลค่ากิจการกับส่วนลด = อยู่ในหมู่บ้าน (บท 1–2)</p></div>
    <div class="eb-map"><div class="st">STATION 2 · หัวที่คิด</div>
      <div class="q">เราใช้โมเดลกี่ตัวมองดีลนี้ — และอคติตัวไหนกำลังบีบเราอยู่?</div>
      <p>ปัญหาไม่ประกาศตัวว่าสังกัดคณะไหน ใช้ตาข่าย ไม่ใช่ค้อน แล้วเช็คมิเตอร์ lollapalooza: ตอนนี้มีสวิตช์อคติกี่ตัวเปิดอยู่ (บท 3–5)</p></div>
    <div class="eb-map"><div class="st">STATION 3 · ธุรกิจ</div>
      <div class="q">การตัดสินใจที่ยากที่สุดประจำปีของผู้บริหารบริษัทนี้ คือ "ขึ้นราคาเท่าไหร่" หรือ "รอดยังไง"?</div>
      <p>บททดสอบ See's — และถ้าบริษัทโม้เป้าใหญ่ แตกเป้านั้นแบบกระดาน $2T จนเห็นว่าต้องเชื่ออะไรบ้าง (บท 6–8)</p></div>
    <div class="eb-map"><div class="st">STATION 4 · ราคา + วินัย</div>
      <div class="q">ที่ราคานี้ ตลาดกำลังสมมติอะไร — และดีลนี้คู่ควรกับ 1 ใน 20 ช่องไหม?</div>
      <p>อย่าลืมแรงโน้มถ่วง: มูลค่าทุกสินทรัพย์คือกระแสเงินสดอนาคตหารด้วยดอกเบี้ย และบัตรเจาะมีช่องจำกัด (บท 9–10)</p></div>
    <div class="eb-map"><div class="st">STATION 5 · ชีวิต</div>
      <div class="q">การตัดสินใจนี้ พาเราเข้าใกล้หรือออกห่างจากใบสั่งยาการันตีความทุกข์?</div>
      <p>leverage, อิจฉา, ขุ่นเคือง, ไม่รักษาคำพูด — ทางไปนรกทุกสายรู้แล้ว อย่าเดินเข้าไป และจงสมควรได้ในสิ่งที่อยากได้ (บท 11–12)</p></div>
    <p class="big-q">สามเสียงร่วมที่ดังทั้งเล่ม: ซื้อธุรกิจ ไม่ใช่ซื้อหุ้น ·
      กลับด้านเสมอ — เขียนเงื่อนไขที่ฆ่า thesis ก่อนกดซื้อ · นิสัยชนะพรสวรรค์
      เพราะนิสัยเลือกได้ พรสวรรค์เลือกไม่ได้</p>
    <p>
      Munger จากโลกนี้ไปเมื่อปลายปี 2023 ในวัย 99 ปี — สุนทรพจน์ USC ปิดท้ายด้วยเพลง
      ที่เขาบอกว่าอยากให้เป็นของขวัญ: ปัญญาคือหน้าที่ทางศีลธรรม ไม่ใช่ทางเลือก
      เล่มนี้จะทำหน้าที่ของมัน ถ้ามันทำให้เราอ่านต้นฉบับภาษาอังกฤษของทั้ง 12 ชิ้นต่อ —
      ทุกชิ้นหาอ่านฟรีได้ และทุกชิ้นดีกว่าบทสรุปของมันเสมอ
    </p>
  </section>
"""

# ---------- ประกอบเล่ม ----------
part_html = ""
for pno, pname, ptag, pdesc, chs in PARTS:
    rows = "".join(
        f'<div class="row"><span class="no">{cn:02d}</span><span class="ti">{chapters[cn]["title"]}</span>'
        f'<span class="sp">{chapters[cn]["speaker"].upper()} · {chapters[cn]["year"]}</span></div>'
        for cn in chs)
    part_html += f'''
  <section class="eb-div" id="part{pno}">
    <div class="eb-dots">{dots(pno)}</div>
    <div class="big">ภาค {pno}</div>
    <div class="power">{pname}</div>
    <div class="hook">{ptag}</div>
    <div class="desc">{pdesc}</div>
    <div class="eb-pl">{rows}</div>
  </section>'''
    for cn in chs:
        c = chapters[cn]
        part_html += f'''
  <section class="eb-ch eb-page" id="ch{cn}">
    <div class="eb-ch-head">ภาค {pno} · บทที่ {cn:02d}<span class="r">{c["speaker"].upper()} · {c["year"]}</span></div>
    <div class="eb-ch-title">{c["title"]}</div>
    <div class="eb-ch-hook">{c["hook"]}</div>
    {c["body"]}
  </section>'''

scene_links = "\n  ".join(
    f'<link rel="stylesheet" href="scenes/{f.replace(".html", ".min.css")}">' for _, f, *_ in CH)

html = f'''<!DOCTYPE html>
<html lang="th" data-theme="light">
<head>
<meta charset="UTF-8">
<title>Buffett × Munger — เส้นทางตัดสินใจของนักลงทุน · Moatrices</title>
<link rel="stylesheet" href="style.min.css">
{scene_links}
<style>{CSS}</style>
</head>
<body>
<div class="eb">

  <section class="eb-dark eb-cover">
    <div class="eb-brand">MOATRICES</div>
    <div class="eb-cover-title">Buffett <span class="accent">×</span> Munger</div>
    <div class="eb-cover-sub">เส้นทางตัดสินใจของนักลงทุน — 12 บทเรียนต้นฉบับจากสองปรมาจารย์</div>
    <p class="eb-cover-desc">สุนทรพจน์และเลกเชอร์ 12 ชิ้นที่นักลงทุนทั้งโลกถ่ายเอกสารส่งต่อกัน
      เรียบเรียงใหม่เป็น 5 ภาคตามเส้นทางตัดสินใจ: จากหลักฐานว่าเกมนี้ชนะได้จริง
      จนถึงชีวิตที่รองรับวิธีคิดทั้งหมดนี้</p>
    <div class="eb-cover-cases">SUPERINVESTORS 1984 · WORLDLY WISDOM 1994 · MISJUDGMENT 1995 · SEE'S 1991 · $2T 1996 · PUNCH CARD · USC 2007</div>
    <div class="eb-cover-art">{COVER_SVG}</div>
    <div class="eb-cover-foot"><span>ฉบับรวมเล่ม · กรกฎาคม 2026</span><span>beatp9696-arch.github.io</span></div>
  </section>

  <section class="eb-page eb-colo">
    <div class="eb-kick">ABOUT THIS BOOK</div>
    <h3>หนังสือเล่มนี้คืออะไร</h3>
    <p>รวมบทความหมวด <strong>Buffett Talks + Munger Talks</strong> ทั้ง 12 บทจากเว็บ Moatrices
      เรียบเรียงใหม่เป็นโครง 5 ภาคตามเส้นทางตัดสินใจของนักลงทุน — ภาพประกอบทุกภาพเป็น "เครื่องมือ"
      ที่วาดจากตัวเลขจริงในเอกสารต้นฉบับ ไม่ใช่ภาพตกแต่ง</p>
    <h3>อ่านเล่มนี้ยังไง</h3>
    <p>อ่านเรียงตามภาคได้ หรือกระโดดจากสารบัญก็ได้ — ลิงก์ในเล่มกดได้ทั้งหมด:
      ลิงก์ข้ามบทพาไปบทนั้นในเล่ม ลิงก์อื่นพาไปเว็บ</p>
    <h3>ที่มาของเนื้อหา</h3>
    <p>ทุกบทเป็นบันทึกการเรียน — สรุปสุนทรพจน์/เลกเชอร์/หนังสือเพื่อการศึกษา
      คำคม (quote) คงไว้เป็นภาษาอังกฤษตามต้นฉบับ ตัวเลขทั้งหมดมาจากเอกสารตีพิมพ์จริง
      (Hermes 1984, Fortune 1999, Outstanding Investor Digest, Poor Charlie's Almanack, จดหมายผู้ถือหุ้น Berkshire)</p>
    <h3>เครดิต</h3>
    <p>ต้นฉบับทั้งหมดเป็นของ Warren Buffett และ Charlie Munger — การตีความ การเรียบเรียง
      และความผิดพลาดใดๆ เป็นของผู้เขียนเอง</p>
    <p class="dim" style="margin-top:9mm"><strong>คำเตือน:</strong> เนื้อหาทั้งหมดเป็นบันทึกการเรียนและความเห็นส่วนตัวเพื่อการศึกษาเท่านั้น
      ไม่ใช่คำแนะนำการลงทุน ไม่ใช่การชี้นำให้ซื้อหรือขายหลักทรัพย์ใดๆ
      การตัดสินใจลงทุนเป็นความรับผิดชอบของผู้อ่านเอง</p>
    <p class="dim">© 2026 Moatrices · beatp9696-arch.github.io</p>
  </section>

  <section class="eb-page">
    <div class="eb-kick">CONTENTS</div>
    {toc_html}
  </section>
{INTRO}{part_html}{CLOSING}

  <section class="eb-dark eb-back">
    <div class="eb-brand">MOATRICES</div>
    <div class="bigq">คนหนึ่งบอกว่า <span class="accent">"ซื้อธุรกิจ ไม่ใช่ซื้อหุ้น"</span>
      อีกคนบอกว่า <span class="accent">"บอกผมว่าจะตายที่ไหน แล้วผมจะไม่ไปที่นั่น"</span>
      — สองประโยคนี้คือเล่มทั้งเล่ม ที่เหลือคือหลักฐาน ตัวเลข และวิธีใช้</div>
    <div class="bot">
      <div class="wm">Moatrices</div>
      <p>บันทึกการเรียนวิเคราะห์หุ้น US เชิงลึก ภาษาไทย — เน้นพื้นฐานธุรกิจ ไม่ใช่ราคา</p>
      <p>อ่านเคสเจาะรายบริษัท ซีรีส์ 7 Powers และ "คูเมืองแตก"
        ได้ที่ <a href="{BASE}">beatp9696-arch.github.io</a></p>
      <p class="fine">เนื้อหาเพื่อการศึกษาเท่านั้น ไม่ใช่คำแนะนำการลงทุน · © 2026 Moatrices</p>
    </div>
  </section>

</div>
</body>
</html>'''

OUT.write_text(html, encoding="utf-8")
print(f"OK → {OUT} ({len(html)//1000}k)")
