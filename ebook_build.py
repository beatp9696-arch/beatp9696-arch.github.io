#!/usr/bin/env python3
"""ประกอบ e-book 7 Powers จากบทความ 7 ตอนบนเว็บ Moatrices → _ebook_7powers.html (print master, A4)

ขั้นตอนออกเล่มเต็ม (master `_ebook_7powers.html` ห้าม commit):
1. python3 ebook_build.py
2. เสิร์ฟผ่าน localhost (python3 -m http.server) — ฟอนต์ไทย self-hosted ไม่โหลดผ่าน file://
3. headless Chrome CDP `Page.printToPDF` {printBackground, preferCSSPageSize, generateDocumentOutline}
   (เปิดแท็บด้วย HTTP PUT /json/new — Chrome ใหม่ปฏิเสธ GET)
4. finalize ด้วย pymupdf: ทาพื้นครีม draw_rect overlay=False ทุกหน้า (Chrome ไม่ทาสีลง margin ของ @page)
   + ประทับเลขหน้า (ข้ามปกหน้า/หลัง) + set_metadata → moatrices-7powers.pdf

จุดที่ทำให้ฉาก SVG นิ่งที่จังหวะจบ: CSS ในเล่ม override `animation-delay: -999s` + paused
(อย่าใช้ animation:none — chip counter จะค้างที่ 0 และ element ที่ fade-in จะหาย)
จุดที่ต้องชนะ @media print ของ style.css: พื้น #fff กับลิงก์ดำ — override ด้วย !important ท้าย cascade
"""
import re, sys, pathlib

SITE = pathlib.Path(__file__).resolve().parent
OUT = SITE / "_ebook_7powers.html"
BASE = "https://beatp9696-arch.github.io"

# num, file, power EN, case label, ticker, benefit, barrier  (benefit/barrier = ตารางแผนที่ในตอน 7)
CH = [
    (1, "powers-01-scale-economies.html",    "Scale Economies",     "Costco",                  "COST", "ยิ่งใหญ่ ต้นทุนต่อหน่วยยิ่งต่ำ",            "คู่แข่งต้องยอมขาดทุนระหว่างไล่ขนาด"),
    (2, "powers-02-network-economies.html",  "Network Economies",   "MercadoLibre",            "MELI", "ยิ่งคนเยอะ ของยิ่งมีค่ากับทุกคน",           "ปัญหาไก่-ไข่: ต้องดึงคนทั้งฝูงพร้อมกัน"),
    (3, "powers-03-counter-positioning.html","Counter-Positioning", "Netflix vs Blockbuster",  "NFLX", "โมเดลใหม่ที่ดีกว่าสำหรับลูกค้า",            "เจ้าตลาดลอกแล้วฆ่ากำไรตัวเอง จึงเลือกไม่ลอก"),
    (4, "powers-04-switching-costs.html",    "Switching Costs",     "Synopsys",                "SNPS", "ลูกค้าเดิมจ่ายต่อโดยไม่ต่อรอง",             "ค่าย้ายออกแพงกว่าส่วนต่างราคาหลายเท่า"),
    (5, "powers-05-branding.html",           "Branding",            "Apple",                   "AAPL", "ของใกล้เคียงกัน ขายแพงกว่าได้",             "ความเชื่อใจสร้างได้ด้วยเวลาเท่านั้น"),
    (6, "powers-06-cornered-resource.html",  "Cornered Resource",   "ASML",                    "ASML", "ถือของที่ทั้งอุตสาหกรรมขาดไม่ได้",           "คู่แข่งเข้าถึงไม่ได้เลย (กฎหมาย/สัญญา/ฟิสิกส์)"),
    (7, "powers-07-process-power.html",      "Process Power",       "TSMC",                    "TSM",  "ทำของเดียวกันได้ดีกว่า/ถูกกว่า",            "ลอกได้ทางเดียวคือทุ่มเวลาหลายปี (hysteresis)"),
]

