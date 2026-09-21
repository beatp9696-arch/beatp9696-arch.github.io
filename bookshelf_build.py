"""Static Bookshelf renderer. Edit data/bookshelf.json; never edit generated pages."""
import datetime
import hashlib
import html
import json
import re
from pathlib import Path
from urllib.parse import urlsplit, unquote

ROOT = Path(__file__).resolve().parent
BASE_URL = "https://beatp9696-arch.github.io"
STATUS = {"ready": "พร้อมอ่าน", "draft": "กำลังเรียบเรียง"}
E = lambda value: html.escape(str(value), quote=True)


def load_catalog():
    catalog = json.loads((ROOT / "data/bookshelf.json").read_text())
    slugs = set()
    required = "slug title titleThai author editor year edition categories status cover coverAlt shortDescription oneLineSummary summarySections keyIdeas suitableFor readingOrder editorialSynthesis relatedLinks purchaseLinks affiliateDisclosure sourceLinks updatedAt".split()
    for book in catalog["books"]:
        assert all(key in book for key in required), "Missing book field"
        assert re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", book["slug"])
        assert book["slug"] not in slugs, "Duplicate book slug"
        slugs.add(book["slug"])
        assert book["status"] in STATUS
        assert set(book["categories"]) <= set(catalog["categories"])
        assert re.fullmatch(r"#[a-fA-F0-9]{6}", book["accent"])
        datetime.date.fromisoformat(book["updatedAt"])
        assert (ROOT / book["cover"]).is_file(), "Missing cover"
        if book["status"] == "ready":
            assert len(book["keyIdeas"]) == 5 and len(book["applicationQuestions"]) == 3
        for link in book["relatedLinks"] + book["readingOrder"] + book["sourceLinks"] + [{"href": book["fullArticle"]}]:
            url = link.get("href", link.get("url"))
            if url.startswith("https://"):
                continue
            path = urlsplit(url)
            assert not path.scheme and not path.netloc and not path.path.startswith("/") and ".." not in Path(path.path).parts
            target = ROOT / unquote(path.path)
            assert target.is_file(), f"Missing local link: {url}"
            if path.fragment:
                assert f'id="{path.fragment}"' in target.read_text(), f"Missing anchor: {url}"
        for link in book["purchaseLinks"]:
            if link.get("url"):
                assert urlsplit(link["url"]).scheme == "https" and link.get("verifiedAt"), "Unverified purchase URL"
                datetime.date.fromisoformat(link["verifiedAt"])
        assert not any(link.get("affiliate") for link in book["purchaseLinks"]) or book["affiliateDisclosure"]
        text = json.dumps(book, ensure_ascii=False)
        assert not any(term in text for term in ["ผมคิดว่า", "สำหรับผม", "ในมุมของผม", "ผมเห็นด้วย", "ประสบการณ์ของผม"])
    return catalog


def paragraphs(items):
    return "\n".join(f"<p>{E(text)}</p>" for text in items)


def asset_url(path):
    """Change the asset URL when its contents change, including in cached previews."""
    version = hashlib.sha256((ROOT / path).read_bytes()).hexdigest()[:12]
    return f"{path}?v={version}"


def cover(book, prefix="", lazy=False):
    return f'''<div class="bs-volume" style="--book-accent:{E(book['accent'])};--cover-ratio:{int(book.get('coverWidth', 3))}/{int(book.get('coverHeight', 4))}">
      <div class="bs-cover-face">
        <span class="bs-cover-fallback" aria-hidden="true"><small>MOATRICES · BOOKSHELF</small><strong lang="en">{E(book['title'])}</strong><span>{E(book['author'])}</span></span>
        <img src="{prefix}{E(book['cover'])}" alt="{E(book['coverAlt'])}" width="{int(book.get('coverWidth', 348))}" height="{int(book.get('coverHeight', 360))}" {'loading="lazy"' if lazy else 'fetchpriority="high"'} decoding="async">
      </div>
      <span class="bs-volume-spine" aria-hidden="true">{E(book['title'])}</span>
      <span class="bs-volume-pages" aria-hidden="true"></span>
    </div>'''


def book_schema(book):
    return {"@type": "Book", "@id": BASE_URL + "/books/" + book["slug"] + ".html#book", "name": book["title"], "author": {"@type": "Person", "name": book["author"]}, "editor": {"@type": "Person", "name": book["editor"]}, "datePublished": str(book["year"]), "bookEdition": book["edition"], "isbn": book["isbn"], "inLanguage": "en", "image": BASE_URL + "/" + book["cover"], "publisher": {"@type": "Organization", "name": book["publisher"]}}


