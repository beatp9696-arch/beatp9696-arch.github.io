"""Build a public-only 13F dataset from downloaded SEC XML and a source manifest.

Usage: python3 pp-os/tools/build-smart-money.py /path/to/sources.json
The manifest maps fund IDs to [current, previous] records containing reportDate,
filingDate, indexURL, and cover/table objects with local file and original SEC url.
Each period may include amendments in amendment-number order using the same
record structure. RESTATEMENT replaces older tables; NEW HOLDINGS is additive.
An explicitly reviewed table/cover difference must be recorded in the manifest
as reviewedTableDifference (table sum minus cover sum). All other mismatches fail.
Emits a catalog plus immutable per-fund detail files. Curated political disclosures
come from data/smart-money-disclosures.json. Values in these post-2022 filings
are USD, not thousands. Never read or merge the user's private portfolio storage.
"""
from pathlib import Path
import json
import sys
import hashlib
import xml.etree.ElementTree as ET

FUNDS = {
    'berkshire': dict(name='Berkshire Hathaway', subtitle='พอร์ตหุ้นที่ Berkshire เปิดเผย', category='investor', monogram='BRK', brandCaption='Berkshire', note='ข้อมูลหุ้นในรายงานของ Berkshire ไม่ใช่พอร์ตส่วนตัวของ Warren Buffett และไม่รวมเงินสดหรือบริษัทลูกที่ถือครองทั้งหมด'),
    'nvidia': dict(name='NVIDIA Portfolio', subtitle='การลงทุนของบริษัท NVIDIA', category='company', monogram='NV', brandCaption='NVIDIA', note='เป็นการลงทุนที่ NVIDIA รายงาน ไม่ใช่พอร์ตหุ้นส่วนตัวของ Jensen Huang และไม่ครอบคลุมการลงทุนเอกชนทั้งหมด'),
    'temasek': dict(name='Temasek Holdings', subtitle='พอร์ตหลักทรัพย์ที่ยื่นต่อ SEC', category='company', monogram='TEMASEK', brandCaption='Singapore', note='แสดงเฉพาะรายการใน Information Table ชุดนี้ ซึ่งเป็น Combination Report ไม่ใช่มูลค่าพอร์ตทั่วโลกทั้งหมดของ Temasek'),
    'pershing': dict(name='Pershing Square', subtitle='Pershing Square Capital Management', category='investor', monogram='PS', brandCaption='Pershing Square', note='ชุดที่ตรวจสอบได้เป็น Q1 2026 จึงเก่ากว่าพอร์ตอื่นในหน้านี้ และรายงาน 13F ไม่แสดงฐานะ short หรือเครื่องมือป้องกันความเสี่ยงทั้งหมด'),
    'bridgewater': dict(name='Ray Dalio', subtitle='Bridgewater Associates · สถาบันที่ก่อตั้ง', category='investor', monogram='RD', brandCaption='Bridgewater', aliases=['Ray Dalio','raydalio','เรย์ ดาลิโอ','Bridgewater'], profileSource='https://www.bridgewater.com/our-founder', note='ใช้รายงานของ Bridgewater Associates ซึ่ง Ray Dalio ก่อตั้ง เขาส่งต่อการบริหารให้ผู้นำรุ่นถัดไปแล้ว จึงไม่ใช่พอร์ตส่วนตัวหรือรายการตัดสินใจลงทุนของเขาในปัจจุบัน'),
    'ark': dict(name='Cathie Wood', subtitle='ARK Investment Management', category='investor', monogram='CW', brandCaption='ARK Invest', aliases=['Cathie Wood','Catherine Wood','cathiewood','ARK','เคธี วูด'], profileSource='https://www.ark-invest.com/board-of-directors', note='พอร์ตหลักทรัพย์รวมที่ ARK Investment Management รายงาน ไม่ใช่พอร์ตส่วนตัวของ Cathie Wood และไม่ใช่เฉพาะกองทุน ARKK หรือข้อมูลซื้อขายรายวันของ ARK'),
    'daily-journal': dict(name='Charlie Munger', subtitle='Daily Journal · แฟ้มย้อนหลังปี 2023', category='investor', monogram='CM', brandCaption='Daily Journal', historical=True, aliases=['Charlie Munger','Charles Munger','Charles T. Munger','charles munger','ชาร์ลี มังเกอร์','Daily Journal'], profileSource='https://www.sec.gov/Archives/edgar/data/783412/000143774924026890/djco20240630_10q.htm', note='แฟ้มประวัติศาสตร์ ณ 30 กันยายน 2023 ก่อน Charlie Munger เสียชีวิตในเดือนพฤศจิกายน 2023 เป็นหลักทรัพย์ของ Daily Journal ที่เขาเคยดูแล ไม่ใช่พอร์ตส่วนตัวและไม่ใช่พอร์ตปัจจุบันของบริษัท'),
    'soros': dict(name='George Soros', subtitle='Soros Fund Management · สถาบันที่ก่อตั้ง', category='investor', monogram='GS', brandCaption='Soros Fund', aliases=['George Soros','Soros','โซรอส'], profileSource='https://sorosfundmgmt.com/', note='รายงานของ Soros Fund Management ซึ่ง George Soros ก่อตั้ง ปัจจุบันมีทีมบริหารการลงทุนและเป็นผู้จัดการสินทรัพย์หลักให้ Open Society Foundations ไม่ใช่พอร์ตส่วนตัวหรือการตัดสินใจรายรายการของ George Soros'),
    'blackrock': dict(name='BlackRock', subtitle='BlackRock, Inc. · รายงานรวมสถาบัน', category='institution', monogram='BLK', brandCaption='BlackRock', aliases=['BlackRock','แบล็คร็อก','iShares'], note='แสดงเฉพาะ Information Table ของ BlackRock, Inc. ชุด Combination Report นี้ ครอบคลุมสินทรัพย์ภายใต้ดุลยพินิจของผู้จัดการที่ระบุ รวมถึงของลูกค้าและกองทุน ไม่ใช่สินทรัพย์ของบริษัทเองทั้งหมดหรือ AUM ทั่วโลก'),
    'vanguard-capital': dict(name='Vanguard', subtitle='Vanguard Capital Management LLC', category='institution', monogram='VG', brandCaption='Vanguard', aliases=['Vanguard','แวนการ์ด','Vanguard Capital Management'], note='ใช้ผู้ยื่น Vanguard Capital Management LLC (CIK 2100119) ทั้งสองไตรมาส ไม่รวมรายงานของผู้จัดการ Vanguard รายอื่น และไม่เทียบข้ามกับ The Vanguard Group เดิม รอบก่อนรวมฉบับแก้ไขครั้งที่ 1 และรายการเพิ่มในครั้งที่ 2 แล้ว'),
    'state-street': dict(name='State Street', subtitle='State Street Corporation', category='institution', monogram='STT', brandCaption='State Street', aliases=['State Street','staate street','state streetb','SPDR','สเตท สตรีท'], note='รายงาน State Street Corporation รวมหลักทรัพย์ภายใต้ดุลยพินิจของผู้จัดการที่ระบุ เช่น กองทุนและบัญชีลูกค้า ไม่ใช่พอร์ตเงินลงทุนของธนาคารเองหรือมูลค่าทรัพย์สินที่รับฝากทั้งหมด'),
    'jpmorgan': dict(name='JPMorgan', subtitle='JPMorgan Chase & Co.', category='institution', monogram='JPM', brandCaption='JPMorgan', aliases=['JPMorgan','JP Morgan','JPM','เจพีมอร์แกน'], note='รายงาน JPMorgan Chase & Co. รวมหลักทรัพย์ภายใต้ดุลยพินิจของหลายหน่วยงานและลูกค้า ไม่ใช่พอร์ตส่วนตัวของผู้บริหารหรือสินทรัพย์ของธนาคารเองทั้งหมด รอบก่อนใช้รายงานฉบับแก้ไขแล้ว'),
    'morgan-stanley': dict(name='Morgan Stanley', subtitle='Morgan Stanley · รายงานรวมสถาบัน', category='institution', monogram='MS', brandCaption='Morgan Stanley', aliases=['Morgan Stanley','มอร์แกน สแตนลีย์'], note='เฉพาะ Information Table ของ Morgan Stanley ใน Combination Report นี้ รวมหลักทรัพย์ของบัญชีที่มีดุลยพินิจบริหาร ไม่ใช่พอร์ตของบริษัทเองทั้งหมด และไม่รวมสินทรัพย์ที่ผู้จัดการรายอื่นแยกยื่น'),
    'invesco': dict(name='Invesco', subtitle='Invesco Ltd. · รายงานรวมผู้จัดการ', category='institution', monogram='IVZ', brandCaption='Invesco', aliases=['Invesco','อินเวสโก','QQQ'], note='รายงานรวมของ Invesco Ltd. ไม่ใช่เฉพาะกองทุน QQQ และไม่ใช่สินทรัพย์ของบริษัทเองทั้งหมด รอบก่อนรวมรายการที่เพิ่มใน 13F-HR/A แล้ว การเปลี่ยนแปลงอาจสะท้อนขอบเขตผู้จัดการ กองทุน และกระแสเงินของลูกค้า'),
}
# Symbol labels for identifiable share classes; unknown securities retain the
# issuer's disclosed name rather than receiving a guessed ticker.
SYMBOLS = {
    '037833100':'AAPL','025816109':'AXP','191216100':'KO','02079K305':'GOOGL',
    '02079K107':'GOOG','060505104':'BAC','166764100':'CVX','674599105':'OXY',
    'G1087J108':'CB','458140100':'INTC','21873S108':'CRWV','19247G107':'COHR',
    '654902204':'NOK','871607107':'SNPS','N97284108':'NBIS','09290D101':'BLK',
    '92826C839':'V','67066G104':'NVDA','57636Q104':'MA','11135F101':'AVGO',
    '11271J107':'BN','023135106':'AMZN','90353T100':'UBER','594918104':'MSFT',
    '76131D103':'QSR','30303M102':'META','02005N100':'ALLY','247361702':'DAL',
    '526057104':'LEN','526057302':'LEN.B','651639106':'NYT','256677105':'DLTR',
    '79466L302':'CRM','46625H100':'JPM','007903107':'AMD','22160K105':'COST',
    '084670702':'BRK.B','G0403H108':'AON','254687106':'DIS','532457108':'LLY',
    '84615Q103':'SpaceX',
    '88160R101':'TSLA','90364P105':'TWST','771049103':'RBLX','770700102':'HOOD',
    '88023B103':'TEM','19260Q107':'COIN','82509L107':'SHOP','01609W102':'BABA',
    '949746101':'WFC','172967424':'C','78462F103':'SPY','464287200':'IVV',
    '922908363':'VOO','46090E103':'QQQ','464287234':'EEM','46434G103':'IEMG',
    '464287465':'EFA','46432F842':'IEFA','69608A108':'PLTR','64110L106':'NFLX',
}

