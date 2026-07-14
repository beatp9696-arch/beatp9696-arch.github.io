#!/usr/bin/env python3
"""Moatrices site build — generate sitemap.xml + feed.xml จาก articles.html และตรวจ drift

วิธีใช้ (รันจากโฟลเดอร์ website/):
    python3 build.py

แหล่งความจริง (source of truth) คือรายการบทความทั้งหมดใน articles.html (คลังบทความ)
index.html เป็นหน้า curated: โชว์แค่บทล่าสุด + การ์ดซีรีส์ (ต้องเป็น subset ของ articles.html)
- sitemap.xml    : generate ใหม่ทั้งไฟล์ (หน้า root + หน้าซีรีส์ + ทุกบทความ)
- series-*.html  : เขียนรายชื่อตอนของแต่ละซีรีส์ระหว่าง marker SERIES-START/END
                   (สมาชิก = บทความที่ชื่อไฟล์ขึ้นต้นด้วย prefix ใน SERIES)
- feed.xml       : generate ใหม่ โดยรักษา pubDate + description ของ item เดิมไว้ (ตาม guid)
                   item ใหม่ใช้ excerpt จาก articles.html และ pubDate = วันที่บทความ 12:00 +0700
- ตรวจ drift     : articles/*.html ↔ ลิงก์ใน articles.html ↔ ARTICLES array ใน app.js
                   ↔ การ์ดใน index.html — ถ้าไม่ตรงจะพิมพ์ WARNING (ไม่ block)

เพิ่มบทความใหม่ = python3 new-article.py (แทรกการ์ดใน articles.html + index.html + app.js)
แล้วรันสคริปต์นี้
"""

import datetime
import html
import json
import os
import re
import shutil
import subprocess
import sys
from xml.sax.saxutils import escape

BASE_URL = "https://beatp9696-arch.github.io"
TOOLS = ["follow-the-money-nvda.html", "compound-interest.html", "reverse-dcf.html",
         "ai-iceberg.html", "econ-lessons.html",
         "moat-break-game-kodak.html",
         "moat-city.html"]  # เครื่องมือ interactive — นับเป็น hero stat + ลิสต์ใน tools.html
ROOT_PAGES = ["", "articles.html", "stocks.html", "tools.html", "dashboard.html",
              "about.html"] + TOOLS
ARCHIVE = "articles.html"   # คลังบทความ = source of truth ของรายการบทความ
TZ = datetime.timezone(datetime.timedelta(hours=7))
THUMB_DIR = "img/thumbs"   # thumbnail ย่อของ og image (ใช้เป็นภาพการ์ดในหน้า index)
THUMB_W = 640             # กว้างพอสำหรับ retina (การ์ด desktop แสดง 176px, mobile เต็มจอ)

os.chdir(os.path.dirname(os.path.abspath(__file__)))


def parse_archive():
    """คืน list ของบทความทั้งหมดจาก articles.html (เรียงตามหน้าเว็บ = ใหม่สุดก่อน)"""
    src = open(ARCHIVE, encoding="utf-8").read()
    pattern = re.compile(
        r'<time class="post-date" datetime="(?P<date>[\d-]+)">.*?'
        r'<a href="articles/(?P<file>[a-z0-9-]+\.html)">\s*(?P<title>.*?)\s*</a>.*?'
        r'<p class="excerpt">\s*(?P<excerpt>.*?)\s*</p>',
        re.S,
    )
    posts = []
    for m in pattern.finditer(src):
        posts.append({
            "file": m.group("file"),
            "date": m.group("date"),
            "title": re.sub(r"\s+", " ", m.group("title")),
            "excerpt": re.sub(r"\s+", " ", m.group("excerpt")),
        })
    return posts


def article_datemod(path, fallback):
    """lastmod = dateModified จาก BlogPosting JSON-LD (author คุมเอง สะท้อนการแก้จริง
    ไม่ใช่วันตีพิมพ์บนการ์ด) — fallback เป็นวันการ์ดถ้าไม่มี/อ่านไม่ได้"""
    try:
        body = open(path, encoding="utf-8").read()
    except OSError:
        return fallback
    m = re.search(r'"dateModified":\s*"([\d-]+)"', body)
    return m.group(1) if m else fallback


def file_mtime_date(path, fallback):
    """lastmod ของหน้า root = วันแก้ไฟล์จริง (ลด churn ใน diff เทียบกับ today ทุก build)"""
    try:
        return datetime.date.fromtimestamp(os.path.getmtime(path)).isoformat()
    except OSError:
        return fallback


TOC_TITLE = "ในบทความนี้"
TOC_MIN_H2 = 4  # ตรงกับเกณฑ์ใน app.js: สร้าง TOC เมื่อ h2 ≥ 4

_H2_RE = re.compile(r"<h2\b[^>]*>(.*?)</h2>", re.S)
_BYLINE_RE = re.compile(
    # sig-stamp (ตราลายเซ็นธุรกิจ, decoration pass 3) เป็นลูกคนท้ายของ .byline ได้ในบทที่ไม่มี company-header
    r'(<div class="byline">.*?<div class="byline-info">.*?</div>\s*</div>\s*'
    r'(?:<span class="sig-stamp"[^>]*>.*?</span>\s*)?</div>)',
    re.S,
)
# กินขึ้นบรรทัดว่าง+ย่อหน้าที่นำหน้า TOC ที่เราใส่ไว้ (\n\n<indent>) แต่ไม่แตะ \n ต่อท้าย
# เพื่อให้ strip→re-inject ได้ผลไบต์ต่อไบต์เดิม (idempotent, diff สะอาด)
_TOC_BLOCK_RE = re.compile(r"\n*[ \t]*<!-- TOC-START -->.*?<!-- TOC-END -->", re.S)


def inject_tocs():
    """ฝังสารบัญ (TOC) ลงในไฟล์บทความตอน build แทนที่ app.js จะ inject หลัง paint
    (ตัวเดิมทำให้เกิด CLS ก้อนใหญ่สุดของหน้าบทความ ~420px ทุกครั้งที่โหลด). ทำ 2 อย่าง:
      1. ใส่ id="sec-N" ให้ทุก <h2> ใน <main> (เขียนทับทุก build = idempotent) —
         scroll-spy + heading-anchor + ลิงก์ในสารบัญใช้ id ชุดเดียวกันนี้ทันทีที่ paint
      2. ฝัง <nav class="toc"> หลัง .byline คั่นด้วย marker <!-- TOC-START/END -->
    app.js ถูกแก้ให้ข้ามการสร้าง TOC ถ้าเจอ .toc อยู่แล้ว (เหลือไว้เป็น fallback)"""
    art_dir = "articles"
    built = skipped = 0
    for fn in sorted(os.listdir(art_dir)):
        if not fn.endswith(".html"):
            continue
        path = os.path.join(art_dir, fn)
        orig = open(path, encoding="utf-8").read()
        body = _TOC_BLOCK_RE.sub("", orig)  # ล้าง TOC เดิมก่อน (idempotent)

        mstart, mend = body.find("<main"), body.find("</main>")
        if mstart == -1 or mend == -1:
            skipped += 1
            continue

        heads = []  # (n, text) เรียงตามลำดับ h2 ใน main

        def add_id(m):
            n = len(heads) + 1
            heads.append((n, re.sub(r"\s+", " ", m.group(1)).strip()))
            return f'<h2 id="sec-{n}">{m.group(1)}</h2>'

        body = body[:mstart] + _H2_RE.sub(add_id, body[mstart:mend]) + body[mend:]

        if len(heads) >= TOC_MIN_H2:
            m = _BYLINE_RE.search(body)
            if m:
                items = "\n".join(
                    f'          <li><a href="#sec-{n}">{text}</a></li>'
                    for n, text in heads
                )
                toc = (
                    "\n\n      <!-- TOC-START -->\n"
                    '      <nav class="toc">\n'
                    f'        <div class="toc-title">{TOC_TITLE}</div>\n'
                    "        <ol>\n" + items + "\n"
                    "        </ol>\n"
                    "      </nav>\n"
                    "      <!-- TOC-END -->"
                )
                body = body[:m.end()] + toc + body[m.end():]

        if body != orig:
            open(path, "w", encoding="utf-8").write(body)
            built += 1
        else:
            skipped += 1
    print(f"toc         : {built} บทฝัง/อัปเดตสารบัญ, {skipped} ไม่เปลี่ยน")


