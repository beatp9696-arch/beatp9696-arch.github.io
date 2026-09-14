"""Money commits across real browser tabs: no lost writes or resurrected entries."""
import os
from datetime import datetime, timezone
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from playwright.sync_api import sync_playwright, expect

ROOT = Path(os.environ.get('MONEY_TEST_ROOT', Path(__file__).resolve().parents[2]))
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *args): pass
server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Quiet, directory=str(ROOT)))
Thread(target=server.serve_forever, daemon=True).start()
origin = f'http://127.0.0.1:{server.server_port}'

def ready(page):
    expect(page.locator('#app-root')).to_have_attribute('data-state', 'ready')

def reload(page):
    page.reload(); ready(page)

def stored(page, key='money.entries'):
    return page.evaluate("async k => (await import('/app/js/core/storage.js')).load(k)", key)

def seed(page, data):
    page.evaluate("async data => {const s=await import('/app/js/core/storage.js');for(const [k,v] of Object.entries(data))s.save(k,v);await s.flushStorage();}", data)

def prepare(page, note, amount):
    page.get_by_role('button', name='Add transaction', exact=True).first.click()
    page.get_by_label('Amount (THB)', exact=True).fill(str(amount))
    page.get_by_label('Note', exact=True).fill(note)

def save(page, label='Save transaction'):
    page.get_by_role('button', name=label, exact=True).click()
    expect(page.locator('dialog')).to_have_count(0)

def simultaneous(a):
    # Both submit handlers start in the same JS task before either save resolves.
    a.evaluate("() => {window.auditPeer=window.open('', 'money-test-peer');document.querySelector('dialog form').requestSubmit();auditPeer.document.querySelector('dialog form').requestSubmit();}")

def transactions(page):
    page.locator('.mn-tabs').get_by_role('button', name='Transactions', exact=True).click()

def edit(page, note):
    transactions(page)
    page.get_by_role('searchbox').fill(note)
    page.get_by_role('button', name='Edit transaction', exact=True).click()

