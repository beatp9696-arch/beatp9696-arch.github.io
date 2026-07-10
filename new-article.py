#!/usr/bin/env python3
"""Scaffold บทความใหม่ — ลดจาก 5 จุดที่ต้องแก้ด้วยมือเหลือคำสั่งเดียว

สร้าง/แก้ให้อัตโนมัติ:
  1. articles/<slug>.html   — head (meta/OG/JSON-LD ครบ) + chrome + โครง section มาตรฐาน
  2. scenes/<slug>.css      — stub ว่าง (build.py จะ minify + ฝัง <link> ให้)
  3. articles.html          — แทรกการ์ดบนสุดของคลังบทความ (source of truth)
  4. index.html             — เฉพาะ --kind stock/book: แทรกการ์ดบนสุดของ "บทความล่าสุด"
                              แล้วตัดท้ายให้เหลือ 6 ใบ (ตอนซีรีส์ไม่ขึ้นหน้าแรก —
                              เข้าถึงผ่านการ์ดซีรีส์/คลังบทความแทน)
  5. app.js                 — แทรก entry บนสุดของ ARTICLES (search + prev/next เห็น)

หลังรัน: เขียนเนื้อหา + scene, ทำ og-<slug>.png, แล้วรัน `python3 build.py`
(build.py จะ gen thumbnail/sitemap/feed/TOC/ItemList + ฝัง scene link + validate)

ตัวอย่าง:
  python3 new-article.py --slug deep-dive-abnb --ticker ABNB --exch NASDAQ \
    --company "Airbnb, Inc." \
    --title 'ผ่าธุรกิจ ABNB (Airbnb) — ตลาดสองด้านที่ ...' \
    --nav-title 'ABNB (Airbnb)' \
    --desc 'meta description ...' --excerpt 'ข้อความบนการ์ด ...' \
    --read-time 15 --sec consumer

  # ซีรีส์อ่านงบ / หนังสือ (ไม่มี company-header, การ์ดใช้ chip):
  python3 new-article.py --slug financials-04-xxx --kind series \
    --title 'ตอนที่ 4: ...' --nav-title 'ตอนที่ 4: ...' \
    --tag 'ซีรีส์: อ่านงบแบบลงมือทำ · ตอนใหม่' \
    --desc '...' --excerpt '...' --read-time 10 --sec basics
"""
import argparse
import datetime
import html
import os
import re
import sys

os.chdir(os.path.dirname(os.path.abspath(__file__)))
TH_MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
             "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."]
BASE = "https://beatp9696-arch.github.io"


def th_date(iso):
    d = datetime.date.fromisoformat(iso)
    return f"{d.day} {TH_MONTHS[d.month - 1]} {d.year}"


def esc(s):   # สำหรับ attribute/HTML text ทั่วไป (ให้ & เป็น &amp;)
    return html.escape(s, quote=True)