def tags(element):
    return {node.tag.split('}')[-1]: (node.text or '').strip() for node in element.iter()}

def parse_filing(record):
    cover = tags(ET.parse(record['cover']['file']).getroot())
    assert cover.get('isConfidentialOmitted','false') == 'false', 'Confidential holdings require review'
    table = ET.parse(record['table']['file']).getroot()
    assert len(table) == int(cover['tableEntryTotal'])
    grouped = {}
    for item in table:
        row = tags(item)
        # Rows for different reporting managers are additive. Options and
        # principal-denominated positions must not merge with common shares.
        identity = '|'.join([row['cusip'], row.get('sshPrnamtType','SH'), row.get('putCall','')])
        holding = grouped.setdefault(identity, dict(id=identity, cusip=row['cusip'], issuer=row['nameOfIssuer'], shareClass=row['titleOfClass'], symbol=SYMBOLS.get(row['cusip']), unit=row.get('sshPrnamtType','SH'), option=row.get('putCall',''), shares=0, value=0))
        holding['shares'] += int(row['sshPrnamt'])
        holding['value'] += int(row['value'])
    holdings=sorted(grouped.values(),key=lambda row:row['value'],reverse=True)
    total=sum(row['value'] for row in holdings)
    cover_total=int(cover['tableValueTotal'])
    assert total-cover_total == record.get('reviewedTableDifference',0), 'Information table does not reconcile to cover; review the exact difference explicitly'
    month,day,year=cover['reportCalendarOrQuarter'].split('-')
    assert f'{year}-{month}-{day}' == record['reportDate']
    return dict(reportDate=record['reportDate'],filedDate=record['filingDate'],source=record['indexURL'],tableSource=record['table']['url'],reportType=cover['reportType'],reportedRows=len(table),totalValue=total,coverTotalValue=cover_total,reconciliationDifference=total-cover_total,holdings=holdings), cover

