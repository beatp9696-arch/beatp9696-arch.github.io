"""Render the authored Thai business explainer without altering the technical report.

Run from this checkout with Python containing markdown and beautifulsoup4.
"""
from pathlib import Path
import html
import json
import re
import markdown
from bs4 import BeautifulSoup, Comment
from axp_picture_scenes import payment_picture, loop_picture, network_picture, picture_figure

ROOT = Path(__file__).resolve().parents[1]
PAGE = ROOT / 'articles/deep-dive-axp.html'
PACK = ROOT / 'articles/research/axp-2026-09-23'
raw = PAGE.read_text()
old = BeautifulSoup(raw, 'html.parser')
source = (PACK / 'business-explained-th.md').read_text()
refs = dict(re.findall(r'^\[([^\]]+)\]: (https?://\S+)', source, re.M))
ref_names = {'K25': '10-K 2025', 'AR25': 'Annual Report 2025', 'PAYMENTS': 'Amex Merchant Payments', 'MERCHANT': 'Amex Merchant Support', 'OPTBLUE': 'Amex OptBlue', 'POT': 'Amex Pay Over Time', 'NOFEE': 'Amex Australia', 'VISA': 'Visa Investor FAQ'}
for key, url in refs.items():
    source = re.sub(r'\[([^\]]+)\]\[' + re.escape(key) + r'\]', lambda m: '[' + m[1] + '](' + url + ')', source)
    source = re.sub(r'\[' + re.escape(key) + r'\](?![:(])', lambda m: '[' + ref_names[key] + '](' + url + ')', source)
# The standalone source uses both named and bare references.
source = re.sub(r'^# .*\n', '', source, count=1)
body = BeautifulSoup(markdown.markdown(source), 'html.parser')

def node(label, detail, x, y, classes=''):
    return f'<div class="axp-sequence-node {classes}" style="--x:{x}%;--y:{y}%"><strong>{label}</strong><span>{detail}</span></div>'

def route(index, line, motion, money=False):
    kind = ' axp-route-money' if money else ''
    marker = 'money' if money else 'request'
    paths = ''.join(f'<path d="{part.strip()}" marker-end="url(#axp-explain-{marker}-arrow)"/>' for part in re.findall(r'M[^M]+', line))
    return f'''<g class="axp-sequence-route{kind}" data-route="{index}">{paths}
      <circle r="4.5" class="axp-sequence-token" style="offset-path:path('{motion}')"/></g>'''

def sequence(name, eyebrow, title, steps, visual, caption):
    buttons = ''.join(f'<button type="button" data-sequence-select="{i}" aria-pressed="{str(i == 0).lower()}" aria-controls="{name}-step-{i}"><span class="axp-step-number">0{i+1}</span>{label}</button>' for i, (label, _, _) in enumerate(steps))
    panels = ''.join(f'<div class="axp-sequence-panel" id="{name}-step-{i}"><span class="axp-sequence-phase">ขั้นที่ {i+1} / {len(steps)}</span><h4>{heading}</h4>{content}</div>' for i, (_, heading, content) in enumerate(steps))
    return f'''<figure class="axp-explainer axp-{name}" aria-labelledby="{name}-diagram-title" data-active="0" data-paused="true" data-offscreen="true">
      <div class="axp-explainer-top"><div><span class="axp-eyebrow">{eyebrow}</span><h3 id="{name}-diagram-title">{title}</h3></div><button class="axp-sequence-motion" type="button" aria-pressed="false" hidden>เล่นลำดับ</button></div>
      {visual}
      <div class="axp-sequence-selectors" role="group" aria-label="เลือกขั้นตอน: {title}" style="--steps:{len(steps)}">{buttons}</div>
      <div class="axp-sequence-panels">{panels}</div>
      <figcaption>{caption}</figcaption>
    </figure>'''