def write_sitemap(posts):
    today = datetime.date.today().isoformat()
    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ]
    pages = ROOT_PAGES + [s["page"] for s in SERIES]
    for page in pages:
        lastmod = file_mtime_date(page or "index.html", today)
        lines.append(f"  <url><loc>{BASE_URL}/{page}</loc><lastmod>{lastmod}</lastmod></url>")
    for p in reversed(posts):  # เก่า → ใหม่ ให้ diff อ่านง่าย
        art = os.path.join("articles", p["file"])
        lines.append(
            f"  <url><loc>{BASE_URL}/articles/{p['file']}</loc>"
            f"<lastmod>{article_datemod(art, p['date'])}</lastmod></url>"
        )
    lines.append("</urlset>")
    open("sitemap.xml", "w", encoding="utf-8").write("\n".join(lines) + "\n")
    print(f"sitemap.xml : {len(pages)} pages + {len(posts)} articles")


def xmltext(s):
    """normalize เป็น text ปลอดภัยสำหรับ XML: decode HTML entity ก่อน (R&amp;D->R&D, S&amp;P->S&P
    และจับ & ดิบที่หลุดมาด้วย) แล้ว escape เป็น XML — idempotent ใช้ซ้ำได้ทั้ง item เก่า/ใหม่
    กัน feed พังจาก ampersand ที่ไม่ถูก escape (เคยทำทั้ง feed invalid)"""
    return escape(html.unescape(s))


def rfc822(date_str, time_str="12:00:00"):
    d = datetime.date.fromisoformat(date_str)
    days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
              "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    return f"{days[d.weekday()]}, {d.day:02d} {months[d.month - 1]} {d.year} {time_str} +0700"


def parse_old_feed():
    """เก็บ pubDate + description ของ item เดิมตาม guid เพื่อไม่ให้ RSS reader เห็นเป็นของใหม่"""
    old = {}
    if not os.path.exists("feed.xml"):
        return old
    src = open("feed.xml", encoding="utf-8").read()
    for m in re.finditer(
        r"<item>.*?<guid[^>]*>(.*?)</guid>.*?<pubDate>(.*?)</pubDate>.*?"
        r"<description>(.*?)</description>.*?</item>",
        src, re.S,
    ):
        old[m.group(1).strip()] = {"pubDate": m.group(2), "description": m.group(3)}
    return old


# หน้า interactive อยู่นอก articles.html แต่เป็น "ของใหม่" ที่คน subscribe RSS ควรรู้
# (guid = url — parse_old_feed จะรักษา pubDate เดิมไว้เหมือน item บทความ)
FEED_EXTRAS = [
    {"file": "follow-the-money-nvda.html", "date": "2026-07-07",
     "title": "ตามเงิน $100 ของ NVIDIA ผ่านงบ 3 ชุด — Interactive Scrollytelling",
     "excerpt": "จากรายได้ทุก $100 รอดถึงมือเจ้าของกี่ดอลลาร์ — เดินผ่านหอกลั่นกำไร สะพานเงินสด และงบดุล ด้วยตัวเลขจริงจาก 10-K FY2026"},
    {"file": "reverse-dcf.html", "date": "2026-07-08",
     "title": "ราคานี้ ตลาดคาดหวังอะไร? (Reverse DCF) — เครื่องคิดเลข Interactive",
     "excerpt": "ใส่ 4 ตัวเลขจากงบ แล้วถอดออกมาว่าตลาดเดิมพันว่า FCF ต้องโตปีละกี่ % ถึงคุ้มราคานี้ พร้อมตัวอย่าง SNPS · TSM · AAPL · NFLX"},
    {"file": "compound-interest.html", "date": "2026-07-08",
     "title": "พลังดอกเบี้ยทบต้น: เงินแสนกลิ้ง 50 ปี — Interactive Scrollytelling",
     "excerpt": "เลื่อนตามก้อนหิมะ ฿100,000 โตเป็น ฿11.7 ล้าน — ทำไม 85% ของเงินเกิดใน 20 ปีท้าย อะไรฆ่าเส้นโค้ง ปิดท้ายด้วยเครื่องคิดเลขทบต้นของคุณเอง"},
    {"file": "ai-iceberg.html", "date": "2026-07-09",
     "title": "ใต้ภูเขาน้ำแข็ง AI: ใครยืนตรงไหน — Interactive Scrollytelling",
     "excerpt": "ทุกคนเห็นแค่ยอด NVIDIA — ดำดิ่งทีละชั้นลงก้นทะเล ดูว่าใครยืนตรงไหนในกองทัพ AI และใครกันแน่ที่เก็บเงินจากทุกคน"},
    {"file": "econ-lessons.html", "date": "2026-07-11",
     "title": "เศรษฐศาสตร์ 4 บทที่โรงเรียนไม่สอน แต่ตลาดหุ้นสอบทุกวัน — Interactive Scrollytelling",
     "excerpt": "ทำไมสายการบินจนทั้งแผงแต่ซอฟต์แวร์ชิปรวยทั้งแผง ค่าตัดผมแพงขึ้นแต่ทีวีถูกลง ชิปยิ่งถูกยิ่งขายดี และอเมริกาต้องง้อไต้หวัน — เลื่อนผ่าน 4 เลนส์พร้อมตัวเลขจริง"},
    {"file": "moat-city.html", "date": "2026-07-13",
     "title": "เมืองคูเมือง — แผนที่ 3D ของ 20 ธุรกิจที่ผ่าแล้ว",
     "excerpt": "เมืองกลางคืนที่สร้างจากบทวิเคราะห์จริง — ตึกสูงตามขนาดธุรกิจ คูน้ำเรืองแสงกว้างตาม moat แต่ละหอมีลายเซ็นธุรกิจของตัวเอง และนอกหมอกคือ 5 บริษัทจากซีรีส์คูเมืองแตก"},
    {"file": "moat-break-game-kodak.html", "date": "2026-07-13",
     "title": "10 ปีที่คูเมืองแตก: คุณคือซีอีโอ Kodak ปี 1996 — เกมจำลองการตัดสินใจ",
     "excerpt": "ตัดสินใจ 5 ครั้งจากเหตุการณ์จริง — Kodak รู้ล่วงหน้าสิบปี เป็นเบอร์ 1 กล้องดิจิทัลโดยขาดทุน $60 ต่อกล้อง แล้วยังล้มละลาย ลองดูว่าคุณจะหาทางออกที่พวกเขาหาไม่เจอได้ไหม"},
    {"file": "moatrices-7powers.pdf", "date": "2026-07-13",
     "title": "E-book ฟรี: 7 Powers — เจ็ดอำนาจของคูเมืองธุรกิจ (รวมเล่ม PDF 62 หน้า)",
     "excerpt": "ซีรีส์ 7 Powers ครบทั้ง 7 ตอนจัดเลย์เป็นหนังสือ — ภาพประกอบทุกฉาก แผนที่ 7 อำนาจ สารบัญกดกระโดดได้ อ่านออฟไลน์หรือส่งต่อให้เพื่อนได้เลย"},
]


def write_feed(posts):
    old = parse_old_feed()
    now = datetime.datetime.now(TZ)
    kept = 0
    items = []
    entries = ([{**p, "url": f"{BASE_URL}/articles/{p['file']}"} for p in posts]
               + [{**e, "url": f"{BASE_URL}/{e['file']}"} for e in FEED_EXTRAS])
    entries.sort(key=lambda e: e["date"], reverse=True)  # stable — ลำดับเดิมภายในวันเดียวกันคงอยู่
    for p in entries:  # ใหม่สุดก่อน
        url = p["url"]
        prev = old.get(url)
        if prev:
            pub, desc = prev["pubDate"], prev["description"]
            kept += 1
        else:
            pub, desc = rfc822(p["date"]), p["excerpt"]
        items.append(
            "<item>\n"
            f"<title>{xmltext(p['title'])}</title>\n"
            f"<link>{url}</link>\n"
            f'<guid isPermaLink="true">{url}</guid>\n'
            f"<pubDate>{pub}</pubDate>\n"
            f"<description>{xmltext(desc)}</description>\n"
            "</item>"
        )
    feed = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n'
        "<channel>\n"
        "<title>Moatrices — บันทึกการเรียนวิเคราะห์หุ้น</title>\n"
        f"<link>{BASE_URL}/</link>\n"
        "<description>บันทึกการเรียนวิเคราะห์หุ้น US เชิงลึก เน้นพื้นฐานธุรกิจ ไม่ใช่ราคา</description>\n"
        "<language>th</language>\n"
        f"<lastBuildDate>{now.strftime('%a, %d %b %Y %H:%M:%S +0700')}</lastBuildDate>\n"
        f'<atom:link href="{BASE_URL}/feed.xml" rel="self" type="application/rss+xml"/>\n'
        + "\n".join(items)
        + "\n</channel>\n</rss>\n"
    )
    open("feed.xml", "w", encoding="utf-8").write(feed)
    print(f"feed.xml    : {len(entries)} items = {len(posts)} บทความ + {len(FEED_EXTRAS)} interactive "
          f"({kept} เดิม, {len(entries) - kept} ใหม่)")


