"""Original SVG objects for the AXP article's illustrated business scenes."""


def defs(prefix):
    return f'''<defs>
      <linearGradient id="{prefix}-card" x2=".8" y2="1"><stop stop-color="#40454c"/><stop offset=".45" stop-color="#20242a"/><stop offset="1" stop-color="#090c12"/></linearGradient>
      <linearGradient id="{prefix}-gold" x2="1" y2="1"><stop stop-color="#ffebae"/><stop offset=".5" stop-color="#dcb873"/><stop offset="1" stop-color="#96703b"/></linearGradient>
      <linearGradient id="{prefix}-metal" x2=".6" y2="1"><stop stop-color="#203951"/><stop offset="1" stop-color="#0a1524"/></linearGradient>
      <radialGradient id="{prefix}-halo"><stop stop-color="#459edd" stop-opacity=".19"/><stop offset="1" stop-color="#459edd" stop-opacity="0"/></radialGradient>
      <marker id="{prefix}-arrow" viewBox="0 0 10 10" markerWidth="8" markerHeight="8" refX="8" refY="5" orient="auto" markerUnits="userSpaceOnUse"><path d="M1 1L8 5L1 9" fill="none" stroke="#80bfea" stroke-width="1.6"/></marker>
      <marker id="{prefix}-money-arrow" viewBox="0 0 10 10" markerWidth="8" markerHeight="8" refX="8" refY="5" orient="auto" markerUnits="userSpaceOnUse"><path d="M1 1L8 5L1 9" fill="none" stroke="#dfbd7e" stroke-width="1.6"/></marker>
    </defs>'''


def card(prefix, width=174, height=108):
    return f'''<g transform="scale({width / 174} {height / 108})">
      <rect x="-87" y="-54" width="174" height="108" rx="13" fill="url(#{prefix}-card)" stroke="#697782" stroke-width="1.4"/>
      <path d="M-72 -38H72 M-72 35H72" stroke="#c3d0dc" stroke-opacity=".14"/>
      <rect x="-70" y="-37" width="31" height="30" rx="3" fill="#0875cd"/>
      <text x="-54.5" y="-24" class="axp-art-brand">AMERICAN</text><text x="-54.5" y="-16" class="axp-art-brand">EXPRESS</text>
      <rect x="8" y="-31" width="31" height="23" rx="5" fill="url(#{prefix}-gold)"/>
      <path d="M18 -31V-8 M29 -31V-8 M8 -20H39" stroke="#9a783e" stroke-width=".8"/>
      <path d="M53 -28Q66 -20 53 -12 M59 -33Q80 -20 59 -7" fill="none" stroke="#8eacc2" stroke-width="1.5" stroke-linecap="round"/>
      <text x="-67" y="18" class="axp-art-card-small">••••  1850</text>
      <text x="-67" y="43" class="axp-art-card-name">MEMBERSHIP</text>
    </g>'''


def logo(prefix, scale=1):
    return f'''<g transform="scale({scale})"><rect x="-54" y="-32" width="108" height="64" rx="15" fill="url(#{prefix}-metal)" stroke="#59adeb" stroke-width="2"/>
      <rect x="-40" y="-19" width="35" height="36" rx="4" fill="#0875cd"/>
      <text x="-22.5" y="-4" class="axp-art-brand">AMERICAN</text><text x="-22.5" y="5" class="axp-art-brand">EXPRESS</text>
      <text x="24" y="6" text-anchor="middle" class="axp-art-logo-name">Amex</text></g>'''


def shop(prefix, scale=1):
    return f'''<g transform="scale({scale})"><rect x="-42" y="-22" width="84" height="71" rx="5" fill="url(#{prefix}-metal)" stroke="#477396" stroke-width="1.6"/>
      <path d="M-49 -22L-38 -47H38L49 -22Z" fill="#244562" stroke="#5284ab" stroke-width="1.6"/>
      <path d="M-29 -45L-34 -22 M-10 -45L-12 -22 M10 -45L12 -22 M29 -45L34 -22" stroke="#81abc9" stroke-opacity=".45"/>
      <path d="M-49 -22Q-38 -6 -26 -22Q-14 -6 -2 -22Q10 -6 22 -22Q35 -6 49 -22" fill="#182f45" stroke="#5284ab"/>
      <rect x="-31" y="-7" width="28" height="29" rx="3" fill="#071422" stroke="#3b6587"/>
      <path d="M-17 -7V22 M-31 8H-3" stroke="#355b78"/>
      <rect x="9" y="-7" width="24" height="56" rx="3" fill="#081521" stroke="#456f8e"/>
      <circle cx="27" cy="22" r="2" fill="#ddbc7f"/>
      <path d="M-47 51H47" stroke="#0a101b" stroke-width="7" stroke-linecap="round"/></g>'''