payment_visual = '''<svg class="axp-shared-defs" width="0" height="0" aria-hidden="true"><defs><marker id="axp-explain-money-arrow" viewBox="0 0 10 10" markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto" markerUnits="userSpaceOnUse"><path d="M1 1L9 5L1 9" fill="none" stroke="#94d5bb" stroke-width="1.7"/></marker><marker id="axp-explain-request-arrow" viewBox="0 0 10 10" markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto" markerUnits="userSpaceOnUse"><path d="M1 1L9 5L1 9" fill="none" stroke="#ddbe82" stroke-width="1.7"/></marker></defs></svg>'''
payment_visual += payment_picture()
payment_visual += '<div class="axp-art-legend"><span>● คำขอและคำตอบ</span><span>● การชำระเงิน</span></div>'
payment = sequence('payment', 'จากการแตะบัตรสู่การจ่ายคืน', 'เงินไม่ได้เดินพร้อมกันทุกฝั่ง', [
    ('ส่งคำขอ', 'ร้านส่งคำขออนุมัติรายการ', '<p>สมาชิกเลือกใช้บัตร ร้านส่งข้อมูลรายการเข้าสู่ระบบเพื่อขออนุมัติ ในขั้นนี้สิ่งที่เดินทางคือคำขอชำระเงิน ร้านยังไม่ได้รับเงินจากการอนุมัติเพียงอย่างเดียว</p>'),
    ('อนุมัติ', 'ตรวจบัญชีและความเสี่ยง แล้วตอบกลับร้าน', '<p>สำหรับบัตรที่ออกเอง Amex พิจารณาสถานะบัญชี กำลังซื้อ และความเสี่ยงของรายการ เมื่ออนุมัติ ร้านจึงดำเนินการขายต่อได้ รายการที่ไม่ผ่านเงื่อนไขอาจถูกปฏิเสธ</p>'),
    ('จ่ายร้านค้า', 'ร้านส่งเรียกเก็บ แล้วรับเงินตามรอบ', '<p>หลังส่งรายการเพื่อชำระบัญชี ร้านได้รับเงินตามสัญญา โดยมีค่าธรรมเนียมและรายการปรับปรุงที่เกี่ยวข้อง Amex ต้องจัดการเงินทุนรองรับ ขณะที่ยอดของสมาชิกอาจยังไม่ถึงกำหนดจ่าย</p>'),
    ('สมาชิกจ่ายคืน', 'เงินกลับมาจากสมาชิกในอีกจังหวะหนึ่ง', '<p>สมาชิกชำระตามบัญชีบัตร บางรายจ่ายเต็ม บางรายมีสินเชื่อที่คิดดอกเบี้ยตามเงื่อนไข ถ้าเรียกเก็บคืนไม่ได้ ฝั่งผู้ออกบัตรมีความเสี่ยงเครดิตที่ต้องรับมือ</p>'),
], payment_visual, 'ตัวอย่างบัตรที่ Amex ออกเองและรับร้านค้าโดยตรง · ระยะเวลาเป็นภาพอธิบายลำดับ ไม่ใช่เวลาชำระเงินจริง · <a href="' + refs['PAYMENTS'] + '">Merchant Payments</a> / <a href="' + refs['K25'] + '">10-K 2025</a>')