def extract(num, fname):
    html = (SITE / "articles" / fname).read_text(encoding="utf-8")
    h1 = re.search(r"<h1>(.*?)</h1>", html, re.S)
    assert h1, f"{fname}: h1 not found"
    title = re.sub(r"\s+", " ", h1.group(1)).strip()
    hook = title.split(" — ", 1)[1] if " — " in title else title
    m = re.search(r"<!-- TOC-END -->(.*?)</div>\s*</main>", html, re.S)
    assert m, f"{fname}: body slice not found"
    body = m.group(1)
    assert body.count("<h2") >= 6, f"{fname}: only {body.count('<h2')} h2 sections"
    # namespace ids ต่อบท กัน id ชนกันข้ามบท
    body = body.replace('id="sec-', f'id="ch{num}-sec-')
    body = body.replace('href="#sec-', f'href="#ch{num}-sec-')
    # ลิงก์ข้ามตอนในซีรีส์ → anchor ในเล่ม
    def xchap(mm):
        tgt = int(mm.group(1)); anch = mm.group(2)
        if anch and anch.startswith("#sec-"):
            return f'href="#ch{tgt}-{anch[1:]}"'
        return f'href="#ch{tgt}"'
    body = re.sub(r'href="powers-0(\d)[^"#]*\.html(#[^"]*)?"', xchap, body)
    # ลิงก์ relative อื่นๆ → absolute ไปเว็บ (กดได้จาก PDF)
    body = re.sub(r'href="\.\./([^"]+)"', rf'href="{BASE}/\1"', body)
    body = re.sub(r'href="(?!https?://|#|mailto:)([^"]+)"', rf'href="{BASE}/articles/\1"', body)
    return hook, body

chapters = []
for num, fname, power, case, ticker, benefit, barrier in CH:
    hook, body = extract(num, fname)
    chapters.append(dict(num=num, power=power, case=case, ticker=ticker,
                         benefit=benefit, barrier=barrier, hook=hook, body=body))
    print(f"  ch{num} {power}: {len(body)//1000}k, h2={body.count('<h2')}")

# ---------- cover motif: กำแพงคูเมือง 7 เสา สูงขึ้นตามเวลาที่ใช้สร้าง ----------
PILLW = 72; GAP = 20; X0 = 46
heights = [118, 146, 104, 170, 156, 200, 236]   # เรียงตาม "เวลาสะสมที่ต้องใช้" — พีคที่ Process Power
tickers = [c[4] for c in CH]
pill = []
for i, (h, tk) in enumerate(zip(heights, tickers)):
    x = X0 + i * (PILLW + GAP); y = 300 - h
    last = (i == 6)
    fill = "#12211a" if not last else "#16341f"
    stroke = "#2a3a32" if not last else "#22c55e"
    numfill = "#8fb3a2" if not last else "#22c55e"
    pill.append(f'''
      <rect x="{x}" y="{y}" width="{PILLW}" height="{h}" rx="6" fill="{fill}" stroke="{stroke}" stroke-width="1.4"/>
      <text x="{x + PILLW/2}" y="{y + 30}" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="17" font-weight="700" fill="{numfill}">{i+1}</text>
      <text x="{x + PILLW/2}" y="322" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="11" fill="#5c6f66">{tk}</text>''')
COVER_SVG = f'''<svg viewBox="0 0 740 372" role="img" aria-label="กำแพงคูเมืองเจ็ดเสา — อำนาจทั้งเจ็ดเรียงจากซ้ายไปขวา สูงขึ้นตามเวลาที่ต้องใช้สร้าง จบที่ Process Power เสาที่สูงที่สุด">
  <line x1="30" y1="300" x2="710" y2="300" stroke="#1e2a24" stroke-width="1.6"/>
  {''.join(pill)}
  <line x1="30" y1="334" x2="710" y2="334" stroke="#16211c" stroke-width="1"/>
  <text x="710" y="360" text-anchor="end" font-family="IBM Plex Mono, monospace" font-size="12" fill="#5c6f66">เวลาที่ต้องใช้สร้างอำนาจ →</text>
</svg>'''

