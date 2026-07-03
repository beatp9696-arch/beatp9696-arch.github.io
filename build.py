#!/usr/bin/env python3
"""Moatrices site build — generate sitemap.xml + feed.xml จาก index.html และตรวจ drift

วิธีใช้ (รันจากโฟลเดอร์ website/):
    python3 build.py

แหล่งความจริง (source of truth) คือรายการบทความใน index.html
- sitemap.xml    : generate ใหม่ทั้งไฟล์ (หน้า root + ทุกบทความ, lastmod = วันที่บทความ)
- feed.xml       : generate ใหม่ โดยรักษา pubDate + description ของ item เดิมไว้ (ตาม guid)
                   item ใหม่ใช้ excerpt จาก index.html และ pubDate = วันที่บทความ 12:00 +0700
- ตรวจ drift     : articles/*.html ↔ ลิงก์ใน index.html ↔ ARTICLES array ใน app.js
                   ถ้าไม่ตรงจะพิมพ์ WARNING (ไม่ block)

เพิ่มบทความใหม่ = เพิ่มการ์ดใน index.html + เพิ่มแถวใน ARTICLES (app.js) แล้วรันสคริปต์นี้
"""

import datetime
import html
import json
import os
import re
import subprocess
import sys
from xml.sax.saxutils import escape

BASE_URL = "https://beatp9696-arch.github.io"
ROOT_PAGES = ["", "stocks.html", "dashboard.html", "about.html"]
TZ = datetime.timezone(datetime.timedelta(hours=7))
THUMB_DIR = "img/thumbs"   # thumbnail ย่อของ og image (ใช้เป็นภาพการ์ดในหน้า index)
THUMB_W = 640             # กว้างพอสำหรับ retina (การ์ด desktop แสดง 176px, mobile เต็มจอ)

os.chdir(os.path.dirname(os.path.abspath(__file__)))


def parse_index():
    """คืน list ของบทความจาก index.html (เรียงตามหน้าเว็บ = ใหม่สุดก่อน)"""
    src = open("index.html", encoding="utf-8").read()
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
    r'(<div class="byline">.*?<div class="byline-info">.*?</div>\s*</div>\s*</div>)',
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
    for page in ROOT_PAGES:
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
    print(f"sitemap.xml : {len(ROOT_PAGES)} pages + {len(posts)} articles")


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


def write_feed(posts):
    old = parse_old_feed()
    now = datetime.datetime.now(TZ)
    kept = 0
    items = []
    for p in posts:  # ใหม่สุดก่อน ตาม index
        url = f"{BASE_URL}/articles/{p['file']}"
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
    print(f"feed.xml    : {len(posts)} items ({kept} เดิม, {len(posts) - kept} ใหม่)")


_ITEMLIST_RE = re.compile(
    r'  <script type="application/ld\+json">\n'
    r'  \{"@context": "https://schema\.org", "@type": "ItemList".*?\}\n'
    r'  </script>', re.S)


def write_itemlist(posts):
    """regen ItemList JSON-LD ใน index.html จากลำดับการ์ด (ใหม่สุด = position 1)
    ตัดการไล่เลข position 25 รายการด้วยมือตอนแทรกบทใหม่ (เคยเป็นจุด drift เงียบ)"""
    src = open("index.html", encoding="utf-8").read()
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
        print(f"itemlist    : WARNING หา ItemList script ใน index.html ไม่เจอ (พบ {n})")
        return
    if new != src:
        open("index.html", "w", encoding="utf-8").write(new)
    print(f"itemlist    : {len(posts)} รายการ" + ("" if new != src else " (ไม่เปลี่ยน)"))


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
        subprocess.run(
            ["sips", "-Z", str(THUMB_W), "-s", "format", "jpeg",
             "-s", "formatOptions", "80", og, "--out", thumb],
            check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        )
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


def validate(posts):
    warnings = []
    index_files = {p["file"] for p in posts}

    disk_files = {f for f in os.listdir("articles") if f.endswith(".html")}
    for f in sorted(disk_files - index_files):
        warnings.append(f"articles/{f} มีไฟล์อยู่ แต่ไม่มีการ์ดใน index.html")
    for f in sorted(index_files - disk_files):
        warnings.append(f"index.html ลิงก์ไป articles/{f} แต่ไฟล์ไม่มีจริง")

    app = open("app.js", encoding="utf-8").read()
    app_files = set(re.findall(r'\{ f: "([a-z0-9.-]+\.html)"', app))
    for f in sorted(index_files - app_files):
        warnings.append(f"{f} อยู่ใน index.html แต่ไม่อยู่ใน ARTICLES (app.js) — search/prev-next จะไม่เห็น")
    for f in sorted(app_files - index_files):
        warnings.append(f"{f} อยู่ใน ARTICLES (app.js) แต่ไม่อยู่ใน index.html")

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

    if warnings:
        print(f"\n{len(warnings)} WARNING:")
        for w in warnings:
            print(f"  - {w}")
        return 1
    print("validate    : index.html ↔ articles/ ↔ app.js ↔ og images ตรงกันครบ")
    return 0


def main():
    posts = parse_index()
    if not posts:
        print("ERROR: parse index.html ไม่เจอบทความเลย — โครงสร้าง HTML อาจเปลี่ยน")
        return 2
    print(f"index.html  : พบ {len(posts)} บทความ")
    inject_tocs()
    write_itemlist(posts)
    write_thumbnails(posts)
    minify_css()
    build_scenes()
    write_sitemap(posts)
    write_feed(posts)
    return validate(posts)


if __name__ == "__main__":
    sys.exit(main())