profit_rows = [('+', 'รายได้จากความสัมพันธ์ลูกค้า', 'ค่ารับบัตร · ค่าสมาชิก · ดอกเบี้ยรับ · บริการอื่น'), ('−', 'รางวัลและพาร์ทเนอร์', 'ต้นทุนการให้คุณค่าแก่สมาชิก'), ('−', 'ระบบ บริการ และการหาลูกค้า', 'ต้นทุนทำให้ธุรกิจใช้งานได้และเติบโต'), ('−', 'เงินทุนและเครดิต', 'ดอกเบี้ยจ่ายและค่าใช้จ่ายความเสียหายเครดิต'), ('=', 'หลังภาษี เหลือเป็นกำไร', 'ผลที่ต้องอ่านคู่กับเงินทุนที่ใช้รองรับธุรกิจ')]
profit_visual = '<ol class="axp-profit-flow" aria-label="จากรายได้สู่กำไร">' + ''.join(f'<li data-reveal="{i}"><span class="axp-profit-symbol" aria-hidden="true">{symbol}</span><div><strong>{title}</strong><span>{detail}</span></div></li>' for i, (symbol, title, detail) in enumerate(profit_rows)) + '</ol>'
profit = sequence('economics', 'อ่านงบผ่านสิ่งที่ธุรกิจต้องทำ', 'รายได้เดินทางมาเป็นกำไรอย่างไร', [
    ('รายได้', 'การใช้บัตรสร้างเงินเข้าได้หลายทาง', '<p>ร้านค้าจ่ายค่ารับบัตร สมาชิกบางผลิตภัณฑ์จ่ายค่ารายปี ยอดสินเชื่อที่เข้าเงื่อนไขสร้างดอกเบี้ย และธุรกิจยังมีรายได้บริการอื่น ยอดซื้อของทั้งก้อนไม่ใช่รายได้ของบริษัท</p>'),
    ('ให้คุณค่า', 'สิทธิประโยชน์ที่ลูกค้าได้รับมีต้นทุน', '<p>แต้ม บริการ และพาร์ทเนอร์ช่วยให้สมาชิกอยากใช้บัตรต่อ ต้องดูว่าความสัมพันธ์และการใช้จ่ายที่เพิ่มคุ้มกับต้นทุนเหล่านี้หรือไม่</p>'),
    ('ดำเนินงาน', 'ระบบและคนทำให้เครือข่ายเดินได้', '<p>บริษัทต้องลงทุนในเทคโนโลยี การประมวลผล การบริการ และการหาลูกค้า บางต้นทุนรองรับการใช้งานเพิ่มได้ แต่บางส่วนเพิ่มตามการใช้งานและระดับบริการ</p>'),
    ('รับความเสี่ยง', 'การจ่ายให้ร้านก่อน มีต้นทุนและความเสี่ยง', '<p>แหล่งเงินมีดอกเบี้ยจ่าย และลูกหนี้อาจชำระคืนไม่ครบ ภาพนี้เริ่มจากดอกเบี้ยรับก่อนหักต้นทุนเงิน หากอ่าน net interest income ในงบ ต้นทุนดอกเบี้ยถูกหักแล้ว จึงไม่หักซ้ำ</p>'),
    ('กำไร', 'รายได้ที่เหลือต้องคุ้มกับทุนที่ใช้', '<p>หลังหักต้นทุน ค่าใช้จ่ายเครดิต และภาษี จึงเหลือกำไร การเติบโตที่ดีต้องสร้างผลเพิ่มอย่างคุ้มค่า ขณะยังมีสภาพคล่องและเงินกองทุนรองรับธุรกิจ</p>'),
], profit_visual, 'ภาพอธิบายความสัมพันธ์ของรายได้และต้นทุน ขนาดกล่องไม่แทนสัดส่วนเงินจริง · รายการบัญชีอาจมีการจัดประเภทและหักกลบตามงบ · <a href="' + refs['K25'] + '">10-K 2025</a>')