CSS = """
  @page { size: A4; margin: 14mm 14mm 16mm; }
  html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  /* ชนะ @media print ของ style.css (บังคับ #fff + ลิงก์ดำ) — ต้อง !important + มาทีหลังใน cascade */
  html, body { background: var(--bg) !important; }
  .eb a { color: var(--accent) !important; }
  .eb .eb-dark a { color: #4ecaa0 !important; }
  .eb { max-width: none; margin: 0; padding: 0; font-size: 15px; }
  .eb p, .eb li { orphans: 3; widows: 3; }
  .eb h2 { break-after: avoid-page; }
  .eb figure.ph-fig, .eb blockquote, .eb table { break-inside: avoid; }

  /* ---- freeze ทุกฉากที่ end state (จังหวะสุดท้ายของ narrative) ---- */
  .ph-panel .sa, .ph-panel .sa.n {
    animation-play-state: paused !important;
    animation-delay: -999s !important;
  }

  /* ---- หน้ามืด (ปก/ปกหลัง) ---- */
  .eb-dark { height: 265mm; border-radius: 12px; background: #0a0e0c;
    border: 1px solid #1e2a24; color: #e8eaed; position: relative;
    display: flex; flex-direction: column; padding: 18mm 16mm; box-sizing: border-box; }
  .eb-cover { break-after: page; }
  .eb-brand { font-family: "IBM Plex Mono", monospace; font-size: 13px; letter-spacing: .42em; color: #8fb3a2; }
  .eb-cover-title { font-family: var(--font-head); font-weight: 700; font-size: 104px; line-height: 1.02;
    color: #f2f4f3; margin: 22mm 0 6mm; letter-spacing: -.01em; }
  .eb-cover-title .accent { color: #22c55e; }
  .eb-cover-sub { font-family: var(--font-head); font-weight: 600; font-size: 23px; color: #cdd6d1; margin: 0 0 4mm; }
  .eb-cover-desc { font-size: 15.5px; line-height: 1.8; color: #8b968f; max-width: 125mm; }
  .eb-cover-cases { margin-top: 6mm; font-family: "IBM Plex Mono", monospace; font-size: 11.5px;
    letter-spacing: .06em; color: #5c6f66; }
  .eb-cover-art { margin-top: auto; }
  .eb-cover-foot { display: flex; justify-content: space-between; margin-top: 8mm;
    font-family: "IBM Plex Mono", monospace; font-size: 11.5px; color: #5c6f66; }

  /* ---- หน้าใน ---- */
  .eb-page { break-before: page; }
  .eb-kick { font-family: "IBM Plex Mono", monospace; font-size: 12px; letter-spacing: .3em;
    color: var(--accent); text-transform: uppercase; margin-bottom: 10mm; }

  /* colophon */
  .eb-colo h3 { font-family: var(--font-head); font-size: 17px; margin: 9mm 0 2.5mm; }
  .eb-colo p { color: var(--text); margin: 0 0 2.5mm; line-height: 1.85; }
  .eb-colo .dim { color: var(--muted); font-size: 13.5px; }

  /* toc */
  .eb-toc-item { display: flex; gap: 7mm; align-items: baseline; padding: 5.2mm 0;
    border-bottom: 1px solid var(--border); text-decoration: none; }
  .eb-toc-item .n { font-family: "IBM Plex Mono", monospace; font-size: 22px; font-weight: 700; color: var(--accent); min-width: 12mm; }
  .eb-toc-item .t { flex: 1; }
  .eb-toc-item .t .en { font-family: var(--font-head); font-weight: 700; font-size: 18.5px; color: var(--text); display: block; }
  .eb-toc-item .t .th { color: var(--muted); font-size: 13.5px; line-height: 1.65; display: block; margin-top: 1mm; }
  .eb-toc-item .tk { font-family: "IBM Plex Mono", monospace; font-size: 12px; color: var(--accent); }

  /* chapter divider */
  .eb-div { break-before: page; break-after: page; height: 258mm; display: flex;
    flex-direction: column; justify-content: center; position: relative; }
  .eb-dots { display: flex; gap: 2.6mm; margin-bottom: 10mm; }
  .eb-dots span { width: 3.2mm; height: 3.2mm; border-radius: 50%; background: var(--border); }
  .eb-dots span.on { background: var(--accent); }
  .eb-div .big { font-family: var(--font-head); font-weight: 700; font-size: 150px; line-height: .9;
    color: var(--accent-tint); -webkit-text-stroke: 1.5px var(--accent); letter-spacing: -.02em; }
  .eb-div .power { font-family: var(--font-head); font-weight: 700; font-size: 44px; color: var(--text);
    margin: 8mm 0 4mm; letter-spacing: -.01em; }
  .eb-div .hook { font-family: var(--font-head); font-weight: 600; font-size: 19px; color: var(--muted);
    line-height: 1.6; max-width: 150mm; margin-bottom: 12mm; }
  .eb-bb { border-top: 1px solid var(--border); max-width: 150mm; }
  .eb-bb .row { display: flex; gap: 6mm; padding: 3.6mm 0; border-bottom: 1px solid var(--border); }
  .eb-bb .lbl { font-family: "IBM Plex Mono", monospace; font-size: 11.5px; letter-spacing: .14em;
    color: var(--accent); min-width: 24mm; padding-top: 1mm; }
  .eb-bb .val { font-size: 14.5px; color: var(--text); }
  .eb-case { margin-top: 9mm; font-family: "IBM Plex Mono", monospace; font-size: 12.5px; color: var(--muted); }
  .eb-case b { color: var(--text); }

  /* chapter body — คุมสเกลให้เข้าเล่ม */
  .eb-ch h2 { font-size: 21px; margin-top: 9mm; }
  .eb-ch .lead { font-size: 16.5px; }
  .eb-ch-head { font-family: "IBM Plex Mono", monospace; font-size: 11.5px; letter-spacing: .22em;
    color: var(--accent); border-bottom: 1px solid var(--border); padding-bottom: 2.6mm; margin-bottom: 7mm; }
  .eb-ch-head .r { float: right; color: var(--muted); letter-spacing: .06em; }

  /* back cover */
  .eb-back { break-before: page; }
  .eb-back .bigq { font-family: var(--font-head); font-weight: 700; font-size: 40px; line-height: 1.42;
    color: #f2f4f3; margin: 20mm 0 0; max-width: 150mm; }
  .eb-back .bigq .accent { color: #22c55e; }
  .eb-back .bot { margin-top: auto; }
  .eb-back .wm { font-family: var(--font-head); font-weight: 700; font-size: 46px; color: #f2f4f3; margin-bottom: 3mm; }
  .eb-back p { color: #8b968f; line-height: 1.85; max-width: 128mm; margin: 0 0 3mm; }
  .eb-back .fine { font-size: 12px; color: #5c6f66; }
"""