def shell(title, description, path, body, schema, prefix="", book=None):
    url = BASE_URL + "/" + path
    image = BASE_URL + "/" + book.get("shareImage", book["cover"]) if book else BASE_URL + "/og-image.jpg"
    header = (ROOT / "partials/site-header.html").read_text().replace("@@PATH_PREFIX@@", prefix).rstrip()
    header = header.replace(f'href="{prefix}books.html"', f'href="{prefix}books.html" aria-current="page"')
    footer = (ROOT / "partials/site-footer.html").read_text().replace("@@PATH_PREFIX@@", prefix).rstrip()
    footer = footer.replace(f'href="{prefix}books.html"', f'href="{prefix}books.html" aria-current="page"')
    header = '\n'.join('  ' + line if line else '' for line in header.splitlines())
    footer = '\n'.join('  ' + line if line else '' for line in footer.splitlines())
    structured = json.dumps({"@context": "https://schema.org", "@graph": schema}, ensure_ascii=False).replace("<", "\\u003c")
    theme_default = 'dark' if book else ''
    rail = ''
    if book:
        stops = [('book-intro', 'ข้อมูลหนังสือ'), ('purchase', 'ตัวเลือกการซื้อ'), ('summary', 'เริ่มบทสรุป'), ('key-ideas', 'แนวคิดสำคัญ'), ('suitable', 'เหมาะกับใคร'), ('reading-order', 'ควรอ่านอย่างไร'), ('synthesis', 'สังเคราะห์แนวคิด'), ('related', 'เนื้อหาที่เกี่ยวข้อง'), ('questions', 'คำถามนำไปใช้'), ('sources', 'แหล่งอ้างอิง')]
        ticks = ''.join(f'<a class="bs-rail-stop" href="#{anchor}" aria-label="{label}"><span></span><small>{label}</small></a>' for anchor, label in stops)
        rail = f'''<aside class="bs-book-rail" aria-label="เมนูหนังสือ">
          <a class="bs-rail-brand" href="../index.html" aria-label="Moatrices — หน้าแรก"><svg viewBox="0 0 32 40" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M4 35V19h6v16M13 35V12h6v23M22 35V5h6v30M2 39h28"/></svg></a>
          <nav class="bs-rail-index" aria-label="ข้ามไปส่วนของหนังสือ"><a class="bs-rail-back" href="../books.html" aria-label="กลับ Bookshelf">←</a>{ticks}</nav>
          <div class="bs-rail-tools"></div>
        </aside>'''
    return f'''<!DOCTYPE html>
<!-- Generated by bookshelf_build.py from data/bookshelf.json. -->
<html lang="th"{' data-theme="dark"' if book else ''}>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <script>try{{var t=localStorage.getItem('theme')||'{theme_default}';if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t);}}catch(e){{}}</script>
  <title>{E(title)} — Moatrices</title>
  <meta name="description" content="{E(description)}">
  <link rel="canonical" href="{url}">
  <meta property="og:type" content="{'article' if book else 'website'}">
  <meta property="og:site_name" content="Moatrices">
  <meta property="og:locale" content="th_TH">
  <meta property="og:title" content="{E(title)} — Moatrices">
  <meta property="og:description" content="{E(description)}">
  <meta property="og:url" content="{url}">
  <meta property="og:image" content="{image}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="{E(title)} — Moatrices">
  <meta name="twitter:description" content="{E(description)}">
  <meta name="twitter:image" content="{image}">
  <link rel="icon" href="{prefix}favicon.svg" type="image/svg+xml">
  <link rel="alternate" type="application/rss+xml" title="Moatrices RSS" href="{prefix}feed.xml">
  <link rel="preload" href="{prefix}fonts/sarabun-400-thai.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="{prefix}style.min.css">
  <link rel="stylesheet" href="{prefix}{asset_url('bookshelf.css')}">
{'  <link rel="stylesheet" href="' + prefix + asset_url('book-editorial.css') + '">' if book else ''}
  <script type="application/ld+json">{structured}</script>
</head>
<body class="bookshelf-page {'book-detail-page' if book else 'book-collection-page'}" {'style="--book-accent:' + E(book['accent']) + '"' if book else ''}>
  <a class="bs-skip" href="#main-content">ข้ามไปเนื้อหา</a>
{('  ' + rail) if rail else ''}
  <div class="top-accent"></div>
  <!-- SITE-HEADER-START -->
{header}
  <!-- SITE-HEADER-END -->
  <main id="main-content">
    <div class="container bs-container">
{body}
    </div>
  </main>
  <!-- SITE-FOOTER-START -->
{footer}
  <!-- SITE-FOOTER-END -->
  <button class="to-top" aria-label="กลับขึ้นด้านบน">↑</button>
  <script defer src="{prefix}app.min.js"></script>
  <script defer src="{prefix}bookshelf.js"></script>
</body>
</html>
'''