fund_visual = '''<div class="axp-sequence-map axp-funding-map" aria-hidden="true"><svg viewBox="0 0 640 300" preserveAspectRatio="none" class="axp-sequence-svg"><path class="axp-sequence-track" d="M100 78H540 M320 78V236"/>'''
fund_visual += route(0, 'M182 78H237', 'M100 78H320', True)
fund_visual += route(1, 'M403 78H458', 'M320 78H540', True)
fund_visual += route(2, 'M320 201V113', 'M320 236V78', True)
fund_visual += route(3, 'M237 78H182', 'M320 78H100', True)
fund_visual += '</svg>' + node('ผู้ฝากเงิน / ผู้ให้กู้', 'แหล่งเงินที่ต้องจ่ายคืน', 15.625, 26) + node('Amex', 'จัดการเงินทุน', 50, 26, 'axp-sequence-hub') + node('ร้านค้า', 'รับเงินตามรอบ', 84.375, 26) + node('สมาชิก', 'มีภาระชำระบัญชีบัตร', 50, 78.67) + '</div>'
funding = sequence('funding', 'เงินหมุนกับเงินกองทุนทำหน้าที่ต่างกัน', 'จ่ายให้ร้านก่อน เก็บจากสมาชิกภายหลัง', [
    ('จัดหาเงิน', 'รับเงินทุนพร้อมภาระที่ต้องดูแล', '<p>เงินฝากและหนี้ช่วยรองรับธุรกิจบัตร แต่มีต้นทุนและเงื่อนไขจ่ายคืน บริษัทต้องรักษาความพร้อมของแหล่งเงินเหล่านี้ร่วมกับทุนของตัวเอง</p>'),
    ('จ่ายร้านค้า', 'ชำระให้ร้านตามกำหนดของสัญญา', '<p>เมื่อร้านส่งรายการ Amex มีภาระจัดการการชำระบัญชีตามเงื่อนไข ขณะเดียวกันมีลูกหนี้ฝั่งสมาชิก จึงต้องมีสภาพคล่องรองรับช่วงเวลาระหว่างสองฝั่ง</p>'),
    ('รับชำระ', 'สมาชิกจ่ายคืนตามเงื่อนไขบัญชี', '<p>เมื่อสมาชิกชำระ เงินกลับเข้าสู่การบริหารสภาพคล่อง หากจ่ายช้าหรือไม่ครบ บริษัทต้องรับมือทั้งการใช้เงินทุนที่นานขึ้นและความเสี่ยงเครดิต</p>'),
    ('ดูแลแหล่งเงิน', 'จ่ายคืน จ่ายต้นทุน และเตรียมรอบถัดไป', '<p>บริษัทบริหารการคืนเงินฝากและหนี้ตามกำหนด พร้อมเตรียมเงินสำหรับธุรกรรมใหม่ ภาระเหล่านี้มีตารางเวลาของตัวเอง จึงไม่รอให้ลูกหนี้รายใดรายหนึ่งจ่ายคืนก่อนเสมอ</p>'),
], fund_visual, 'ภาพรวมการบริหารเงิน ไม่ได้จับคู่เงินฝากรายหนึ่งกับธุรกรรมรายหนึ่ง · ทุนผู้ถือหุ้นช่วยรองรับความเสียหายและข้อกำกับ ส่วนสภาพคล่องช่วยให้ชำระภาระตรงเวลา · <a href="' + refs['K25'] + '">10-K 2025</a>')

loop_scene = picture_figure('network-structure', 'OPEN-LOOP / CLOSED-LOOP', 'เบื้องหลังการจ่ายเงิน ใครทำหน้าที่อะไร', loop_picture(), 'เส้นทางแสดงความเชื่อมโยงของบทบาท ไม่ใช่สัดส่วนค่าธรรมเนียมหรือความเร็วจริง · Amex มีพาร์ทเนอร์ร่วมออกบัตรและรับร้านค้าด้วย จึงไม่ได้ทำทุกบทบาทเองในทุกรายการ · <a href="' + refs['K25'] + '">10-K 2025</a> / <a href="' + refs['VISA'] + '">Visa Investor FAQ</a>')
network_scene = picture_figure('two-sided-network', 'TWO-SIDED NETWORK', 'สมาชิกกับร้านค้า ช่วยเพิ่มคุณค่าให้กัน', network_picture(), 'ภาพอธิบายแรงหนุนระหว่างสองฝั่ง · การรับบัตรและสิทธิประโยชน์ต้องคุ้มกับต้นทุน วงจรจึงจะสร้างคุณค่าได้ต่อเนื่อง · <a href="' + refs['K25'] + '">10-K 2025</a>')

