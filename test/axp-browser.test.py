"""AXP editorial regression: static HTML, research links, model, keyboard and motion.

Run with Python containing playwright, beautifulsoup4 and html5lib.
No website runtime dependency is required. Uses an installed Chromium browser.
Optional --refresh-cover renders the original SVG to the site's JPEG social assets.
Screenshots and result JSON go to axp-verification in the system temporary directory.
"""
from pathlib import Path
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from threading import Thread
from urllib.parse import urlparse, unquote
import contextlib
import io
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import xml.etree.ElementTree as ET
import html5lib
from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
OUT = Path(tempfile.gettempdir()) / 'axp-verification'
OUT.mkdir(exist_ok=True)
SUMMARY = 'articles/deep-dive-axp.html'
REPORT = 'articles/deep-dive-axp-2026-09-23.html'
PACK = ROOT / 'articles/research/axp-2026-09-23'
model = json.loads((PACK / 'model-results.json').read_text())
results = {'static': {}, 'browser': []}

def parse(path):
    return BeautifulSoup(path.read_text(), 'html.parser')

# HTML5 tree construction, unique IDs, one H1, anchors and local resources.
for name in [SUMMARY, REPORT]:
    path = ROOT / name
    raw = path.read_text()
    parser = html5lib.HTMLParser(strict=False)
    parser.parse(raw)
    assert not parser.errors, (name, parser.errors)
    soup = parse(path)
    ids = [e['id'] for e in soup.select('[id]')]
    assert len(ids) == len(set(ids)), name
    assert len(soup.select('h1')) == 1
    assert '/Users/' not in raw and 'file://' not in raw
    assert soup.select_one('link[rel=canonical]')['href'].endswith('/' + name)
    assert 'American Express' in soup.title.text or 'AXP' in soup.title.text
    if name == REPORT:
        assert 'Q2 2026' in soup.title.text
        assert '23 September 2026' in soup.title.text
    posting = next(json.loads(s.text) for s in soup.select('script[type="application/ld+json"]') if json.loads(s.text)['@type'] == 'BlogPosting')
    assert posting['dateModified'] == '2026-09-23'
    assert posting['datePublished'] == ('2026-06-27' if name == SUMMARY else '2026-09-23')
    checked = 0
    for el in soup.select('[href], [src]'):
        url = el.get('href') or el.get('src')
        parsed = urlparse(url)
        if parsed.scheme or parsed.netloc:
            continue
        target = (ROOT / parsed.path.lstrip('/')) if parsed.path.startswith('/') else (path.parent / unquote(parsed.path)).resolve() if parsed.path else path
        assert target.exists(), (name, url)
        if parsed.fragment and target.suffix == '.html':
            assert parse(target).find(id=unquote(parsed.fragment)), (name, url)
        checked += 1
    for table in soup.select('table'):
        assert table.find_parent(class_='axp-table-wrap')
        assert table.caption
        assert all(x.get('scope') == 'col' for x in table.select('thead th'))
    results['static'][name] = {'html5_errors': 0, 'local_links_and_resources': checked, 'tables': len(soup.select('table'))}

summary = parse(ROOT / SUMMARY)
assert len(summary.select('.axp-study > section')) == 12
assert len(summary.select('.axp-toc li')) == 12
assert not summary.select('table')
assert summary.select_one('#moat .axp-flywheel')
assert summary.select_one('#business .axp-payment')
assert summary.select_one('#financials .axp-economics')
assert summary.select_one('#funding .axp-funding')
assert summary.select_one('#business #network-structure')
assert summary.select_one('#moat #two-sided-network')
assert len(summary.select('.axp-picture-figure')) == 2
assert all(summary.find(id='sec-' + str(i)) for i in range(1, 10))
assert summary.select_one('a[href="deep-dive-axp-2026-09-23.html#sec-6"]')
assert summary.select_one('a[href="research/axp-2026-09-23/financial-review-th.md"]')
assert 'เส้นทางเงิน' in summary.select_one('meta[name=description]')['content']
assert not re.search(r'\[(?:K25|Q26|E26|M8|AR25)[,;\]]', str(summary))
# Adjacent Markdown references must not consume one another or label the wrong URL.
source_refs = dict(re.findall(r'^\[([^\]]+)\]: (https?://\S+)', (PACK / 'investment-report.md').read_text(), re.M))
source_labels = {'10-K 2025': 'K25', '10-Q Q2 2026': 'Q26', 'Q2 earnings release': 'E26',
                 'September credit filing': 'M8', 'Annual Report 2025': 'AR25',
                 '10-K 2021': 'K21', '10-K 2022': 'K22', '10-K 2023': 'K23', 'Proxy 2026': 'P26'}