def bank(prefix):
    return f'''<g fill="url(#{prefix}-metal)" stroke="#4a7fa6" stroke-width="1.5"><path d="M-36 -18L0 -41L36 -18Z"/><rect x="-33" y="-12" width="66" height="6" rx="2"/>
      <path d="M-24 -6V29 M-8 -6V29 M8 -6V29 M24 -6V29" stroke-width="6"/>
      <rect x="-36" y="29" width="72" height="8" rx="2"/><circle cy="-25" r="4" fill="#dabb7f" stroke="none"/></g>'''


def network_icon():
    return '''<g fill="none" stroke="#5aa7db" stroke-width="1.6"><circle r="32"/><ellipse rx="13" ry="32"/><path d="M-30 -11H30 M-30 11H30 M-32 0H32"/></g>'''


def token(path, gold=False, delay=0, duration=4):
    color = ' axp-art-coin' if gold else ''
    return f'''<circle r="4.5" class="axp-art-motion axp-art-token{color}" style="offset-path:path('{path}');animation-delay:{delay}s;animation-duration:{duration}s"/>'''


def terminal(prefix):
    keys = ''.join(f'<rect x="{x}" y="{y}" width="39" height="18" rx="4"/>' for y in [32, 59, 86] for x in [-68, -19, 30])
    return f'''<rect x="-89" y="-73" width="178" height="180" rx="20" fill="url(#{prefix}-metal)" stroke="#4a789d" stroke-width="2"/>
      <rect x="-77" y="-60" width="154" height="77" rx="9" fill="#06121f" stroke="#255270"/>
      <text x="0" y="-38" class="axp-art-terminal-small">รายการชำระเงิน</text>
      <g fill="#0b1e31" stroke="#365d7e" stroke-width="1.3">{keys}</g>
      <path d="M-43 111H43" stroke="#02070f" stroke-width="5" stroke-linecap="round"/>'''


def caption(x, y, text, small=False):
    return f'<text x="{x}" y="{y}" class="axp-art-label{" axp-art-label-small" if small else ""}">{text}</text>'


def payment_picture():
    pictures = []
    for mobile in [False, True]:
        p = 'tap-mobile' if mobile else 'tap-desktop'
        view = '0 0 420 490' if mobile else '0 0 820 440'
        card_at, pos_at, shop_at, amex_at = ((165, 96), (132, 240), (316, 362), (322, 157)) if mobile else ((341, 104), (357, 235), (118, 233), (677, 220))
        cx, cy = card_at
        px, py = pos_at
        sx, sy = shop_at
        ax, ay = amex_at
        amex_edge = 53 if mobile else 62
        paths = [
            f'M{px + 94} {py - 25}Q{ax - 72} {py - 110} {ax - amex_edge} {ay}',
            f'M{ax - amex_edge} {ay}Q{ax - 72} {py - 110} {px + 98} {py - 25}',
            (f'M{ax} {ay + 33}Q{ax + 30} {sy - 50} {sx} {sy - 45}' if mobile else f'M{ax} {ay + 33}C{ax} 399 {sx} 399 {sx} {sy + 48}'),
            (f'M{cx + 75} {cy}Q340 54 {ax} {ay - 43}' if mobile else f'M{cx + 72} {cy - 15}Q659 23 {ax} {ay - 43}'),
        ]
        stages = ''.join(f'<g class="axp-sequence-route axp-art-payment-route" data-route="{i}"><path class="axp-art-wire" d="{path}" marker-end="url(#{p}-{"money-arrow" if i > 1 else "arrow"})"/>{token(path, i > 1, duration=3.4)}</g>' for i, path in enumerate(paths))
        labels = ['ส่งคำขอ', 'อนุมัติแล้ว', 'ชำระให้ร้าน', 'สมาชิกจ่ายคืน']
        screen = ''.join(f'<g class="axp-sequence-route axp-art-screen" data-route="{i}"><text x="0" y="-8" class="axp-art-terminal-status">{label}</text></g>' for i, label in enumerate(labels))
        tap = '''<g class="axp-art-motion axp-art-contactless" fill="none" stroke="#81c7fa" stroke-width="2.5" stroke-linecap="round"><path d="M0 0Q12 10 0 20"/><path d="M10 -7Q31 10 10 27"/><path d="M20 -14Q49 10 20 34"/></g>'''
        pictures.append(f'''<svg class="axp-art-svg axp-art-{'narrow' if mobile else 'wide'}" viewBox="{view}" aria-hidden="true">
          {defs(p)}<ellipse cx="{px}" cy="{py + 58}" rx="185" ry="160" fill="url(#{p}-halo)"/>
          <ellipse cx="{px}" cy="{py + 130}" rx="90" ry="10" fill="#020812" opacity=".6"/>
          {stages}
          <g transform="translate({sx} {sy})">{shop(p, .72 if mobile else .95)}</g>
          <g class="axp-art-hub" transform="translate({ax} {ay})">{logo(p, .86 if mobile else 1.05)}</g>
          <g transform="translate({px} {py})">{terminal(p)}{screen}</g>
          <g transform="translate({cx} {cy}) rotate(-16)"><g class="axp-art-motion axp-art-tap">{card(p)}</g></g>
          <g transform="translate({px + 9} {py - 111})">{tap}</g>
          {caption(sx, sy + (72 if mobile else 88), 'ร้านค้า')}
          {caption(px, py + 151, 'เครื่องรับบัตร (POS)')}
          {caption(ax, ay + 68, 'Amex')}
          {caption(cx - 16, cy - 77 if not mobile else 32, 'สมาชิกแตะบัตร')}
        </svg>''')
    return '<div class="axp-picture-stage axp-picture-payment">' + ''.join(pictures) + '</div>'


