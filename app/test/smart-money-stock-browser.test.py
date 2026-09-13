"""Cross-portfolio security navigation, matching, partial results and network loss.

แอปย้ายจาก /pp-os/ มาเป็นหน้า /smart-money.html แล้ว และไม่มี service worker ของตัวเอง
(sw.js เหลือเป็น kill switch) ส่วนที่เคยเช็ค cache ของ SW จึงเปลี่ยนมาทดสอบพฤติกรรมจริง
ที่ผู้ใช้เจอแทน: เน็ตหลุดกลางทาง → "Partial results" แล้วกดลองใหม่เมื่อเน็ตกลับมา
"""
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from threading import Thread
from collections import Counter
import json
import tempfile
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(tempfile.gettempdir())
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *args): pass
class PreviewServer(ThreadingHTTPServer):
    request_queue_size = 128
server = PreviewServer(('127.0.0.1', 0), partial(Quiet, directory=str(ROOT)))
Thread(target=server.serve_forever, daemon=True).start()
origin = f'http://127.0.0.1:{server.server_port}'
url = origin + '/smart-money.html'
catalog = json.loads((ROOT/'app/data/smart-money.json').read_text())
errors = []
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width':390,'height':844}, reduced_motion='reduce', service_workers='block')
        requests = Counter()
        block_blackrock = True
        def route(request):
            address = request.request.url
            if not address.startswith(origin):
                request.abort(); return
            if '/data/smart-money/' in address:
                requests[address] += 1
                if block_blackrock and '/blackrock-' in address:
                    request.abort(); return
            request.continue_()
        context.route('**/*', route)
        page = context.new_page()
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(url)
        page.locator('[data-fund="berkshire"]').click()
        page.locator('.sm-holding-search input').fill('AAPL')
        apple = page.locator('.sm-holding-id[data-stock="037833100|SH|"]')
        apple.focus(); page.keyboard.press('Enter')
        expect(page.locator('.sm-stock-detail h2')).to_have_text('AAPL')
        expect(page.locator('.sm-stock-coverage')).to_contain_text('Partial results', timeout=20000)
        expect(page.locator('.sm-stock-coverage')).to_contain_text('BlackRock')
        expect(page.locator('.sm-stock-summary')).to_contain_text('13 / 14')
        expect(page.locator('[data-owner="berkshire"]')).to_contain_text('227,917,808')
        expect(page.locator('[data-owner="berkshire"]')).to_contain_text('30 Jun 2026')
        expect(page.locator('[data-owner="berkshire"]')).to_contain_text('Unchanged')
        assert all(count == 1 for count in requests.values())
        block_blackrock = False
        page.locator('[data-stock-retry]').click()
        expect(page.locator('.sm-stock-coverage')).to_have_text('Checked all 14 available portfolio reports.', timeout=20000)
        expect(page.locator('.sm-stock-current [data-owner]')).to_have_count(10)
        expect(page.locator('.sm-stock-current [data-owner="blackrock"]')).to_have_count(1)
        expect(page.locator('[data-estimated-owner]')).to_have_count(2)
        expect(page.locator('[data-estimated-owner="trump"]')).to_contain_text('Date unavailable')
        expect(page.locator('[data-estimated-owner="trump"]')).to_contain_text('No comparable period')
        assert all(count == (2 if '/blackrock-' in address else 1) for address,count in requests.items())
        for width in [320,375,390,768,1280]:
            page.set_viewport_size({'width':width,'height':900})
            page.evaluate('()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))')
            assert page.locator('.app-smart-money').evaluate('e=>e.scrollWidth<=e.clientWidth'),width
            page.screenshot(path=str(OUT/f'smart-money-stock-{width}.png'))
        page.set_viewport_size({'width':390,'height':844})
        before = requests.copy()
        page.locator('[data-stock-back]').click()
        expect(page.locator('.sm-detail h2')).to_have_text('Berkshire Hathaway')
        expect(page.locator('.sm-holding-search input')).to_have_value('AAPL')
        expect(apple).to_be_focused()
        expect(page.locator('.sm-holdings>li')).to_have_count(1)
        apple.click()
        expect(page.locator('.sm-stock-coverage')).to_have_text('Checked all 14 available portfolio reports.')
        assert requests == before
        page.locator('[data-stock-fund="blackrock"]').click()
        page.locator('.sm-holding-search input').fill('AAPL')
        page.locator('[data-stock="037833100|SH|Call"]').click()
        expect(page.locator('.sm-stock-historical')).to_contain_text('Call options')
        expect(page.locator('[data-estimated-owner]')).to_have_count(0)
        assert all('Call option' in text for text in page.locator('.sm-owner-instrument').all_text_contents())
        page.locator('[data-stock-back]').click()
        page.locator('.sm-back').click()
        page.locator('[data-fund="pershing"]').click()
        page.locator('[data-holdings="exited"]').click()
        page.locator('[data-stock]').first.click()
        expect(page.locator('.sm-stock-exited [data-owner="pershing"]')).to_contain_text('No longer reported')
        page.locator('[data-stock-back]').click()
        expect(page.locator('[data-holdings="exited"]')).to_have_attribute('aria-pressed','true')
        page.locator('.sm-back').click()
        page.locator('[data-fund="daily-journal"]').click()
        page.locator('[data-stock]').first.click()
        expect(page.locator('.sm-stock-history [data-owner="daily-journal"]')).to_contain_text('30 Sept 2023')
        expect(page.locator('.sm-stock-current [data-owner="daily-journal"]')).to_have_count(0)
        page.locator('[data-stock-back]').click()
        page.locator('.sm-back').click()
        page.locator('[data-fund="trump"]').click()
        page.locator('.sm-holding-search input').fill('AAPL')
        page.locator('[data-stock="AAPL"]').click()
        expect(page.locator('.sm-stock-current [data-owner]')).to_have_count(10)
        page.locator('[data-stock-back]').click()
        expect(page.locator('.sm-holding-search input')).to_have_value('AAPL')
        page.locator('[data-profile-view="transactions"]').click()
        page.locator('.sm-disclosed-list [data-stock]').first.click()
        expect(page.locator('.sm-stock-detail')).to_be_visible()
        page.locator('[data-stock-back]').click()
        expect(page.locator('.sm-disclosed-list li')).to_have_count(8)

        # A late response must not replace the portfolio after the user goes back.
        held = []
        race = browser.new_context(service_workers='block')
        def delayed(request):
            address=request.request.url
            if not address.startswith(origin): request.abort()
            elif '/data/smart-money/' in address and '/berkshire-' not in address: held.append(request)
            else: request.continue_()
        race.route('**/*', delayed)
        rp=race.new_page();rp.on('pageerror',lambda error:errors.append(str(error)))
        rp.goto(url);rp.locator('[data-fund="berkshire"]').click()
        rp.locator('[data-stock="037833100|SH|"]').click()
        expect(rp.locator('.sm-stock-coverage')).to_contain_text('Checking portfolio reports')
        rp.locator('[data-stock-back]').click()
        for request in held: request.abort()
        expect(rp.locator('.sm-detail h2')).to_have_text('Berkshire Hathaway')
        rp.wait_for_timeout(200)
        expect(rp.locator('.sm-stock-detail')).to_have_count(0)
        race.close()

        # เน็ตหลุดกลางทาง: รายงานที่ยังไม่ได้โหลดจะขาด → ต้องบอกว่าเป็นผลบางส่วน
        # (เดิมบล็อกนี้พึ่ง cache ของ service worker — ตอนนี้ไม่มี SW แล้ว จึงทดสอบตรงๆ)
        drop=browser.new_context(viewport={'width':390,'height':844},reduced_motion='reduce')
        dp=drop.new_page();dp.on('pageerror',lambda error:errors.append(str(error)))
        dp.goto(url);expect(dp.locator('.sm-card')).to_have_count(16,timeout=15000)
        dp.locator('[data-fund="nvidia"]').click()
        expect(dp.locator('.sm-holdings')).to_be_visible()
        drop.set_offline(True)
        dp.locator('[data-stock]').first.click()
        expect(dp.locator('.sm-stock-coverage')).to_contain_text('Partial results',timeout=20000)
        expect(dp.locator('.sm-stock-summary')).to_contain_text('1 / 14')
        drop.set_offline(False);dp.locator('[data-stock-retry]').click()
        expect(dp.locator('.sm-stock-coverage')).to_have_text('Checked all 14 available portfolio reports.',timeout=20000)
        # รายงานที่โหลดครบแล้วต้องถูกใช้ซ้ำในเซสชันเดิม แม้เน็ตหลุดอีกรอบ
        dp.locator('[data-stock-back]').click()
        dp.locator('.sm-back').click();expect(dp.locator('.sm-card')).to_have_count(16)
        drop.set_offline(True)
        dp.locator('[data-fund="trump"]').click();dp.locator('[data-stock="AAPL"]').click()
        expect(dp.locator('.sm-stock-coverage')).to_have_text('Checked all 14 available portfolio reports.',timeout=20000)
        expect(dp.locator('.sm-stock-current [data-owner]')).to_have_count(10)
        drop.set_offline(False)
        assert not errors,errors
        browser.close()
finally:
    server.shutdown()
print('PASS: stock navigation, keyboard/back restoration, AAPL across 10 filings, estimates, options, exits, historical data, partial/retry, in-session report reuse and stale responses.')
