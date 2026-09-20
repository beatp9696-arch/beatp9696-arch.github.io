"""Cockpit math, filters, targets, shared stock navigation, small screens and auto restore."""
from functools import partial
import tempfile
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from threading import Thread
from datetime import datetime, timezone
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(tempfile.mkdtemp(prefix='moatrices-portfolio-'))
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *args): pass
class Server(ThreadingHTTPServer):
    request_queue_size = 128
server=Server(('127.0.0.1',0),partial(Quiet,directory=str(ROOT)))
Thread(target=server.serve_forever,daemon=True).start()
origin=f'http://127.0.0.1:{server.server_port}'
url=origin+'/portfolio.html'
holdings=[{'id':i,'tk':tk,'shares':shares,'price':price,'cost':cost,'priceAt':1789084800000} for i,(tk,shares,price,cost) in enumerate([
    ('MSFT',3,100,90),('SNPS',2,100,80),('NVDA',1,100,120),('COST',1,100,85),('LLY',1,100,95),('MELI',2,100,75)])]
entries=[{'type':'in','date':'2026-09-01','amount':1000,'split':{'savings':20,'invest':10}},{'type':'out','date':'2026-09-02','amount':105,'roundup':5}]
def store(page,key): return page.evaluate("async key=>(await import('./app/js/core/storage.js')).load(key)",key)
def save(page,key,value):
    page.evaluate("async ([k,v])=>{const s=await import('./app/js/core/storage.js');s.save(k,v);await s.flushStorage();}",[key,value])
def fitted(page):
    page.evaluate('()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))')
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),page.viewport_size
    for selector in ['.app-living-thesis','.lt-wrap','.pc-cockpit','.pc-table-content']:
        assert page.locator(selector).evaluate('e=>e.scrollWidth<=e.clientWidth+1'),(selector,page.viewport_size)

