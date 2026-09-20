"""Reading → evidence → research/portfolio; activity and month summary smoke tests.

Run with Playwright: python app/test/reading-flow-browser.test.py --base CHECKOUT
Uses a fresh browser profile with synthetic records, never personal browser data.
"""
import argparse
from datetime import datetime, timezone
import importlib.util
import json
from pathlib import Path
import tempfile
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from threading import Thread
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[2]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--base', type=Path, default=ROOT)
args = parser.parse_args()
if (ROOT / 'preview.py').exists():
    spec = importlib.util.spec_from_file_location('preview', ROOT / 'preview.py')
    preview = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(preview)
    server = preview.preview_server(args.base)
else:
    class Quiet(SimpleHTTPRequestHandler):
        def log_message(self, *args): pass
    class Server(ThreadingHTTPServer):
        request_queue_size = 128
    server = Server(('127.0.0.1', 0), partial(Quiet, directory=str(args.base)))
Thread(target=server.serve_forever, daemon=True).start()
origin = f'http://127.0.0.1:{server.server_port}'
out = Path(tempfile.mkdtemp(prefix='moatrices-reading-check-'))


def check_layout(page, label, selector=None):
    for width in [320, 390, 768, 1440]:
        page.set_viewport_size({'width': width, 'height': 1000})
        page.evaluate('document.fonts.ready')
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), (label, width)
        if selector:
            assert page.locator(selector).evaluate('e => e.scrollWidth <= e.clientWidth + 1'), (label, selector, width)
    page.screenshot(path=str(out / f'{label}-desktop.png'), full_page=True)
    page.set_viewport_size({'width': 390, 'height': 844})
    page.screenshot(path=str(out / f'{label}-mobile.png'), full_page=True)
    print('PASS layout:', label, flush=True)


try:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1440, 'height': 1000}, reduced_motion='reduce', timezone_id='Asia/Bangkok', service_workers='block')
        context.route('**/*', lambda route: route.continue_() if route.request.url.startswith(origin) else route.abort())
        page = context.new_page()
        page.clock.set_fixed_time(datetime(2026, 9, 20, 5, tzinfo=timezone.utc))
        errors, failures = [], []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.on('response', lambda response: failures.append(response.url) if response.url.startswith(origin) and response.status >= 400 else None)

        page.goto(origin + '/index.html')
        expect(page.locator('.reading-home')).to_be_visible()
        assert page.locator('h1').count() == 1
        assert page.locator('.home-hero').evaluate("e => e.nextElementSibling.classList.contains('home-approach-section')")
        assert page.locator('.home-approach-section').evaluate("e => e.nextElementSibling.id === 'home-overview'")
        expect(page.locator('#home-reading-slot .reading-home')).to_have_count(1)
        assert page.locator('#home-explore').evaluate("e => e.nextElementSibling.id === 'home-reading-slot'")
        assert page.evaluate("document.querySelector('.home-hero').compareDocumentPosition(document.querySelector('.home-overview')) & Node.DOCUMENT_POSITION_FOLLOWING")
        lenses = [('price', 'reverse-dcf.html'), ('news', 'portfolio.html?view=research'),
                  ('financials', 'series-financials.html'), ('business', 'stocks.html'), ('moat', 'series-powers.html')]
        for theme in ['light', 'dark']:
            page.evaluate('(theme) => document.documentElement.dataset.theme = theme', theme)
            for width in [320, 390, 768, 1440]:
                page.set_viewport_size({'width': width, 'height': 1000})
                page.evaluate('document.fonts.ready')
                heights = []
                for index, (layer, href) in enumerate(lenses):
                    tab = page.locator('#approach-' + layer)
                    # Keep the target clear of the fixed header and mobile tabbar.
                    tab.evaluate("e => e.scrollIntoView({block: 'center', behavior: 'instant'})")
                    tab.click()
                    expect(tab).to_have_attribute('aria-selected', 'true')
                    expect(page.locator('.home-layer-band[aria-selected=true]')).to_have_count(1)
                    expect(page.locator('#approach-panel')).to_have_attribute('aria-labelledby', 'approach-' + layer)
                    expect(page.locator('.home-approach')).to_have_attribute('data-depth', str(index + 1))
                    expect(page.locator('.home-approach-link')).to_have_attribute('href', href)
                    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), (theme, width, layer)
                    assert tab.bounding_box()['height'] >= 44
                    heights.append(page.locator('.home-approach').bounding_box()['height'])
                assert max(heights) - min(heights) <= 1, (theme, width, heights)
                assert page.locator('.home-approach').evaluate("e => e.getAnimations({subtree: true}).length === 0"), 'reduced motion'
                if width in [390, 1440]:
                    page.locator('.home-approach').screenshot(path=str(out / f'approach-{theme}-{width}.png'))
        page.locator('#approach-moat').focus()
        page.keyboard.press('Home')
        expect(page.locator('#approach-price')).to_be_focused()
        page.keyboard.press('ArrowDown')
        expect(page.locator('#approach-news')).to_be_focused()
        page.keyboard.press('End')
        expect(page.locator('#approach-moat')).to_have_attribute('aria-selected', 'true')
        page.evaluate("document.documentElement.dataset.theme = 'light'")
        print('PASS approach placement, five lenses, links, keyboard, stable layout and reduced motion', flush=True)
        check_layout(page, 'home')
        for tab in ['frameworks', 'money', 'research']:
            page.locator('#home-tab-' + tab).click()
            expect(page.locator('#home-panel-' + tab)).to_be_visible()
        page.locator('#home-tab-research').focus()
        page.keyboard.press('ArrowRight')
        expect(page.locator('#home-tab-frameworks')).to_have_attribute('aria-selected', 'true')
        page.locator('#theme-toggle').click()
        expect(page.locator('html')).to_have_attribute('data-theme', 'dark')
        check_layout(page, 'home-dark')
        page.locator('#theme-toggle').click()

        page.goto(origin + '/articles/deep-dive-nvda.html')
        expect(page.locator('[data-bookmark]')).to_be_visible()
        page.locator('[data-bookmark]').click()
        page.reload()
        expect(page.locator('[data-bookmark]')).to_have_attribute('aria-pressed', 'true')
        quote = page.locator('#sec-2 + p').evaluate(r"e => { const r = document.createRange(); r.selectNodeContents(e); const s = getSelection(); s.removeAllRanges(); s.addRange(r); return s.toString().replace(/\s+/g, ' ').trim(); }")
        expect(page.locator('.reading-selection')).to_be_visible()
        page.locator('.reading-selection').click()
        expect(page.locator('dialog input[name=ticker]')).to_have_value('NVDA')
        page.locator('dialog textarea').fill('ทดสอบหลักฐาน: switching costs <script>throw 1</script>')
        page.locator('dialog select').select_option('supports')
        page.locator('dialog input[name=reviewOn]').fill('2026-09-20')
        page.locator('dialog button[type=submit]').click()
        expect(page.locator('dialog')).to_have_count(0)
        expect(page.locator('[data-notebook] span')).to_have_text('1')
        assert page.evaluate("CSS.highlights.get('reading-evidence').size") == 1
        check_layout(page, 'article')
        page.locator('#sec-5').scroll_into_view_if_needed()
        page.wait_for_timeout(900)
        record = page.evaluate("async () => (await import('/reading-store.js')).getArticle(location.pathname)")
        assert record['progress'] > 2, record
        page.goto(origin + '/reading.html?view=due&company=NVDA')
        expect(page.locator('.reading-note')).to_have_count(1)
        expect(page.locator('.reading-note blockquote')).to_have_text(quote)
        expect(page.locator('.reading-note-copy')).to_contain_text('<script>throw 1</script>')
        check_layout(page, 'reading-library')
        page.locator('#theme-toggle').click()
        check_layout(page, 'reading-library-dark')
        page.locator('#theme-toggle').click()
        with page.expect_download() as download:
            page.locator('[data-export]').click()
        exported = json.loads(Path(download.value.path()).read_text())
        assert len(exported['notes']) == 1 and exported['notes'][0]['quote'] == quote
        page.locator('[data-review-note]').click()
        expect(page.locator('.reading-note')).to_have_count(0)
        page.locator('[data-reading-view=notes]').click()
        expect(page.locator('.reading-note')).to_have_count(1)
        page.locator('[data-edit-note]').click()
        page.locator('dialog input[name=reviewOn]').fill('2026-09-21')
        page.locator('dialog button[type=submit]').click()
        expect(page.locator('.reading-note')).to_contain_text('ทดสอบหลักฐาน')
        page.locator('.reading-source').click()
        expect(page.locator('[data-notebook] span')).to_have_text('1')
        assert page.evaluate("CSS.highlights.get('reading-evidence').size") == 1
        page.goto(origin + '/index.html')
        expect(page.locator('.reading-home .reading-article-card')).to_have_count(1)
        page.locator('.reading-home .reading-article-card a').click()
        expect(page.locator('.reading-resume')).to_be_attached()
        page.wait_for_function('scrollY > 200')
        print('PASS bookmark, highlight, export, review and resume', flush=True)

        page.goto(origin + '/portfolio.html?view=research&ticker=NVDA')
        expect(page.locator('[data-reading-company=NVDA]')).to_be_visible()
        expect(page.locator('.reading-note-preview')).to_contain_text(quote)
        page.locator('[data-back]').click()
        page.locator('[data-layout=table]').click()
        expect(page.locator('.rx-watch-table tbody tr')).to_have_count(3)
        page.locator('[data-lens]').select_option('evidence')
        check_layout(page, 'research', '.app-research')
        page.locator('.rx-toolbar [data-scope=due]').click()
        expect(page.locator('.rx-section-head h2').first).to_have_text('Review queue')
        page.reload()
        expect(page.locator('.rx-toolbar [data-scope=due]')).to_have_attribute('aria-pressed', 'true')
        expect(page.locator('[data-layout=table]')).to_have_attribute('aria-pressed', 'true')
        page.evaluate("async () => { const s = await import('/app/js/core/storage.js'); s.save('pf.holdings', [{id:'test',tk:'NVDA',name:'NVIDIA',shares:2,price:100,cost:90}]); await s.flushStorage(); }")
        page.goto(origin + '/portfolio.html?book=personal&symbol=NVDA')
        expect(page.locator('[data-reading-company=NVDA]')).to_be_visible()
        expect(page.locator('.reading-note-preview')).to_contain_text(quote)
        check_layout(page, 'portfolio', '.app-living-thesis')
        print('PASS evidence links to research and personal portfolio', flush=True)

        page.goto(origin + '/smart-money.html')
        expect(page.locator('.sm-card')).to_have_count(16)
        page.locator('[data-list-view=changes]').click()
        assert page.locator('.sm-activity-row').count() > 0
        check_layout(page, 'smart-money', '.app-smart-money')
        page.locator('[data-activity-filter=reduced]').click()
        assert page.locator('.sm-activity-row').count() > 0
        assert page.locator('.sm-activity-row').count() == page.locator('.sm-activity-row .sm-reduced').count()
        page.locator('.sm-activity-row').first.click()
        expect(page.locator('.sm-detail')).to_be_visible()
        page.locator('.sm-back').click()
        expect(page.locator('[data-list-view=changes]')).to_have_attribute('aria-pressed', 'true')
        print('PASS activity filters and report navigation', flush=True)

        page.goto(origin + '/money.html')
        expect(page.locator('.mn-month-brief')).to_be_visible()
        page.evaluate("async () => { const s = await import('/app/js/core/storage.js'); s.save('money.entries',[{id:'salary',type:'in',amount:10000,cat:'Salary',date:'2026-09-01',split:{savings:20,invest:10}},{id:'food',type:'out',amount:3000,cat:'Food',date:'2026-09-15'},{id:'transport',type:'out',amount:500,cat:'Transport',date:'2026-09-20'}]); s.save('money.budgets',{Food:2500,Home:1000}); await s.flushStorage(); }")
        page.reload()
        expect(page.locator('.mn-brief-net')).to_contain_text('6,500')
        expect(page.locator('.mn-month-brief')).to_contain_text('Food เกินงบ')
        check_layout(page, 'money', '.app-money')
        page.locator('.mn-month-brief [data-action=budgets]').click()
        expect(page.locator('.mn-budget-grid')).to_be_visible()
        print('PASS monthly cash flow and budget navigation', flush=True)

        page.goto(origin + '/stocks.html')
        expect(page.locator('.reading-card-save').first).to_be_visible()
        check_layout(page, 'stock-library')
        page.goto(origin + '/articles.html')
        expect(page.locator('.reading-card-save').first).to_be_visible()
        check_layout(page, 'article-library')
        assert not errors, errors
        assert not failures, failures
        print('PASS no JavaScript exceptions or failed local resources', flush=True)
        browser.close()
finally:
    server.shutdown()
    print('Screenshots:', out, flush=True)