for link in summary.select('.axp-study .axp-source-ref'):
    key = source_labels.get(link.text, link.text)
    if key in source_refs:
        assert link['href'] == source_refs[key], (key, link['href'])
assert not re.search(r'Q1\s*2026|ไตรมาส\s*1\s*ปี\s*2026|Centurion|Agent Purchase Protection', str(summary), re.I)
assert not re.search(r'19,637|305\.07|41 ข้อ|24 หัวข้อ', summary.select_one('.axp-study').get_text())
assert abs(model['valuation']['Base']['upside'] * 100 + 3.0110131226) < 1e-6
report = parse(ROOT / REPORT)
assert all(report.find(id='sec-' + str(i)) for i in range(1, 25))
register = report.find(id='sec-23').find_next('table')
assert len(register.select('tbody tr')) == 41
for raw_ref in re.findall(r'\[([A-Z][A-Z0-9; ]*)\]', str(report)):
    raise AssertionError('Unresolved citation: ' + raw_ref)

# Recompute in an isolated directory so source research files cannot be overwritten.
with tempfile.TemporaryDirectory(prefix='axp-model-') as directory:
    target = Path(directory) / 'model.py'
    shutil.copyfile(PACK / 'model.py', target)
    subprocess.run([sys.executable, str(target)], check=True, capture_output=True)
    assert json.loads((Path(directory) / 'model-results.json').read_text()) == model
results['static']['reproduced_model'] = True
# The site generator must preserve hand-authored TOC and diagram anchors.
sys.path.insert(0, str(ROOT))
import build
with tempfile.TemporaryDirectory(prefix='axp-build-anchors-') as directory:
    folder = Path(directory)
    (folder / 'articles').mkdir()
    for name in [SUMMARY, REPORT]:
        shutil.copyfile(ROOT / name, folder / name)
    try:
        os.chdir(folder)
        with contextlib.redirect_stdout(io.StringIO()):
            build.inject_tocs()
            build.write_related()
        for name in [SUMMARY, REPORT]:
            assert (folder / name).read_bytes() == (ROOT / name).read_bytes()
    finally:
        os.chdir(ROOT)
results['static']['build_preserves_editorial_anchors'] = True
for filename in ['feed.xml', 'sitemap.xml']:
    ET.parse(ROOT / filename)
archive = parse(ROOT / 'articles.html')
assert len(archive.select('a[href="' + SUMMARY + '"]')) == 1
assert len(archive.select('a[href="' + REPORT + '"]')) == 1
assert parse(ROOT / 'index.html').select_one('.post-list--recent li a')['href'] == SUMMARY

class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass

server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Quiet, directory=str(ROOT)))
Thread(target=server.serve_forever, daemon=True).start()
origin = f'http://127.0.0.1:{server.server_port}'

def fitted(page):
    dimensions = page.evaluate('({viewport:innerWidth,scroll:document.documentElement.scrollWidth})')
    assert dimensions['scroll'] <= dimensions['viewport'], dimensions