_ITEMLIST_RE = re.compile(
    r'  <script type="application/ld\+json">\n'
    r'  \{"@context": "https://schema\.org", "@type": "ItemList".*?\}\n'
    r'  </script>', re.S)


def write_itemlist(posts):
    """regen ItemList JSON-LD ใน articles.html จากลำดับการ์ด (ใหม่สุด = position 1)
    ตัดการไล่เลข position 25 รายการด้วยมือตอนแทรกบทใหม่ (เคยเป็นจุด drift เงียบ)"""
    src = open(ARCHIVE, encoding="utf-8").read()
    obj = {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "name": "บทความวิเคราะห์หุ้นทั้งหมด — Moatrices",
        "itemListElement": [
            {"@type": "ListItem", "position": i + 1,
             "url": f"{BASE_URL}/articles/{p['file']}",
             # JSON-LD ไม่ถูก HTML-parse: decode entity (S&amp;P->S&P) ก่อนใส่ JSON
             "name": html.unescape(p["title"])}
            for i, p in enumerate(posts)
        ],
    }
    payload = json.dumps(obj, ensure_ascii=False, separators=(", ", ": "))
    block = ('  <script type="application/ld+json">\n'
             f'  {payload}\n'
             '  </script>')
    new, n = _ITEMLIST_RE.subn(lambda _: block, src)
    if n != 1:
        print(f"itemlist    : WARNING หา ItemList script ใน {ARCHIVE} ไม่เจอ (พบ {n})")
        return
    if new != src:
        open(ARCHIVE, "w", encoding="utf-8").write(new)
    print(f"itemlist    : {len(posts)} รายการ" + ("" if new != src else " (ไม่เปลี่ยน)"))


def _thumb_cmd(src, dst):
    """คืน argv ย่อ src -> dst (jpeg คุณภาพ 80, ด้านยาว THUMB_W) ตามเครื่องมือที่มีในเครื่อง:
    macOS = sips, Linux/CI = ImageMagick (magick v7 หรือ convert v6) — คืน None ถ้าไม่มีทั้งคู่
    (แยกออกมาเพื่อให้ build รันได้ทั้งเครื่อง PP และ GitHub Actions ที่ไม่มี sips)"""
    if shutil.which("sips"):
        return ["sips", "-Z", str(THUMB_W), "-s", "format", "jpeg",
                "-s", "formatOptions", "80", src, "--out", dst]
    im = shutil.which("magick") or shutil.which("convert")
    if im:
        # 640x640> = ย่อให้พอดีกรอบเมื่อใหญ่กว่าเท่านั้น (คงสัดส่วน) เทียบเท่า sips -Z
        return [im, src, "-resize", f"{THUMB_W}x{THUMB_W}>", "-quality", "80", dst]
    return None


def write_thumbnails(posts):
    """gen thumbnail JPEG 640px จาก og-<slug>.png (regen เฉพาะที่ขาดหรือ og ใหม่กว่า thumb)
    เก็บ og png เต็มไว้สำหรับ meta og:image — thumb ใช้แค่เป็นภาพการ์ด ลดหน้าแรก ~90%"""
    os.makedirs(THUMB_DIR, exist_ok=True)
    made = skipped = missing = 0
    for p in posts:
        base = p["file"].replace(".html", "")
        og = f"og-{base}.png"
        thumb = f"{THUMB_DIR}/{base}.jpg"
        if not os.path.exists(og):
            missing += 1
            continue
        if os.path.exists(thumb) and os.path.getmtime(thumb) >= os.path.getmtime(og):
            skipped += 1
            continue
        cmd = _thumb_cmd(og, thumb)
        if cmd is None:
            print("thumbnails  : WARNING ไม่พบ sips หรือ ImageMagick (magick/convert) — ข้ามการสร้าง thumbnail")
            return
        subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        made += 1
    print(f"thumbnails  : {made} สร้างใหม่, {skipped} ทันสมัยแล้ว"
          + (f", {missing} ไม่มี og png" if missing else ""))


def _minify_css_text(css):
    """conservative minify: ตัด comment + dedent + ลบบรรทัดว่าง (คงขึ้นบรรทัดใหม่ระหว่าง rule)
    ปลอดภัยกับ calc()/gradient/keyframe เพราะไม่ยุ่งกับ whitespace ในค่า/ใน quote"""
    out = re.sub(r"/\*.*?\*/", "", css, flags=re.S)               # ตัด block comment
    return "\n".join(l.strip() for l in out.splitlines() if l.strip())  # dedent + ลบบรรทัดว่าง


def minify_css(src="style.css", dst="style.min.css"):
    """style.css = shared shell/base เท่านั้น (ทุกหน้า link style.min.css)
    scene CSS เฉพาะบทความอยู่ที่ scenes/<slug>.css แล้ว โหลดเฉพาะบทตัวเอง (build_scenes)"""
    css = open(src, encoding="utf-8").read()
    out = _minify_css_text(css)
    open(dst, "w", encoding="utf-8").write(out)
    print(f"{dst} : {len(css):,} -> {len(out):,} bytes ({100 - len(out) * 100 // len(css)}% เล็กลง)")


SCENE_DIR = "scenes"
# ลิงก์ scene CSS ที่ build ฝัง (คั่นด้วย marker ให้ idempotent เหมือน TOC)
_SCENE_LINK_RE = re.compile(
    r'\n[ \t]*<!-- SCENE-CSS -->.*?<!-- /SCENE-CSS -->', re.S)
_STYLE_LINK_RE = re.compile(r'<link rel="stylesheet" href="\.\./style\.min\.css">')


def build_scenes():
    """minify scenes/<slug>.css -> scenes/<slug>.min.css แล้วฝัง <link> ลงบท <slug>.html
    (เฉพาะบทที่มีไฟล์ scene) ต่อจาก style.min.css — บทโหลด scene ของตัวเองเท่านั้น
    ตัด scene CSS (~13KB gz) ออกจาก style.min.css ที่ render-blocking ทุกหน้ารวมหน้าแรก
    เพิ่มบทใหม่ = สร้าง scenes/<slug>.css แล้วรัน build.py (scaffold ทำให้อัตโนมัติ)"""
    if not os.path.isdir(SCENE_DIR):
        print("scenes      : ไม่มีโฟลเดอร์ scenes/ (ข้าม)")
        return
    scene_slugs = sorted(
        f[:-4] for f in os.listdir(SCENE_DIR)
        if f.endswith(".css") and not f.endswith(".min.css")
    )
    minified = injected = orphan = 0
    for slug in scene_slugs:
        raw = open(f"{SCENE_DIR}/{slug}.css", encoding="utf-8").read()
        open(f"{SCENE_DIR}/{slug}.min.css", "w", encoding="utf-8").write(_minify_css_text(raw))
        minified += 1

        art = f"articles/{slug}.html"
        if not os.path.exists(art):
            orphan += 1
            continue
        body = open(art, encoding="utf-8").read()
        stripped = _SCENE_LINK_RE.sub("", body)  # ล้าง block เดิมก่อน (idempotent)
        m = _STYLE_LINK_RE.search(stripped)
        if not m:
            print(f"  ! {slug}.html ไม่พบ link style.min.css — ฝัง scene ไม่ได้")
            continue
        block = (f'\n      <!-- SCENE-CSS -->'
                 f'\n      <link rel="stylesheet" href="../scenes/{slug}.min.css">'
                 f'\n      <!-- /SCENE-CSS -->')
        new = stripped[:m.end()] + block + stripped[m.end():]
        if new != body:
            open(art, "w", encoding="utf-8").write(new)
            injected += 1
    print(f"scenes      : {minified} minified, {injected} บทฝัง/อัปเดต link"
          + (f", {orphan} scene ไม่มีบทคู่" if orphan else ""))