def parse_period(record):
    records=[record,*record.get('amendments',[])]
    covers=[tags(ET.parse(r['cover']['file']).getroot()) for r in records]
    assert covers[0].get('isAmendment','false') == 'false', 'Start with the original report'
    sources=[];start=0
    for i,(item,cover) in enumerate(zip(records,covers)):
        assert item['reportDate'] == record['reportDate'], 'Amendment quarter mismatch'
        if i:
            assert cover.get('isAmendment') == 'true' and int(cover['amendmentNo']) == i, 'Amendments must be complete and ordered'
            assert cover['amendmentType'] in ['RESTATEMENT','NEW HOLDINGS']
            if cover['amendmentType'] == 'RESTATEMENT': start=i
        sources.append(dict(source=item['indexURL'],tableSource=item['table']['url'],label=f'ฉบับแก้ไข {i} · {cover["amendmentType"]}' if i else 'รายงานเดิม'))
    # A complete restatement replaces all older tables, including defective originals.
    period,_=parse_filing(records[start])
    for item in records[start+1:]:
        update,cover=parse_filing(item)
        if cover['amendmentType'] == 'NEW HOLDINGS':
            grouped={r['id']:dict(r) for r in period['holdings']}
            for row in update['holdings']:
                if row['id'] in grouped:
                    grouped[row['id']]['shares']+=row['shares']
                    grouped[row['id']]['value']+=row['value']
                else: grouped[row['id']]=dict(row)
            period['holdings']=sorted(grouped.values(),key=lambda r:r['value'],reverse=True)
            period['totalValue']+=update['totalValue']
            period['coverTotalValue']+=update['coverTotalValue']
            period['reconciliationDifference']+=update['reconciliationDifference']
            period['reportedRows']+=update['reportedRows']
            period['filedDate']=update['filedDate']
        else: raise ValueError('Unrecognized amendment type')
    period['sources']=sources
    assert sum(r['value'] for r in period['holdings']) == period['totalValue']
    return period