try:
  with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    def pair(fallback=False, notifications=True):
        context = browser.new_context(viewport={'width':1280,'height':950}, service_workers='block', reduced_motion='reduce')
        context.set_default_timeout(8000)
        context.route('**/*', lambda r: r.continue_() if r.request.url.startswith(origin) else r.abort())
        if fallback: context.add_init_script("Object.defineProperty(window,'indexedDB',{get(){throw new Error('Test fallback')}})")
        if not notifications: context.add_init_script('window.BroadcastChannel = undefined')
        a = context.new_page()
        a.clock.set_fixed_time(datetime(2026,9,14,5,tzinfo=timezone.utc))
        a.goto(origin+'/money.html'); ready(a)
        with a.expect_popup() as popup:
            a.evaluate("window.auditPeer=window.open('/money.html','money-test-peer')")
        b = popup.value; ready(b)
        return context,a,b

    # Original report: confirmed saves in alternating tabs must both survive.
    context,a,b = pair()
    prepare(a,'Tab A',100); save(a)
    expect(b.locator('.mn-summary')).to_contain_text('฿100')
    prepare(b,'Draft in B',200)
    prepare(a,'Second in A',50); save(a)
    expect(b.get_by_label('Note',exact=True)).to_have_value('Draft in B')
    save(b); reload(a); reload(b)
    assert len(stored(a)) == 3 and sum(e['amount'] for e in stored(a)) == 350
    assert stored(a) == stored(b)
    print('PASS: alternating tabs, live totals, preserved draft and durable reloads', flush=True)
    context.close()

    # Notifications are deliberately absent; transaction isolation must suffice.
    for fallback in [False, True]:
        context,a,b = pair(fallback=fallback, notifications=False)
        prepare(a,'Simultaneous A',100); prepare(b,'Simultaneous B',200)
        simultaneous(a)
        expect(a.locator('dialog')).to_have_count(0); expect(b.locator('dialog')).to_have_count(0)
        reload(a); reload(b)
        assert len(stored(a)) == 2 and sum(e['amount'] for e in stored(a)) == 300
        assert stored(a) == stored(b)
        snapshot=a.evaluate("async () => (await import('/app/js/core/storage.js')).syncSnapshot()")
        assert snapshot['meta']['money.entries'] > 0
        print('PASS: simultaneous saves without BroadcastChannel / '+('localStorage + Web Locks' if fallback else 'IndexedDB'), flush=True)
        context.close()

    context,a,b = pair()
    prepare(a,'Original',100); save(a); reload(b)
    edit(a,'Original'); edit(b,'Original')
    a.get_by_label('Amount (THB)',exact=True).fill('125'); save(a,'Save changes')
    b.get_by_label('Amount (THB)',exact=True).fill('999')
    b.get_by_role('button',name='Save changes',exact=True).click()
    expect(b.locator('.mn-form-error')).to_contain_text('changed in another tab')
    expect(b.get_by_label('Amount (THB)',exact=True)).to_have_value('999')
    b.keyboard.press('Escape'); reload(b)
    assert stored(b)[0]['amount'] == 125
    edit(a,'Original'); edit(b,'Original')
    a.get_by_role('button',name='Delete transaction',exact=True).click(); save(a,'Delete')
    b.get_by_role('button',name='Save changes',exact=True).click()
    expect(b.locator('.mn-form-error')).to_contain_text('removed elsewhere')
    b.keyboard.press('Escape'); reload(b)
    assert stored(b) == []
    print('PASS: stale edits are rejected and deleted transactions stay deleted', flush=True)

    # Imports use the current ledger at commit, not the import preview's snapshot.
    transactions(b)
    csv = b'Date,Type,Amount,Category,Note\n2026-09-14,out,250,Food,Imported'
    b.locator('[data-csv-input]').set_input_files({'name':'audit.csv','mimeType':'text/csv','buffer':csv})
    expect(b.locator('dialog')).to_contain_text('Review CSV import')
    prepare(a,'Added during preview',75); save(a)
    save(b,'Import transactions'); reload(a)
    assert {e['note'] for e in stored(a)} == {'Imported','Added during preview'}
    print('PASS: CSV import preserves another tab\'s new transaction', flush=True)

    # Different existing rows edited at once must both be retained.
    reload(b); edit(a,'Imported'); edit(b,'Added during preview')
    a.get_by_label('Amount (THB)',exact=True).fill('260')
    b.get_by_label('Amount (THB)',exact=True).fill('80')
    simultaneous(a)
    expect(a.locator('dialog')).to_have_count(0); expect(b.locator('dialog')).to_have_count(0)
    reload(a)
    assert {e['note']:e['amount'] for e in stored(a)} == {'Imported':260,'Added during preview':80}
    print('PASS: concurrent edits to different transactions both survive', flush=True)

    seed(a,{'money.recurring':[{'id':'bill','name':'Same bill','amount':99,'day':14,'startDate':'2026-09-01','cat':'Fun'}]})
    for page in [a,b]:
        page.goto(origin+'/money.html'); ready(page)
        page.locator('[data-bill="bill"] [data-action="pay-bill"]').click()
    simultaneous(a)
    a.wait_for_function("[document,auditPeer.document].filter(d=>d.querySelector('.mn-form-error')).length===1")
    payment_errors=[page.locator('.mn-form-error').inner_text() for page in [a,b] if page.locator('.mn-form-error').count()]
    assert 'already recorded' in payment_errors[0]
    reload(a); reload(b)
    assert len([e for e in stored(a) if e.get('recurringId')=='bill']) == 1
    print('PASS: one bill cannot be paid twice by concurrent tabs', flush=True)
    context.close()

    # Fund calculations also read the latest shared savings in their transaction.
    context,a,b = pair()
    seed(a,{'money.entries':[{'id':'income','date':'2026-09-14','type':'in','amount':100,'cat':'Salary','split':{'savings':100,'invest':0}}], 'money.goals':[{'id':i,'name':i,'saved':0,'target':100} for i in ['A','B']]})
    for page,goal in [(a,'A'),(b,'B')]:
        reload(page)
        page.locator('.mn-tabs').get_by_role('button',name='Goals',exact=True).click()
        page.locator(f'[data-goal="{goal}"]').get_by_role('button',name='Manage funds',exact=True).click()
        page.get_by_label('Amount (THB)',exact=True).fill('80')
    simultaneous(a)
    a.wait_for_function("[document,auditPeer.document].filter(d=>d.querySelector('.mn-form-error')).length===1")
    reload(a)
    assert sum(g['saved'] for g in stored(a,'money.goals')) == 80
    print('PASS: concurrent goal funding cannot allocate the same savings twice', flush=True)
    context.close()

    # An aborted database transaction must not report success or retry silently.
    context,a,b = pair()
    a.evaluate("""() => {window.originalPut=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(value,key){if(key==='money.entries')throw new DOMException('Test write rejected','QuotaExceededError');return originalPut.call(this,value,key);};}""")
    prepare(a,'Retry once',10)
    a.get_by_role('button',name='Save transaction',exact=True).click()
    expect(a.locator('.mn-form-error')).to_contain_text('Test write rejected')
    assert stored(a) is None
    reload(b); assert stored(b) is None
    a.evaluate('() => {IDBObjectStore.prototype.put=originalPut;}')
    save(a); reload(b)
    assert len(stored(b)) == 1 and stored(b)[0]['note'] == 'Retry once'
    print('PASS: failed write leaves data and draft intact; explicit retry saves once', flush=True)
    context.close()
    browser.close()
finally:
    server.shutdown(); server.server_close()