# ─── stocks.html + hero stats: generate จาก ARTICLES (app.js = SoT ของ ticker↔sector↔ไฟล์) ───
# ARTICLES ให้ว่ามี ticker ตัวไหน / อยู่ sector อะไร / ลิงก์ไปไฟล์ไหน (สอดคล้อง articles.html)
# ตารางล่างเก็บเฉพาะ "หน้าตา" ที่ ARTICLES ไม่มี: ชื่อบริษัท, sub-label, โลโก้, ลำดับการ์ด
def parse_articles_js(path="app.js"):
    """ดึง ARTICLES (f, tk, sec) จาก app.js — SoT เดียวกับที่ search/prev-next ใช้"""
    src = open(path, encoding="utf-8").read()
    m = re.search(r"var ARTICLES = \[(.*?)\];", src, re.S)
    if not m:
        print("stocks      : WARNING หา 'var ARTICLES = [' ใน app.js ไม่เจอ")
        return []
    out = []
    for entry in re.finditer(r"\{[^{}]*\}", m.group(1)):
        e = entry.group(0)
        f = re.search(r'\bf:\s*"([^"]+)"', e)
        if not f:
            continue
        tk = re.search(r'\btk:\s*"([^"]*)"', e)
        sec = re.search(r'\bsec:\s*"([^"]*)"', e)
        out.append({"f": f.group(1),
                    "tk": tk.group(1) if tk else "",
                    "sec": sec.group(1) if sec else ""})
    return out


# หัวข้อ + ลำดับกลุ่มธุรกิจในหน้า stocks.html (sec key ต้องตรงกับ ARTICLES)
STOCK_SECTORS = [
    ("semi", "เซมิคอนดักเตอร์ &amp; AI"),
    ("software", "ซอฟต์แวร์ &amp; อินเทอร์เน็ต"),
    ("health", "สุขภาพ"),
    ("finance", "การเงิน"),
    ("consumer", "ผู้บริโภค"),
    ("space", "อวกาศ &amp; กลาโหม"),
]
# ลำดับการ์ดภายในกลุ่ม (curated — ไม่ใช่ลำดับเวลาแบบ ARTICLES)
STOCK_ORDER = ["ASML", "SNPS", "TSM", "NVDA", "MU", "MRVL", "COHR", "AVGO",
               "MSFT", "GOOGL", "NFLX", "LLY", "UNH", "AXP", "SPGI",
               "AAPL", "COST", "MELI", "SPACEX", "LMT"]
# ticker (ตรงกับ tk ใน ARTICLES) -> หน้าตาการ์ด
#   logo ("img", "X.png")                 = <img> โลโก้ราสเตอร์/svg
#   logo ("wm", "X.svg", ar, "aria")      = wordmark ตัดด้วย mask (อัตราส่วน ar)
#   tk (ออปชัน)                            = ข้อความ ticker ที่โชว์ ถ้าต่างจาก key
STOCK_META = {
    "ASML":   {"name": "ASML Holding", "sub": "EUV / Litho", "logo": ("wm", "ASML.svg", 3.55, "ASML")},
    "SNPS":   {"name": "Synopsys", "sub": "EDA", "logo": ("img", "SNPS.png")},
    "TSM":    {"name": "TSMC", "sub": "Foundry", "logo": ("img", "TSM.png")},
    "NVDA":   {"name": "NVIDIA", "sub": "GPU", "logo": ("img", "NVDA.png")},
    "MU":     {"name": "Micron Technology", "sub": "Memory", "logo": ("wm", "MU.svg", 4.67, "Micron")},
    "MRVL":   {"name": "Marvell Technology", "sub": "Custom chip", "logo": ("img", "MRVL.png")},
    "COHR":   {"name": "Coherent", "sub": "Optical", "logo": ("img", "COHR.png")},
    "AVGO":   {"name": "Broadcom", "sub": "AI chip", "logo": ("wm", "AVGO.svg", 7.27, "Broadcom")},
    "MSFT":   {"name": "Microsoft", "sub": "Cloud", "logo": ("img", "MSFT.png")},
    "GOOGL":  {"name": "Alphabet", "sub": "Ads", "logo": ("img", "GOOGL.png")},
    "NFLX":   {"name": "Netflix", "sub": "Streaming", "logo": ("img", "NFLX.png")},
    "LLY":    {"name": "Eli Lilly", "sub": "Pharma", "logo": ("img", "LLY.png")},
    "UNH":    {"name": "UnitedHealth Group", "sub": "ประกัน", "logo": ("img", "UNH.png")},
    "AXP":    {"name": "American Express", "sub": "Payments", "logo": ("img", "AXP.png")},
    "SPGI":   {"name": "S&amp;P Global", "sub": "Ratings", "logo": ("img", "SPGI.png")},
    "AAPL":   {"name": "Apple", "sub": "อุปกรณ์ + บริการ", "logo": ("img", "AAPL.svg")},
    "COST":   {"name": "Costco Wholesale", "sub": "ค้าปลีก", "logo": ("img", "COST.png")},
    "MELI":   {"name": "MercadoLibre", "sub": "E-commerce", "logo": ("img", "MELI.png")},
    "SPACEX": {"name": "บริษัทเอกชน — ยังไม่ IPO", "sub": "Launch", "tk": "SpaceX",
               "logo": ("wm", "SPACEX.svg", 8, "SpaceX")},
    "LMT":    {"name": "Lockheed Martin", "sub": "กลาโหม", "logo": ("wm", "LMT.svg", 4.15, "Lockheed Martin")},
}
_STOCKS_BLOCK_RE = re.compile(r"<!-- STOCKS-START -->.*?<!-- STOCKS-END -->", re.S)

# ป้ายเขตประจำกลุ่มธุรกิจ (inline SVG ประดับท้ายหัวข้อ h2.sec — decoration pass 3, 14 ก.ค. 2026)
# ภาพนิ่งล้วน (Layer 0) = ป้ายบอกทาง ไม่ใช่ฉากอาร์กิวเมนต์ · CSS: .sec-art ใน style.css
SECTOR_ART = {
    "semi": (  # เวเฟอร์ → die ที่ตัดออกมา
        '<circle class="sca-l" cx="24" cy="24" r="16"/>'
        '<path class="sca-l" d="M12 18 h24 M10 24 h28 M12 30 h24 M18 10.5 v27 M24 8 v32 M30 10.5 v27" opacity=".5"/>'
        '<rect class="sca-fg" x="21" y="21" width="6" height="6"/>'
        '<path class="sca-l" d="M46 24 h14" stroke-dasharray="3 4"/>'
        '<rect class="sca-l" x="66" y="10" width="28" height="28" rx="3"/>'
        '<rect class="sca-g" x="74" y="18" width="12" height="12"/>'
        '<path class="sca-l" d="M72 10 v-4 M80 10 v-4 M88 10 v-4 M72 38 v4 M80 38 v4 M88 38 v4 '
        'M66 16 h-4 M66 24 h-4 M66 32 h-4 M94 16 h4 M94 24 h4 M94 32 h4" opacity=".65"/>'
    ),
    "software": (  # จอ + เมฆที่หยดค่าเช่าลงมาเรื่อยๆ
        '<rect class="sca-l" x="8" y="12" width="42" height="28" rx="4"/>'
        '<path class="sca-l" d="M8 20 h42"/>'
        '<circle class="sca-fg" cx="14" cy="16" r="1.4"/><circle class="sca-fg" cx="19" cy="16" r="1.4"/>'
        '<path class="sca-l" d="M14 27 h14 M14 33 h20" opacity=".55"/>'
        '<path class="sca-l" d="M69 25 a7.5 7.5 0 0 1 7.5 -9 a8.5 8.5 0 0 1 16 1.5 a6 6 0 0 1 -2 11.5 h-15 a6.5 6.5 0 0 1 -6.5 -4 z"/>'
        '<path class="sca-g" d="M78 33 v7 m-3 -3 l3 3 3 -3 M89 33 v7 m-3 -3 l3 3 3 -3"/>'
    ),
    "health": (  # เส้นชีพจร + แคปซูล
        '<path class="sca-l" d="M6 26 h16 l5 -12 7 22 5 -14 4 4 h12"/>'
        '<circle class="sca-fg" cx="55" cy="26" r="2.2"/>'
        '<g transform="rotate(-24 94 24)"><rect class="sca-l" x="80" y="18" width="28" height="12" rx="6"/>'
        '<line class="sca-l" x1="94" y1="18" x2="94" y2="30"/>'
        '<rect class="sca-fg" x="83" y="21" width="8" height="6" rx="3" opacity=".85"/></g>'
    ),
    "finance": (  # ด่านเก็บค่าผ่านทาง + เหรียญ
        '<rect class="sca-l" x="10" y="16" width="15" height="24" rx="2"/>'
        '<path class="sca-l" d="M10 22 h15"/>'
        '<line class="sca-g" x1="25" y1="24" x2="64" y2="17"/>'
        '<path class="sca-l" d="M60 40 v-8" opacity=".55"/>'
        '<circle class="sca-g" cx="86" cy="24" r="9"/>'
        '<path class="sca-g" d="M86 19 v10 M83 21.5 h5 a2.5 2.5 0 0 1 0 5 h-5" opacity=".9"/>'
    ),
    "consumer": (  # ใบเสร็จ + ถุงช้อปปิ้ง
        '<path class="sca-l" d="M12 6 h30 v32 l-5 -3 -5 3 -5 -3 -5 3 -5 -3 -5 3 z"/>'
        '<path class="sca-l" d="M18 14 h18 M18 20 h18 M18 26 h10" opacity=".55"/>'
        '<circle class="sca-fg" cx="34" cy="28" r="2"/>'
        '<path class="sca-l" d="M66 18 l3 22 h26 l3 -22 z"/>'
        '<path class="sca-l" d="M73 18 a9 9 0 0 1 18 0"/>'
        '<circle class="sca-fg" cx="82" cy="29" r="2"/>'
    ),
    "space": (  # จานเรดาร์ + จรวด
        '<path class="sca-l" d="M10 26 a15 15 0 0 1 26 -8 l-24 14 z"/>'
        '<line class="sca-l" x1="22" y1="30" x2="22" y2="40"/>'
        '<path class="sca-l" d="M14 40 h16"/>'
        '<line class="sca-g" x1="38" y1="14" x2="48" y2="6" opacity=".8"/>'
        '<path class="sca-l" d="M84 6 c5.5 6 5.5 17 0 27 c-5.5 -10 -5.5 -21 0 -27 z"/>'
        '<path class="sca-l" d="M80 26 l-5 8 6 -2 M88 26 l5 8 -6 -2"/>'
        '<path class="sca-g" d="M84 34 l-2.5 8 M84 34 l2.5 8" opacity=".9"/>'
    ),
}