ARTICLE_TMPL = """<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script>try{var t=localStorage.getItem('theme');if(t)document.documentElement.setAttribute('data-theme',t);}catch(e){}</script>
  <title>@@TITLE@@ | Moatrices</title>
  <meta name="description" content="@@DESC@@">
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="Moatrices">
  <meta property="og:title" content="@@TITLE@@">
  <meta property="og:description" content="@@DESC@@">
  <meta property="og:url" content="@@BASE@@/articles/@@SLUG@@.html">
  <meta property="og:locale" content="th_TH">
  <meta name="twitter:card" content="summary_large_image">
  <meta property="og:image" content="@@BASE@@/og-@@SLUG@@.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:image" content="@@BASE@@/og-@@SLUG@@.png">
  <meta name="author" content="Moatrices">
  <link rel="canonical" href="@@BASE@@/articles/@@SLUG@@.html">
  <link rel="alternate" type="application/rss+xml" title="Moatrices RSS" href="/feed.xml">
  <meta name="theme-color" media="(prefers-color-scheme: light)" content="#f7f5f0">
  <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#121417">
  <link rel="icon" href="../favicon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">
  <link rel="manifest" href="/site.webmanifest">
  <link rel="preload" as="font" type="font/woff2" href="../fonts/sarabun-400-thai.woff2" crossorigin>
  <link rel="preload" as="font" type="font/woff2" href="../fonts/sarabun-400-latin.woff2" crossorigin>
  <link rel="stylesheet" href="../style.min.css">
  <script type="application/ld+json">
  {"@context": "https://schema.org", "@type": "BlogPosting", "headline": "@@JTITLE@@", "description": "@@JDESC@@", "image": ["@@BASE@@/og-@@SLUG@@.png"], "author": {"@type": "Person", "name": "Moatrices"}, "publisher": {"@type": "Organization", "name": "Moatrices", "logo": {"@type": "ImageObject", "url": "@@BASE@@/icon-512.png"}}, "mainEntityOfPage": {"@type": "WebPage", "@id": "@@BASE@@/articles/@@SLUG@@.html"}, "inLanguage": "th", "datePublished": "@@DATE@@", "dateModified": "@@DATE@@"}
  </script>
  <script type="application/ld+json">
  {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": 1, "name": "หน้าแรก", "item": "@@BASE@@/"}, {"@type": "ListItem", "position": 2, "name": "@@JTITLE@@", "item": "@@BASE@@/articles/@@SLUG@@.html"}]}
  </script>
</head>
<body>

  <div class="reading-progress"></div>
  <div class="top-accent"></div>

  <header class="site-header">
    <div class="container">
      <a href="../index.html" class="site-title">Moatrices</a>
      <nav class="site-nav">
        <a href="../index.html">หน้าแรก</a>
        <a href="../articles.html">บทความ</a>
        <a href="../stocks.html">หุ้น</a>
        <a href="../about.html">เกี่ยวกับ</a>
      </nav>
    </div>
  </header>

  <main>
    <div class="container">

      <span class="kicker">@@KICKER@@</span>
      <h1>@@TITLE@@</h1>
@@COMPANY_HEADER@@      <div class="byline">
        <span class="byline-avatar">M</span>
        <div>
          <div class="byline-author">Moatrices</div>
          <div class="byline-info">@@DATE_TH@@ · อ่าน ~@@READ@@ นาที</div>
        </div>
      </div>

      <p class="lead">
        TODO: เปิดด้วย hook — ธุรกิจนี้คืออะไร ทำไมน่าสนใจในหนึ่งย่อหน้า
      </p>

      <blockquote>
        ตัวเลขอ้างอิง TODO (10-K/20-F FYxxxx + earnings call ล่าสุด)
        เป็นบันทึกการเรียนเพื่อการศึกษา ไม่ใช่คำแนะนำซื้อขาย
      </blockquote>

      <h2>ธุรกิจนี้หาเงินจากอะไร</h2>
      <p>TODO</p>

      <h2>Moat: คูเมืองอยู่ตรงไหน (และทำไมลอกไม่ได้)</h2>
      <p>TODO</p>

      <h2>ตัวเลขบอกอะไร</h2>
      <p>TODO</p>

      <h2>Bull Case</h2>
      <p>TODO</p>

      <h2>Bear Case / จุดเปราะ</h2>
      <p>TODO</p>

      <h2>Kill Conditions</h2>
      <p>TODO — เหตุการณ์แบบไหนที่จะทำให้รู้ว่าคิดผิดและต้องขาย</p>

      <h2>สิ่งที่ยังต้องขุดต่อ (What to ask)</h2>
      <p>TODO</p>

      <h2>สรุป</h2>
      <p>TODO</p>

    </div>
  </main>

  <footer class="site-footer">
    <div class="container footer-grid">
      <div class="footer-brand">
        <a href="../index.html" class="site-title">Moatrices</a>
        <p>บันทึกการเรียนวิเคราะห์หุ้น US เชิงลึก ภาษาไทย — เน้นพื้นฐานธุรกิจ ไม่ใช่ราคา</p>
      </div>
      <nav class="footer-nav">
        <a href="../index.html">หน้าแรก</a>
        <a href="../articles.html">บทความ</a>
        <a href="../stocks.html">หุ้น</a>
        <a href="../dashboard.html">Dashboard</a>
        <a href="../about.html">เกี่ยวกับ</a>
      </nav>
      <div class="footer-follow">
        <span class="footer-follow-label">ติดตาม</span>
        <div class="footer-social">
          <a href="/feed.xml" class="social-btn" aria-label="RSS feed" title="RSS feed"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 11a9 9 0 0 1 9 9"/><path d="M4 4a16 16 0 0 1 16 16"/><circle cx="5" cy="19" r="1"/></svg></a>
          <a href="mailto:beatp9696@gmail.com" class="social-btn" aria-label="อีเมล" title="อีเมล"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg></a>
        </div>
      </div>
    </div>
    <div class="container footer-legal">
      <p><strong>คำเตือน:</strong> เนื้อหาทั้งหมดเป็นบันทึกการเรียนและความเห็นส่วนตัว
         เพื่อการศึกษาเท่านั้น <strong>ไม่ใช่คำแนะนำการลงทุน</strong> ไม่ใช่การชี้นำให้ซื้อหรือขายหลักทรัพย์ใดๆ
         ตัวเลขอ้างอิงงบที่เผยแพร่ ณ ช่วงเวลาหนึ่งและอาจล้าสมัย การตัดสินใจลงทุนเป็นความรับผิดชอบของผู้อ่านเอง</p>
      <p>© 2026 Moatrices · เผยแพร่ผ่าน GitHub Pages</p>
    </div>
  </footer>

  <button class="to-top" aria-label="กลับขึ้นด้านบน">↑</button>
  <script defer src="../app.js"></script>

</body>
</html>
"""