def loop_picture():
    pictures = []
    for mobile in [False, True]:
        p = 'loop-mobile' if mobile else 'loop-desktop'
        view = '0 0 420 350' if mobile else '0 0 820 210'
        points = [(65, 63), (210, 63), (355, 63), (355, 243), (65, 243)] if mobile else [(64, 80), (237, 80), (410, 80), (583, 80), (756, 80)]
        line = 'M65 63H355V243H65' if mobile else 'M64 80H756'
        icons = [card(p, 65, 41), bank(p), network_icon(), bank(p), shop(p, .65)]
        titles = ['ผู้ถือบัตร', 'ผู้ออกบัตร', 'เครือข่าย', 'ผู้รับชำระ', 'ร้านค้า']
        objects = ''.join(f'<g transform="translate({x} {y})">{icon}</g>{caption(x, y + 65, title)}' for (x, y), icon, title in zip(points, icons, titles))
        tolls = ''.join(f'''<g transform="translate({points[i][0]} {points[i][1]})"><path class="axp-art-toll" d="M-18 -49V-61H18V-49"/>
          <circle r="4" class="axp-art-motion axp-art-token axp-art-coin" style="offset-path:path('M0 0V35');animation-delay:{-i}s;animation-duration:3.5s"/></g>''' for i in [1, 2, 3])
        open_svg = f'''<svg class="axp-art-svg axp-art-{'narrow' if mobile else 'wide'}" viewBox="{view}" aria-hidden="true">{defs(p)}
          <path class="axp-art-pipe-base" d="{line}"/><path class="axp-art-motion axp-art-pipe" d="{line}"/>
          {token(line, duration=7)}{objects}{tolls}</svg>'''
        pictures.append(('open', open_svg))
        cp = p + '-closed'
        cview = '0 0 420 350' if mobile else '0 0 820 290'
        center, hub_y, left, right, side_y, bottom = (210, 63, 65, 355, 196, 296) if mobile else (410, 65, 190, 630, 156, 243)
        loop = f'M{center} {hub_y}C{right} {hub_y} {right} {hub_y + 45} {right} {side_y}C{right} {bottom} {left} {bottom} {left} {side_y}C{left} {hub_y + 45} {left} {hub_y} {center} {hub_y}Z'
        closed_svg = f'''<svg class="axp-art-svg axp-art-{'narrow' if mobile else 'wide'}" viewBox="{cview}" aria-hidden="true">{defs(cp)}
          <ellipse cx="{center}" cy="{side_y}" rx="122" ry="106" fill="url(#{cp}-halo)"/>
          <path class="axp-art-pipe-base" d="{loop}"/><path class="axp-art-motion axp-art-pipe" d="{loop}"/>
          <path class="axp-art-data-link" d="M{left} {side_y}Q{center} {hub_y + 35} {right} {side_y}"/>
          <circle cx="{center}" cy="{side_y}" r="55" class="axp-art-motion axp-art-ring"/>
          {token(loop, True, duration=8)}{token(loop, False, -4, 8)}
          <g transform="translate({left} {side_y})">{card(cp, 73, 46)}</g>
          <g transform="translate({right} {side_y})">{shop(cp, .7)}</g>
          <g class="axp-art-hub" transform="translate({center} {hub_y})">{logo(cp)}</g>
          {caption(left, side_y + 66, 'ผู้ถือบัตร')}{caption(right, side_y + 66, 'ร้านค้า')}
          {caption(center, side_y - 2, 'เชื่อมข้อมูล')}{caption(center, side_y + 22, 'สองฝั่ง', True)}
        </svg>'''
        pictures.append(('closed', closed_svg))
    return '<div class="axp-loop-comparison"><div class="axp-loop-half"><h4><span>OPEN-LOOP</span> หลายฝ่ายทำงานร่วมกัน</h4><p>รูปแบบทั่วไปของ Visa / Mastercard</p>' + ''.join(svg for name, svg in pictures if name == 'open') + '</div><div class="axp-loop-half"><h4><span>CLOSED-LOOP</span> Amex เชื่อมบทบาทหลัก</h4><p>ภาพส่วนที่ Amex ออกบัตรและรับร้านค้าเอง</p>' + ''.join(svg for name, svg in pictures if name == 'closed') + '</div></div>'


