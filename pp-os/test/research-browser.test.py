"""Research workflows, privacy, responsive layouts and offline snapshots."""
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from threading import Thread
import csv
import io
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[2]
OUT = Path("/private/tmp")

class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass

class PreviewServer(ThreadingHTTPServer):
    request_queue_size = 128

server = PreviewServer(("127.0.0.1", 0), partial(Quiet, directory=str(ROOT)))
Thread(target=server.serve_forever, daemon=True).start()
origin = f"http://127.0.0.1:{server.server_port}"
url = origin + "/pp-os/?mode=app&tab=moatrices"

def fitted(page):
    # Container queries settle on the next rendering frame after a viewport change.
    page.evaluate("() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))")
    if not page.evaluate("document.documentElement.scrollWidth <= innerWidth"):
        print("Overflow", page.viewport_size, page.evaluate("({inner:innerWidth, scroll:scrollX, roots:[...document.querySelectorAll('html,body,#shell,#shell-view,.rx-wrap,.rx-table-scroll')].map(e=>[e.tagName,e.className,e.clientWidth,e.scrollWidth,e.scrollLeft,getComputedStyle(e).overflowX]), outside:[...document.querySelectorAll('body *')].filter(e=>e.getBoundingClientRect().right>innerWidth && !e.closest('.rx-table-scroll')).map(e=>[e.tagName,e.className,Math.round(e.getBoundingClientRect().right)]).slice(0,20)})"))
        page.screenshot(path=str(OUT / "moatrices-research-overflow.png"))
    assert page.evaluate("document.documentElement.scrollWidth <= innerWidth")
    assert page.locator(".app-research").evaluate("e => e.scrollWidth <= e.clientWidth"), page.viewport_size
    assert page.locator(".rx-wrap").evaluate("e => e.scrollWidth <= e.clientWidth"), page.viewport_size

try:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 1000}, reduced_motion="reduce", service_workers="block")
        context.route("**/*", lambda r: r.continue_() if r.request.url.startswith(origin) else r.abort())
        page = context.new_page()
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.goto(url)
        expect(page.locator(".rx-card")).to_have_count(3)
        page.evaluate("document.fonts.ready")
        page.evaluate("async () => Promise.all([...document.querySelectorAll('.rx-logo img')].map(i => i.decode()))")
        assert page.locator(".rx-logo img").count() == 3
        page.screenshot(path=str(OUT / "moatrices-research-desktop.png"))
        for width in [320, 375, 390, 768, 1440]:
            page.set_viewport_size({"width": width, "height": 900})
            fitted(page)
        page.set_viewport_size({"width": 390, "height": 844})
        page.screenshot(path=str(OUT / "moatrices-research-mobile.png"))
        page.locator('[data-follow="SNPS"]').click()
        expect(page.locator('[data-follow="SNPS"]')).to_have_attribute("aria-pressed", "true")
        page.locator('[data-scope="following"]').click()
        expect(page.locator(".rx-card")).to_have_count(1)
        page.reload()
        expect(page.locator('[data-follow="SNPS"]')).to_have_attribute("aria-pressed", "true")
        page.get_by_role("searchbox").fill("TSMC")
        expect(page.locator(".rx-card")).to_have_count(1)
        page.get_by_role("searchbox").fill('<img src=x onerror="alert(1)">')
        expect(page.locator(".rx-card")).to_have_count(0)
        page.locator("[data-reset]").click()
        page.locator('[data-company="SNPS"]').click()
        expect(page.locator(".rx-detail-head h1")).to_have_text("Synopsys")
        expect(page.locator(".rx-check")).to_have_count(3)
        page.locator('[data-evidence="monitor:SNPS:0"]').click()
        expect(page.locator("dialog")).to_be_visible()
        assert page.locator("dialog a").get_attribute("href").endswith("/articles/deep-dive-snps.html#sec-10")
        page.keyboard.press("Escape")
        expect(page.locator("dialog")).to_have_count(0)
        expect(page.locator('[data-evidence="monitor:SNPS:0"]')).to_be_focused()
        page.locator(".rx-note textarea").fill("My private thesis <draft>")
        page.locator('[data-detail-tab="moat"]').click()
        expect(page.locator(".rx-moat-list>button")).to_have_count(7)
        page.locator('[data-detail-tab="thesis"]').click()
        expect(page.locator(".rx-note textarea")).to_have_value("My private thesis <draft>")
        page.locator('.rx-note button[type="submit"]').click()
        expect(page.locator(".rx-note-status")).to_have_text("Saved on this device")
        page.locator("[data-back]").click()
        page.locator('[data-company="SNPS"]').click()
        expect(page.locator(".rx-note textarea")).to_have_value("My private thesis <draft>")
        page.screenshot(path=str(OUT / "moatrices-research-thesis-mobile.png"))
        page.locator("[data-back]").click()
        page.locator('[data-view="earnings"]').click()
        expect(page.locator(".rx-report-heading h3")).to_have_text("NVIDIA")
        expect(page.locator(".rx-earnings-table")).to_contain_text("-3.9 pp")
        for width in [320, 390, 768, 1440]:
            page.set_viewport_size({"width": width, "height": 900})
            fitted(page)
        page.locator("#shell-view").evaluate("e => e.scrollTop = 0")
        page.screenshot(path=str(OUT / "moatrices-research-earnings-desktop.png"))
        with page.expect_download() as info:
            page.locator("[data-export]").click()
        rows = list(csv.DictReader(io.StringIO(Path(info.value.path()).read_text())))
        assert len(rows) == 3 and rows[1]["Change unit"] == "pp"
        page.locator("[data-earnings-company]").select_option("SNPS")
        expect(page.locator(".rx-earnings-table")).to_contain_text("Not recorded")
        page.locator("[data-report]").select_option("debt-2026")
        expect(page.locator(".rx-earnings-table")).to_contain_text("-25.6%")
        page.locator('[data-view="matrix"]').click()
        expect(page.locator(".rx-matrix tbody tr")).to_have_count(8)
        for width in [320, 390, 768, 1440]:
            page.set_viewport_size({"width": width, "height": 900})
            fitted(page)
        page.screenshot(path=str(OUT / "moatrices-research-matrix-desktop.png"))
        page.set_viewport_size({"width": 390, "height": 844})
        page.locator(".rx-table-scroll").evaluate("e => e.scrollLeft = 200")
        page.screenshot(path=str(OUT / "moatrices-research-matrix-mobile.png"))
        page.locator('[data-compare="TSM"]').uncheck()
        expect(page.locator(".rx-matrix thead th")).to_have_count(3)
        page.locator('[data-evidence="power:SNPS:brand"]').click()
        expect(page.locator("dialog")).to_contain_text("ยังไม่ได้จัดหมวดหมู่")
        page.locator("[data-close]").click()
        page.locator('[data-compare="SNPS"]').uncheck()
        page.locator('[data-compare="NVDA"]').uncheck()
        expect(page.locator(".rx-matrix")).to_have_count(0)
        page.locator("[data-select-all]").click()
        expect(page.locator(".rx-matrix thead th")).to_have_count(4)

        # Seed only the disposable browser profile, never the user's actual book.
        holdings = [{"tk": "SNPS", "shares": 2, "price": 100, "cost": 90, "priceAt": 1}, {"tk": "MSFT", "shares": 3, "price": 100, "cost": 90, "priceAt": 1}]
        page.evaluate("async hs => { const s = await import('./js/core/storage.js'); s.save('pf.holdings', hs); }", holdings)
        page.locator('#tabbar [data-tab="portfolio"]').click()
        page.locator('[data-action="allocation"]').click()
        expect(page.locator(".pf-research p")).to_contain_text("40.0% by entered value")
        page.get_by_role("button", name="Research SNPS", exact=True).click()
        expect(page.locator(".rx-detail-head h1")).to_have_text("Synopsys")
        assert page.evaluate("async () => (await import('./js/core/storage.js')).load('pf.holdings')") == holdings
        page.locator('#tabbar [data-tab="portfolio"]').click()
        if page.locator('[data-action="allocation"]').count():
            page.locator('[data-action="allocation"]').click()
        page.locator('.pf-row[data-tk="SNPS"]').click()
        expect(page.locator(".pf-sheet .sheet-card")).to_be_visible()
        page.keyboard.press("Escape")
        page.locator('#tabbar [data-tab="smart-money"]').click()
        expect(page.locator(".sm-card")).to_have_count(16)
        page.goto(url + "&company=NVDA")
        expect(page.locator(".rx-detail-head h1")).to_have_text("NVIDIA")
        page.goto(origin + "/pp-os/?mode=desktop&open=research")
        expect(page.locator(".rx-card")).to_have_count(3)
        fitted(page)
        page.evaluate("document.dispatchEvent(new CustomEvent('pp-research', {detail:{ticker:'TSM'}}))")
        expect(page.locator(".rx-detail-head h1")).to_have_text("TSMC")
        assert "mode=desktop" in page.url
        assert not errors, errors
        context.close()

        # A failed first load offers retry; no demo data are substituted.
        failed = browser.new_context(service_workers="block")
        failed.route("**/data/research.json", lambda r: r.fulfill(status=503, body="Unavailable"))
        page = failed.new_page()
        page.goto(url)
        expect(page.locator("[data-retry]")).to_be_visible()
        failed.unroute("**/data/research.json")
        page.locator("[data-retry]").click()
        expect(page.locator(".rx-card")).to_have_count(3)
        failed.close()

        offline = browser.new_context(viewport={"width": 390, "height": 844})
        page = offline.new_page()
        page.goto(url)
        expect(page.locator(".rx-card")).to_have_count(3)
        page.evaluate("async () => { await navigator.serviceWorker.ready; if (!navigator.serviceWorker.controller) await new Promise(r => navigator.serviceWorker.addEventListener('controllerchange', r, {once:true})); }")
        await_cache = "async () => { const keys = await caches.keys(); const c = await caches.open(keys.find(k => k.startsWith('pp-os-'))); return !!(await c.match('./data/research.json')); }"
        assert page.evaluate(await_cache)
        offline.set_offline(True)
        page.reload()
        expect(page.locator(".rx-card")).to_have_count(3)
        page.locator('[data-view="earnings"]').click()
        expect(page.locator(".rx-earnings-table")).to_contain_text("-3.9 pp")
        offline.close()
        browser.close()
        print("Research browser: workflows, 320-1440px layouts, source dialogs, CSV, private holdings, desktop, retry and offline passed.")
finally:
    server.shutdown()
    server.server_close()