def _sector_art_html(sec_key):
    art = SECTOR_ART.get(sec_key)
    if not art:
        return ""
    return (f'<span class="sec-art" aria-hidden="true">'
            f'<svg viewBox="0 0 120 48">{art}</svg></span>')


def _stock_logo_html(logo):
    if logo[0] == "img":
        return f'<img class="stock-logo" src="logos/{logo[1]}" alt="" loading="lazy">'
    _, file, ar, aria = logo
    return ('<span class="stock-logo stock-logo--wm"><span class="ticker-wm ticker-wm--mask" '
            f"style=\"--ar:{ar}; -webkit-mask-image:url('logos/{file}');mask-image:url('logos/{file}')\" "
            f'role="img" aria-label="{aria}"></span></span>')


def _stock_card_html(tk_key, art_file, meta):
    disp = meta.get("tk", tk_key)
    return (
        '        <li class="stock-card">\n'
        f'          {_stock_logo_html(meta["logo"])}\n'
        f'          <span class="stock-meta"><a href="articles/{art_file}">'
        f'<span class="stock-tk">{disp}</span></a>'
        f'<span class="stock-name">{meta["name"]}</span></span>\n'
        f'          <span class="stock-sec">{meta["sub"]}</span>\n'
        '        </li>'
    )


def render_stocks_grid(articles):
    sec_by_tk = {a["tk"].upper(): a["sec"] for a in articles if a["tk"]}
    file_by_tk = {a["tk"].upper(): a["f"] for a in articles if a["tk"]}
    parts = []
    n_sec = 0
    for sec_key, heading in STOCK_SECTORS:
        cards = [
            _stock_card_html(tk, file_by_tk[tk], STOCK_META[tk])
            for tk in STOCK_ORDER
            if sec_by_tk.get(tk) == sec_key and tk in STOCK_META and tk in file_by_tk
        ]
        if cards:
            n_sec += 1
            parts.append(f'      <h2 class="sec"><span class="sec-no">{n_sec:02d}</span>{heading}'
                         f'{_sector_art_html(sec_key)}</h2>\n'
                         '      <ul class="stock-grid">\n'
                         + "\n".join(cards) + "\n      </ul>")
    return "\n\n".join(parts)


def write_stocks(articles):
    """เขียนตารางการ์ดหุ้นใน stocks.html ระหว่าง marker <!-- STOCKS-START/END -->
    จาก ARTICLES (มี ticker/sector ไหน) × STOCK_META (หน้าตา) — ตัด manual card ทิ้ง"""
    src = open("stocks.html", encoding="utf-8").read()
    if "<!-- STOCKS-START -->" not in src:
        print("stocks.html : WARNING ไม่พบ marker <!-- STOCKS-START --> — ข้าม (ใส่ marker ก่อน)")
        return
    grid = render_stocks_grid(articles)
    block = f"<!-- STOCKS-START -->\n{grid}\n      <!-- STOCKS-END -->"
    new = _STOCKS_BLOCK_RE.sub(lambda _: block, src)
    n_cards = new.count('class="stock-card"')
    if new != src:
        open("stocks.html", "w", encoding="utf-8").write(new)
    print(f"stocks.html : {n_cards} การ์ดหุ้น" + ("" if new != src else " (ไม่เปลี่ยน)"))


def count_works(articles):
    """นับ "เรื่อง": ซีรีส์ทั้งชุดนับเป็น 1 (PP สั่ง 14 ก.ค. 2026 — 7 Powers 7 ตอน = 1 เรื่อง)
    ตอนซีรีส์ = ไฟล์ขึ้นต้นด้วย prefix ใน SERIES; ต้อง sync กับ SERIES_PREFIXES ใน app.js"""
    n_ep = sum(1 for a in articles
               if any(a["f"].startswith(s["prefix"]) for s in SERIES))
    n_series = sum(1 for s in SERIES
                   if any(a["f"].startswith(s["prefix"]) for a in articles))
    return len(articles) - n_ep + n_series


def write_hero_stats(articles):
    """อัปเดตตัวเลข hero (บทความ/Deep-dive/เครื่องมือ Interactive) + view-all-count ใน index.html
    ให้ตรง ARTICLES/TOOLS — HTML ดิบไม่ค้าง (app.js เขียนทับตอน runtime อยู่แล้ว แต่ no-JS/SEO เห็นค่านิ่ง)"""
    n_works = count_works(articles)
    n_deep = sum(1 for a in articles if a["tk"])
    n_tools = len(TOOLS)
    src = open("index.html", encoding="utf-8").read()
    new = src
    for label, val in [("บทความ", n_works), ("Deep-dive", n_deep), ("เครื่องมือ Interactive", n_tools)]:
        new = re.sub(
            r'(<span class="hero-stat-num">)\d+(</span>\s*'
            r'<span class="hero-stat-label">' + re.escape(label) + r'</span>)',
            lambda m: m.group(1) + str(val) + m.group(2), new, count=1)
    new = re.sub(r'(<span class="view-all-count">)\d+(</span>)',
                 lambda m: m.group(1) + str(n_works) + m.group(2), new)
    if new != src:
        open("index.html", "w", encoding="utf-8").write(new)
    print(f"hero stats  : บทความ {n_works} เรื่อง (ซีรีส์นับเป็น 1, จาก {len(articles)} ชิ้น)"
          f" · deep-dive {n_deep} · เครื่องมือ {n_tools}"
          + ("" if new != src else " (ไม่เปลี่ยน)"))