def network_picture():
    pictures = []
    for mobile in [False, True]:
        p = 'network-mobile' if mobile else 'network-desktop'
        view = '0 0 420 490' if mobile else '0 0 820 350'
        cx, cy, ax, ay, sx, sy = (210, 70, 210, 234, 210, 385) if mobile else (103, 149, 410, 157, 702, 149)
        paths = ['M210 70C35 155 100 225 210 234C350 245 365 315 210 385', 'M210 385C40 315 68 250 210 234C355 214 375 145 210 70'] if mobile else ['M143 149Q272 57 410 139Q530 57 661 149', 'M661 174Q530 271 410 180Q272 271 143 174']
        paths += ['M210 70Q82 151 210 234Q355 302 210 385', 'M210 385Q61 309 210 234Q354 148 210 70'] if mobile else ['M143 163Q280 106 410 158Q548 106 661 163', 'M661 174Q542 217 410 169Q281 217 143 174']
        lines = ''.join(f'<path class="axp-art-field {"axp-art-field-gold" if i % 2 else ""}" d="{path}"/>{token(path, bool(i % 2), -i * 1.2, 4.6)}' for i, path in enumerate(paths))
        cards = ''.join(f'<g transform="rotate({angle})" opacity="{opacity}">{card(p, 116, 74)}</g>' for angle, opacity in [(-20, .4), (-10, .7), (0, 1)])
        pictures.append(f'''<svg class="axp-art-svg axp-art-{'narrow' if mobile else 'wide'}" viewBox="{view}" aria-hidden="true">{defs(p)}
          <ellipse cx="{ax}" cy="{ay}" rx="105" ry="105" fill="url(#{p}-halo)"/>{lines}
          <g transform="translate({cx} {cy})"><g class="axp-art-motion axp-art-float">{cards}</g></g>
          <g class="axp-art-hub" transform="translate({ax} {ay})">{logo(p, 1.05)}</g>
          <g transform="translate({sx - 50} {sy + 38})">{shop(p, .52)}</g>
          <g transform="translate({sx + 47} {sy + 30})">{shop(p, .62)}</g>
          <g transform="translate({sx} {sy - 8})"><g class="axp-art-motion axp-art-store">{shop(p, .85)}</g></g>
          {caption(cx, cy + 79, 'สมาชิก')}{caption(ax, ay + 58, 'เชื่อมสองฝั่ง', True)}{caption(sx, sy + 80, 'ร้านค้า')}
        </svg>''')
    return '<div class="axp-picture-stage axp-picture-network">' + ''.join(pictures) + '</div><div class="axp-network-meaning"><p><strong>ร้านรับบัตรมากขึ้น</strong><span>สมาชิกมีโอกาสหยิบบัตรมาใช้</span></p><span aria-hidden="true">↔</span><p><strong>สมาชิกอยากใช้บัตร</strong><span>ร้านค้ามีเหตุผลในการรับบัตร</span></p></div>'


def picture_figure(name, eyebrow, title, visual, caption_text):
    return f'''<figure id="{name}" class="axp-picture-figure" aria-labelledby="{name}-title" data-paused="false" data-offscreen="true">
      <div class="axp-explainer-top"><div><span class="axp-eyebrow">{eyebrow}</span><h3 id="{name}-title">{title}</h3></div>
      <button class="axp-picture-toggle" type="button" aria-pressed="false" hidden>หยุดภาพ</button></div>
      {visual}<figcaption>{caption_text}</figcaption></figure>'''
