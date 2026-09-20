"""Money: old ledger compatibility, real workflows, durability, navigation and layout."""
import json
import tempfile
from datetime import datetime, timezone
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from threading import Thread
from playwright.sync_api import sync_playwright, expect

ROOT=Path(__file__).resolve().parents[2]
OUT=Path(tempfile.mkdtemp(prefix='moatrices-money-'))
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*args): pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT)))
Thread(target=server.serve_forever,daemon=True).start()
origin=f'http://127.0.0.1:{server.server_port}'
url=origin+'/money.html'

def stored(page,key):
    return page.evaluate("async key=>(await import('/app/js/core/storage.js')).load(key)",key)

def fitted(page):
    page.evaluate('() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))')
    for selector in ['.app-money','.mn-wrap','.mn-content']:
        assert page.locator(selector).evaluate('e=>e.scrollWidth<=e.clientWidth+1'),(selector,page.viewport_size)
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),page.viewport_size
    if page.locator('dialog[open]').count():
        assert page.locator('dialog').evaluate('e=>e.scrollWidth<=e.clientWidth+1')

def tab(page,name):
    page.locator('.mn-tabs').get_by_role('button',name=name,exact=True).click()

def screenshot(page,name):
    size=page.viewport_size
    height=page.locator('.mn-wrap').evaluate('e=>e.scrollHeight')+61
    page.set_viewport_size({'width':size['width'],'height':max(size['height'],height)})
    page.screenshot(path=str(OUT/name))
    page.set_viewport_size(size)

def save(page,label):
    page.get_by_role('button',name=label,exact=True).click()
    expect(page.locator('dialog')).to_have_count(0)

entries=[]
for month in range(4,10):
    entries.append({'id':month,'date':f'2026-{month:02d}-01','type':'in','amount':80000+(month-4)*1500,'cat':'Salary','note':'Monthly salary','split':{'savings':20,'invest':10},'reviewed':True})
    for i,(cat,amount,note) in enumerate([('Home',15000,'Rent & utilities'),('Food',4200+month*130,'Groceries'),('Transport',2100,'Getting around'),('Fun',1590,'Books & subscriptions')]):
        entries.append({'id':month*100+i,'date':f'2026-{month:02d}-{i+3:02d}','type':'out','amount':amount,'cat':cat,'note':note,'reviewed':month<9 or i<2})
fixture={'money.entries':entries,'money.budgets':{'Food':6500,'Home':20000,'Transport':4000,'Fun':2500},'money.split':{'savings':20,'invest':10},'money.card':{'locked':False,'roundups':True},'money.goals':[{'id':'emergency','name':'Emergency fund','target':120000,'saved':60000,'emoji':'🏠'},{'id':'trip','name':'A month in Japan','target':80000,'saved':23500,'emoji':'🏝️'}],'money.recurring':[{'id':'internet','name':'Home internet','day':18,'startDate':'2026-04-01','amount':799,'cat':'Home'}],'pf.holdings':[{'id':1,'tk':'MSFT','shares':2,'cost':300,'price':400}]}

