"""Exercise SEC table aggregation and amendment handling with local XML fixtures."""
import importlib.util
from pathlib import Path
import tempfile
import unittest
import xml.etree.ElementTree as ET

spec = importlib.util.spec_from_file_location(
    'smart_money_builder', Path(__file__).resolve().parents[1] / 'tools/build-smart-money.py')
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)


def position(shares=10, value=100, cusip='037833100', unit='SH', option=''):
    return dict(nameOfIssuer='APPLE INC', titleOfClass='COM', cusip=cusip,
                sshPrnamt=shares, value=value, sshPrnamtType=unit, putCall=option)


class BuilderTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='smart-money-builder-')
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.sequence = 0

    def filing(self, rows=None, amendment=0, kind='NEW HOLDINGS', **cover_changes):
        rows = [position()] if rows is None else rows
        self.sequence += 1
        stem = f'filing-{self.sequence}'
        cover = dict(reportCalendarOrQuarter='03-31-2026', reportType='13F HOLDINGS REPORT',
                     isConfidentialOmitted='false', isAmendment=str(bool(amendment)).lower(),
                     tableEntryTotal=len(rows), tableValueTotal=sum(row['value'] for row in rows))
        if amendment:
            cover.update(amendmentNo=amendment, amendmentType=kind)
        cover.update(cover_changes)
        root = ET.Element('edgarSubmission', xmlns='http://www.sec.gov/edgar/thirteenffiler')
        for key, value in cover.items():
            ET.SubElement(root, key).text = str(value)
        cover_file = self.root / f'{stem}-cover.xml'
        ET.ElementTree(root).write(cover_file)
        root = ET.Element('informationTable', xmlns='http://www.sec.gov/edgar/document/thirteenf/informationtable')
        for row in rows:
            item = ET.SubElement(root, 'infoTable')
            for key, value in row.items():
                ET.SubElement(item, key).text = str(value)
        table_file = self.root / f'{stem}-table.xml'
        ET.ElementTree(root).write(table_file)
        url = f'https://www.sec.gov/Archives/edgar/data/1/{stem}'
        return dict(reportDate='2026-03-31', filingDate=f'2026-05-{10+self.sequence:02}',
                    indexURL=f'{url}/index.htm', cover=dict(file=str(cover_file), url=f'{url}/cover.xml'),
                    table=dict(file=str(table_file), url=f'{url}/table.xml'))

    def test_aggregates_managers_without_merging_options_or_principal(self):
        record = self.filing([position(), position(shares=20, value=200),
                              position(option='Put'), position(option='Call'), position(unit='PRN')])
        period = builder.parse_period(record)
        rows = {row['id']: row for row in period['holdings']}
        self.assertEqual(len(rows), 4)
        self.assertEqual((rows['037833100|SH|']['shares'], rows['037833100|SH|']['value']), (30, 300))
        self.assertEqual((period['reportedRows'], period['totalValue']), (5, 600))

    def test_preserves_unknown_security_without_guessing_symbol(self):
        row = builder.parse_period(self.filing([position(cusip='UNKNOWN00')]))['holdings'][0]
        self.assertIsNone(row['symbol'])

    def test_requires_exact_reviewed_reconciliation_difference(self):
        record = self.filing(tableValueTotal=101)
        with self.assertRaisesRegex(AssertionError, 'reconcile'):
            builder.parse_period(record)
        record['reviewedTableDifference'] = -2
        with self.assertRaisesRegex(AssertionError, 'reconcile'):
            builder.parse_period(record)
        record['reviewedTableDifference'] = -1
        period = builder.parse_period(record)
        self.assertEqual((period['totalValue'], period['coverTotalValue'], period['reconciliationDifference']), (100, 101, -1))

    def test_rejects_missing_rows_wrong_quarter_and_confidential_omissions(self):
        for change in [dict(tableEntryTotal=2), dict(reportCalendarOrQuarter='06-30-2026'),
                       dict(isConfidentialOmitted='true')]:
            with self.subTest(change=change), self.assertRaises(AssertionError):
                builder.parse_period(self.filing(**change))

    def test_restatement_replaces_defective_original_then_adds_new_holdings(self):
        original = self.filing(tableValueTotal=999)
        restated = self.filing([position(shares=20, value=200)], amendment=1, kind='RESTATEMENT')
        added = self.filing([position(shares=3, value=30), position(cusip='UNKNOWN00', value=50)], amendment=2)
        original['amendments'] = [restated, added]
        period = builder.parse_period(original)
        self.assertEqual(period['totalValue'], 280)
        self.assertEqual(period['reportedRows'], 3)
        self.assertEqual(period['holdings'][0]['shares'], 23)
        self.assertEqual(period['filedDate'], added['filingDate'])
        self.assertEqual(period['source'], restated['indexURL'])
        self.assertEqual([ref['source'] for ref in period['sources']],
                         [r['indexURL'] for r in [original, restated, added]])

    def test_later_restatement_replaces_earlier_additions(self):
        original = self.filing()
        original['amendments'] = [self.filing(amendment=1),
                                  self.filing([position(shares=5, value=50)], amendment=2, kind='RESTATEMENT')]
        period = builder.parse_period(original)
        self.assertEqual((period['totalValue'], period['reportedRows']), (50, 1))

    def test_additive_reports_preserve_reviewed_differences(self):
        original = self.filing(tableValueTotal=101)
        added = self.filing(amendment=1, tableValueTotal=102)
        original['reviewedTableDifference'] = -1
        added['reviewedTableDifference'] = -2
        original['amendments'] = [added]
        period = builder.parse_period(original)
        self.assertEqual((period['totalValue'], period['coverTotalValue'], period['reconciliationDifference']), (200, 203, -3))

    def test_rejects_amendment_without_original(self):
        with self.assertRaisesRegex(AssertionError, 'original'):
            builder.parse_period(self.filing(amendment=1))

    def test_rejects_skipped_repeated_and_reordered_amendments(self):
        for numbers in [[2], [1, 1], [2, 1]]:
            original = self.filing()
            original['amendments'] = [self.filing(amendment=n) for n in numbers]
            with self.subTest(numbers=numbers), self.assertRaisesRegex(AssertionError, 'ordered'):
                builder.parse_period(original)

    def test_rejects_amendment_for_other_quarter(self):
        original, added = self.filing(), self.filing(amendment=1)
        added['reportDate'] = '2026-06-30'
        original['amendments'] = [added]
        with self.assertRaisesRegex(AssertionError, 'quarter'):
            builder.parse_period(original)

    def test_rejects_unknown_amendment_type(self):
        original = self.filing()
        original['amendments'] = [self.filing(amendment=1, kind='UNKNOWN')]
        with self.assertRaises(AssertionError):
            builder.parse_period(original)


if __name__ == '__main__':
    unittest.main()