def verify_explainers(page, width):
    page.emulate_media(reduced_motion='reduce')
    for figure in page.locator('.axp-explainer').all():
        figure.scroll_into_view_if_needed()
        expect(figure.locator('.axp-sequence-motion')).to_be_hidden()
        controls = figure.locator('[data-sequence-select]')
        panels = figure.locator('.axp-sequence-panel')
        height = figure.bounding_box()['height']
        for index in range(controls.count()):
            controls.nth(index).click()
            expect(controls.nth(index)).to_have_attribute('aria-pressed', 'true')
            expect(panels.nth(index)).to_be_visible()
            for other in range(panels.count()):
                if other != index:
                    expect(panels.nth(other)).to_be_hidden()
            assert abs(figure.bounding_box()['height'] - height) < 1
        if figure.locator('.axp-sequence-map').count():
            chart = figure.locator('.axp-sequence-map').bounding_box()
            boxes = [node.bounding_box() for node in figure.locator('.axp-sequence-node').all()]
            for i, box in enumerate(boxes):
                assert box['x'] >= chart['x'] - 1, (width, box, chart)
                assert box['x'] + box['width'] <= chart['x'] + chart['width'] + 1, (width, box, chart)
                assert box['y'] >= chart['y'] - 1, (width, box, chart)
                assert box['y'] + box['height'] <= chart['y'] + chart['height'] + 1, (width, box, chart)
                for other in boxes[i+1:]:
                    assert box['x'] + box['width'] <= other['x'] or other['x'] + other['width'] <= box['x'] or box['y'] + box['height'] <= other['y'] or other['y'] + other['height'] <= box['y'], (width, box, other)
        page.keyboard.press('Tab')
        controls.first.focus()
        page.keyboard.press('ArrowRight')
        expect(controls.nth(1)).to_be_focused()
        expect(panels.nth(1)).to_be_visible()
        page.keyboard.press('End')
        expect(controls.last).to_be_focused()
        controls.nth(2).click()
        figure.screenshot(path=str(OUT / f'{figure.get_attribute("aria-labelledby")}-{width}.png'))
    fitted(page)
    page.emulate_media(reduced_motion='no-preference')

def verify_pictures(page, width):
    page.emulate_media(reduced_motion='no-preference')
    for figure in page.locator('.axp-picture-figure').all():
        figure.scroll_into_view_if_needed()
        expect(figure).to_have_attribute('data-offscreen', 'false')
        toggle = figure.locator('.axp-picture-toggle')
        token = figure.locator('.axp-art-svg:visible .axp-art-token').first
        expect(toggle).to_be_visible()
        before = token.evaluate('e=>getComputedStyle(e).offsetDistance')
        page.wait_for_timeout(100)
        assert token.evaluate('e=>getComputedStyle(e).offsetDistance') != before
        toggle.click()
        expect(figure).to_have_attribute('data-paused', 'true')
        assert token.evaluate('e=>getComputedStyle(e).animationPlayState') == 'paused'
        page.evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))')
        frozen = token.evaluate('e=>getComputedStyle(e).offsetDistance')
        page.wait_for_timeout(100)
        assert token.evaluate('e=>getComputedStyle(e).offsetDistance') == frozen
        toggle.focus()
        page.keyboard.press('Space')
        expect(figure).to_have_attribute('data-paused', 'false')
        page.locator('#overview-title').scroll_into_view_if_needed()
        expect(figure).to_have_attribute('data-offscreen', 'true')
        assert token.evaluate('e=>getComputedStyle(e).animationPlayState') == 'paused'
        page.emulate_media(reduced_motion='reduce')
        figure.scroll_into_view_if_needed()
        expect(toggle).to_be_hidden()
        assert token.evaluate('e=>getComputedStyle(e).animationName') == 'none'
        figure.screenshot(path=str(OUT / f'{figure.get_attribute("id")}-{width}.png'))
        page.emulate_media(reduced_motion='no-preference')
    # Labels in each responsive illustration must stay within their own SVG.
    for svg in page.locator('.axp-art-svg:visible').all():
        box = svg.bounding_box()
        for label in svg.locator('text:visible').all():
            rect = label.bounding_box()
            assert rect['x'] >= box['x'] - 1, (width, label.text_content(), rect, box)
            assert rect['x'] + rect['width'] <= box['x'] + box['width'] + 1, (width, label.text_content(), rect, box)
            assert rect['y'] >= box['y'] - 1, (width, label.text_content(), rect, box)
            assert rect['y'] + rect['height'] <= box['y'] + box['height'] + 1, (width, label.text_content(), rect, box)
    fitted(page)