def breadcrumb_schema(book=None):
    items = [{"@type": "ListItem", "position": 1, "name": "Moatrices", "item": BASE_URL + "/"}, {"@type": "ListItem", "position": 2, "name": "Bookshelf", "item": BASE_URL + "/books.html"}]
    if book:
        items.append({"@type": "ListItem", "position": 3, "name": book["title"], "item": BASE_URL + "/books/" + book["slug"] + ".html"})
    return {"@type": "BreadcrumbList", "itemListElement": items}


def collection(catalog):
    books = catalog["books"]
    featured = next((b for b in books if b.get("featured") and b["status"] == "ready"), None)
    feature = ""
    if featured:
        b = featured
        feature = f'''<section class="bs-feature" aria-labelledby="featured-title">
          <div class="bs-stage"><span class="bs-stage-note">FROM THE SHELF / FEATURED</span>{cover(b)}<span class="bs-stage-caption">{E(b['edition'])} · {b['year']}</span></div>
          <div class="bs-feature-copy"><p class="bs-eyebrow">คัดมาให้อ่าน · FEATURED BOOK</p><span class="bs-status">พร้อมอ่าน · {b['readingMinutes']} นาที</span>
            <h2 id="featured-title" class="bs-book-title" lang="en">{E(b['title'])}</h2><p class="bs-author">{E(b['author'])}</p>
            <p class="bs-feature-description">{E(b['shortDescription'])}</p><p class="bs-categories">{' · '.join(E(c) for c in b['categories'])}</p>
            <a class="bs-button bs-button-primary" href="books/{E(b['slug'])}.html">สำรวจหนังสือเล่มนี้ <span aria-hidden="true">↗</span></a>
          </div>
        </section>'''
    cards = []
    for number, b in enumerate(books, 1):
        search = " ".join([b["title"], b["titleThai"], b["author"], b["editor"], *b.get("searchAliases", []), *b["categories"]])
        title = f'<h3 class="bs-book-title" lang="en">{E(b["title"])}</h3>'
        link = f'books/{b["slug"]}.html'
        visual = cover(b, lazy=True)
        if b["status"] == "ready":
            visual = f'<a href="{link}" aria-label="สำรวจ {E(b["title"])}">{visual}</a>'
            title = f'<a href="{link}">{title}</a>'
        cards.append(f'''<article class="bs-card" data-book data-search="{E(search)}" data-categories="{E(json.dumps(b['categories'], ensure_ascii=False))}">
          <div class="bs-card-art">{visual}<span class="bs-card-number">{number:02d}</span></div>
          <div class="bs-card-meta"><span class="bs-status">{STATUS[b['status']]}</span><span>{b['readingMinutes']} นาที</span></div>{title}<p class="bs-author">{E(b['author'])}</p><p>{E(b['shortDescription'])}</p><p class="bs-categories">{' · '.join(E(c) for c in b['categories'])}</p>
        </article>''')
    filters = ''.join(f'<button type="button" data-category="{E(c)}" aria-pressed="false">{E(c)}</button>' for c in catalog["categories"])
    body = f'''<header class="bs-intro"><div><p class="bs-eyebrow">MOATRICES / THE READING ROOM</p><h1 lang="en">Bookshelf<span>.</span></h1></div><p class="bs-intro-copy">อ่านให้กว้าง คิดให้รอบ<br><span>หนังสือว่าด้วยธุรกิจ การลงทุน และการตัดสินใจ<br>เลือกเล่มที่ช่วยต่อยอดคำถามของคุณ</span></p></header>
      {feature}
      <section id="shelf" class="bs-shelf" aria-labelledby="shelf-title"><div class="bs-section-heading"><div><p class="bs-eyebrow">THE COLLECTION</p><h2 id="shelf-title">บนชั้นหนังสือ</h2></div><span>{len(books):02d} เล่ม · ค่อย ๆ เติมทีละความคิด</span></div>
        <div class="bs-controls" hidden><label class="bs-search-label" for="book-search">ค้นหาหนังสือ</label><input id="book-search" type="search" placeholder="ชื่อไทย / อังกฤษ ผู้เขียน หรือหมวดหมู่" autocomplete="off"><div class="bs-filters" role="group" aria-label="กรองตามหมวดหมู่"><button type="button" data-category="" aria-pressed="true">ทั้งหมด</button>{filters}</div><p class="bs-results" role="status" aria-live="polite" aria-atomic="true"></p></div>
        <noscript><p class="bs-noscript">แสดงหนังสือทั้งหมด · เปิดอ่านแต่ละเล่มได้จากปกและชื่อหนังสือ</p></noscript>
        <div class="bs-grid">{''.join(cards)}</div>
        <div class="bs-empty" hidden><span class="bs-eyebrow">NO MATCHES YET</span><h3>ยังไม่พบเล่มที่ตรงกับคำค้น</h3><p>ลองชื่อผู้เขียน คำที่สั้นลง หรือกลับมาดูหนังสือทั้งหมด</p><button type="button" class="bs-button" data-clear-filters>ล้างตัวกรอง</button></div>
      </section>
      <aside class="bs-closing"><span class="bs-eyebrow">A NOTE ON THIS SHELF</span><p>เริ่มจากคำถาม<br>แล้วให้หนังสือช่วยเปิดมุมมอง</p><span>บทสรุปแต่ละเล่มคัดแนวคิด ตัวอย่าง และข้อควรระวัง<br>เพื่อช่วยตัดสินใจก่อนเปิดอ่านฉบับเต็ม</span><a href="reading.html">เปิดคลังไว้อ่าน <span aria-hidden="true">↗</span></a></aside>'''
    schema = [{"@type": "CollectionPage", "name": "Bookshelf — Moatrices", "url": BASE_URL + "/books.html", "inLanguage": "th", "mainEntity": {"@type": "ItemList", "itemListElement": [{"@type": "ListItem", "position": i, "url": BASE_URL + "/books/" + b["slug"] + ".html", "name": b["title"]} for i, b in enumerate([b for b in books if b["status"] == "ready"], 1)]}}, breadcrumb_schema()]
    return shell("Bookshelf · อ่านให้กว้าง คิดให้รอบ", "หนังสือด้านธุรกิจ การลงทุน การตัดสินใจ และ Mental Models พร้อมบทสรุปที่ช่วยเลือกว่าจะอ่านเล่มไหนต่อ", "books.html", body, schema)