for name, content in [('TRANSACTION', payment), ('LOOP-COMPARISON', loop_scene), ('TWO-SIDED-NETWORK', network_scene), ('ECONOMICS', profit), ('FUNDING', funding), ('FLYWHEEL', str(old.select_one('.axp-flywheel')))]:
    marker = next(e for e in body.find_all(string=lambda t: isinstance(t, Comment)) if e.strip() == name)
    marker.replace_with(BeautifulSoup(content, 'html.parser'))

ids = ['overview', 'business', 'segments', 'revenue', 'financials', 'funding', 'credit', 'moat', 'competitors', 'growth', 'monitoring', 'sources']
labels = ['ลูกค้าเลือก Amex ไปทำอะไร', 'เบื้องหลังการจ่ายเงิน', 'ลูกค้าของแต่ละหน่วยธุรกิจ', 'คุณค่าเปลี่ยนเป็นรายได้อย่างไร', 'จากรายได้สู่กำไร', 'เงินที่จ่ายร้านมาจากไหน', 'ความเสี่ยงเมื่อให้จ่ายภายหลัง', 'วงจรที่ทำให้ธุรกิจแข็งแรง', 'คู่แข่งแย่งอะไรจาก Amex', 'ทางเติบโตและสิ่งที่ต้องแลก', 'ดูคุณภาพธุรกิจจากอะไร', 'เอกสารและงบประกอบ']
article = body.new_tag('article', attrs={'class': 'axp-content axp-study axp-business-study', 'aria-label': 'อธิบายธุรกิจ American Express เชิงลึก'})
section = None
index = 0
for element in list(body.contents):
    if getattr(element, 'name', None) == 'h2':
        ident = ids[index]
        section = body.new_tag('section', id=ident, attrs={'aria-labelledby': ident+'-title'})
        element['id'] = ident+'-title'
        article.append(section)
        index += 1
    if section:
        section.append(element.extract())
assert index == len(ids)
for i, heading in enumerate(article.select('h3'), 1):
    if not heading.get('id'):
        heading['id'] = 'business-topic-' + str(i)
for a in article.select('a[href]'):
    if a['href'] in refs.values():
        a['class'] = ['axp-source-ref']
        a['title'] = 'แหล่งอ้างอิง: ' + a.get_text()
# Keep older shared fragments usable while the TOC follows the new reading order.
aliases = {'cutoff':'sources','operating':'growth','quarter':'sources','management':'funding','risks':'credit','macro':'credit','valuation':'sources','cases':'sources','margin':'sources','market':'sources','catalysts':'growth','thesis':'monitoring','conclusion':'monitoring','assumptions':'sources'}
aliases.update({'sec-1':'overview','sec-2':'segments','sec-3':'moat','sec-4':'financials','sec-5':'growth','sec-6':'credit','sec-7':'monitoring','sec-8':'sources','sec-9':'monitoring'})
for alias, target in aliases.items():
    article.find('section', id=target).insert(0, body.new_tag('span', id=alias, attrs={'class':'axp-anchor-alias','aria-hidden':'true'}))
for selector in ['.related', 'p.back']:
    element = old.select_one(selector)
    if element:
        article.append(element.extract())