def verify_cards(page, width):
    scene = page.locator('.axp-card-scene')
    motion = page.locator('.axp-card-motion')
    floating = page.locator('.axp-card-float').first
    scene.scroll_into_view_if_needed()
    expect(scene).to_have_attribute('data-offscreen', 'false')
    expect(scene).to_have_attribute('data-paused', 'false')
    # Pointer focus on the pause button must not cancel the first click.
    motion.click()
    expect(scene).to_have_attribute('data-paused', 'true')
    expect(motion).to_have_attribute('aria-pressed', 'true')
    assert floating.evaluate('e=>getComputedStyle(e).animationPlayState') == 'paused'
    page.evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))')
    frozen = floating.evaluate('e=>getComputedStyle(e).transform')
    page.wait_for_timeout(120)
    assert floating.evaluate('e=>getComputedStyle(e).transform') == frozen
    motion.click()
    expect(scene).to_have_attribute('data-paused', 'false')
    assert floating.evaluate('e=>getComputedStyle(e).animationPlayState') == 'running'
    page.emulate_media(reduced_motion='reduce')
    expect(motion).to_be_hidden()
    assert floating.evaluate('e=>getComputedStyle(e).animationName') == 'none'
    controls = page.locator('.axp-card-selectors')
    # Read both rectangles in one frame: focus can scroll the document between
    # separate browser calls even though the controls have not moved in the card.
    control_position = 'e=>e.getBoundingClientRect().top-e.closest(".axp-card-scene").getBoundingClientRect().top'
    baseline = controls.evaluate(control_position)
    scene_height = scene.bounding_box()['height']
    for index in range(3):
        page.locator('[data-card-select]').nth(index).click()
        expect(scene).to_have_attribute('data-active', str(index))
        expect(page.locator('#card-story-' + str(index))).to_be_visible()
        for other in range(3):
            if other != index:
                expect(page.locator('#card-story-' + str(other))).to_be_hidden()
        assert abs(scene.bounding_box()['height'] - scene_height) < 1
        control_offset = controls.evaluate(control_position)
        assert abs(control_offset - baseline) < 1, (width, index, control_offset, baseline)
        stage = page.locator('.axp-card-stage').bounding_box()
        for face in page.locator('.axp-card-face').all():
            box = face.bounding_box()
            assert box['x'] >= stage['x'], (width, index, box, stage)
            assert box['x'] + box['width'] <= stage['x'] + stage['width'], (width, index, box, stage)
            assert box['y'] >= stage['y'], (width, index, box, stage)
            assert box['y'] + box['height'] <= stage['y'] + stage['height'], (width, index, box, stage)
    # Keyboard selection is stable, with a visible focus ring.
    page.keyboard.press('Tab')
    card = page.locator('[data-card]').nth(1)
    card.focus()
    expect(scene).to_have_attribute('data-active', '1')
    assert card.evaluate('e=>getComputedStyle(e).outlineStyle') != 'none'
    page.keyboard.press('Enter')
    expect(card).to_have_attribute('aria-pressed', 'true')
    page.locator('[data-card-select]').first.click()
    scene.screenshot(path=str(OUT / f'cards-{width}.png'))
    fitted(page)
    page.emulate_media(reduced_motion='no-preference')
    expect(motion).to_be_visible()
    # Explicit pause survives reduced-motion changes and leaving the viewport.
    expect(scene).to_have_attribute('data-paused', 'true')
    motion.click()
    expect(scene).to_have_attribute('data-paused', 'false')