# ─── series landing pages: generate รายชื่อตอนระหว่าง marker <!-- SERIES-START/END --> ───
# สมาชิกซีรีส์ = บทความใน articles.html ที่ชื่อไฟล์ขึ้นต้นด้วย prefix (เรียงตามเลขตอนในชื่อไฟล์)
# เพิ่มตอนใหม่ = new-article.py ตามปกติ แล้วรัน build.py — หน้าซีรีส์อัปเดตเอง
SERIES = [
    {"page": "series-financials.html", "prefix": "financials-", "name": "อ่านงบแบบลงมือทำ"},
    {"page": "series-buffett-talks.html", "prefix": "buffett-talks-", "name": "Buffett Talks"},
    {"page": "series-munger-talks.html", "prefix": "munger-talks-", "name": "Munger Talks"},
    {"page": "series-powers.html", "prefix": "powers-", "name": "7 Powers"},
    {"page": "series-moat-break.html", "prefix": "moat-break-", "name": "คูเมืองแตก"},
]
_SERIES_BLOCK_RE = re.compile(r"<!-- SERIES-START -->.*?<!-- SERIES-END -->", re.S)
# read-time ของแต่ละการ์ดใน articles.html (span อยู่ก่อนลิงก์บทความภายในการ์ดเดียวกัน)
_READTIME_RE = re.compile(
    r'<span class="read-time">\s*([^<]+?)\s*</span>.*?'
    r'<a href="articles/([a-z0-9-]+\.html)">', re.S)
THAI_MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
               "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."]


def thai_date(iso):
    d = datetime.date.fromisoformat(iso)
    return f"{d.day} {THAI_MONTHS[d.month - 1]} {d.year}"


def episode_no(file, prefix):
    m = re.match(r"(\d+)", file[len(prefix):])
    return int(m.group(1)) if m else None


def parse_read_times():
    """map file -> ข้อความ read-time จากการ์ดใน articles.html (การ์ดไหนไม่มีได้ None)"""
    src = open(ARCHIVE, encoding="utf-8").read()
    return {m.group(2): m.group(1) for m in _READTIME_RE.finditer(src)}


def _series_card_html(p, n, read_time):
    tag = f"ตอนที่ {n}" if n is not None else "ตอนพิเศษ"
    rt = (f'\n            <span class="read-time">{read_time}</span>'
          if read_time else "")
    alt = escape(html.unescape(p["title"]), {'"': "&quot;"})
    thumb = p["file"].replace(".html", "")
    return (
        "        <li>\n"
        '          <div class="article-meta-row">\n'
        f'            <span class="tag">{tag}</span>{rt}\n'
        f'            <time class="post-date" datetime="{p["date"]}">{thai_date(p["date"])}</time>\n'
        "          </div>\n"
        f'          <a href="articles/{p["file"]}">\n'
        f'            {p["title"]}\n'
        "          </a>\n"
        '          <p class="excerpt">\n'
        f'            {p["excerpt"]}\n'
        "          </p>\n"
        f'          <img class="card-thumb" src="img/thumbs/{thumb}.jpg" alt="{alt}" '
        'loading="lazy" decoding="async" width="640" height="336">\n'
        '          <span class="read-more">อ่านต่อ →</span>\n'
        "        </li>"
    )


def write_series(posts):
    """เขียนรายชื่อตอน (เรียงเลขตอน) + ItemList JSON-LD ลงหน้า series-*.html ระหว่าง marker
    ใช้ข้อมูลการ์ดชุดเดียวกับ sitemap/feed (articles.html) — หน้าซีรีส์ไม่มีข้อมูลของตัวเอง"""
    read_times = parse_read_times()
    for s in SERIES:
        if not os.path.exists(s["page"]):
            print(f"series      : WARNING ไม่มีไฟล์ {s['page']} — ข้าม")
            continue
        src = open(s["page"], encoding="utf-8").read()
        if "<!-- SERIES-START -->" not in src:
            print(f"series      : WARNING {s['page']} ไม่มี marker <!-- SERIES-START --> — ข้าม")
            continue
        eps = sorted(
            (p for p in posts if p["file"].startswith(s["prefix"])),
            key=lambda p: (episode_no(p["file"], s["prefix"]) is None,
                           episode_no(p["file"], s["prefix"]) or 0, p["file"]))
        cards = "\n".join(
            _series_card_html(p, episode_no(p["file"], s["prefix"]), read_times.get(p["file"]))
            for p in eps)
        itemlist = json.dumps({
            "@context": "https://schema.org", "@type": "ItemList",
            "name": f"{s['name']} — Moatrices",
            "itemListElement": [
                {"@type": "ListItem", "position": i + 1,
                 "url": f"{BASE_URL}/articles/{p['file']}",
                 "name": html.unescape(p["title"])}
                for i, p in enumerate(eps)],
        }, ensure_ascii=False, separators=(", ", ": "))
        block = (
            "<!-- SERIES-START -->\n"
            f'      <ul class="post-list post-list--series">\n{cards}\n      </ul>\n'
            '      <script type="application/ld+json">\n'
            f"      {itemlist}\n"
            "      </script>\n"
            "      <!-- SERIES-END -->")
        new = _SERIES_BLOCK_RE.sub(lambda _: block, src)
        if new != src:
            open(s["page"], "w", encoding="utf-8").write(new)
        print(f"{s['page']} : {len(eps)} ตอน" + ("" if new != src else " (ไม่เปลี่ยน)"))


def series_warnings(posts):
    """หน้า series ต้องมีไฟล์+marker และมีตอนใน archive อย่างน้อย 1 — กันหน้าเปล่าเงียบ"""
    w = []
    for s in SERIES:
        if not os.path.exists(s["page"]):
            w.append(f"ไม่มีไฟล์ {s['page']} (กำหนดไว้ใน SERIES)")
            continue
        body = open(s["page"], encoding="utf-8").read()
        if "<!-- SERIES-START -->" not in body:
            w.append(f"{s['page']} ไม่มี marker <!-- SERIES-START --> — build ไม่ gen รายชื่อตอนให้")
        if not any(p["file"].startswith(s["prefix"]) for p in posts):
            w.append(f"{s['page']} ไม่มีบทความ prefix '{s['prefix']}' ใน {ARCHIVE} — หน้าซีรีส์จะว่าง")
    return w


def stock_warnings(articles):
    """cross-check ARTICLES ↔ STOCK_META ↔ ลำดับ ↔ ไฟล์โลโก้ — deep-dive ทุกตัวต้องมีการ์ด"""
    w = []
    art_tk = {a["tk"].upper() for a in articles if a["tk"]}
    meta_tk = set(STOCK_META)
    sec_keys = {k for k, _ in STOCK_SECTORS}
    sec_by_tk = {a["tk"].upper(): a["sec"] for a in articles if a["tk"]}
    for tk in sorted(art_tk - meta_tk):
        w.append(f"{tk} เป็น deep-dive (มี tk ใน ARTICLES) แต่ไม่มีใน STOCK_META — ไม่ขึ้นการ์ดใน stocks.html")
    for tk in sorted(meta_tk - art_tk):
        w.append(f"STOCK_META มี {tk} แต่ไม่มีใน ARTICLES (app.js) — การ์ดชี้บทความที่ไม่มี")
    for tk in sorted(meta_tk):
        if tk not in STOCK_ORDER:
            w.append(f"STOCK_META มี {tk} แต่ไม่อยู่ใน STOCK_ORDER — การ์ดจะไม่แสดง")
        logo_file = f"logos/{STOCK_META[tk]['logo'][1]}"
        if not os.path.exists(logo_file):
            w.append(f"ไม่มีไฟล์โลโก้ {logo_file} สำหรับ {tk}")
        sec = sec_by_tk.get(tk)
        if sec and sec not in sec_keys:
            w.append(f"{tk} มี sec='{sec}' ที่ไม่มีหัวข้อใน STOCK_SECTORS — การ์ดจะหาย")
    return w


