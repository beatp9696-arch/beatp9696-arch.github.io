"""Build a public-only 13F dataset from downloaded SEC XML and a source manifest.

Usage: python3 pp-os/tools/build-smart-money.py /path/to/sources.json
The manifest maps fund IDs to [current, previous] records containing reportDate,
filingDate, indexURL, and cover/table objects with local file and original SEC url.
Only complete holdings reports are accepted. Values in these post-2022 filings
are USD, not thousands. Never read or merge the user's private portfolio storage.
"""
from pathlib import Path
import json
import sys
import xml.etree.ElementTree as ET

FUNDS = {
    'berkshire': dict(name='Berkshire Hathaway', subtitle='พอร์ตหุ้นที่ Berkshire เปิดเผย', category='investor', monogram='BRK', brandCaption='Berkshire', note='ข้อมูลหุ้นในรายงานของ Berkshire ไม่ใช่พอร์ตส่วนตัวของ Warren Buffett และไม่รวมเงินสดหรือบริษัทลูกที่ถือครองทั้งหมด'),
    'nvidia': dict(name='NVIDIA Portfolio', subtitle='การลงทุนของบริษัท NVIDIA', category='company', monogram='NV', brandCaption='NVIDIA', note='เป็นการลงทุนที่ NVIDIA รายงาน ไม่ใช่พอร์ตหุ้นส่วนตัวของ Jensen Huang และไม่ครอบคลุมการลงทุนเอกชนทั้งหมด'),
    'temasek': dict(name='Temasek Holdings', subtitle='พอร์ตหลักทรัพย์ที่ยื่นต่อ SEC', category='company', monogram='TEMASEK', brandCaption='Singapore', note='แสดงเฉพาะรายการใน Information Table ชุดนี้ ซึ่งเป็น Combination Report ไม่ใช่มูลค่าพอร์ตทั่วโลกทั้งหมดของ Temasek'),
    'pershing': dict(name='Pershing Square', subtitle='Pershing Square Capital Management', category='investor', monogram='PS', brandCaption='Pershing Square', note='ชุดที่ตรวจสอบได้เป็น Q1 2026 จึงเก่ากว่าพอร์ตอื่นในหน้านี้ และรายงาน 13F ไม่แสดงฐานะ short หรือเครื่องมือป้องกันความเสี่ยงทั้งหมด'),
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
}

def tags(element):
    return {node.tag.split('}')[-1]: (node.text or '').strip() for node in element.iter()}

def parse_period(record):
    cover = tags(ET.parse(record['cover']['file']).getroot())
    assert cover.get('isAmendment') == 'false', 'Amendments need explicit reconciliation'
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
    assert total == int(cover['tableValueTotal']), 'Information table does not reconcile to cover'
    month,day,year=cover['reportCalendarOrQuarter'].split('-')
    assert f'{year}-{month}-{day}' == record['reportDate']
    return dict(reportDate=record['reportDate'],filedDate=record['filingDate'],source=record['indexURL'],tableSource=record['table']['url'],reportType=cover['reportType'],reportedRows=len(table),totalValue=total,holdings=holdings)

def main():
    manifest=json.loads(Path(sys.argv[1]).read_text())
    output=Path(__file__).resolve().parents[1]/'data'/'smart-money.json'
    data=dict(schemaVersion=1,checkedAt='2026-09-09',currency='USD',funds=[])
    for ident,meta in FUNDS.items():
        records=manifest[ident]
        current,previous=map(parse_period,records)
        assert previous['reportDate'] < current['reportDate']
        aliases={'berkshire':['Buffett','Warren Buffett','BRK','บัฟเฟตต์'], 'nvidia':['NVDA','NVIDIA Corp'], 'temasek':['เทมาเส็ก'], 'pershing':['Bill Ackman','Ackman']}[ident]
        data['funds'].append(dict(id=ident,**meta,aliases=aliases,current=current,previous=previous))
        print(ident,current['reportDate'],len(current['holdings']),'positions; total reconciled')
    output.parent.mkdir(parents=True,exist_ok=True)
    output.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')

if __name__=='__main__':
    main()
