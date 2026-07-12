#!/usr/bin/env python3
"""scene-shot.py — ถ่ายภาพฉากที่ "หยุดเวลา" ไว้ที่วินาทีที่ต้องการ (CDP)

ใช้ตรวจว่า narrative ของฉากเล่าเรื่องจริงไหม ไม่ใช่แค่ดูสวยตอนจบ
(ดู .claude/skills/scene-animation ข้อ 10-11 — Definition of Done)

    python3 tools/scene-shot.py <url> --nth 1 --at 0,2.4,4.8,7.2 --out /tmp/s1

  --nth  ฉากที่เท่าไรในหน้า (1-based, นับจาก .ph-panel)
  --at   วินาทีที่ต้องการหยุดเวลา (คั่นด้วยจุลภาค)

วิธีทำงาน: เปิด Chrome headless พร้อม remote debugging → บังคับให้ฉากเล่น (.playing)
→ pause ทุก animation แล้ว seek currentTime ไปยัง t ที่ขอ → screenshot เฉพาะกล่องของฉากนั้น
"""
import asyncio, json, base64, subprocess, sys, time, argparse, urllib.request, shutil, os

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PORT = 9223


async def shoot(url, nth, times, out_prefix):
    import websockets
    tmp = f"/tmp/scene-shot-profile-{os.getpid()}"
    proc = subprocess.Popen(
        [CHROME, "--headless=new", f"--remote-debugging-port={PORT}", f"--user-data-dir={tmp}",
         "--window-size=1280,900", "--hide-scrollbars", "--disable-gpu", "about:blank"],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        ws_url = None
        for _ in range(50):
            try:
                tabs = json.load(urllib.request.urlopen(f"http://127.0.0.1:{PORT}/json"))
                page = next(t for t in tabs if t["type"] == "page")
                ws_url = page["webSocketDebuggerUrl"]
                break
            except Exception:
                time.sleep(0.2)
        if not ws_url:
            sys.exit("เปิด Chrome debugging ไม่สำเร็จ")

        async with websockets.connect(ws_url, max_size=64 * 1024 * 1024) as ws:
            i = 0

            async def cmd(method, params=None):
                nonlocal i
                i += 1
                await ws.send(json.dumps({"id": i, "method": method, "params": params or {}}))
                while True:
                    msg = json.loads(await ws.recv())
                    if msg.get("id") == i:
                        return msg.get("result", {})

            await cmd("Page.enable")
            await cmd("Runtime.enable")
            await cmd("Page.navigate", {"url": url})
            await asyncio.sleep(2.2)  # โหลด font/CSS ให้ครบก่อน

            # บังคับให้ฉากเล่น (ไม่ต้องรอ scroll) แล้วหยุดเวลาทุก animation ไว้ก่อน
            await cmd("Runtime.evaluate", {"expression": """
                document.querySelectorAll('.ph-panel').forEach(p => p.classList.add('playing'));
                document.getAnimations().forEach(a => { a.pause(); a.currentTime = 0; });
            """})

            for t in times:
                await cmd("Runtime.evaluate", {"expression": f"""
                    document.getAnimations().forEach(a => {{
                      try {{ a.currentTime = {int(t * 1000)}; }} catch (e) {{}}
                    }});
                """})
                await asyncio.sleep(0.35)
                # clip ของ CDP ใช้พิกัด "หน้าเอกสาร" ไม่ใช่พิกัด viewport → ต้องบวก scrollX/scrollY เอง
                box = await cmd("Runtime.evaluate", {"returnByValue": True, "expression": f"""
                    (() => {{
                      const p = document.querySelectorAll('.ph-panel')[{nth - 1}];
                      if (!p) return null;
                      const r = p.getBoundingClientRect();
                      return {{x: r.x + scrollX, y: r.y + scrollY, w: r.width, h: r.height}};
                    }})()
                """})
                b = box.get("result", {}).get("value")
                if not b:
                    sys.exit(f"ไม่พบฉากที่ {nth} ในหน้านี้")
                shot = await cmd("Page.captureScreenshot", {
                    "format": "png", "captureBeyondViewport": True,
                    "clip": {"x": b["x"], "y": b["y"], "width": b["w"], "height": b["h"], "scale": 1.4}})
                path = f"{out_prefix}-t{str(t).replace('.', '_')}.png"
                with open(path, "wb") as f:
                    f.write(base64.b64decode(shot["data"]))
                print(f"  t={t}s → {path}")
    finally:
        proc.terminate()
        shutil.rmtree(tmp, ignore_errors=True)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("url")
    ap.add_argument("--nth", type=int, default=1)
    ap.add_argument("--at", default="0,3,6")
    ap.add_argument("--out", default="/tmp/scene")
    a = ap.parse_args()
    asyncio.run(shoot(a.url, a.nth, [float(x) for x in a.at.split(",")], a.out))