def validate(posts, articles):
    warnings = []
    archive_files = {p["file"] for p in posts}

    disk_files = {f for f in os.listdir("articles") if f.endswith(".html")}
    for f in sorted(disk_files - archive_files):
        warnings.append(f"articles/{f} มีไฟล์อยู่ แต่ไม่มีการ์ดใน {ARCHIVE}")
    for f in sorted(archive_files - disk_files):
        warnings.append(f"{ARCHIVE} ลิงก์ไป articles/{f} แต่ไฟล์ไม่มีจริง")

    app = open("app.js", encoding="utf-8").read()
    app_files = set(re.findall(r'\{ f: "([a-z0-9.-]+\.html)"', app))
    for f in sorted(archive_files - app_files):
        warnings.append(f"{f} อยู่ใน {ARCHIVE} แต่ไม่อยู่ใน ARTICLES (app.js) — search/prev-next จะไม่เห็น")
    for f in sorted(app_files - archive_files):
        warnings.append(f"{f} อยู่ใน ARTICLES (app.js) แต่ไม่อยู่ใน {ARCHIVE}")

    # ลำดับ ARTICLES ต้องเก่า→ใหม่ตามวันที่การ์ด — prev/next, "ใหม่สุด" ใน 404,
    # ลำดับผลค้นหา/related พึ่งลำดับนี้ (เคยพังเพราะบทใหม่ถูกแทรกหัว array แทนต่อท้าย)
    date_by_file = {p["file"]: p["date"] for p in posts}
    prev_a = None
    for a in articles:
        d = date_by_file.get(a["f"])
        if d is None:
            continue
        if prev_a and d < prev_a[1]:
            warnings.append(f"ARTICLES (app.js) ลำดับผิด: {a['f']} ({d}) มาหลัง "
                            f"{prev_a[0]} ({prev_a[1]}) — ต้องเรียงเก่า→ใหม่ (บทใหม่ต่อท้ายเสมอ)")
        prev_a = (a["f"], d)

    # หน้าแรก (curated) ต้องชี้เฉพาะบทความที่มีอยู่จริงในคลัง
    idx = open("index.html", encoding="utf-8").read()
    idx_files = set(re.findall(r'href="articles/([a-z0-9-]+\.html)"', idx))
    for f in sorted(idx_files - archive_files):
        warnings.append(f"index.html ลิงก์ไป articles/{f} ที่ไม่อยู่ใน {ARCHIVE}")
    idx_cards = len(re.findall(r'<ul class="post-list post-list--recent">.*?</ul>',
                               idx, re.S)[0].split("<li>")) - 1 if "post-list--recent" in idx else 0
    if idx_cards > 6:
        warnings.append(f"index.html มีการ์ดล่าสุด {idx_cards} ใบ (ควร ≤ 6) — หน้าแรกจะเริ่มรกอีก")

    if os.path.isdir(SCENE_DIR):
        for f in sorted(os.listdir(SCENE_DIR)):
            if not f.endswith(".css") or f.endswith(".min.css"):
                continue
            slug = f[:-4]
            art = f"articles/{slug}.html"
            if not os.path.exists(art):
                warnings.append(f"scenes/{f} ไม่มีบทคู่ articles/{slug}.html")
            elif f"scenes/{slug}.min.css" not in open(art, encoding="utf-8").read():
                warnings.append(f"{slug}.html ไม่ได้ link scenes/{slug}.min.css — รัน build.py")

    for p in posts:
        og = f"og-{p['file'].replace('.html', '')}.png"
        if not os.path.exists(og):
            warnings.append(f"ไม่มี {og} สำหรับ thumbnail ของ {p['file']}")
        art = os.path.join("articles", p["file"])
        if os.path.exists(art):
            body = open(art, encoding="utf-8").read()
            if '"@type": "BlogPosting"' in body and '"image"' not in body:
                warnings.append(f"{p['file']}: BlogPosting JSON-LD ขาด \"image\" — เสียสิทธิ์ Article rich results")

    warnings.extend(stock_warnings(articles))
    if "<!-- STOCKS-START -->" not in open("stocks.html", encoding="utf-8").read():
        warnings.append("stocks.html ไม่มี marker <!-- STOCKS-START --> — build ไม่ gen การ์ดหุ้นให้")

    warnings.extend(series_warnings(posts))
    for s in SERIES:  # การ์ดซีรีส์หน้าแรกต้องชี้มาหน้า landing ของซีรีส์
        if f'href="{s["page"]}"' not in idx:
            warnings.append(f"index.html ไม่มีลิงก์ไป {s['page']} — การ์ดซีรีส์หน้าแรกยังชี้ที่อื่น")

    if warnings:
        print(f"\n{len(warnings)} WARNING:")
        for w in warnings:
            print(f"  - {w}")
        return 1
    print(f"validate    : {ARCHIVE} ↔ articles/ ↔ app.js ↔ index.html ↔ og images ตรงกันครบ")
    return 0


