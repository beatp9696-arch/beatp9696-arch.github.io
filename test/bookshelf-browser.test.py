"""Bookshelf behavior, accessibility, fallbacks, local links and responsive previews.
Run: python3 test/bookshelf-browser.test.py [--screenshots /path/to/output]
"""
import argparse
import json
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from threading import Thread
from urllib.parse import urlsplit, unquote
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
args = argparse.ArgumentParser()
args.add_argument('--screenshots', type=Path, default=Path('/private/tmp/bookshelf-previews') if Path('/private/tmp').exists() else Path('/tmp/bookshelf-previews'))
OUT = args.parse_args().screenshots
OUT.mkdir(parents=True, exist_ok=True)

class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass

server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Quiet, directory=str(ROOT)))
Thread(target=server.serve_forever, daemon=True).start()
origin = f'http://127.0.0.1:{server.server_port}'
routes = ['/books.html', '/books/poor-charlies-almanack.html']
errors = []

def fitted(page):
    result = page.evaluate('''() => ({width: innerWidth, scroll: document.documentElement.scrollWidth,
      outside: [...document.querySelectorAll('main *, .site-header *, .bs-reader-toolbar *, .bs-book-rail *, .bs-reader-dialog[open] *')].filter(e => {
        const r=e.getBoundingClientRect(); return r.width && (r.right>innerWidth+1 || r.left < -1);
      }).map(e => [e.tagName, e.className]).slice(0,8)})''')
    assert result['scroll'] <= result['width'], result
    assert not result['outside'], result

def local_links(page):
    for href in page.locator('main a[href]').evaluate_all('(items) => items.map(a => a.href)'):
        if not href.startswith(origin):
            continue
        url = urlsplit(href)
        target = ROOT / unquote(url.path).lstrip('/')
        assert target.is_file(), href
        if url.fragment:
            assert f'id="{url.fragment}"' in target.read_text(), href

try:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width':1440,'height':1000}, reduced_motion='reduce', service_workers='block')
        context.route('**/*', lambda route: route.continue_() if route.request.url.startswith(origin) else route.abort())
        page = context.new_page()
        page.on('pageerror', lambda error: errors.append(str(error)))
        for theme in ['dark', 'light']:
            page.goto(origin + routes[0])
            page.evaluate('(t) => localStorage.setItem("theme",t)', theme)
            for path in routes:
                for width in [320,390,768,1440]:
                    page.set_viewport_size({'width':width,'height':1000})
                    response = page.goto(origin + path, wait_until='networkidle')
                    assert response.status == 200
                    page.evaluate('document.fonts.ready')
                    fitted(page)
                    expect(page.locator('html')).to_have_attribute('data-theme', theme)
                    local_links(page)
                    for image in page.locator('main img:visible').all():
                        image.scroll_into_view_if_needed()
                        expect(image).to_have_js_property('complete', True)
                        assert image.evaluate('e => e.naturalWidth > 0')
                    assert page.locator('link[rel="canonical"]').count() == 1
                    for script in page.locator('script[type="application/ld+json"]').all():
                        json.loads(script.text_content())
                    page.evaluate('scrollTo(0,0)')
                    if width in [390,1440]:
                        page.emulate_media(reduced_motion='no-preference')
                        page.wait_for_timeout(400)
                        label = 'bookshelf' if path == routes[0] else 'book'
                        size = 'mobile' if width == 390 else 'desktop'
                        page.screenshot(path=str(OUT / f'{label}-{size}-{theme}.png'), full_page=False)
                        page.emulate_media(reduced_motion='reduce')
                    if path == routes[1]:
                        page.get_by_role('link', name='อ่านฉบับเต็ม', exact=True).click()
                        expect(page.locator('.bs-tendencies > li')).to_have_count(25)
                        expect(page.locator('.bs-talks > li')).to_have_count(11)
                        expect(page.locator('main a[href="../articles/poor-charlies-almanack.html"]')).to_have_count(0)
                        expect(page.locator('.bs-detail-art')).to_be_hidden()
                        expect(page.locator('.bs-reader-header h1')).to_be_visible()
                        assert page.locator('.bs-prose').bounding_box()['width'] <= 721
                        fitted(page)
                        if width in [390,1440]:
                            page.screenshot(path=str(OUT / f'book-reader-{size}-{theme}.png'), full_page=False)
                            page.locator('#key-ideas').evaluate("e => e.scrollIntoView({block: 'start', behavior: 'instant'})")
                            page.screenshot(path=str(OUT / f'book-headings-{size}-{theme}.png'), full_page=False)
                        page.get_by_role('link', name='กลับไปข้อมูลหนังสือ', exact=True).click()
                        expect(page.locator('.bs-detail-copy h1')).to_be_visible()
                        fitted(page)
        page.goto(origin + routes[0])
        search = page.get_by_role('searchbox', name='ค้นหาหนังสือ')
        for query in ['ชาร์ลี', 'Poor Charlie\'s', 'Munger', 'Peter', 'จิตวิทยา', 'Mental Models', 'CHARLIE']:
            search.fill(query)
            expect(page.locator('[data-book]:visible')).to_have_count(1)
        search.fill('หนังสือที่ไม่มี')
        expect(page.locator('.bs-empty')).to_be_visible()
        page.get_by_role('button', name='ล้างตัวกรอง').click()
        expect(search).to_be_focused()
        page.get_by_role('button', name='ธุรกิจและคูเมือง', exact=True).click()
        expect(page.locator('.bs-empty')).to_be_visible()
        page.get_by_role('button', name='ล้างตัวกรอง').click()
        page.get_by_role('button', name='การตัดสินใจ', exact=True).focus()
        page.keyboard.press('Enter')
        expect(page.get_by_role('button', name='การตัดสินใจ', exact=True)).to_have_attribute('aria-pressed','true')
        assert page.evaluate('getComputedStyle(document.activeElement).outlineStyle') != 'none'
        expect(page.locator('[data-book]:visible')).to_have_count(1)
        assert page.locator('.bs-volume').first.evaluate('e => getComputedStyle(e).transform') == 'none'
        page.goto(origin + routes[1])
        # Default to charcoal; ignore the retired paper theme and share the site's preference.
        page.evaluate('localStorage.setItem("moatrices.book-theme", "light"); localStorage.removeItem("theme")')
        page.reload()
        expect(page.locator('html')).to_have_attribute('data-theme', 'dark')
        assert page.evaluate('getComputedStyle(document.body).backgroundColor') == 'rgb(16, 18, 20)'
        page.get_by_role('button', name='สลับโหมดสว่าง/มืด').click()
        expect(page.locator('html')).to_have_attribute('data-theme', 'light')
        assert page.evaluate('localStorage.getItem("theme")') == 'light'
        page.reload()
        expect(page.locator('html')).to_have_attribute('data-theme', 'light')
        page.get_by_role('button', name='สลับโหมดสว่าง/มืด').click()
        page.evaluate('scrollTo(0, 250)')
        art_top = page.locator('.bs-detail-art').bounding_box()['y']
        page.evaluate('scrollTo(0, 500)')
        assert abs(page.locator('.bs-detail-art').bounding_box()['y'] - art_top) < 2
        page.get_by_role('link', name='อ่านฉบับเต็ม', exact=False).first.click()
        assert page.url.endswith('#summary')
        assert 'reader=1' in page.url
        page.go_back()
        expect(page.locator('.bs-detail-art')).to_be_visible()
        expect(page.locator('.bs-detail-copy h1')).to_be_visible()
        page.go_forward()
        expect(page.locator('.bs-reader-header h1')).to_be_visible()
        page.get_by_role('button', name='ปรับการอ่าน', exact=True).click()
        settings = page.get_by_role('dialog', name='ปรับการอ่าน', exact=True)
        settings.get_by_role('radio', name='24', exact=True).check()
        settings.get_by_role('radio', name='โปร่ง', exact=True).check()
        assert page.locator('.bs-prose').evaluate('e => getComputedStyle(e).fontSize') == '24px'
        assert float(page.locator('.bs-prose').evaluate('e => getComputedStyle(e).lineHeight').removesuffix('px')) > 52
        page.keyboard.press('Escape')
        expect(page.get_by_role('button', name='ปรับการอ่าน', exact=True)).to_be_focused()
        page.reload()
        expect(page.locator('.bs-reader-header h1')).to_be_visible()
        assert page.locator('.bs-prose').evaluate('e => getComputedStyle(e).fontSize') == '24px'
        for width in [320,390,768,1440]:
            page.set_viewport_size({'width':width,'height':1000})
            fitted(page)
        page.get_by_role('button', name='ปรับการอ่าน', exact=True).click()
        settings.get_by_role('button', name='คืนค่าเริ่มต้น').click()
        page.keyboard.press('Escape')
        assert page.locator('.bs-prose').evaluate('e => getComputedStyle(e).fontSize') == '20px'
        # Next links and browser back/forward keep the reader layout and correct chapter.
        page.locator('#question .bs-next-section a').click()
        assert page.url.endswith('#key-ideas')
        page.go_back()
        assert page.url.endswith('#summary')
        page.go_forward()
        assert page.url.endswith('#key-ideas')
        for link in page.locator('.bs-rail-index .bs-chapter-link').all():
            link.click()
            target = page.locator(link.get_attribute('href'))
            top = target.bounding_box()['y']
            assert top >= 70 and top < 200, (link.text_content(), top)
            expect(link).to_have_attribute('aria-current', 'location')
        page.locator('.bs-rail-index a[href="#summary"]').click()
        # Adjusting type midway through a chapter keeps the same text on screen.
        page.locator('.bs-rail-index a[href="#synthesis"]').click()
        before_adjustment = page.locator('#synthesis > h2').bounding_box()['y']
        page.get_by_role('button', name='ปรับการอ่าน', exact=True).click()
        settings.get_by_role('radio', name='22', exact=True).check()
        settings.get_by_role('radio', name='โปร่ง', exact=True).check()
        page.keyboard.press('Escape')
        assert abs(page.locator('#synthesis > h2').bounding_box()['y'] - before_adjustment) < 3
        page.get_by_role('button', name='＋ ไว้อ่าน', exact=True).click()
        expect(page.locator('[data-bookmark]')).to_have_attribute('aria-pressed','true')
        page.reload()
        expect(page.locator('[data-bookmark]')).to_have_attribute('aria-pressed','true')
        page.wait_for_timeout(750)  # Reading's deliberate post-load scroll-restoration guard.
        page.locator('#synthesis').scroll_into_view_if_needed()
        page.wait_for_timeout(800)
        saved = page.evaluate('JSON.parse(localStorage.getItem("moatrices.reading.v1.article./books/poor-charlies-almanack.html"))')
        assert saved['progress'] > 0 and saved['saved'] and saved['sourceDate'] == '2026-09-21', saved
        page.goto(origin + '/reading.html?view=saved')
        expect(page.locator('.reading-article-card a[href*="/books/"]')).to_have_count(1)
        page.locator('.reading-article-card a[href*="/books/"]').click()
        expect(page.locator('.reading-resume')).to_be_attached()
        expect(page.locator('.bs-reader-header')).to_be_visible()
        page.get_by_role('link', name='กลับไปข้อมูลหนังสือ', exact=True).click()
        page.get_by_role('link', name='ดูตัวเลือกการซื้อ').click()
        assert page.url.endswith('#purchase')
        purchases = page.locator('.bs-purchase-rows a')
        assert purchases.count() == 3
        for link in purchases.all():
            assert link.get_attribute('href').startswith('https://')
            assert 'noopener' in link.get_attribute('rel')
        # Check the actual outgoing target without depending on third-party uptime.
        context.route('https://buy.stripe.com/4gw7ut4VjaK0aFG9AA', lambda route: route.fulfill(status=200, content_type='text/html', body='<title>Verified outgoing destination</title>'))
        with page.expect_popup() as popup_info:
            purchases.first.click()
        popup = popup_info.value
        popup.wait_for_load_state('domcontentloaded')
        assert popup.url == purchases.first.get_attribute('href')
        popup.close()
        page.set_viewport_size({'width':390,'height':1000})
        page.evaluate('scrollTo(0,0)')
        page.get_by_role('button', name='เปิดเมนู', exact=True).click()
        expect(page.locator('.nav-drawer a[href="../books.html"]')).to_be_visible()
        page.keyboard.press('Escape')
        expect(page.get_by_role('button', name='เปิดเมนู', exact=True)).to_be_focused()
        # Mobile contents is a modal with keyboard focus, active chapter and normal links.
        page.get_by_role('button', name='สารบัญ', exact=True).click()
        toc_dialog = page.get_by_role('dialog', name='สารบัญหนังสือ', exact=True)
        expect(toc_dialog).to_be_visible()
        fitted(page)
        page.keyboard.press('Escape')
        expect(page.get_by_role('button', name='สารบัญ', exact=True)).to_be_focused()
        page.get_by_role('button', name='สารบัญ', exact=True).click()
        toc_dialog.locator('a[href="#key-ideas"]').click()
        expect(toc_dialog).not_to_be_visible()
        expect(page.locator('.bs-reader-toolbar')).to_be_visible()
        expect(page.locator('#key-ideas > h2')).to_be_focused()
        page.get_by_role('button', name='สารบัญ', exact=True).click()
        expect(toc_dialog.locator('a[href="#key-ideas"]')).to_have_attribute('aria-current', 'location')
        toc_dialog.get_by_role('button', name='ปิดสารบัญ', exact=True).click()
        page.get_by_role('button', name='ปรับการอ่าน', exact=True).click()
        fitted(page)
        page.keyboard.press('Escape')
        page.goto(origin + '/index.html')
        expect(page.locator('.home-bookshelf-entry')).to_have_attribute('href','books.html')
        for width in [320,390,768,1440]:
            page.set_viewport_size({'width':width,'height':1000})
            fitted(page)
        # Images fail: title fallback remains accessible and cannot shift the layout.
        context.route('**/img/books/*', lambda route: route.abort())
        page.goto(origin + routes[1])
        expect(page.locator('.bs-cover-face img')).to_be_hidden()
        expect(page.locator('.bs-cover-face')).to_have_attribute('role','img')
        expect(page.locator('.bs-cover-fallback')).to_be_visible()
        fitted(page)
        # No scripts: static content, book links, sources and navigation still work.
        nojs = browser.new_context(java_script_enabled=False, viewport={'width':320,'height':900})
        nojs.route('**/*', lambda route: route.continue_() if route.request.url.startswith(origin) else route.abort())
        static = nojs.new_page()
        for path in routes:
            static.goto(origin + path)
            expect(static.locator('main h1')).to_be_visible()
            local_links(static)
            fitted(static)
        static.goto(origin + routes[0])
        expect(static.locator('.bs-controls')).to_be_hidden()
        expect(static.locator('[data-book]')).to_be_visible()
        static.locator('.bs-card h3').click()
        expect(static.locator('#key-ideas')).to_be_attached()
        static.locator('#question .bs-next-section a').click()
        assert static.url.endswith('#key-ideas')
        # Reader still works with blocked browser storage and a direct chapter URL.
        blocked = browser.new_context(viewport={'width':320,'height':900}, reduced_motion='reduce')
        blocked.route('**/*', lambda route: route.continue_() if route.request.url.startswith(origin) else route.abort())
        blocked.add_init_script("Storage.prototype.getItem = Storage.prototype.setItem = () => { throw new Error('storage blocked'); }")
        restricted = blocked.new_page()
        restricted.on('pageerror', lambda error: errors.append(str(error)))
        restricted.goto(origin + routes[1] + '#key-ideas')
        expect(restricted.locator('.bs-reader-header')).to_be_visible()
        restricted.get_by_role('button', name='ปรับการอ่าน', exact=True).click()
        restricted.get_by_role('radio', name='22', exact=True).check()
        restricted.keyboard.press('Escape')
        assert restricted.locator('.bs-prose').evaluate('e => getComputedStyle(e).fontSize') == '22px'
        fitted(restricted)
        # Incoming links from the previous short edition still open the full reader.
        for old, current in [('one-line', 'question'), ('suitable', 'reading-order'), ('related', 'sources')]:
            restricted.goto(origin + routes[1] + '#' + old)
            expect(restricted.locator('.bs-reader-toolbar')).to_be_visible()
            assert restricted.url.endswith('#' + current), restricted.url
            expect(restricted.locator(f'.bs-toc-dialog a[href="#{current}"]')).to_have_attribute('aria-current', 'location')
        restricted.goto(origin + routes[1] + '#tendency-25')
        expect(restricted.locator('.bs-reader-toolbar')).to_be_visible()
        assert restricted.locator('#tendency-25').bounding_box()['y'] >= 120
        expect(restricted.locator('.bs-toc-dialog a[href="#misjudgment"]')).to_have_attribute('aria-current', 'location')
        assert not errors, errors
        browser.close()
    print('Bookshelf: 16 theme/viewport checks; reader layout/settings, labelled TOC, next chapters, history, mobile dialogs, reading persistence, search, links, keyboard, reduced motion, failed images, blocked storage and no-JS passed.')
    print(f'Previews: {OUT}')
finally:
    server.shutdown()