COMPANY_HEADER_TMPL = """      <div class="company-header">
        <span class="company-logo"><img src="../logos/@@LOGO@@" alt="@@COMPANY@@ logo" width="44" height="44"></span>
        <span class="company-meta">
          <span class="company-ticker">@@TICKER@@ <span class="company-exch">@@EXCH@@</span></span>
          <span class="company-name">@@COMPANY@@</span>
        </span>
      </div>
"""

SCENE_STUB = """/* ============================================================
   @@SLUG@@ — scene/instrument CSS (โหลดเฉพาะบทนี้)
   ตั้ง namespace prefix เฉพาะบท (เช่น .@@NS@@-panel) กัน collide กับบทอื่น
   ============================================================ */
"""

BADGE_STOCK = ('<span class="ticker-badge">@@TICKER@@</span>')
BADGE_SERIES = (
    '<span class="ticker-badge cat-badge" aria-label="@@TAG@@">'
    '<svg class="cat-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" '
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
    '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>'
    '<line x1="6" y1="20" x2="6" y2="14"/></svg></span>')

CARD_TMPL = """        <li>
          <div class="article-meta-row">
            <span class="tag">@@TAG@@</span>
            @@BADGE@@
            <span class="read-time">~@@READ@@ นาที</span>
            <time class="post-date" datetime="@@DATE@@">@@DATE_TH@@</time>
          </div>
          <a href="articles/@@SLUG@@.html">
            @@TITLE@@
          </a>
          <p class="excerpt">
            @@EXCERPT@@
          </p>
          <img class="card-thumb" src="img/thumbs/@@SLUG@@.jpg" alt="@@TITLE@@" loading="lazy" decoding="async" width="640" height="336">
          <span class="read-more">อ่านต่อ →</span>
        </li>
"""


def fill(tmpl, **kw):
    for k, v in kw.items():
        tmpl = tmpl.replace(f"@@{k}@@", v)
    return tmpl