# ─── related articles: ฝัง "อ่านต่อ" ท้าย deep-dive ระหว่าง marker <!-- RELATED-START/END --> ───
# แก้รายการที่นี่แล้วรัน build ใหม่ — block เดิมถูก strip แล้ว re-inject (idempotent เหมือน TOC)
# href relative จาก articles/ (บทความ = ชื่อไฟล์ตรง, หน้า root = ../xxx.html)
RELATED = {
    "deep-dive-nvda.html": [
        ("deep-dive-tsm.html", "ผ่าธุรกิจ TSM — โรงหล่อที่ผลิตชิปให้ NVIDIA"),
        ("deep-dive-avgo.html", "ผ่าธุรกิจ AVGO — custom XPU ที่ hyperscaler ใช้ลดการพึ่ง GPU"),
        ("deep-dive-ai-bubble.html", "AI = ฟองสบู่ dot-com รอบใหม่?"),
    ],
    "deep-dive-tsm.html": [
        ("deep-dive-nvda.html", "ผ่าธุรกิจ NVDA — ลูกค้าคนสำคัญที่สุดของโรงหล่อ"),
        ("deep-dive-asml.html", "ผ่าธุรกิจ ASML — เครื่อง EUV ที่ TSMC ขาดไม่ได้"),
        ("deep-dive-mu.html", "ผ่าธุรกิจ MU — ความจำของยุค AI ในวัฏจักรที่โหดที่สุด"),
    ],
    "deep-dive-asml.html": [
        ("deep-dive-tsm.html", "ผ่าธุรกิจ TSM — ลูกค้าเบอร์หนึ่งของเครื่อง EUV"),
        ("deep-dive-snps.html", "ผ่าธุรกิจ SNPS — ซอฟต์แวร์ที่ออกแบบชิปก่อนถึงเครื่องพิมพ์"),
        ("deep-dive-nvda.html", "ผ่าธุรกิจ NVDA — ปลายทางของชิปที่ EUV พิมพ์"),
    ],
    "deep-dive-snps.html": [
        ("deep-dive-asml.html", "ผ่าธุรกิจ ASML — ผูกขาดอีกชั้นของห่วงโซ่ชิป"),
        ("deep-dive-tsm.html", "ผ่าธุรกิจ TSM — โรงหล่อที่รับไม้ต่อจาก EDA"),
        ("deep-dive-nvda.html", "ผ่าธุรกิจ NVDA — ลูกค้า EDA และผู้ถือหุ้นใหม่ของ SNPS"),
    ],
    "deep-dive-mu.html": [
        ("deep-dive-tsm.html", "ผ่าธุรกิจ TSM — โรงหล่อ logic คู่ขนานกับโลก memory"),
        ("deep-dive-nvda.html", "ผ่าธุรกิจ NVDA — คนซื้อ HBM รายใหญ่ที่สุด"),
        ("deep-dive-ai-oil-shock.html", "Oil Shock 1970s — บทซ้อมใหญ่ของ commodity cycle"),
    ],
    "deep-dive-mrvl.html": [
        ("deep-dive-avgo.html", "ผ่าธุรกิจ AVGO — คู่แข่งตรงในสนาม custom XPU"),
        ("deep-dive-cohr.html", "ผ่าธุรกิจ COHR — ฝั่ง optics ของ data center เดียวกัน"),
        ("deep-dive-nvda.html", "ผ่าธุรกิจ NVDA — เจ้าตลาดที่ custom chip ท้าชิง"),
    ],
    "deep-dive-cohr.html": [
        ("deep-dive-mrvl.html", "ผ่าธุรกิจ MRVL — optical DSP ที่อยู่ปลายสายแสงเดียวกัน"),
        ("deep-dive-nvda.html", "ผ่าธุรกิจ NVDA — ต้นทางดีมานด์ของ optics ทั้งหมด"),
        ("deep-dive-tsm.html", "ผ่าธุรกิจ TSM — โรงหล่อของโลก AI"),
    ],
    "deep-dive-avgo.html": [
        ("deep-dive-nvda.html", "ผ่าธุรกิจ NVDA — เจ้าตลาดที่ XPU ตั้งใจแทน"),
        ("deep-dive-mrvl.html", "ผ่าธุรกิจ MRVL — อีกค่าย custom chip"),
        ("deep-dive-msft.html", "ผ่าธุรกิจ MSFT — ลูกค้า VMware ที่โดนขึ้นราคา"),
    ],
    "deep-dive-msft.html": [
        ("deep-dive-googl.html", "ผ่าธุรกิจ GOOGL — คู่ชกตรงในสนาม cloud + AI"),
        ("deep-dive-aapl.html", "ผ่าธุรกิจ AAPL — อีกหนึ่ง ecosystem lock-in"),
        ("deep-dive-avgo.html", "ผ่าธุรกิจ AVGO — คนคิดค่าเช่า VMware กับ Azure"),
    ],
    "deep-dive-googl.html": [
        ("deep-dive-msft.html", "ผ่าธุรกิจ MSFT — คู่ชกตรงในสนาม cloud + AI"),
        ("deep-dive-aapl.html", "ผ่าธุรกิจ AAPL — เจ้าของประตูที่ Google จ่ายค่าผ่าน"),
        ("deep-dive-nflx.html", "ผ่าธุรกิจ NFLX — สนามชิงเวลาหน้าจอเดียวกัน"),
    ],
    "deep-dive-nflx.html": [
        ("deep-dive-googl.html", "ผ่าธุรกิจ GOOGL — YouTube คู่แข่งชิงเวลาหน้าจอ"),
        ("deep-dive-cost.html", "ผ่าธุรกิจ COST — โมเดลสมาชิกอีกแบบที่ churn ต่ำกว่า"),
        ("deep-dive-meli.html", "ผ่าธุรกิจ MELI — โตแรงคนละทวีป"),
    ],
    "deep-dive-aapl.html": [
        ("deep-dive-googl.html", "ผ่าธุรกิจ GOOGL — คนจ่ายค่าประตูให้ Apple ปีละหลายหมื่นล้าน"),
        ("deep-dive-msft.html", "ผ่าธุรกิจ MSFT — ecosystem lock-in ฝั่งองค์กร"),
        ("deep-dive-cost.html", "ผ่าธุรกิจ COST — ธุรกิจค่าสมาชิกที่ลูกค้าไม่ยอมยกเลิก"),
    ],
    "deep-dive-cost.html": [
        ("deep-dive-aapl.html", "ผ่าธุรกิจ AAPL — เครื่องเก็บค่าเช่าจากฐานผู้ใช้"),
        ("deep-dive-nflx.html", "ผ่าธุรกิจ NFLX — subscription อีกแบบที่ moat บางกว่า"),
        ("deep-dive-meli.html", "ผ่าธุรกิจ MELI — ค้าปลีก+fintech ของลาตินอเมริกา"),
    ],
    "deep-dive-meli.html": [
        ("deep-dive-cost.html", "ผ่าธุรกิจ COST — ค้าปลีกที่ margin บางแต่ moat หนา"),
        ("deep-dive-axp.html", "ผ่าธุรกิจ AXP — payments แบบ closed-loop"),
        ("deep-dive-googl.html", "ผ่าธุรกิจ GOOGL — เครื่องโฆษณาที่ MELI ต้องพึ่ง"),
    ],
    "deep-dive-axp.html": [
        ("deep-dive-spgi.html", "ผ่าธุรกิจ SPGI — toll booth การเงินอีกชั้น"),
        ("deep-dive-cost.html", "ผ่าธุรกิจ COST — โมเดลสมาชิกฝั่งค้าปลีก"),
        ("deep-dive-meli.html", "ผ่าธุรกิจ MELI — fintech ตลาดเกิดใหม่"),
    ],
    "deep-dive-spgi.html": [
        ("deep-dive-axp.html", "ผ่าธุรกิจ AXP — การเงินสาย closed-loop"),
        ("deep-dive-msft.html", "ผ่าธุรกิจ MSFT — subscription + data ในอีกอุตสาหกรรม"),
        ("financials-01-income-statement.html", "ซีรีส์อ่านงบ ตอนที่ 1 — margin บอกโครงสร้างยังไง"),
    ],
    "deep-dive-unh.html": [
        ("deep-dive-lly.html", "ผ่าธุรกิจ LLY — ฝั่งยาของระบบสุขภาพเดียวกัน"),
        ("financials-01-income-statement.html", "ซีรีส์อ่านงบ ตอนที่ 1 — อ่าน margin บางๆ ให้เป็น"),
    ],
    "deep-dive-lly.html": [
        ("deep-dive-unh.html", "ผ่าธุรกิจ UNH — ฝั่ง payer ของระบบสุขภาพเดียวกัน"),
        ("financials-01-income-statement.html", "ซีรีส์อ่านงบ ตอนที่ 1 — งบกำไรขาดทุนแบบลงมือทำ"),
    ],
    "deep-dive-lmt.html": [
        ("deep-dive-spacex.html", "ผ่าธุรกิจ SpaceX — ผู้ท้าชิงจากนอกระบบ defense เดิม"),
        ("financials-01-income-statement.html", "ซีรีส์อ่านงบ ตอนที่ 1 — backlog กับความทนทานของรายได้"),
    ],
    "deep-dive-spacex.html": [
        ("deep-dive-lmt.html", "ผ่าธุรกิจ LMT — เจ้าตลาด defense ที่โดนท้าชิง"),
        ("deep-dive-ai-bubble.html", "AI = ฟองสบู่? — วิธีคิดกับ valuation ที่ขายอนาคต"),
    ],
    "deep-dive-ai-bubble.html": [
        ("deep-dive-nvda.html", "ผ่าธุรกิจ NVDA — ศูนย์กลางของวงจรเงินที่บทนี้ผ่า"),
        ("deep-dive-ai-oil-shock.html", "Oil Shock 1970s — บทซ้อมใหญ่ของ AI Capex"),
        ("buffett-talks-03-stock-market-1999.html", "Buffett 1999 — คำเตือนกลางไข้ dot-com"),
    ],
    "deep-dive-ai-oil-shock.html": [
        ("deep-dive-ai-bubble.html", "AI = ฟองสบู่ dot-com รอบใหม่?"),
        ("deep-dive-nvda.html", "ผ่าธุรกิจ NVDA — ผู้ขายจอบเสียมของยุคตื่นทอง"),
        ("deep-dive-mu.html", "ผ่าธุรกิจ MU — ธุรกิจ commodity cycle ตัวเป็นๆ"),
    ],
}

_RELATED_BLOCK_RE = re.compile(r"\n*[ \t]*<!-- RELATED-START -->.*?<!-- RELATED-END -->", re.S)


def write_related():
    """ฝัง block "อ่านต่อในจักรวาลเดียวกัน" ท้าย deep-dive (ก่อน author-card ถ้ามี
    ไม่งั้นก่อนปิด container ท้าย main) — strip block เดิมก่อนเสมอ = idempotent"""
    changed = 0
    for fname, links in RELATED.items():
        path = os.path.join("articles", fname)
        try:
            src = open(path, encoding="utf-8").read()
        except OSError:
            print(f"related     : WARNING ไม่พบ {path} — ข้าม")
            continue
        cards = "\n".join(
            f'          <a class="related-card" href="{href}">{html.escape(label, quote=False)}</a>'
            for href, label in links
        )
        block = (
            "<!-- RELATED-START -->\n"
            '      <div class="related">\n'
            '        <div class="related-title">อ่านต่อในจักรวาลเดียวกัน</div>\n'
            '        <div class="related-grid">\n'
            f"{cards}\n"
            "        </div>\n"
            "      </div>\n"
            "      <!-- RELATED-END -->"
        )
        orig = src
        src = _RELATED_BLOCK_RE.sub("", src)
        if '<div class="author-card">' in src:
            src = src.replace('<div class="author-card">', block + '\n\n      <div class="author-card">', 1)
        elif "\n    </div>\n  </main>" in src:
            src = src.replace("\n    </div>\n  </main>", "\n\n      " + block + "\n\n    </div>\n  </main>", 1)
        else:
            print(f"related     : WARNING {fname} ไม่เจอจุดฝัง (author-card / ปิด main) — ข้าม")
            continue
        if src != orig:
            open(path, "w", encoding="utf-8").write(src)
            changed += 1
    print(f"related     : ฝัง related block {changed} ไฟล์ ({len(RELATED)} รายการใน map)")


def main():
    posts = parse_archive()
    if not posts:
        print(f"ERROR: parse {ARCHIVE} ไม่เจอบทความเลย — โครงสร้าง HTML อาจเปลี่ยน")
        return 2
    print(f"{ARCHIVE}: พบ {len(posts)} บทความ")
    articles = parse_articles_js()
    inject_tocs()
    write_related()
    write_itemlist(posts)
    write_thumbnails(posts)
    minify_css()
    build_scenes()
    write_stocks(articles)
    write_hero_stats(articles)
    write_series(posts)
    write_sitemap(posts)
    write_feed(posts)
    return validate(posts, articles)


if __name__ == "__main__":
    sys.exit(main())