dots = lambda k: "".join(f'<span class="{"on" if i < k else ""}"></span>' for i in range(7))

toc_items = "\n".join(
    f'''<a class="eb-toc-item" href="#ch{c["num"]}">
      <span class="n">{c["num"]}</span>
      <span class="t"><span class="en">{c["power"]}</span><span class="th">{c["hook"]}</span></span>
      <span class="tk">{c["ticker"]}</span></a>''' for c in chapters)

chapter_html = ""
for c in chapters:
    chapter_html += f'''
  <section class="eb-div" id="ch{c["num"]}">
    <div class="eb-dots">{dots(c["num"])}</div>
    <div class="big">{c["num"]:02d}</div>
    <div class="power">{c["power"]}</div>
    <div class="hook">{c["hook"]}</div>
    <div class="eb-bb">
      <div class="row"><span class="lbl">BENEFIT</span><span class="val">{c["benefit"]}</span></div>
      <div class="row"><span class="lbl">BARRIER</span><span class="val">{c["barrier"]}</span></div>
    </div>
    <div class="eb-case">เคสหลักของบทนี้ · <b>{c["case"]} ({c["ticker"]})</b></div>
  </section>
  <section class="eb-ch">
    <div class="eb-ch-head">บทที่ {c["num"]} — {c["power"].upper()}<span class="r">{c["ticker"]}</span></div>
    {c["body"]}
  </section>'''

scene_links = "\n  ".join(
    f'<link rel="stylesheet" href="scenes/{f.replace(".html", ".min.css")}">' for _, f, *_ in CH)

