"""Portfolio-integrated living thesis: navigation, edits, privacy, failures, offline and layouts."""
from functools import partial
from datetime import datetime, timezone
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from threading import Thread
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[2]
OUT = Path('/private/tmp')
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *args): pass
class Server(ThreadingHTTPServer):
    request_queue_size = 128
server = Server(('127.0.0.1', 0), partial(Quiet, directory=str(ROOT)))
Thread(target=server.serve_forever, daemon=True).start()
origin = f'http://127.0.0.1:{server.server_port}'
url = origin + '/pp-os/?mode=app&tab=portfolio'

def fitted(page):
    page.evaluate('() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))')
    for selector in ['.app-living-thesis', '.lt-wrap', '.lt-content']:
        assert page.locator(selector).evaluate('e => e.scrollWidth <= e.clientWidth + 1'), (selector, page.viewport_size)
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), page.viewport_size
    assert not page.locator('.lt-content').evaluate("e => [...e.querySelectorAll('*')].some(n => !n.closest('.lt-tabs,.lt-filters') && getComputedStyle(n).position !== 'absolute' && n.getBoundingClientRect().width > 0 && n.getBoundingClientRect().right > e.getBoundingClientRect().right + 2)"), page.viewport_size

def store(page,key):
    return page.evaluate("async key => (await import('./js/core/storage.js')).load(key)",key)