def detail(b):
    purchases = []
    for p in b["purchaseLinks"]:
        content = f'<span><strong>{E(p["store"])}</strong><small>{E(p["format"])}</small></span>'
        if p.get("url"):
            purchases.append(f'<a href="{E(p["url"])}" target="_blank" rel="noopener noreferrer{" sponsored" if p.get("affiliate") else ""}">{content}<span aria-hidden="true">↗</span><span class="bs-sr">เปิดเว็บไซต์ร้านค้าในแท็บใหม่</span></a>')
        else:
            purchases.append(f'<div class="bs-purchase-pending">{content}<small>ลิงก์ซื้อกำลังตรวจสอบ</small></div>')
    verified = max((p.get("verifiedAt", "") for p in b["purchaseLinks"]), default="")
    disclosure = f'<p class="bs-small">{E(b["affiliateDisclosure"])}</p>' if b["affiliateDisclosure"] else ''
    sections = ''.join(f'<section id="{E(s["id"])}"><p class="bs-eyebrow">01 / THE QUESTION</p><h2>{E(s["title"])}</h2>{paragraphs(s["paragraphs"])}</section>' for s in b["summarySections"])
    ideas = ''.join(f'<section class="bs-idea"><span class="bs-idea-index">{i:02d}</span><div><h3><span lang="en">{E(idea["english"])}</span>{E(idea["thai"])}</h3>{paragraphs(idea["paragraphs"])}<div class="bs-example"><span class="bs-eyebrow">ลองใช้กับธุรกิจ · MOATRICES</span><p>{E(idea["example"])}</p></div></div></section>' for i, idea in enumerate(b["keyIdeas"], 1))
    suitable = ''.join(f'<li>{E(item)}</li>' for item in b["suitableFor"])
    order = ''.join(f'<li><h3>{E(item["title"])}</h3><p>{E(item["text"])}</p><a href="../{E(item["href"])}">อ่านต่อในบทความเดิม ↗</a></li>' for item in b["readingOrder"])
    related = ''.join(f'<a href="../{E(link["href"])}"><span><strong>{E(link["title"])}</strong><small>{E(link["description"])}</small></span><span aria-hidden="true">↗</span></a>' for link in b["relatedLinks"])
    sources = ''.join(f'<li><a href="{E(link["url"] if link["url"].startswith("https://") else "../" + link["url"])}">{E(link["title"])}</a></li>' for link in b["sourceLinks"])
    questions = ''.join(f'<li>{E(q)}</li>' for q in b["applicationQuestions"])
    toc = ''.join(f'<a href="#{key}">{label}</a>' for key, label in [("question", "เล่มนี้ตอบอะไร"), ("one-line", "สรุปหนึ่งประโยค"), ("key-ideas", "5 แนวคิดสำคัญ"), ("suitable", "เหมาะกับใคร"), ("reading-order", "ควรอ่านอย่างไร"), ("synthesis", "สังเคราะห์แนวคิด"), ("related", "อ่านต่อใน Moatrices"), ("questions", "คำถามนำไปใช้"), ("sources", "ข้อมูลและแหล่งอ้างอิง")])
    date = datetime.date.fromisoformat(b["updatedAt"]).strftime("%d/%m/%Y")
    body = f'''<nav class="bs-breadcrumb" aria-label="เส้นทางหน้า"><a href="../index.html">Moatrices</a><span>/</span><a href="../books.html">Bookshelf</a><span>/</span><span aria-current="page">{E(b['title'])}</span></nav>
      <div class="bs-detail-layout">
        <figure class="bs-detail-art"><div class="bs-stage">{cover(b, '../')}</div><figcaption class="bs-sr">ปกฉบับปี {b['year']} · ตีพิมพ์ครั้งแรก {b['firstPublished']}</figcaption></figure>
        <div class="bs-detail-content">
        <header class="bs-detail-copy" id="book-intro"><h1 class="bs-book-title" lang="en">{E(b.get('fullTitle', b['title']))}</h1><p class="bs-author" lang="en">Edited by {E(b['editor'])}</p>
          <div class="bs-actions"><a class="bs-button bs-button-primary" href="#summary">อ่านบทสรุป</a><a class="bs-button bs-full-article" href="../{E(b['fullArticle'])}">อ่านบทความฉบับเต็ม {b['fullArticleMinutes']} นาที</a></div>
          <div class="bs-book-intro"><h2 class="bs-intro-heading">หนังสือเล่มนี้เกี่ยวกับอะไร</h2>{paragraphs(b.get('intro', [b['shortDescription']]))}</div>
          <a class="bs-buy-jump" href="#purchase">ดูตัวเลือกการซื้อ ↓</a>
        </header>
        <section class="bs-purchase" id="purchase" aria-labelledby="purchase-title"><div class="bs-section-heading"><h2 id="purchase-title">เลือกฉบับที่อยากอ่าน</h2><span>BUY THE BOOK</span></div><p class="bs-small">{E(b.get('purchaseNote', ''))}</p><div class="bs-purchase-rows">{''.join(purchases)}</div>{disclosure}<p class="bs-small">{"ลิงก์ปกติ ไม่มี affiliate · " if not b["affiliateDisclosure"] else ""}ตรวจสอบ {E(verified)}<br>ราคาและการจัดส่งดูได้จากเว็บไซต์ร้านค้า</p></section>
      <div class="bs-reading-slot"></div>
      <div class="bs-reading-layout" id="summary"><aside class="bs-toc"><p class="bs-eyebrow">READING GUIDE</p><h2>ในบทสรุปนี้</h2><nav aria-label="สารบัญบทสรุป">{toc}</nav><span class="bs-small">อ่านประมาณ {b['readingMinutes']} นาที</span></aside>
      <article class="bs-prose" aria-label="บทสรุปหนังสือ"><p class="bs-editor-note">เรียบเรียงโดย Moatrices จากบทความเดิม · เนื้อหาหลักอธิบายแนวคิดของ Munger ส่วนตัวอย่างการใช้และบทสังเคราะห์เป็นการเรียบเรียงของเว็บไซต์</p>
        {sections}
        <section class="bs-one-line" id="one-line"><p class="bs-eyebrow">02 / IN ONE SENTENCE</p><h2>สรุปในหนึ่งประโยค</h2><p>{E(b['oneLineSummary'])}</p><small>สรุปโดย Moatrices · ไม่ใช่คำพูดจากต้นฉบับ</small></section>
        <section id="key-ideas"><p class="bs-eyebrow">03 / FIVE IDEAS TO THINK WITH</p><h2>แนวคิดสำคัญ 5 ข้อ</h2>{ideas}</section>
        <section id="suitable"><p class="bs-eyebrow">04 / IS THIS FOR YOU?</p><h2>เหมาะกับใคร</h2><ul>{suitable}</ul><p>{E(b['readingCaveat'])}</p></section>
        <section id="reading-order"><p class="bs-eyebrow">05 / A WAY THROUGH THE BOOK</p><h2>ควรอ่านอย่างไร</h2><ol class="bs-reading-order">{order}</ol></section>
        <section id="synthesis"><p class="bs-eyebrow">06 / EDITORIAL SYNTHESIS</p><h2>แก่นที่เชื่อมทุกบทเข้าด้วยกัน</h2>{paragraphs(b['editorialSynthesis'])}</section>
        <section id="related"><p class="bs-eyebrow">07 / KEEP EXPLORING</p><h2>เชื่อมกับเนื้อหาใน Moatrices</h2><div class="bs-related">{related}</div></section>
        <section class="bs-questions" id="questions"><p class="bs-eyebrow">08 / TAKE IT INTO PRACTICE</p><h2>คำถามสำหรับนำไปใช้</h2><ol>{questions}</ol><a href="../portfolio.html?view=research">นำคำถามไปใช้ใน Research workspace ↗</a></section>
        <section id="sources"><p class="bs-eyebrow">09 / THE COLOPHON</p><h2>แหล่งอ้างอิงและข้อมูลหนังสือ</h2><dl class="bs-facts"><dt>ชื่อหนังสือ</dt><dd>{E(b['title'])}</dd><dt>ผู้เขียน</dt><dd>{E(b['author'])}</dd><dt>ผู้เรียบเรียง</dt><dd>{E(b['editor'])}</dd><dt>ฉบับที่อ้างถึง</dt><dd>{E(b['edition'])} · {b['year']}</dd><dt>สำนักพิมพ์</dt><dd>{E(b['publisher'])}</dd><dt>ISBN</dt><dd>{E(b['isbn'])}</dd><dt>อัปเดตบทสรุป</dt><dd><time datetime="{b['updatedAt']}">{date}</time></dd></dl><p class="bs-small">{E(b['editionNote'])}</p><ul class="bs-sources">{sources}</ul></section>
      </article></div></div></div>'''
    url = BASE_URL + "/books/" + b["slug"] + ".html"
    schema = [book_schema(b), {"@type": "Article", "headline": b["title"] + " — บทสรุป", "description": b["shortDescription"], "inLanguage": "th", "datePublished": b["updatedAt"], "dateModified": b["updatedAt"], "author": {"@type": "Organization", "name": "Moatrices"}, "about": {"@id": url + "#book"}, "mainEntityOfPage": url, "image": BASE_URL + "/" + b.get("shareImage", b["cover"]), "isBasedOn": BASE_URL + "/" + b["fullArticle"]}, breadcrumb_schema(b)]
    return shell(b["title"] + " · บทสรุปและวิธีอ่าน", b["shortDescription"], "books/" + b["slug"] + ".html", body, schema, "../", b)


def write_if_changed(path, text):
    path = ROOT / path
    path.parent.mkdir(parents=True, exist_ok=True)
    if not path.exists() or path.read_text() != text:
        path.write_text(text, encoding="utf-8")


def build_bookshelf():
    catalog = load_catalog()
    write_if_changed("books.html", collection(catalog))
    ready = [b for b in catalog["books"] if b["status"] == "ready"]
    for book in ready:
        write_if_changed("books/" + book["slug"] + ".html", detail(book))
    print(f"bookshelf   : {len(catalog['books'])} books, {len(ready)} summaries (static HTML)")
    return ready


if __name__ == "__main__":
    build_bookshelf()