hero = old.select_one('.axp-hero')
hero.select_one('.axp-eyebrow').string = 'MOATRICES / BUSINESS EXPLAINED / AXP'
hero.h1.clear()
hero.h1.append('American Express')
hero.h1.append(old.new_tag('br'))
hero.h1.append('เบื้องหลังบัตรหนึ่งใบ มีธุรกิจอะไรอยู่บ้าง')
hero.select_one('.lead').string = 'เริ่มจากเหตุผลที่คนเลือกใช้บัตร ตามดูเงินที่เดินระหว่างสมาชิก ร้านค้า และ Amex แล้วค่อยแกะว่าบริษัทสร้างรายได้ จ่ายต้นทุน และรับความเสี่ยงอย่างไร พร้อมภาพเคลื่อนไหวที่กดสำรวจทีละขั้นได้'
hero.select_one('#card-story-0 p').string = 'สมาชิกเลือกบัตรจากบริการและสิทธิที่ใช้ได้จริง บัตรบางประเภทมีค่ารายปี ความสัมพันธ์นี้ต้องคุ้มค่าพอให้กลับมาใช้และถือบัตรต่อ'
hero.select_one('.axp-dateline').clear()
hero.select_one('.axp-dateline').append(BeautifulSoup('โดย Moatrices · เรียบเรียงใหม่ <time datetime="2026-09-23">23 ก.ย. 2026</time> · เผยแพร่ครั้งแรก <time datetime="2026-06-27">27 มิ.ย. 2026</time><br>ศึกษาธุรกิจเชิงลึก · 12 หัวข้อ · มีรายงานงบ Q2 2026 ให้อ่านประกอบ', 'html.parser'))
nav = hero.select_one('.axp-edition-nav')
nav.select_one('span').string = 'เข้าใจธุรกิจ · ภาษาไทย'
nav.select_one('a').string = 'งบการเงินและการประเมินมูลค่า ↗'
nav.select('a')[1].string = 'ตามดูการจ่ายเงินหนึ่งครั้ง ↓'
nav.select('a')[1]['href'] = '#business'
toc = '<nav class="toc axp-toc axp-toc--technical" aria-label="สารบัญอธิบายธุรกิจ"><div class="toc-title">เข้าใจธุรกิจ Amex</div><ol>' + ''.join(f'<li><a href="#{ident}">{i}. {label}</a></li>' for i, (ident, label) in enumerate(zip(ids, labels), 1)) + '</ol></nav>'
main = '<main id="main-content" data-editorial-layout="manual"><div class="container">\n' + str(hero) + '\n<div class="axp-layout">' + toc + '\n' + str(article) + '\n</div>\n</div></main>'
raw = re.sub(r'<main\b.*?</main>', lambda m: main, raw, flags=re.S)
headline = 'American Express (AXP) — เบื้องหลังบัตรหนึ่งใบ มีธุรกิจอะไรอยู่บ้าง'
description = 'อธิบายธุรกิจ Amex เชิงลึก: ลูกค้าใช้บัตรทำอะไร เส้นทางเงินจากการจ่ายหนึ่งครั้ง รายได้และต้นทุน แหล่งเงินทุน เครดิต และคูเมือง พร้อมภาพเคลื่อนไหวและรายงานงบ Q2 2026 ประกอบ'
raw = re.sub(r'<title>.*?</title>', lambda m: '<title>' + headline + ' | Moatrices</title>', raw, count=1)
for field, value in [('name="description"', description), ('property="og:title"', headline), ('property="og:description"', description)]:
    raw = re.sub(r'(<meta ' + field + r' content=")[^"]*(">)', lambda m: m[1]+html.escape(value, quote=True)+m[2], raw, count=1)
def schema_update(match):
    obj = json.loads(match[1])
    if obj['@type'] == 'BlogPosting':
        obj.update(headline=headline, description=description, articleSection='อธิบายธุรกิจเชิงลึก')
    elif obj['@type'] == 'BreadcrumbList':
        obj['itemListElement'][-1]['name'] = headline
    return '<script type="application/ld+json">' + json.dumps(obj, ensure_ascii=False) + '</script>'
raw = re.sub(r'<script type="application/ld\+json">(.*?)</script>', schema_update, raw, flags=re.S)
PAGE.write_text(raw)
print(json.dumps({'sections': index, 'tables': len(article.select('table')), 'explainers': len(article.select('.axp-explainer'))}))