try:
  with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    context=browser.new_context(viewport={'width':1440,'height':1080},reduced_motion='reduce',service_workers='block')
    context.route('**/*',lambda r:r.continue_() if r.request.url.startswith(origin) else r.abort())
    page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.clock.set_fixed_time(datetime(2026,9,13,12,tzinfo=timezone.utc))
    page.goto(url);expect(page.locator('.pc-head h1')).to_have_text('Portfolio Cockpit.')
    expect(page.locator('.pc-empty')).to_contain_text('Your portfolio starts here')
    expect(page.locator('.pc-bridge')).to_contain_text('No Money transactions')
    assert store(page,'pf.holdings') is None
    for width in [320,390,768,1024,1440]:
        page.set_viewport_size({'width':width,'height':1000});fitted(page)
    save(page,'pf.holdings',holdings);save(page,'money.entries',entries)
    page.reload();expect(page.locator('.pf-row')).to_have_count(6)
    expect(page.locator('.pf-total')).to_have_text('$1,000.00')
    expect(page.locator('.pc-summary')).to_contain_text('$880.00')
    expect(page.locator('.pc-summary')).to_contain_text('+$120.00')
    expect(page.locator('.pc-bridge')).to_contain_text('895.00')
    expect(page.locator('.pc-bridge')).to_contain_text('100.00')
    expect(page.locator('.pc-bridge')).to_contain_text('Ready to invest')
    page.wait_for_function("[...document.querySelectorAll('.pf-logo img')].every(i=>i.complete&&i.naturalWidth)")
    for width in [320,390,768,1024,1440]:
        page.set_viewport_size({'width':width,'height':1080});fitted(page)
        page.screenshot(path=str(OUT/f'moatrices-cockpit-{width}.png'),full_page=True)
        page.locator('.pc-holdings').evaluate("e=>e.scrollIntoView({block:'start'})")
        page.screenshot(path=str(OUT/f'moatrices-holdings-{width}.png'))
        page.locator('#shell-view').evaluate('e=>e.scrollTop=0')
    page.locator('.pc-legend [data-pc-sector="semi"]').click()
    expect(page.locator('.pf-row')).to_have_count(2)
    expect(page.locator('.pf-row[data-tk="SNPS"] [data-weight]')).to_have_attribute('data-weight','20')
    expect(page.locator('.pf-total')).to_have_text('$1,000.00')
    page.locator('[data-pc-view="sort"]').select_option('gain')
    page.reload();expect(page.locator('.pf-row')).to_have_count(2)
    expect(page.locator('[data-pc-view="sort"]')).to_have_value('gain')
    page.locator('[data-pc-reset]').click();page.locator('[data-pc-group="holding"]').click()
    page.locator('.pf-arc[data-pc-holding="MSFT"]').focus();page.keyboard.press('Enter')
    expect(page.locator('.pf-row')).to_have_count(1)
    page.locator('[data-pc-reset]').click()
    page.locator('[data-pc-view="query"]').fill('mercado')
    expect(page.locator('.pf-row')).to_have_count(1)
    page.locator('[data-pc-view="query"]').fill('<img src=x onerror=alert(1)>')
    expect(page.locator('.pf-row')).to_have_count(0);page.locator('[data-pc-reset]').click()
    page.locator('[data-pc-view="thesis"]').select_option('INSUFFICIENT DATA')
    assert page.locator('.pf-row').count()<=6;page.locator('[data-pc-reset]').click()
    page.locator('.pc-actions [data-pc-targets]').click()
    page.locator('[data-target-group="holdings"][data-target-key="MSFT"]').fill('10')
    page.locator('[data-target-group="holdings"][data-target-key="SNPS"]').fill('95')
    page.get_by_role('button',name='Save allocation settings',exact=True).click()
    expect(page.locator('.pc-form-error')).to_contain_text('100% or less')
    page.locator('[data-target-group="holdings"][data-target-key="SNPS"]').fill('20')
    page.locator('[data-target-group="sectors"][data-target-key="semi"]').fill('25')
    page.get_by_role('button',name='Save allocation settings',exact=True).click()
    expect(page.locator('.pf-row[data-tk="MSFT"]')).to_contain_text('Overweight')
    expect(page.locator('.pf-row[data-tk="SNPS"]')).to_contain_text('On target')
    expect(page.locator('.pc-review')).to_contain_text('MSFT exceeds target')
    page.reload();expect(page.locator('.pf-row[data-tk="MSFT"]')).to_contain_text('Overweight')
    assert store(page,'pf.holdings')==holdings and store(page,'money.entries')==entries
    # Existing holding editor is now the shared stock detail, retaining original CRUD.
    page.locator('[data-pc-open="SNPS"]').first.click()
    expect(page.locator('.pc-stock-detail h2')).to_have_text('Synopsys')
    for width in [320,390,768,1024,1440]:
        page.set_viewport_size({'width':width,'height':900})
        assert page.locator('dialog').evaluate('e=>e.scrollWidth<=e.clientWidth')
    page.keyboard.press('Escape')
    page.locator('[data-pc-open="SNPS"]').first.click()
    page.locator('[data-stock-thesis]').click();expect(page.locator('.lt-detail-head h1')).to_have_text('Synopsys')
    page.locator('[data-action="cockpit"]').click()
    page.locator('[data-pc-open="SNPS"]').first.click()
    page.locator('.pc-detail-links a').filter(has_text='Research').click()
    expect(page.locator('.rx-detail-head h1')).to_have_text('Synopsys')
    page.goto(origin+'/portfolio.html')
    expect(page.locator('.pc-head h1')).to_be_visible()
    page.locator('[data-pc-open="MSFT"]').first.click()
    page.locator('.pc-detail-links a').filter(has_text='Smart Money').click()
    expect(page.locator('.sm-stock-heading h2')).to_have_text('MSFT')
    expect(page.locator('.sm-stock-coverage')).to_contain_text('Checked all',timeout=60000)
    page.locator('[data-stock-back]').click();expect(page.locator('.sm-card')).to_have_count(16)
    page.goto(origin+'/portfolio.html')
    page.locator('[data-pc-open="MSFT"]').first.click()
    page.locator('.pf-form input[name="shares"]').fill('4')
    page.get_by_role('button',name='Save changes',exact=True).click()
    expect(page.locator('.pf-total')).to_have_text('$1,100.00')
    page.reload();expect(page.locator('.pf-total')).to_have_text('$1,100.00')
    # No input or confirmation gate is needed to restore the last Portfolio tab.
    page.goto(origin+'/portfolio.html');expect(page.locator('.pc-head h1')).to_be_visible()
    # Incomplete data retains all holdings but suppresses all aggregate weights.
    save(page,'pf.holdings',holdings+[{'id':99,'tk':'UNKNOWN','shares':1,'cost':10,'price':None}])
    page.reload();expect(page.locator('.pf-row')).to_have_count(7)
    expect(page.locator('.pf-total')).to_have_text('—')
    expect(page.locator('.pf-asof')).to_contain_text('allocation unavailable')
    expect(page.locator('.pf-arc')).to_have_count(0)
    assert all(v=='' for v in page.locator('[data-weight]').evaluate_all('es=>es.map(e=>e.dataset.weight)'))
    page.locator('[data-pc-open="UNKNOWN"]').first.click();expect(page.locator('.pc-monogram')).not_to_have_count(0)
    page.keyboard.press('Escape')
    # Local logo failures expose the symbol fallback.
    page.route('**/assets/brands/MSFT.png',lambda r:r.abort())
    page.reload();expect(page.locator('.pf-row[data-tk="MSFT"] .pf-logo img')).to_have_count(0)
    expect(page.locator('.pf-row[data-tk="MSFT"] .pc-monogram')).to_be_visible()
    page.goto(origin+'/portfolio.html')
    expect(page.locator('.pc-head h1')).to_be_visible();fitted(page)
    assert not errors,errors
    context.close()
    # Research arriving after a user starts an editor cannot discard the draft.
    delayed=browser.new_context(viewport={'width':390,'height':844},service_workers='block')
    pending=[]
    delayed.route('**/app/data/living-thesis-library.json',lambda r:pending.append(r))
    page=delayed.new_page();page.goto(url);expect(page.locator('.pc-head h1')).to_be_visible()
    page.locator('.pf-add').click();page.locator('.pf-form input[name="tk"]').fill('MSFT')
    page.locator('.pf-form input[name="shares"]').fill('2')
    assert pending
    pending[0].continue_()
    expect(page.locator('.lt-loading')).to_have_count(0)
    expect(page.locator('.pf-form input[name="shares"]')).to_have_value('2')
    page.keyboard.press('Escape');expect(page.locator('dialog')).to_have_count(0)
    delayed.close()
    browser.close()
    print('PASS: cockpit accounting, targets, filters, stock navigation, auto restore, 320–1440px, logo fallback and missing data.')
finally:
    server.shutdown();server.server_close()