try:
    with sync_playwright() as p:
        options = {'headless': True}
        cached = sorted((Path.home() / 'Library/Caches/ms-playwright').glob('chromium-*/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'))
        if os.environ.get('AXP_CHROMIUM'):
            options['executable_path'] = os.environ['AXP_CHROMIUM']
        elif cached:
            options['executable_path'] = str(cached[-1])
        browser = p.chromium.launch(**options)
        if '--refresh-cover' in sys.argv:
            cover = browser.new_page(viewport={'width': 1200, 'height': 630}, device_scale_factor=1)
            cover.goto(origin + '/img/axp-research-cover.svg')
            cover.screenshot(path=str(ROOT / 'og-deep-dive-axp.jpg'), type='jpeg', quality=90)
            shutil.copyfile(ROOT / 'og-deep-dive-axp.jpg', ROOT / 'og-deep-dive-axp-2026-09-23.jpg')
            cover.set_viewport_size({'width': 640, 'height': 336})
            cover.screenshot(path=str(ROOT / 'img/thumbs/deep-dive-axp.jpg'), type='jpeg', quality=85)
            cover.close()
        context = browser.new_context(viewport={'width': 1440, 'height': 1000}, service_workers='block')
        context.route('**/*', lambda r: r.continue_() if r.request.url.startswith(origin) else r.abort())
        page = context.new_page()
        errors, failed = [], []
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.on('response', lambda r: failed.append([r.url, r.status]) if r.url.startswith(origin) and r.status >= 400 else None)
        for name in [SUMMARY, REPORT]:
            for width in [1440, 390]:
                page.set_viewport_size({'width': width, 'height': 1000 if width == 1440 else 844})
                page.goto(origin + '/' + name, wait_until='networkidle')
                page.evaluate('document.fonts.ready')
                fitted(page)
                assert page.locator('.axp-toc').evaluate("e=>getComputedStyle(e).position") == ('sticky' if width == 1440 else 'static')
                for table in page.locator('.axp-table-wrap').all():
                    assert table.evaluate('e=>e.clientWidth<=innerWidth')
                if width == 390 and name == REPORT:
                    table = page.locator('.axp-table-wrap').first
                    assert table.evaluate('e=>e.scrollWidth>e.clientWidth')
                    table.focus()
                    table.evaluate('e=>e.scrollLeft=100')
                    assert table.evaluate('e=>e.scrollLeft') > 0
                page.evaluate('scrollTo(0,0)')
                page.screenshot(path=str(OUT / f'{Path(name).stem}-{width}.png'))
                if name == SUMMARY:
                    verify_cards(page, width)
                    verify_explainers(page, width)
                    verify_pictures(page, width)
                    page.locator('.axp-toc a[href="#business"]').click()
                    assert page.url.endswith('#business')
                    expect(page.locator('#business-title')).to_be_in_viewport()
                    figure = page.locator('.axp-flywheel')
                    figure.scroll_into_view_if_needed()
                    expect(page.locator('.axp-node')).to_have_count(5)
                    # Switch from the TOC mouse click to keyboard input before
                    # asserting the browser's :focus-visible treatment.
                    page.keyboard.press('Tab')
                    for node in page.locator('.axp-node').all():
                        node.focus()
                        expect(node).to_be_focused()
                        # Programmatic focus is intentionally followed by an
                        # activation so this assertion does not depend on
                        # which element the preceding jump-link Tab reached.
                        node.click()
                        expect(node).to_have_attribute('aria-pressed', 'true')
                        description = page.locator('#' + node.get_attribute('aria-describedby'))
                        expect(description).to_be_visible()
                        assert node.evaluate("e=>getComputedStyle(e).outlineStyle") != 'none'
                    first = page.locator('.axp-node').first
                    first.focus()
                    page.keyboard.press('Tab')
                    expect(page.locator('.axp-node').nth(1)).to_be_focused()
                    page.keyboard.press('Enter')
                    expect(page.locator('#flywheel-spending')).to_be_visible()
                    first.hover()
                    expect(page.locator('#flywheel-members')).to_be_visible()
                    token = page.locator('.axp-token').first
                    before = token.evaluate("e=>getComputedStyle(e).offsetDistance")
                    page.wait_for_timeout(250)
                    assert token.evaluate("e=>getComputedStyle(e).offsetDistance") != before
                    bounds = token.bounding_box()
                    box = page.locator('.axp-diagram').bounding_box()
                    assert box['x'] <= bounds['x'] <= box['x'] + box['width']
                    assert box['y'] <= bounds['y'] <= box['y'] + box['height']
                    page.locator('.axp-motion').click()
                    assert token.evaluate("e=>getComputedStyle(e).animationPlayState") == 'paused'
                    figure.evaluate("e=>scrollTo({top:e.getBoundingClientRect().top+scrollY-100,behavior:'instant'})")
                    figure.screenshot(path=str(OUT / f'flywheel-{width}.png'))
                    page.locator('.axp-motion').click()
                    page.locator('#sources-title').scroll_into_view_if_needed()
                    expect(figure).to_have_attribute('data-offscreen', 'true')
                    assert token.evaluate("e=>getComputedStyle(e).animationPlayState") == 'paused'
                    page.emulate_media(reduced_motion='reduce')
                    figure.scroll_into_view_if_needed()
                    assert token.evaluate("e=>getComputedStyle(e).animationName") == 'none'
                    expect(page.locator('.axp-motion')).not_to_be_visible()
                    assert page.locator('.axp-center-pulse').evaluate("e=>getComputedStyle(e).animationName") == 'none'
                    first.focus()
                    expect(page.locator('#flywheel-members')).to_be_visible()
                    figure.evaluate("e=>scrollTo({top:e.getBoundingClientRect().top+scrollY-100,behavior:'instant'})")
                    figure.screenshot(path=str(OUT / f'flywheel-reduced-{width}.png'))
                    page.emulate_media(reduced_motion='no-preference')
                else:
                    page.locator('.axp-toc a[href="#sec-23"]').click()
                    assert page.url.endswith('#sec-23')
                    expect(page.locator('#sec-23')).to_be_in_viewport()
                fitted(page)
                results['browser'].append({'page': name, 'width': width, 'passed': True})
        # Mobile touch selection and persisted dark theme.
        touch = browser.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True, color_scheme='dark', reduced_motion='reduce')
        touch.add_init_script("localStorage.setItem('theme','dark')")
        mobile = touch.new_page()
        mobile.goto(origin + '/' + SUMMARY, wait_until='networkidle')
        mobile.locator('[data-card-select]').nth(2).tap()
        expect(mobile.locator('.axp-card-scene')).to_have_attribute('data-active', '2')
        expect(mobile.locator('#card-story-2')).to_be_visible()
        mobile.locator('.axp-node').last.tap()
        expect(mobile.locator('#flywheel-rewards')).to_be_visible()
        fitted(mobile)
        mobile.locator('.axp-flywheel').screenshot(path=str(OUT / 'flywheel-touch-dark.png'))
        for figure in mobile.locator('.axp-explainer').all():
            figure.locator('[data-sequence-select]').last.tap()
            expect(figure.locator('.axp-sequence-panel').last).to_be_visible()
            figure.screenshot(path=str(OUT / (figure.get_attribute('aria-labelledby') + '-touch-dark.png')))
        touch.close()
        # Intermediate breakpoints used to crop the back card above the scene.
        for width in [320, 600, 850, 1050]:
            page.set_viewport_size({'width': width, 'height': 1200})
            page.goto(origin + '/' + SUMMARY, wait_until='networkidle')
            verify_cards(page, width)
            verify_explainers(page, width)
            verify_pictures(page, width)
        # Advance the real browser's timers to cover repeated cycling and hover.
        page.set_viewport_size({'width': 1440, 'height': 1000})
        page.mouse.move(0, 0)
        page.clock.install()
        page.goto(origin + '/' + SUMMARY, wait_until='networkidle')
        cards = page.locator('.axp-card-scene')
        cards.scroll_into_view_if_needed()
        expect(cards).to_have_attribute('data-offscreen', 'false')
        for expected in ['1', '2', '0']:
            page.clock.fast_forward(7100)
            expect(cards).to_have_attribute('data-active', expected)
        page.locator('#card-scene-title').hover()
        page.clock.fast_forward(15000)
        expect(cards).to_have_attribute('data-active', '0')
        page.mouse.move(0, 0)
        page.clock.fast_forward(7100)
        expect(cards).to_have_attribute('data-active', '1')
        page.locator('#segments-title').scroll_into_view_if_needed()
        expect(cards).to_have_attribute('data-offscreen', 'true')
        assert page.locator('.axp-card-float').first.evaluate('e=>getComputedStyle(e).animationPlayState') == 'paused'
        page.clock.fast_forward(15000)
        expect(cards).to_have_attribute('data-active', '1')
        cards.scroll_into_view_if_needed()
        expect(cards).to_have_attribute('data-offscreen', 'false')
        page.clock.fast_forward(7100)
        expect(cards).to_have_attribute('data-active', '2')
        results['card_motion'] = {'widths': [320, 390, 600, 850, 1050, 1440], 'pause_resume': True, 'cycle_hover_offscreen': True, 'keyboard_touch_reduced_motion': True, 'stable_story_height': True}
        for figure in page.locator('.axp-explainer').all():
            figure.scroll_into_view_if_needed()
            expect(figure).to_have_attribute('data-offscreen', 'false')
            total = figure.locator('[data-sequence-select]').count()
            for index in range(1, total + 1):
                page.clock.fast_forward(8600)
                expect(figure).to_have_attribute('data-active', str(index % total))
            motion = figure.locator('.axp-sequence-motion')
            motion.click()
            expect(figure).to_have_attribute('data-paused', 'true')
            page.clock.fast_forward(20000)
            expect(figure).to_have_attribute('data-active', '0')
            motion.click()
            page.clock.fast_forward(8600)
            expect(figure).to_have_attribute('data-active', '1')
            page.locator('#overview-title').scroll_into_view_if_needed()
            expect(figure).to_have_attribute('data-offscreen', 'true')
            page.clock.fast_forward(20000)
            expect(figure).to_have_attribute('data-active', '1')
        results['business_sequences'] = {'count': 3, 'widths': [320, 390, 600, 850, 1050, 1440], 'automatic_cycle': True, 'pause_resume_offscreen': True, 'keyboard_touch_reduced_motion': True, 'no_overlapping_labels': True}
        results['illustrated_scenes'] = {'count': 3, 'widths': [320, 390, 600, 850, 1050, 1440], 'pause_resume_keyboard_offscreen': True, 'reduced_motion': True, 'labels_within_svg': True}
        # All content and the static diagram remain available without JavaScript.
        plain = browser.new_context(java_script_enabled=False, viewport={'width': 390, 'height': 844}, reduced_motion='reduce')
        plain_page = plain.new_page()
        for name in [SUMMARY, REPORT]:
            plain_page.goto(origin + '/' + name, wait_until='networkidle')
            expect(plain_page.locator('h1')).to_be_visible()
            expect(plain_page.locator('.axp-content')).to_be_visible()
            if name == SUMMARY:
                expect(plain_page.locator('.axp-card-motion')).to_be_hidden()
                for story in plain_page.locator('.axp-card-story').all():
                    expect(story).to_be_visible()
                for panel in plain_page.locator('.axp-sequence-panel').all():
                    expect(panel).to_be_visible()
                for figure in plain_page.locator('.axp-picture-figure').all():
                    expect(figure.locator('.axp-picture-toggle')).to_be_hidden()
                    expect(figure.locator('figcaption')).to_be_visible()
        plain.close()
        assert not errors, errors
        assert not failed, failed
        results['browser_errors'] = errors
        results['failed_local_requests'] = failed
        browser.close()
finally:
    server.shutdown()
(OUT / 'results.json').write_text(json.dumps(results, ensure_ascii=False, indent=2))
print(json.dumps(results, ensure_ascii=False, indent=2))
print('Screenshots:', OUT)
