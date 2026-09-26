"""Export Apple share artwork from the article's own Three.js scene.

Run with Python + Playwright and an installed Chrome browser.
Outputs are static JPEGs; the homepage never loads the 3D scene.
"""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
import shutil

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]


class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def main():
    server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Quiet, directory=str(ROOT)))
    Thread(target=server.serve_forever, daemon=True).start()
    origin = f'http://127.0.0.1:{server.server_port}'
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(channel='chrome', headless=True,
                                        args=['--enable-unsafe-swiftshader'])
            page = browser.new_page(viewport={'width': 1200, 'height': 630},
                                    device_scale_factor=1, reduced_motion='reduce')
            page.route('**/*', lambda r: r.continue_() if r.request.url.startswith(origin) else r.abort())
            page.goto(origin + '/articles/deep-dive-aapl.html', wait_until='networkidle')
            page.wait_for_function("document.body.dataset.ready === 'true'")
            page.evaluate('document.fonts.ready')
            page.add_style_tag(content='''
                html, body { width:1200px; height:630px; overflow:hidden; }
                .mast, .scene-meta, .scale, .bottom-bar, .progress,
                .scene-status, .vignette, .skip-link, main > article > :not(.journey),
                .article-footer { display:none!important; }
                .journey, .stage { height:630px!important; min-height:0!important; }
                .chapters { visibility:hidden!important; }
                .stage { position:relative; background:radial-gradient(ellipse at 60% 42%,#273730,#101b16 48%,#080e0b 85%); }
                #scene canvas { transform:translate(-17%,0) scale(.75); }
            ''')
            page.evaluate("dispatchEvent(new Event('resize'))")
            page.wait_for_timeout(350)
            page.screenshot(path=str(ROOT / 'img/apple-macbook-2026-09-26.jpg'),
                            type='jpeg', quality=88)
            page.add_style_tag(content='''
                #scene canvas { transform:translate(5%,0) scale(.75); }
                .share-art { position:fixed; inset:0; pointer-events:none;
                    background:linear-gradient(90deg,#080e0b 0%,#080e0bd9 28%,transparent 67%); }
                .share-brand { position:absolute; top:42px; left:58px; color:#e9eeeb;
                    font:14px Mono,monospace; letter-spacing:3px; }
                .share-edition { position:absolute; top:43px; right:58px;
                    color:#abc29f; font:12px Mono,monospace; letter-spacing:2px; }
                .share-copy { position:absolute; left:58px; top:160px; }
                .share-copy p { margin:0 0 22px; color:#b3c3b7;
                    font:12px Mono,monospace; letter-spacing:3px; }
                .share-copy h1 { margin:0; color:#eff5ef; font:600 68px/1.4 Thai,sans-serif;
                    letter-spacing:-2px; }
                .share-copy h1 span { color:#ccf899; }
                .share-subtitle { position:absolute; bottom:73px; left:60px;
                    color:#c0cec3; font:21px Thai,sans-serif; }
                .share-rule { position:absolute; bottom:45px; left:60px; right:60px;
                    height:1px; background:#abc29f40; }
            ''')
            page.evaluate('''() => {
                const art = document.createElement('div');
                art.className = 'share-art';
                art.innerHTML = `<div class="share-brand">MOATRICES</div>
                  <div class="share-edition">APPLE / AAPL</div>
                  <div class="share-copy"><p>BUSINESS DEEP DIVE</p>
                    <h1>ข้างในความ<br><span>เรียบง่าย</span></h1></div>
                  <div class="share-subtitle">จากอุปกรณ์ ถึงคูเมืองของ Apple</div>
                  <div class="share-rule"></div>`;
                document.body.append(art);
            }''')
            page.evaluate('document.fonts.ready')
            versioned = ROOT / 'og-deep-dive-aapl-2026-09-26.jpg'
            page.screenshot(path=str(versioned), type='jpeg', quality=90)
            shutil.copyfile(versioned, ROOT / 'og-deep-dive-aapl.jpg')
            browser.close()
            print('Exported Apple feature image and 1200 × 630 share artwork.')
    finally:
        server.shutdown()


if __name__ == '__main__':
    main()