try:
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True)
        context=browser.new_context(viewport={'width':1440,'height':1100},reduced_motion='reduce')
        context.set_default_timeout(7000)
        context.route('**/*',lambda r:r.continue_() if r.request.url.startswith(origin) else r.abort())
        context.add_init_script("if(!localStorage.getItem('money-test-seeded')) {const data="+json.dumps(fixture)+";for(const [k,v] of Object.entries(data))localStorage.setItem('pp-os:'+k,JSON.stringify(v));localStorage.setItem('money-test-seeded','yes');}")
        page=context.new_page();page.clock.set_fixed_time(datetime(2026,9,13,5,tzinfo=timezone.utc))
        errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto(url);expect(page.locator('.mn-page-head h1')).to_have_text('Money Overview.')
        assert stored(page,'money.entries')==entries
        assert stored(page,'money.goals')==fixture['money.goals']
        expect(page.locator('.mn-summary')).to_contain_text('฿87,500')
        assert page.locator('.m-nav').count()==0
        assert page.locator('#tabbar .on').evaluate('e=>getComputedStyle(e).color')=='rgb(113, 205, 178)'
        page.evaluate('document.fonts.ready')
        screenshot(page,'moatrices-money-overview-desktop.png')
        for width in [320,375,390,600,768,1024,1440]:
            page.set_viewport_size({'width':width,'height':1000});fitted(page)
        page.set_viewport_size({'width':390,'height':844});screenshot(page,'moatrices-money-overview-mobile.png')
        page.get_by_role('button',name='Add transaction',exact=True).first.click()
        fitted(page)
        page.get_by_label('Amount (THB)',exact=True).fill('123.45')
        page.get_by_label('Category',exact=True).select_option('Food')
        page.get_by_label('Note',exact=True).fill('Lunch <script>alert(1)</script>')
        save(page,'Save transaction')
        page.reload();expect(page.locator('.mn-page-head h1')).to_be_visible()
        entry=stored(page,'money.entries')[-1]
        assert entry['amount']==123.45 and entry['roundup']==6.55
        assert entry['note']=='Lunch <script>alert(1)</script>'
        tab(page,'Transactions');expect(page.locator('[data-entry]')).to_have_count(6)
        page.get_by_role('searchbox').fill('Lunch')
        expect(page.locator('[data-entry]')).to_have_count(1)
        page.get_by_role('button',name='Edit transaction',exact=True).click()
        page.get_by_label('Amount (THB)',exact=True).fill('130')
        page.get_by_label('Date',exact=True).fill('2026-08-31')
        save(page,'Save changes')
        expect(page.locator('[data-entry]')).to_have_count(0)
        page.get_by_label('All dates',exact=True).check()
        expect(page.locator('[data-entry]')).to_have_count(1)
        page.get_by_role('button',name='Mark as reviewed',exact=True).click()
        expect(page.get_by_role('button',name='Mark as unreviewed',exact=True)).to_be_visible()
        with page.expect_download() as exported:
            page.get_by_role('button',name='Export CSV',exact=True).click()
        exported.value.save_as(OUT/'moatrices-money-export.csv')
        csv=(OUT/'moatrices-money-export.csv').read_text()
        assert 'Lunch <script>alert(1)</script>' in csv and '2026-08-31' in csv
        count=len(stored(page,'money.entries'))
        page.locator('[data-csv-input]').set_input_files({'name':'transactions.csv','mimeType':'text/csv','buffer':csv.encode()})
        expect(page.locator('dialog')).to_contain_text('1 match')
        save(page,'Import transactions')
        assert len(stored(page,'money.entries'))==count
        page.locator('[data-csv-input]').set_input_files({'name':'new.csv','mimeType':'text/csv','buffer':b'Date,Type,Amount,Category,Note\n2026-09-12,in,250,Other,Refund'})
        save(page,'Import transactions');assert len(stored(page,'money.entries'))==count+1
        page.locator('[data-csv-input]').set_input_files({'name':'bad.csv','mimeType':'text/csv','buffer':b'Date,Type,Amount,Category\n2026-09-99,out,2,Food'})
        expect(page.locator('[role="alert"]')).to_contain_text('Row 2')
        assert len(stored(page,'money.entries'))==count+1
        page.get_by_role('searchbox').fill('Lunch')
        page.get_by_role('button',name='Edit transaction',exact=True).click()
        page.get_by_role('button',name='Delete transaction',exact=True).click()
        expect(page.locator('dialog')).to_contain_text('Delete this transaction?')
        save(page,'Delete');assert len(stored(page,'money.entries'))==count
        tab(page,'Budgets');fitted(page)
        page.get_by_role('button',name='Edit Food budget',exact=True).click()
        page.get_by_label('Monthly limit (THB)',exact=True).fill('1000')
        save(page,'Save budget');expect(page.locator('[data-budget="Food"]')).to_contain_text('Over budget')
        page.reload();expect(page.locator('[data-budget="Food"]')).to_contain_text('Over budget')
        page.get_by_role('button',name='Edit Food budget',exact=True).click()
        page.get_by_role('button',name='Remove limit',exact=True).click();expect(page.locator('dialog')).to_have_count(0)
        assert 'Food' not in stored(page,'money.budgets')
        tab(page,'Goals');fitted(page)
        page.get_by_role('button',name='New goal',exact=True).click()
        page.get_by_label('Goal name',exact=True).fill('New laptop')
        page.get_by_label('Target (THB)',exact=True).fill('50000')
        save(page,'Create goal')
        page.locator('[data-goal]').last.get_by_role('button',name='Manage funds',exact=True).click()
        page.get_by_label('Amount (THB)',exact=True).fill('1000000')
        page.get_by_role('button',name='Update goal funds',exact=True).click()
        expect(page.locator('.mn-form-error')).to_contain_text('exceeds')
        page.get_by_label('Amount (THB)',exact=True).fill('1000');save(page,'Update goal funds')
        page.reload();expect(page.locator('[data-goal]').last).to_contain_text('฿1,000')
        page.locator('[data-goal]').last.get_by_role('button',name='Manage funds',exact=True).click()
        page.get_by_label('Action',exact=True).select_option('release');page.get_by_label('Amount (THB)',exact=True).fill('250');save(page,'Update goal funds')
        assert stored(page,'money.goals')[-1]['saved']==750
        page.get_by_role('button',name='Money settings',exact=True).click()
        page.get_by_label('Savings (%)',exact=True).fill('90');page.get_by_label('Set aside to invest (%)',exact=True).fill('50')
        page.get_by_role('button',name='Save settings',exact=True).click();expect(page.locator('.mn-form-error')).to_contain_text('100%')
        page.get_by_label('Savings (%)',exact=True).fill('30');page.get_by_label('Set aside to invest (%)',exact=True).fill('15');save(page,'Save settings')
        assert stored(page,'money.entries')[0]['split']=={'savings':20,'invest':10}
        assert stored(page,'money.card')['locked'] is False
        tab(page,'Overview');page.get_by_role('button',name='Add subscription',exact=True).click()
        page.get_by_label('Subscription name',exact=True).fill('Cloud storage');page.get_by_label('Amount (THB)',exact=True).fill('99')
        page.get_by_label('Due day of month',exact=True).fill('15');save(page,'Save subscription')
        bill=stored(page,'money.recurring')[-1]
        page.locator(f'[data-bill="{bill["id"]}"]').get_by_role('button',name='Record',exact=True).click()
        save(page,'Save transaction')
        expect(page.locator(f'[data-bill="{bill["id"]}"]')).to_contain_text('Paid')
        payment=stored(page,'money.entries')[-1];assert payment['recurringId']==bill['id'] and payment['occurrence']=='2026-09'
        page.reload();expect(page.locator(f'[data-bill="{bill["id"]}"]')).to_contain_text('Paid')
        tab(page,'Subscriptions');fitted(page)
        expect(page.locator('.mn-sub-summary')).to_contain_text('Active subscriptions')
        expect(page.locator('.mn-subscription')).to_have_count(2)
        expect(page.locator(f'[data-bill="{bill["id"]}"]')).to_contain_text('Paid')
        # Income uses the new allocation; editing old income preserves its original split.
        page.get_by_role('button',name='Add transaction',exact=True).first.click()
        page.get_by_label('Type',exact=True).select_option('in');page.get_by_label('Amount (THB)',exact=True).fill('1000');save(page,'Save transaction')
        assert stored(page,'money.entries')[-1]['split']=={'savings':30,'invest':15}
        tab(page,'Transactions');page.get_by_role('searchbox').fill('Monthly salary')
        page.get_by_role('button',name='Edit transaction',exact=True).first.click();page.get_by_label('Amount (THB)',exact=True).fill('88000');save(page,'Save changes')
        assert next(e for e in stored(page,'money.entries') if e['id']==9)['split']=={'savings':20,'invest':10}
        # Focus, route restoration and all four views at narrow and wide sizes.
        page.get_by_role('searchbox').fill('');page.get_by_label('All dates',exact=True).check()
        for width in [320,390,768,1440]:
            page.set_viewport_size({'width':width,'height':1000})
            for name in ['Overview','Transactions','Budgets','Goals']:
                tab(page,name);fitted(page)
        page.set_viewport_size({'width':1440,'height':1100});tab(page,'Transactions')
        screenshot(page,'moatrices-money-transactions-desktop.png')
        tab(page,'Budgets');screenshot(page,'moatrices-money-budgets-desktop.png')
        tab(page,'Goals');screenshot(page,'moatrices-money-goals-desktop.png')
        page.go_back();expect(page.locator('.mn-page-head h1')).to_have_text('Monthly Budgets.')
        page.go_forward();expect(page.locator('.mn-page-head h1')).to_have_text('Savings Goals.')
        page.locator('.mn-tabs [data-action="goals"]').focus();page.keyboard.press('Home');expect(page.locator('.mn-page-head h1')).to_have_text('Money Overview.')
        page.get_by_role('button',name='Money settings',exact=True).click();page.keyboard.press('Escape')
        expect(page.get_by_role('button',name='Money settings',exact=True)).to_be_focused()
        assert stored(page,'pf.holdings')==fixture['pf.holdings']
        # A single large entry still fits; zero-data state never injects demo money.
        page.evaluate("async()=>{const s=await import('/app/js/core/storage.js');s.save('money.entries',[{id:'large',date:'2026-09-01',type:'in',amount:1000000000,cat:'Other',split:{savings:20,invest:10}}]);await s.flushStorage();}")
        for width in [320,390,1440]:page.set_viewport_size({'width':width,'height':1000});fitted(page)
        expect(page.locator('[data-metric="0"]')).to_have_text('฿1,000,000,000')
        page.evaluate("async()=>{const s=await import('/app/js/core/storage.js');for(const [k,v] of Object.entries({entries:[],budgets:{},goals:[],recurring:[]}))s.save('money.'+k,v);await s.flushStorage();}")
        expect(page.locator('[data-metric="0"]')).to_have_text('฿0')
        expect(page.locator('.mn-flow')).to_contain_text('Your cash flow starts here')
        assert stored(page,'money.entries')==[]
        assert not errors,errors
        context.close();browser.close()
        print('PASS: Money legacy preservation, CRUD, saved edits and reloads, filters, safe CSV import/export, review, budgets, goals, allocations, recurring payments, keyboard, history, 320–1440px and billion-baht/empty layouts.')
finally:
    server.shutdown();server.server_close()