def summarize(fund):
    previous={r['id']:r for r in fund['previous']['holdings']}
    rows=[]
    for row in fund['current']['holdings']:
        old=previous.get(row['id']);delta=row['shares']-old['shares'] if old else None
        status='new' if old is None else 'added' if delta>0 else 'reduced' if delta<0 else 'unchanged'
        rows.append(dict(row,weight=row['value']/fund['current']['totalValue']*100,changePercent=delta/old['shares']*100 if old and old['shares']>0 else None,status=status))
    changes=[r for r in rows if r['status']!='unchanged']
    current_ids={r['id'] for r in rows}
    chart=[dict(r,fraction=r['weight']/100) for r in rows[:5]]
    other=sum(r['value'] for r in rows[5:])
    if other: chart.append(dict(id='other',symbol='Other',issuer='Other disclosed holdings',value=other,fraction=other/fund['current']['totalValue']))
    return dict(**{k:v for k,v in fund.items() if k not in ['current','previous']},
        current={k:v for k,v in fund['current'].items() if k!='holdings'},previous={k:v for k,v in fund['previous'].items() if k!='holdings'},
        rows=rows[:5],changes=changes[:2],chart=chart,positionCount=len(rows),changeCount=len(changes),exitCount=sum(r['id'] not in current_ids for r in fund['previous']['holdings']),topFiveWeight=sum(r['weight'] for r in rows[:5]),
        searchText=' '.join(sorted({str(x).lower() for r in rows for x in [r['symbol'] or '',r['issuer']]})))

def main():
    manifest=json.loads(Path(sys.argv[1]).read_text())
    output=Path(__file__).resolve().parents[1]/'data'/'smart-money.json'
    data=dict(schemaVersion=2,checkedAt='2026-09-09',currency='USD',funds=[])
    detail_dir=output.parent/'smart-money';detail_dir.mkdir(parents=True,exist_ok=True)
    for ident,meta in FUNDS.items():
        records=manifest[ident]
        current,previous=map(parse_period,records)
        assert previous['reportDate'] < current['reportDate']
        aliases={'berkshire':['Buffett','Warren Buffett','BRK','บัฟเฟตต์'], 'nvidia':['NVDA','NVIDIA Corp'], 'temasek':['เทมาเส็ก'], 'pershing':['Bill Ackman','Ackman']}.get(ident,meta.get('aliases',[]))
        fund=dict(id=ident,kind='13f',**meta,current=current,previous=previous);fund['aliases']=aliases
        # Immutable detail URLs avoid mixing quarters when a PWA has an older catalog.
        payload=json.dumps(fund,ensure_ascii=False,separators=(',',':'))+'\n'
        filename=f'{ident}-{hashlib.sha256(payload.encode()).hexdigest()[:12]}.json'
        (detail_dir/filename).write_text(payload)
        data['funds'].append(dict(summarize(fund),detailFile=f'smart-money/{filename}'))
        print(ident,current['reportDate'],len(current['holdings']),'positions; total reconciled')
    output.parent.mkdir(parents=True,exist_ok=True)
    data['disclosures']=json.loads((output.parent/'smart-money-disclosures.json').read_text())
    output.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')

if __name__=='__main__':
    main()