def main():
    ap = argparse.ArgumentParser(description="Scaffold บทความใหม่ให้เว็บ Moatrices")
    ap.add_argument("--slug", required=True, help="เช่น deep-dive-abnb (= ชื่อไฟล์)")
    ap.add_argument("--title", required=True, help="หัวข้อเต็ม (บนการ์ด + h1)")
    ap.add_argument("--nav-title", help="หัวข้อสั้นสำหรับ search/prev-next (default = --title)")
    ap.add_argument("--desc", required=True, help="meta description / og")
    ap.add_argument("--excerpt", required=True, help="ข้อความบนการ์ดหน้าแรก")
    ap.add_argument("--date", default=datetime.date.today().isoformat(), help="YYYY-MM-DD")
    ap.add_argument("--read-time", type=int, default=12, help="นาทีโดยประมาณ")
    ap.add_argument("--sec", default="other",
                    help="app.js section: semi/software/health/finance/consumer/space/basics/other")
    ap.add_argument("--kind", default="stock", choices=["stock", "series", "book"])
    ap.add_argument("--tag", help="ข้อความ .tag บนการ์ด (default ตาม --kind)")
    ap.add_argument("--kicker", help="ข้อความ kicker เหนือ h1 (default ตาม --kind)")
    # stock only
    ap.add_argument("--ticker", help="เช่น ABNB (จำเป็นถ้า --kind stock)")
    ap.add_argument("--exch", default="NASDAQ")
    ap.add_argument("--company", help="ชื่อบริษัทเต็ม เช่น 'Airbnb, Inc.'")
    ap.add_argument("--logo", help="ไฟล์โลโก้ใน logos/ (default <TICKER>.png)")
    a = ap.parse_args()

    if not re.fullmatch(r"[a-z0-9-]+", a.slug):
        sys.exit("ERROR: --slug ใช้ได้แค่ a-z 0-9 - เท่านั้น")
    art = f"articles/{a.slug}.html"
    if os.path.exists(art):
        sys.exit(f"ERROR: {art} มีอยู่แล้ว — เลือก slug อื่นหรือแก้ไฟล์เดิม")
    if a.kind == "stock" and not (a.ticker and a.company):
        sys.exit("ERROR: --kind stock ต้องมี --ticker และ --company")

    nav_title = a.nav_title or a.title
    is_stock = a.kind == "stock"
    kicker = a.kicker or ("Deep-dive · หุ้นจริง" if is_stock else "บทวิเคราะห์")
    tag = a.tag or ("Deep-dive · หุ้นจริง" if is_stock
                    else "ซีรีส์: อ่านงบแบบลงมือทำ · ตอนใหม่")
    date_th = th_date(a.date)

    common = dict(SLUG=a.slug, BASE=BASE, DATE=a.date, DATE_TH=date_th,
                  READ=str(a.read_time), KICKER=esc(kicker), TITLE=esc(a.title),
                  DESC=esc(a.desc), JTITLE=nav_title, JDESC=a.desc)

    # 1) article html
    if is_stock:
        ch = fill(COMPANY_HEADER_TMPL, LOGO=(a.logo or f"{a.ticker}.png"),
                  COMPANY=esc(a.company), TICKER=esc(a.ticker), EXCH=esc(a.exch))
    else:
        ch = ""
    open(art, "w", encoding="utf-8").write(fill(ARTICLE_TMPL, COMPANY_HEADER=ch, **common))

    # 2) scene stub
    ns = re.sub(r"[^a-z0-9]", "", a.slug.replace("deep-dive-", "").replace("financials-", "f"))[:6] or "sc"
    os.makedirs("scenes", exist_ok=True)
    open(f"scenes/{a.slug}.css", "w", encoding="utf-8").write(fill(SCENE_STUB, SLUG=a.slug, NS=ns))

    # 3) articles.html card (แทรกบนสุดของคลังบทความ = source of truth)
    badge = (fill(BADGE_STOCK, TICKER=esc(a.ticker)) if is_stock
             else fill(BADGE_SERIES, TAG=esc(tag)))
    card = fill(CARD_TMPL, TAG=esc(tag), BADGE=badge, READ=str(a.read_time),
                DATE=a.date, DATE_TH=date_th, SLUG=a.slug,
                TITLE=esc(a.title), EXCERPT=esc(a.excerpt))
    arc = open("articles.html", encoding="utf-8").read()
    anchor = '<ul class="post-list post-list--all">\n'
    if anchor not in arc:
        sys.exit("ERROR: ไม่พบ <ul class=\"post-list post-list--all\"> ใน articles.html")
    arc = arc.replace(anchor, anchor + "\n" + card, 1)
    open("articles.html", "w", encoding="utf-8").write(arc)

    # 4) index.html "บทความล่าสุด" (เฉพาะ stock/book) — แทรกบนสุด + ตัดให้เหลือ RECENT_MAX
    on_index = a.kind in ("stock", "book")
    if on_index:
        RECENT_MAX = 6
        idx = open("index.html", encoding="utf-8").read()
        m = re.search(r'(<ul class="post-list post-list--recent">\n)(.*?)(\n[ ]{6}</ul>)',
                      idx, re.S)
        if not m:
            sys.exit("ERROR: ไม่พบ <ul class=\"post-list post-list--recent\"> ใน index.html")
        cards = re.findall(r"[ ]{8}<li>\n.*?\n[ ]{8}</li>\n", m.group(2) + "\n", re.S)
        cards = ([card] + cards)[:RECENT_MAX]
        inner = "\n" + "\n".join(cards).rstrip("\n")
        idx = idx[:m.start()] + m.group(1) + inner + m.group(3) + idx[m.end():]
        open("index.html", "w", encoding="utf-8").write(idx)

    # 5) app.js ARTICLES entry (แทรกบนสุด)
    app = open("app.js", encoding="utf-8").read()
    entry = f'    {{ f: "{a.slug}.html", t: "{nav_title}", sec: "{a.sec}" }},\n'
    m = re.search(r"var ARTICLES = \[\n", app)
    if not m:
        sys.exit("ERROR: ไม่พบ 'var ARTICLES = [' ใน app.js")
    app = app[:m.end()] + entry + app[m.end():]
    open("app.js", "w", encoding="utf-8").write(app)

    print(f"✓ สร้าง {art}")
    print(f"✓ สร้าง scenes/{a.slug}.css (stub, namespace .{ns}-*)")
    print("✓ แทรกการ์ดใน articles.html (คลังบทความ)")
    if on_index:
        print("✓ แทรกการ์ดใน index.html บทความล่าสุด (ตัดให้เหลือ 6 ใบ)")
    else:
        print("- ตอนซีรีส์ไม่ขึ้นหน้าแรกอัตโนมัติ — ถ้าเป็นซีรีส์ใหม่ให้เพิ่ม/แก้การ์ดซีรีส์ใน index.html เอง")
    print("✓ แทรก entry ใน app.js ARTICLES")
    print("\nต่อไป:")
    print(f"  1. เขียนเนื้อหาใน {art} (แทน TODO) + scene ใน scenes/{a.slug}.css")
    print(f"  2. ทำ og-{a.slug}.png (1200×630) วางที่ website/")
    print("  3. python3 build.py   # thumbnail/sitemap/feed/TOC/ItemList + ฝัง scene link + validate")


if __name__ == "__main__":
    main()
