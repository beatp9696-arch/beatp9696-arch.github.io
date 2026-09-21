"""Data-driven additions must not leak unverified links or require copied pages."""
import copy
import sys
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from bookshelf_build import load_catalog, collection, detail


class BookshelfBuildTests(unittest.TestCase):
    def test_second_book_and_draft(self):
        catalog = load_catalog()
        second = copy.deepcopy(catalog['books'][0])
        second.update(slug='test-second-volume', title='A second & different book', status='draft', featured=False)
        second['purchaseLinks'] = [{'store': 'ร้านที่ยังตรวจไม่ได้', 'format': 'ฉบับพิมพ์', 'url': None, 'affiliate': False}]
        catalog['books'].append(second)
        draft = collection(catalog)
        self.assertIn('A second &amp; different book', draft)
        self.assertIn('กำลังเรียบเรียง', draft)
        self.assertNotIn('href="books/test-second-volume.html"', draft)
        second['status'] = 'ready'
        self.assertIn('href="books/test-second-volume.html"', collection(catalog))
        page = detail(second)
        self.assertIn('/books/test-second-volume.html', page)
        self.assertIn('ลิงก์ซื้อกำลังตรวจสอบ', page)
        self.assertNotIn('href="None"', page)
        self.assertNotIn('class="bs-purchase-rows"><a', page)

    def test_affiliate_disclosure(self):
        book = copy.deepcopy(load_catalog()['books'][0])
        book['purchaseLinks'][0]['affiliate'] = True
        book['affiliateDisclosure'] = 'ลิงก์บางรายการอาจเป็น affiliate link ซึ่งช่วยสนับสนุนการทำเว็บไซต์ โดยไม่มีค่าใช้จ่ายเพิ่มสำหรับผู้อ่าน'
        page = detail(book)
        self.assertIn('noopener noreferrer sponsored', page)
        self.assertIn(book['affiliateDisclosure'], page)
        self.assertNotIn('ลิงก์ปกติ ไม่มี affiliate', page)


if __name__ == '__main__':
    unittest.main()
