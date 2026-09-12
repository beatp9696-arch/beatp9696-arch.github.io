"""Run with a Python environment containing Playwright and its Chromium browser."""
from pathlib import Path
import tempfile
from functools import partial
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from threading import Thread
from playwright.sync_api import sync_playwright,expect
import json
import re

ROOT=Path(__file__).resolve().parents[2]
OUT=Path(tempfile.gettempdir())
VERSION=re.search(r'const VERSION = "([^"]+)"', (ROOT/'pp-os/sw.js').read_text()).group(1)
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*args):pass
class PreviewServer(ThreadingHTTPServer):
    request_queue_size=128  # The service worker fetches all shell assets together.
server=PreviewServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT)))
Thread(target=server.serve_forever,daemon=True).start()
origin=f'http://127.0.0.1:{server.server_port}'
url=origin+'/pp-os/?mode=app&tab=smart-money'
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    context=browser.new_context(viewport={'width':390,'height':844},reduced_motion='reduce',service_workers='block')
    context.route('**/*',lambda r:r.continue_() if r.request.url.startswith(origin) else r.abort())
    page=context.new_page();errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(url);expect(page.locator('.sm-card')).to_have_count(16)
    page.evaluate('document.fonts.ready')
    page.evaluate('async()=>Promise.all([...document.querySelectorAll(".app-smart-money img")].map(image=>image.decode()))')
    expect(page.locator('.sm-card .sm-brand img, .sm-card .sm-portrait img')).to_have_count(16)
    expect(page.locator('.sm-card .sm-brand b, .sm-card .sm-portrait b')).to_have_count(0)
    for card in page.locator('.sm-card:not(.sm-disclosure-card)').all():
        assert 1 <= card.locator('.sm-ring > svg > g:first-child > circle').count() <= 5
        expect(card.locator('.sm-chart-caption')).to_contain_text('สัดส่วนเฉพาะกลุ่มนี้')
    assert page.locator('#tabbar .tab').all_text_contents()==['Moatrices','Money','Portfolio','Smart Money']
    for w in [320,375,390,430,768,1280]:
        page.set_viewport_size({'width':w,'height':844})
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),w
        assert page.locator('.app-smart-money').evaluate('e=>e.scrollWidth<=e.clientWidth'),w
    page.set_viewport_size({'width':390,'height':844})
    page.screenshot(path=str(OUT/'moatrices-smart-money-mobile.png'))
    page.locator('.sm-search-toggle').click()
    page.locator('.sm-search input').fill('Warren Buffett')
    expect(page.locator('.sm-card')).to_have_count(1)
    page.locator('.sm-search input').fill('<img src=x onerror=alert(1)>')
    expect(page.locator('.sm-card')).to_have_count(0)
    page.locator('[data-reset]').click();expect(page.locator('.sm-card')).to_have_count(16)
    page.locator('.sm-search-toggle').click()
    page.locator('[data-category="company"]').click();expect(page.locator('.sm-card')).to_have_count(2)
    page.locator('[data-category="all"]').click()
    page.locator('[data-fund="berkshire"]').click();expect(page.locator('.sm-detail h2')).to_have_text('Berkshire Hathaway')
    assert page.locator('.sm-holdings>li').count()==29
    assert page.locator('.sm-detail').get_by_text('299.25',exact=False).count()>0
    page.screenshot(path=str(OUT/'moatrices-smart-money-detail.png'))
    page.locator('[data-holdings="changes"]').click();assert page.locator('.sm-holdings>li').count()<29
    page.locator('.sm-back').click();expect(page.locator('.sm-card')).to_have_count(16)
    page.locator('[data-fund="pershing"]').click();page.locator('[data-holdings="exited"]').click()
    assert page.locator('.sm-status').count()>0
    page.locator('.sm-back').click()
    # Expanded catalog: all institutions and public disclosure views.
    page.locator('[data-category="institution"]').click();expect(page.locator('.sm-card')).to_have_count(6)
    page.screenshot(path=str(OUT/'moatrices-smart-money-institutions-mobile.png'))
    page.locator('[data-category="all"]').click()
    reports=json.loads((ROOT/'pp-os/data/smart-money.json').read_text())
    for fund in reports['funds']:
        page.locator('[data-fund="'+fund['id']+'"]').click()
        expect(page.locator('.sm-detail h2')).to_have_text(fund['name'])
        expect(page.locator('.sm-holdings>li')).to_have_count(min(50,fund['positionCount']))
        if fund['positionCount']>50:
            page.locator('[data-more]').click()
            expect(page.locator('.sm-holdings>li')).to_have_count(min(100,fund['positionCount']))
            last=json.loads((ROOT/'pp-os/data'/fund['detailFile']).read_text())['current']['holdings'][-1]
            page.locator('.sm-holding-search input').fill(last['cusip'])
            expect(page.locator('.sm-holding-id').first).to_be_visible()
            assert last['issuer'] in page.locator('.sm-holdings').inner_text()
            page.locator('.sm-holding-search input').fill('no-such-security-123')
            expect(page.locator('[data-more]')).to_be_hidden()
            expect(page.locator('.sm-holding-id')).to_have_count(0)
        if fund['id']=='jpmorgan':
            full=json.loads((ROOT/'pp-os/data'/fund['detailFile']).read_text())
            previous={r['id']:r for r in full['previous']['holdings']}
            zero=next(r for r in full['current']['holdings'] if r['id'] in previous and previous[r['id']]['shares']==0 and r['shares']>0)
            page.locator('.sm-holding-search input').fill(zero['cusip'])
            expect(page.locator('.sm-status').first).to_contain_text('จำนวนเพิ่ม · —')
            assert 'New' not in page.locator('.sm-holdings').inner_text()
        if fund.get('historical'):
            assert 'ย้อนหลัง' in page.locator('.sm-detail-heading').inner_text()
        if fund['id']=='invesco':
            page.locator('.sm-filing-sources summary').click()
            assert '$898' in page.locator('.sm-filing-sources').inner_text()
        page.locator('.sm-back').click()
        expect(page.locator('.sm-card')).to_have_count(16)
    for profile in reports['disclosures']:
        page.locator('[data-fund="'+profile['id']+'"]').click()
        expect(page.locator('.sm-detail h2')).to_have_text(profile['name'])
        if profile.get('estimatedHoldings'):
            rows=profile['estimatedHoldings']['rows']
            expect(page.locator('.sm-estimated-table tbody tr')).to_have_count(min(50,len(rows)))
            expect(page.locator('.sm-estimated-table tbody tr').first).to_contain_text('5.66%' if profile['id']=='trump' else '12.93%')
            expect(page.locator('.sm-estimated-table tbody tr').first).to_contain_text('171.23K' if profile['id']=='trump' else '85.43K')
            while page.locator('[data-estimate-more]').is_visible():
                page.locator('[data-estimate-more]').click()
            expect(page.locator('.sm-estimated-table tbody tr')).to_have_count(len(rows))
            expect(page.locator('.sm-estimated-table tbody tr').last).to_contain_text(rows[-1]['symbol'])
            page.locator('.sm-holding-search input').fill(rows[-1]['issuer'])
            expect(page.locator('.sm-estimated-table tbody tr')).to_have_count(1)
            expect(page.locator('.sm-estimated-table tbody tr')).to_contain_text(rows[-1]['symbol'])
            page.locator('.sm-holding-search input').fill('no-such-security-123')
            expect(page.locator('.sm-estimate-count')).to_have_text('Showing 0 of 0 holdings')
            expect(page.locator('[data-estimate-more]')).to_be_hidden()
            page.locator('.sm-holding-search input').fill('')
            expect(page.locator('.sm-ring')).to_have_count(1)
            expect(page.locator('.sm-estimate-note')).to_contain_text('undated')
            for width in [320,390,768]:
                page.set_viewport_size({'width':width,'height':844})
                assert page.locator('.app-smart-money').evaluate('e=>e.scrollWidth<=e.clientWidth'),('estimate',width)
            page.set_viewport_size({'width':390,'height':844})
            page.screenshot(path=str(OUT/f"moatrices-smart-money-{profile['id']}-holdings.png"),full_page=True)
            page.locator('[data-profile-view="transactions"]').click()
        expect(page.locator('.sm-disclosed-list li')).to_have_count(len(profile['disclosure']['entries']))
        expect(page.locator('.sm-ring')).to_have_count(0)
        assert all('#page=' in href for href in page.locator('.sm-disclosed-list a').evaluate_all('(links)=>links.map(a=>a.href)'))
        for width in [320,390,768]:
            page.set_viewport_size({'width':width,'height':844})
            assert page.locator('.app-smart-money').evaluate('e=>e.scrollWidth<=e.clientWidth'),(profile['id'],width)
        page.locator('.sm-back').click()
    page.set_viewport_size({'width':390,'height':844})
    page.locator('.sm-settings').click();expect(page.locator('.settings-ov.open')).to_be_visible()
    expect(page.locator('[data-d="export"]')).to_be_visible()
    page.locator('[data-tool="todo"]').click();expect(page.locator('.app-ov.open')).to_be_visible()
    page.locator('.set-close').click();expect(page.locator('.app-ov')).to_have_count(0)
    # Seed disposable browser storage, never real account data.
    page.evaluate("""async()=>{const s=await import('/pp-os/js/core/storage.js');s.save('health.days',{'2026-09-01':{water:7}});s.save('pf.holdings',[{tk:'AAPL',shares:2,cost:100,price:150,priceAt:Date.now()}]);s.save('money.entries',[]);s.save('os.name','Test only');} """)
    before=page.evaluate("async()=>{const s=await import('/pp-os/js/core/storage.js');return {health:s.load('health.days'),holdings:s.load('pf.holdings')}}")
    page.locator('[data-tab="portfolio"]').click()
    expect(page.locator('.app-living-thesis')).to_be_visible()
    page.locator('[data-action="allocation"]').click()
    expect(page.locator('.app-pf')).to_be_visible()
    assert page.locator('.app-pf').inner_text().find('300')>=0
    page.locator('[data-tab="money"]').click();page.locator('#quick-fab').click()
    assert page.locator('[data-q="water"]').count()==0
    page.locator('.sheet-x').click()
    for retired in ['me','health','does-not-exist']:
        page.goto(origin+'/pp-os/?mode=app&tab='+retired)
        expect(page.locator('.sm-card')).to_have_count(16)
    after=page.evaluate("async()=>{const s=await import('/pp-os/js/core/storage.js');return {health:s.load('health.days'),holdings:s.load('pf.holdings')}}")
    assert before==after
    # Shared website navigation also drops the retired tabs.
    page.goto(origin+'/index.html');expect(page.locator('.os-tabbar a')).to_have_count(4)
    assert 'Health' not in page.locator('.os-tabbar').inner_text()
    page.set_viewport_size({'width':1280,'height':900})
    page.goto(origin+'/pp-os/?mode=desktop&open=smart-money');expect(page.locator('.sm-card')).to_have_count(16)
    assert page.locator('.desk-icon[data-app="health"],.desk-icon[data-app="me"]').count()==0
    assert page.locator('.sm-cards').evaluate("e=>getComputedStyle(e).gridTemplateColumns.split(' ').length")==1
    assert page.locator('.titlebar').evaluate('e=>e.getBoundingClientRect().height')<65
    for selector in ['.app-smart-money','.sm-card','.sm-cards']:
        assert page.locator(selector).first.evaluate('e=>e.scrollWidth<=e.clientWidth'),selector
    page.screenshot(path=str(OUT/'moatrices-smart-money-desktop.png'))
    page.goto(url);expect(page.locator('.sm-card')).to_have_count(16)
    assert page.locator('.sm-cards').evaluate("e=>getComputedStyle(e).gridTemplateColumns.split(' ').length")==2
    page.screenshot(path=str(OUT/'moatrices-smart-money-wide.png'))
    page.locator('[data-fund="daily-journal"]').screenshot(path=str(OUT/'moatrices-smart-money-munger.png'))
    page.locator('[data-category="institution"]').click()
    page.screenshot(path=str(OUT/'moatrices-smart-money-institutions-wide.png'))
    # Installed app retains the new menu, data, and diagrams offline.
    offline=browser.new_context(viewport={'width':390,'height':844},reduced_motion='reduce')
    op=offline.new_page();op.on('pageerror',lambda e:errors.append(str(e)))
    op.goto(url);expect(op.locator('.sm-card')).to_have_count(16,timeout=15000)
    op.evaluate('navigator.serviceWorker.ready')
    op.wait_for_function('!!navigator.serviceWorker.controller')
    assert op.evaluate("async(version)=>{const c=await caches.open(version);return !!(await c.match('/pp-os/data/smart-money.json'))}",VERSION)
    await_keys=op.evaluate('caches.keys()')
    assert VERSION in await_keys
    op.locator('[data-fund="nvidia"]').click();expect(op.locator('.sm-detail h2')).to_have_text('NVIDIA Portfolio')
    op.wait_for_function("async(version)=>{const c=await caches.open(version);return (await c.keys()).some(r=>r.url.includes('/data/smart-money/nvidia-'))}",arg=VERSION)
    offline.set_offline(True);op.reload();expect(op.locator('.sm-card')).to_have_count(16)
    expect(op.locator('.sm-card .sm-brand img, .sm-card .sm-portrait img')).to_have_count(16)
    op.evaluate('async()=>Promise.all([...document.querySelectorAll(".sm-card .sm-brand img, .sm-card .sm-portrait img")].map(image=>image.decode()))')
    op.locator('[data-fund="nvidia"]').click();expect(op.locator('.sm-detail h2')).to_have_text('NVIDIA Portfolio')
    assert op.locator('.sm-brand-nvidia img').evaluate('e=>e.complete&&e.naturalWidth>0')
    op.locator('.sm-back').click()
    op.locator('[data-fund="blackrock"]').click()
    expect(op.locator('[data-retry-detail]')).to_be_visible()
    op.locator('.sm-back').click();expect(op.locator('.sm-card')).to_have_count(16)
    op.locator('[data-fund="trump"]').click();expect(op.locator('.sm-estimated-table tbody tr')).to_have_count(50)
    op.locator('[data-profile-view="transactions"]').click();expect(op.locator('.sm-disclosed-list li')).to_have_count(8)
    op.locator('[data-profile-view="holdings"]').click();expect(op.locator('.sm-estimated-table tbody tr')).to_have_count(50)
    op.locator('.sm-back').click()
    op.locator('[data-fund="blackrock"]').click();expect(op.locator('[data-retry-detail]')).to_be_visible()
    offline.set_offline(False);op.locator('[data-retry-detail]').click()
    expect(op.locator('.sm-detail h2')).to_have_text('BlackRock')
    assert not errors,errors
    browser.close()
server.shutdown()
print('PASS: 16 profiles; all 14 holdings views; large-portfolio pagination and search; zero-share labels; historical and political disclosures; 6 widths; offline/retry; private storage and navigation; no browser errors.')
