"""Public home navigation, dated research, market strip and responsive layouts."""
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from threading import Thread
import json
import sys
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
OUT = Path('/private/tmp')
LIVE = '--live' in sys.argv

class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass

class Server(ThreadingHTTPServer):
    request_queue_size = 128

server = Server(('127.0.0.1', 0), partial(Quiet, directory=str(ROOT)))
Thread(target=server.serve_forever, daemon=True).start()
origin = f'http://127.0.0.1:{server.server_port}'

def fitted(page):
    page.evaluate('() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))')
    overflow = page.evaluate('''() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth,
      outside: [...document.querySelectorAll('main *, .site-header *, .market-clock *')]
        .filter(e => e.getBoundingClientRect().right > innerWidth + 1 && e.getBoundingClientRect().width)
        .map(e => [e.tagName, e.className]).slice(0, 12) })''')
    assert overflow['scroll'] <= overflow['width'], overflow

def approach_position(page):
    card = page.locator('.home-approach')
    expect(card).to_have_count(1)
    placement = card.evaluate('''e => {
      const compact = matchMedia('(max-width: 820px)').matches;
      const anchor = document.querySelector(compact ? '.home-coverage' : '.home-workspace');
      const next = document.querySelector(compact ? '.home-latest' : '.home-toolkit');
      const a = anchor.getBoundingClientRect(), c = e.getBoundingClientRect(), n = next.getBoundingClientRect();
      return { correctOrder: anchor.nextElementSibling === e && e.nextElementSibling === next,
        sameColumn: Math.abs(c.left - a.left) < 1,
        above: c.top >= a.bottom, below: c.bottom <= n.top };
    }''')
    assert all(placement.values()), (page.viewport_size, placement)

try:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1440, 'height': 1000}, reduced_motion='reduce', service_workers='block')
        if not LIVE:
            context.route('**/*', lambda r: r.continue_() if r.request.url.startswith(origin) else r.abort())
        # A saved light reading preference must not change the requested home theme.
        context.add_init_script("localStorage.setItem('theme', 'light')")
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(origin + '/index.html', wait_until='domcontentloaded')
        expect(page.locator('.home-company')).to_have_count(3)
        page.evaluate('document.fonts.ready')
        expect(page.locator('.site-header .moa-brand-section')).to_have_text('RESEARCH')
        assert page.evaluate('getComputedStyle(document.body).backgroundColor') == 'rgb(16, 18, 20)'
        assert page.evaluate('localStorage.getItem("theme")') == 'light'
        expect(page.locator('#theme-toggle')).to_have_count(0)
        expect(page.locator('#clk-bkk')).to_contain_text(':')
        expect(page.locator('#clk-ny')).to_contain_text(':')
        assert page.locator('.market-clock').evaluate('e => e.nextElementSibling.id') == 'tv-ticker'
        if not LIVE:
            ticker = page.locator('#tv-ticker script').text_content()
            config = json.loads(ticker)
            assert config['colorTheme'] == 'dark'
            assert config['isTransparent'] is False
            for symbol in ['FOREXCOM:DJI', 'FOREXCOM:SPXUSD', 'FOREXCOM:NSXUSD', 'TVC:GOLD', 'TVC:USOIL', 'NASDAQ:AAPL', 'NASDAQ:NVDA', 'NASDAQ:META']:
                assert any(s['proName'] == symbol for s in config['symbols']), symbol
        if LIVE:
            expect(page.locator('#tv-ticker iframe')).to_be_visible(timeout=25000)
            page.wait_for_timeout(2500)
        expect(page.locator('.home-layer-label')).to_have_text(['ราคา', 'ข่าว', 'งบการเงิน', 'โครงสร้างธุรกิจ', 'คูเมือง'])
        expect(page.locator('.home-approach-caption')).to_have_text('อะไรปกป้องกำไรระยะยาว')
        for width in [320, 390, 768, 820, 821, 1024, 1440]:
            page.set_viewport_size({'width': width, 'height': 1000})
            fitted(page)
            approach_position(page)
            card_height = page.locator('.home-approach').bounding_box()['height']
            for label in ['ราคา', 'ข่าว', 'งบการเงิน', 'โครงสร้างธุรกิจ', 'คูเมือง']:
                layer = page.get_by_role('tab', name=label, exact=True)
                layer.click()
                expect(layer).to_have_attribute('aria-selected', 'true')
                expect(page.get_by_role('tabpanel', name=label, exact=True)).to_be_visible()
                assert abs(page.locator('.home-approach').bounding_box()['height'] - card_height) <= 1
                assert layer.bounding_box()['height'] >= 44
                if label == 'ข่าว':
                    expect(page.get_by_role('tabpanel', name=label, exact=True)).to_contain_text('Macro')
                    expect(page.get_by_role('tabpanel', name=label, exact=True)).to_contain_text('Micro')
                if label == 'งบการเงิน':
                    expect(page.get_by_role('tabpanel', name=label, exact=True)).to_contain_text('Income Statement')
                    expect(page.get_by_role('tabpanel', name=label, exact=True)).to_contain_text('Balance Sheet')
                    expect(page.get_by_role('tabpanel', name=label, exact=True)).to_contain_text('Cash Flow Statement')
                if label == 'โครงสร้างธุรกิจ':
                    expect(page.get_by_role('tabpanel', name=label, exact=True)).to_contain_text('รายได้')
                    expect(page.get_by_role('tabpanel', name=label, exact=True)).to_contain_text('กำไรต่อหน่วย')
                if label == 'คูเมือง':
                    expect(page.get_by_role('tabpanel', name=label, exact=True)).to_contain_text('ปกป้องกำไรระยะยาว')
                    expect(page.get_by_role('tabpanel', name=label, exact=True)).to_contain_text('เลียนแบบยาก')
            page.evaluate('scrollTo(0, 0)')
        page.evaluate("async () => { const images = [...document.querySelectorAll('img')]; for (const img of images) img.loading = 'eager'; await Promise.all(images.map(img => img.decode().catch(() => {}))); }")
        page.screenshot(path=str(OUT / 'moatrices-home-desktop.png'))
        page.screenshot(path=str(OUT / 'moatrices-home-desktop-full.png'), full_page=True)
        page.set_viewport_size({'width': 390, 'height': 844})
        page.screenshot(path=str(OUT / 'moatrices-home-mobile.png'))
        page.screenshot(path=str(OUT / 'moatrices-home-mobile-full.png'), full_page=True)
        page.locator('.home-company').last.focus()
        page.keyboard.press('Tab')
        expect(page.get_by_role('tab', name='คูเมือง', exact=True)).to_be_focused()
        page.keyboard.press('Home')
        expect(page.get_by_role('tab', name='ราคา', exact=True)).to_be_focused()
        page.keyboard.press('ArrowDown')
        expect(page.get_by_role('tabpanel', name='ข่าว', exact=True)).to_be_visible()
        page.keyboard.press('ArrowUp')
        expect(page.get_by_role('tabpanel', name='ราคา', exact=True)).to_be_visible()
        page.keyboard.press('End')
        page.keyboard.press('Tab')
        expect(page.get_by_role('tabpanel', name='คูเมือง', exact=True)).to_be_focused()
        page.keyboard.press('Tab')
        approach_link = page.get_by_role('link', name='สำรวจ 7 Powers')
        expect(approach_link).to_be_focused()
        approach_link.click()
        assert page.url.endswith('/series-powers.html')
        page.go_back()
        expect(page.locator('.home-company')).to_have_count(3)
        # Browse every retained collection, including the previously featured tools.
        for summary in page.locator('.home-collection summary').all():
            summary.click()
        expect(page.locator('.home-collection[open]')).to_have_count(2)
        for width in [320, 390, 768, 1440]:
            page.set_viewport_size({'width': width, 'height': 1000})
            fitted(page)
        assert page.locator('a[href="moat-city.html"]').count() >= 1
        assert page.locator('a[href="moatrices-buffett-munger.pdf"]').count() == 1
        search = page.get_by_role('searchbox', name='ค้นหาบริษัทใน Research')
        search.fill('tsmc')
        expect(page.locator('.home-company')).to_have_count(1)
        expect(page.locator('.home-company')).to_contain_text('TSMC')
        search.fill('<img src=x onerror=alert(1)>')
        expect(page.locator('.home-company')).to_have_count(0)
        page.locator('[data-clear-search]').click()
        expect(page.locator('.home-company')).to_have_count(3)
        expect(search).to_be_focused()
        page.locator('.home-company').filter(has_text='Synopsys').click()
        expect(page.locator('.rx-detail-head h1')).to_have_text('Synopsys')
        page.locator('[data-follow="SNPS"]').click()
        expect(page.locator('[data-follow="SNPS"]')).to_have_attribute('aria-pressed', 'true')
        page.reload()
        expect(page.locator('[data-follow="SNPS"]')).to_have_attribute('aria-pressed', 'true')
        page.locator('.rx-note textarea').fill('A note saved before reloading.')
        page.locator('[data-note] button[type="submit"]').click()
        expect(page.locator('.rx-note-status')).to_have_text('Saved on this device')
        page.reload()
        expect(page.locator('.rx-note textarea')).to_have_value('A note saved before reloading.')
        page.goto(origin + '/index.html')
        page.get_by_role('link', name='Moat Matrix').click()
        expect(page.locator('.rx-matrix')).to_be_visible()
        page.locator('[data-view="earnings"]').click()
        page.reload()
        expect(page.locator('.rx-earnings-table')).to_be_visible()
        page.goto(origin + '/index.html')
        page.get_by_role('link', name='Earnings comparison').click()
        expect(page.locator('.rx-earnings-table')).to_be_visible()
        page.goto(origin + '/portfolio.html?view=research&researchView=invalid')
        expect(page.locator('.rx-card')).to_have_count(3)
        page.locator('.rx-summary-filter').click()
        expect(page.locator('.rx-summary-filter')).to_have_attribute('aria-pressed', 'true')
        expect(page.locator('.rx-section-head').first).to_contain_text('Review due')
        # Mobile menu and global search still work on the redesigned public home.
        page.goto(origin + '/index.html')
        page.set_viewport_size({'width': 390, 'height': 844})
        page.locator('.hamburger-btn').click()
        expect(page.locator('.nav-drawer')).to_be_visible()
        page.keyboard.press('Escape')
        expect(page.locator('#clk-date')).to_be_visible()
        expect(page.locator('.home-sidebar #tars-buddy')).to_be_visible()
        assert not errors, errors
        context.close()
        failed = browser.new_context(service_workers='block')
        failed.route('**/app/data/research.json', lambda r: r.fulfill(status=503, body='Unavailable'))
        page = failed.new_page()
        page.goto(origin + '/index.html')
        expect(page.locator('[data-retry-research]')).to_be_visible()
        failed.unroute('**/app/data/research.json')
        page.locator('[data-retry-research]').click()
        expect(page.locator('.home-company')).to_have_count(3)
        failed.close()
        # The introduction runs only on first visibility; touch and reduced motion can stop it.
        motion = browser.new_context(viewport={'width': 390, 'height': 844}, has_touch=True, reduced_motion='no-preference', service_workers='block')
        motion.route('**/*', lambda r: r.continue_() if r.request.url.startswith(origin) else r.abort())
        page = motion.new_page()
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(origin + '/index.html')
        expect(page.locator('.home-company')).to_have_count(3)
        card = page.locator('.home-approach')
        expect(card).to_have_attribute('data-intro', 'pending')
        diagram = page.locator('.home-approach-diagram')
        diagram.scroll_into_view_if_needed()
        expect(card).to_have_attribute('data-intro', 'playing')
        assert page.locator('.home-approach-dot').evaluate('e => e.getAnimations().length') == 1
        expect(card).to_have_attribute('data-intro', 'done', timeout=5000)
        page.evaluate('scrollTo(0, 0)')
        diagram.scroll_into_view_if_needed()
        expect(card).to_have_attribute('data-intro', 'done')
        assert page.locator('.home-approach-dot').evaluate('e => e.getAnimations().length') == 0
        page.reload()
        diagram.scroll_into_view_if_needed()
        expect(card).to_have_attribute('data-intro', 'playing')
        page.get_by_role('tab', name='งบการเงิน', exact=True).tap()
        expect(page.get_by_role('tabpanel', name='งบการเงิน', exact=True)).to_contain_text('กระแสเงินสด')
        expect(card).to_have_attribute('data-intro', 'done')
        assert page.locator('.home-approach-dot').evaluate('e => e.getAnimations().length') == 0
        page.get_by_role('tab', name='งบการเงิน', exact=True).focus()
        page.set_viewport_size({'width': 1440, 'height': 1000})
        expect(page.get_by_role('tab', name='งบการเงิน', exact=True)).to_be_focused()
        expect(page.get_by_role('tabpanel', name='งบการเงิน', exact=True)).to_be_visible()
        page.reload()
        diagram.scroll_into_view_if_needed()
        expect(card).to_have_attribute('data-intro', 'playing')
        page.emulate_media(reduced_motion='reduce')
        expect(card).to_have_attribute('data-intro', 'done')
        assert card.evaluate('e => e.getAnimations({subtree:true}).length') == 0
        page.reload()
        diagram.scroll_into_view_if_needed()
        expect(card).to_have_attribute('data-intro', 'done')
        assert card.evaluate('e => e.getAnimations({subtree:true}).length') == 0
        page.get_by_role('tab', name='ข่าว', exact=True).tap()
        expect(page.get_by_role('tabpanel', name='ข่าว', exact=True)).to_be_visible()
        motion.close()
        assert not errors, errors
        browser.close()
        print('Home: theme, clock, original ticker symbols, search, retry, collections, Research deep links, interactive layers, first-view animation, touch/keyboard, reduced motion and 320–1440px layouts passed.' + (' Live TradingView iframe rendered.' if LIVE else ' External market requests blocked for deterministic checks.'))
finally:
    server.shutdown()
    server.server_close()