html = f'''<!DOCTYPE html>
<html lang="th" data-theme="light">
<head>
<meta charset="UTF-8">
<title>7 Powers — เจ็ดอำนาจของคูเมืองธุรกิจ · Moatrices</title>
<link rel="stylesheet" href="style.min.css">
{scene_links}
<style>{CSS}</style>
</head>
<body>
<div class="eb">

  <section class="eb-dark eb-cover">
    <div class="eb-brand">MOATRICES</div>
    <div class="eb-cover-title">7 <span class="accent">Powers</span></div>
    <div class="eb-cover-sub">เจ็ดอำนาจของคูเมืองธุรกิจ</div>
    <p class="eb-cover-desc">ทฤษฎีของ Hamilton Helmer อ่านผ่านเคสจริงเจ็ดบริษัท —
      ทุกอำนาจต้องตอบได้สองคำถาม: ทำไมถึงกำไรมากกว่า (Benefit)
      และทำไมคู่แข่งที่เห็นทุกอย่างแล้วยังลอกไม่ได้ (Barrier)</p>
    <div class="eb-cover-cases">COSTCO · MERCADOLIBRE · NETFLIX · SYNOPSYS · APPLE · ASML · TSMC</div>
    <div class="eb-cover-art">{COVER_SVG}</div>
    <div class="eb-cover-foot"><span>ฉบับรวมเล่ม · กรกฎาคม 2026</span><span>beatp9696-arch.github.io</span></div>
  </section>

  <section class="eb-page eb-colo">
    <div class="eb-kick">ABOUT THIS BOOK</div>
    <h3>หนังสือเล่มนี้คืออะไร</h3>
    <p>รวมบทความซีรีส์ <strong>7 Powers</strong> ทั้งเจ็ดตอนจากเว็บ Moatrices ฉบับสมบูรณ์ —
      หนึ่งอำนาจต่อหนึ่งบท จบด้วยแผนที่รวมทั้งเจ็ดอำนาจในบทสุดท้าย
      ภาพประกอบทุกภาพคือ "เครื่องมือ" ที่วาดขึ้นจากตัวเลขจริงของแต่ละบริษัท ไม่ใช่ภาพตกแต่ง</p>
    <h3>อ่านเล่มนี้ยังไง</h3>
    <p>อ่านเรียงตามบทได้ หรือกระโดดจากสารบัญก็ได้ — ลิงก์ในเล่มกดได้ทั้งหมด:
      ลิงก์ข้ามบทพาไปบทนั้นในเล่ม ส่วนลิงก์บทวิเคราะห์เจาะรายบริษัท (deep-dive) พาไปเว็บ</p>
    <h3>ที่มาของตัวเลข</h3>
    <p>ตัวเลขทั้งหมดอ้างอิงงบการเงินที่เผยแพร่จริง (10-K / 20-F / earnings call)
      ณ ช่วงที่เขียนแต่ละตอน (กรกฎาคม 2026) — ตัวเลขมีวันหมดอายุ แต่โครงของอำนาจอยู่ได้นานกว่านั้นมาก</p>
    <h3>เครดิต</h3>
    <p>กรอบทฤษฎี: Hamilton Helmer, <em>7 Powers: The Foundations of Business Strategy</em> (2016)
      — การตีความ การเลือกเคส และความผิดพลาดใดๆ เป็นของผู้เขียนเอง</p>
    <p class="dim" style="margin-top:9mm"><strong>คำเตือน:</strong> เนื้อหาทั้งหมดเป็นบันทึกการเรียนและความเห็นส่วนตัวเพื่อการศึกษาเท่านั้น
      ไม่ใช่คำแนะนำการลงทุน ไม่ใช่การชี้นำให้ซื้อหรือขายหลักทรัพย์ใดๆ
      การตัดสินใจลงทุนเป็นความรับผิดชอบของผู้อ่านเอง</p>
    <p class="dim">© 2026 Moatrices · beatp9696-arch.github.io</p>
  </section>

  <section class="eb-page">
    <div class="eb-kick">CONTENTS</div>
    {toc_items}
    <a class="eb-toc-item" href="#ch7-sec-8">
      <span class="n">★</span>
      <span class="t"><span class="en">แผนที่ทั้ง 7 อำนาจ</span><span class="th">ทั้งกรอบในหน้าเดียว + สามบทเรียนติดตัวจากซีรีส์</span></span>
      <span class="tk">MAP</span></a>
  </section>
{chapter_html}

  <section class="eb-dark eb-back">
    <div class="eb-brand">MOATRICES</div>
    <div class="bigq">สินค้าดี ทีมเก่ง แบรนด์ดัง — ล้วนเป็นของที่คู่แข่งลอกได้
      ถ้าตอบไม่ได้ว่า <span class="accent">ทำไมเขาเห็นทุกอย่างแล้วยังทำตามไม่ได้</span>
      ก็ยังไม่เจอ moat จริง เจอแค่ผลประกอบการที่ดี</div>
    <div class="bot">
      <div class="wm">Moatrices</div>
      <p>บันทึกการเรียนวิเคราะห์หุ้น US เชิงลึก ภาษาไทย — เน้นพื้นฐานธุรกิจ ไม่ใช่ราคา</p>
      <p>อ่านเคสเจาะรายบริษัท ซีรีส์ "คูเมืองแตก" ภาคต่อของเล่มนี้
        และเครื่องคิดเลข Reverse DCF ได้ที่ <a href="{BASE}">beatp9696-arch.github.io</a></p>
      <p class="fine">เนื้อหาเพื่อการศึกษาเท่านั้น ไม่ใช่คำแนะนำการลงทุน · © 2026 Moatrices</p>
    </div>
  </section>

</div>
</body>
</html>'''

OUT.write_text(html, encoding="utf-8")
print(f"OK → {OUT} ({len(html)//1000}k)")