try:
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True)
        context=browser.new_context(viewport={'width':1440,'height':1080},reduced_motion='reduce',service_workers='block')
        context.route('**/*',lambda r:r.continue_() if r.request.url.startswith(origin) else r.abort())
        page=context.new_page(); errors=[]
        page.clock.set_fixed_time(datetime(2026,9,13,tzinfo=timezone.utc))
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto(url)
        expect(page.locator('[data-holding]')).to_have_count(3)
        page.evaluate('document.fonts.ready')
        page.screenshot(path=str(OUT/'matrices-portfolio-desktop.png'),full_page=True)
        assert store(page,'pf.holdings') is None
        for width in [320,375,390,768,1024,1440]:
            page.set_viewport_size({'width':width,'height':950});fitted(page)
        page.set_viewport_size({'width':390,'height':844})
        page.screenshot(path=str(OUT/'matrices-portfolio-mobile.png'),full_page=True)
        for label,count in [('Strengthened',1),('Unchanged',1),('Weakened',1),('At Risk',0),('Needs Review',2),('All',3)]:
            page.locator(f'[data-filter="{label}"]').click()
            expect(page.locator('[data-holding]')).to_have_count(count)
        page.get_by_role('searchbox',name='Search holdings').fill('Visa')
        expect(page.locator('[data-holding]')).to_have_count(1)
        page.get_by_role('searchbox').fill('<img src=x onerror=alert(1)>')
        expect(page.locator('[data-holding]')).to_have_count(0)
        page.locator('[data-action="clear"]').click()
        page.get_by_label('Sort holdings').select_option('drift')
        assert page.locator('[data-holding]').first.get_attribute('data-holding')=='MSFT'
        page.get_by_label('Sort holdings').select_option('recent')
        assert page.locator('[data-holding]').first.get_attribute('data-holding')=='COST'
        page.locator('.lt-company-link[data-symbol="MSFT"]').click()
        expect(page.locator('.lt-detail-head h1')).to_have_text('Microsoft')
        assert 'symbol=MSFT' in page.url
        page.set_viewport_size({'width':1440,'height':1080})
        page.screenshot(path=str(OUT/'matrices-thesis-desktop.png'),full_page=True)
        page.reload();expect(page.locator('.lt-detail-head h1')).to_have_text('Microsoft')
        for tab in ['thesis','moat','timeline','earnings','redteam','sell']:
            page.locator(f'[data-thesis-tab="{tab}"]').click()
            for width in [320,390,768,1440]:
                page.set_viewport_size({'width':width,'height':950});fitted(page)
            if tab in ['earnings','redteam']:
                page.screenshot(path=str(OUT/f'matrices-{tab}-desktop.png'),full_page=True)
            page.set_viewport_size({'width':390,'height':844})
            page.screenshot(path=str(OUT/f'matrices-{tab}-mobile.png'),full_page=True)
        page.locator('[data-thesis-tab="moat"]').click()
        expect(page.locator('.lt-pillar')).to_have_count(7)
        page.locator('[data-thesis-tab="moat"]').press('ArrowRight')
        expect(page.locator('[data-thesis-tab="timeline"]')).to_have_attribute('aria-selected','true')
        page.locator('.lt-evidence summary').first.click()
        expect(page.locator('.lt-evidence[open]')).to_have_count(1)
        assert page.locator('.lt-evidence[open] a').get_attribute('target')=='_blank'
        page.locator('.lt-evidence summary').first.click()
        expect(page.locator('.lt-evidence[open]')).to_have_count(0)
        page.locator('[data-thesis-tab="sell"]').click()
        expect(page.locator('.lt-condition')).to_have_count(3)
        page.locator('[data-action="add-condition"]').click()
        page.locator('dialog input[name="title"]').fill('Management changes incentives')
        page.locator('dialog textarea[name="description"]').fill('Watch the focus on returns on capital.')
        page.locator('dialog select[name="status"]').select_option('warning')
        page.get_by_role('button',name='Save condition',exact=True).click()
        expect(page.locator('.lt-condition')).to_have_count(4)
        page.locator('.lt-condition').last.locator('[data-action="edit-condition"]').click()
        page.locator('dialog select[name="metric"]').select_option('grossMargin')
        page.locator('dialog input[name="threshold"]').fill('70')
        page.get_by_role('button',name='Save condition',exact=True).click()
        expect(page.locator('.lt-condition').last).to_contain_text('TRIGGERED')
        page.reload();expect(page.locator('.lt-condition')).to_have_count(4)
        page.locator('[data-action="resolve"]').first.click()
        expect(page.locator('.lt-question').first).to_have_class('lt-question is-resolved')
        page.locator('[data-action="watch"]').nth(1).click()
        expect(page.locator('[data-action="watch"]').nth(1)).to_have_attribute('aria-pressed','true')
        page.locator('[data-action="investigate"]').nth(1).click()
        page.locator('dialog textarea').fill('Compare utilization and cash returns over two quarters.')
        page.get_by_role('button',name='Save notes',exact=True).click()
        expect(page.locator('dialog')).to_have_count(0)
        page.reload()
        expect(page.locator('.lt-question').first).to_have_class('lt-question is-resolved')
        page.locator('[data-action="investigate"]').nth(1).click()
        expect(page.locator('dialog textarea')).to_have_value('Compare utilization and cash returns over two quarters.')
        page.keyboard.press('Escape');expect(page.locator('dialog')).to_have_count(0)
        page.locator('[data-action="review"]').click()
        page.locator('[data-action="review-done"]').click()
        expect(page.locator('[data-action="review"]')).to_have_text('Reviewed')
        page.locator('[data-action="review"]').click()
        page.locator('[data-action="review-pending"]').click()
        expect(page.locator('[data-action="review"]')).to_have_text('Review thesis')
        stamp=page.locator('.lt-detail-stats>div').last.inner_text()
        pending=[]
        context.route('**/data/living-thesis.json',lambda r:pending.append(r))
        page.locator('[data-action="refresh"]').click()
        expect(page.locator('.lt-loading')).to_be_visible()
        expect(page.locator('[data-action="refresh"]')).to_be_disabled()
        assert pending
        pending[0].continue_()
        context.unroute('**/data/living-thesis.json')
        expect(page.locator('.lt-success')).to_contain_text('Demo analysis refreshed')
        assert page.locator('.lt-detail-stats>div').last.inner_text()==stamp
        context.route('**/data/living-thesis.json',lambda r:r.fulfill(status=503,body='Unavailable'))
        page.locator('[data-action="refresh"]').click()
        expect(page.locator('.lt-alert')).to_be_visible()
        expect(page.locator('.lt-detail-head h1')).to_have_text('Microsoft')
        context.unroute('**/data/living-thesis.json')
        page.locator('[data-action="retry"]').click()
        expect(page.locator('.lt-success')).to_contain_text('Demo analysis refreshed')
        page.locator('[data-thesis-tab="thesis"]').click()
        page.locator('[data-action="edit-thesis"]').click()
        original='My revised thesis <script>alert(1)</script> & a capital return hurdle.'
        page.locator('dialog textarea').fill(original)
        page.get_by_role('button',name='Save original thesis',exact=True).click()
        expect(page.locator('.lt-original blockquote')).to_have_text(original)
        expect(page.locator('.lt-detail-stats')).to_contain_text('INSUFFICIENT DATA')
        page.reload();expect(page.locator('.lt-original blockquote')).to_have_text(original)
        page.locator('[data-action="refresh"]').click()
        expect(page.locator('.lt-success')).to_be_visible()
        expect(page.locator('.lt-detail-stats')).to_contain_text('INSUFFICIENT DATA')
        assert store(page,'pf.holdings') is None
        page.locator('.lt-breadcrumb [data-action="back"]').click()
        page.locator('.lt-company-link[data-symbol="V"]').click()
        expect(page.locator('.lt-detail-head h1')).to_have_text('Visa')
        page.go_back();expect(page.locator('[data-holding]')).to_have_count(3)
        page.go_forward();expect(page.locator('.lt-detail-head h1')).to_have_text('Visa')
        page.locator('[data-action="personal"]').click()
        expect(page.locator('.lt-empty')).to_contain_text('Your investment story starts here')
        page.get_by_role('button',name='Add your first holding',exact=True).click()
        page.locator('.pf-add').click()
        page.locator('.pf-form input[name="tk"]').fill('MSFT')
        page.locator('.pf-form input[name="shares"]').fill('2')
        page.locator('.pf-form input[name="cost"]').fill('300')
        page.locator('.pf-form input[name="price"]').fill('400')
        page.get_by_role('button',name='Add to portfolio',exact=True).click()
        expect(page.locator('.pf-row')).to_have_count(1)
        personal=store(page,'pf.holdings')
        assert personal[0]['shares']==2
        page.locator('.pf-row').click()
        page.locator('.pf-form input[name="shares"]').fill('3')
        page.get_by_role('button',name='Save changes',exact=True).click()
        page.locator('.pf-asof').click()
        page.locator('.pf-price-row input').fill('420')
        page.get_by_role('button',name='Save prices',exact=True).click()
        personal=store(page,'pf.holdings')
        assert personal[0]['shares']==3 and personal[0]['price']==420
        expect(page.locator('.pf-thesis-entry')).to_have_count(1)
        page.get_by_role('button',name='Open Portfolio Health and Living Thesis',exact=True).click()
        expect(page.locator('[data-holding]')).to_have_count(1)
        assert store(page,'pf.holdings')==personal
        expect(page.locator('[data-holding]')).to_contain_text('INSUFFICIENT DATA')
        page.locator('.lt-company-link').click()
        expect(page.locator('.lt-original blockquote')).not_to_have_text(original)
        page.locator('[data-action="edit-thesis"]').click()
        page.locator('dialog textarea').fill('My actual private investment rationale.')
        page.get_by_role('button',name='Save original thesis',exact=True).click()
        page.locator('[data-action="refresh"]').click()
        expect(page.locator('.lt-alert')).to_contain_text('verified evidence')
        page.locator('[data-thesis-tab="timeline"]').click()
        expect(page.locator('#lt-panel')).to_contain_text('No evidence yet')
        for tab in ['moat','earnings','redteam','sell']:
            page.locator(f'[data-thesis-tab="{tab}"]').click();fitted(page)
        page.locator('#tabbar [data-tab="smart-money"]').click()
        expect(page.locator('.sm-card')).to_have_count(16)
        page.locator('#tabbar [data-tab="moatrices"]').click()
        expect(page.locator('.rx-card')).to_have_count(3)
        page.locator('#tabbar [data-tab="money"]').click()
        expect(page.locator('.app-money')).to_be_visible()
        assert store(page,'pf.holdings')==personal
        page.goto(url+'&book=demo&symbol=NOPE')
        expect(page.locator('.lt-empty')).to_contain_text('Holding not found')
        page.locator('.lt-empty [data-action="back"]').click()
        expect(page.locator('[data-holding]')).to_have_count(3)
        page.goto(origin+'/pp-os/?mode=desktop&open=portfolio&book=demo')
        expect(page.locator('[data-holding]')).to_have_count(3)
        fitted(page)
        page.locator('.lt-company-link[data-symbol="COST"]').click()
        expect(page.locator('.lt-detail-head h1')).to_have_text('Costco')
        assert 'mode=desktop' in page.url
        assert not errors,errors
        context.close()
        # Initial load error and an observable loading skeleton.
        failed=browser.new_context(service_workers='block')
        failed.route('**/data/living-thesis.json',lambda r:r.fulfill(status=503,body='Unavailable'))
        page=failed.new_page();page.goto(url)
        expect(page.locator('.lt-alert')).to_be_visible()
        failed.unroute('**/data/living-thesis.json')
        page.locator('[data-action="retry"]').click()
        expect(page.locator('[data-holding]')).to_have_count(3)
        failed.close()
        offline=browser.new_context(viewport={'width':390,'height':844})
        page=offline.new_page();page.goto(url)
        expect(page.locator('[data-holding]')).to_have_count(3)
        page.evaluate("async () => { await navigator.serviceWorker.ready; if (!navigator.serviceWorker.controller) await new Promise(r => navigator.serviceWorker.addEventListener('controllerchange',r,{once:true})); }")
        offline.set_offline(True);page.reload()
        expect(page.locator('[data-holding]')).to_have_count(3)
        page.locator('.lt-company-link[data-symbol="COST"]').click()
        page.locator('[data-thesis-tab="earnings"]').click()
        expect(page.locator('.lt-earnings')).to_contain_text('$65.9B')
        page.locator('[data-action="refresh"]').click()
        expect(page.locator('.lt-success')).to_contain_text('Demo analysis refreshed')
        offline.close();browser.close()
        print('PASS: thesis workflows, local persistence, portfolio CRUD, privacy, all tabs and filters, 320–1440px layouts, desktop windows, route history, errors and offline.')
finally:
    server.shutdown();server.server_close()
