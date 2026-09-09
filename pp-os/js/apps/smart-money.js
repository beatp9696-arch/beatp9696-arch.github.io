import { esc } from '../core/ui.js';
import { summarizeFund, donutRows, matchesFund, validateDataset } from '../core/smart-money-model.js';

const svg = content => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${content}</svg>`;
const ICON = {
  bulb: svg('<path d="M9 18h6M10 21h4M8.2 14.4a6 6 0 1 1 7.6 0L15 17H9Z"/><path d="m8 10 2.5-2 2.5 2L16 7"/>'),
  search: svg('<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>'),
  gear: svg('<path d="m9 3-.6 2.1-2 .9-2-.6L2.5 8.7l1.5 1.5v2.5l-1.5 1.5L4.4 18l2-.5 2 .9L9 21h4l.6-2.6 2-.9 2 .5 1.9-3.8-1.5-1.5v-2.5l1.5-1.5L17.6 5.4l-2 .6-2-.9L13 3Z"/><circle cx="11" cy="12" r="3"/>'),
  back: svg('<path d="m15 5-7 7 7 7"/>'),
  arrow: svg('<path d="M7 17 17 7M7 7h10v10"/>'),
  check: svg('<path d="m5 12 4 4 10-10"/>'),
  close: svg('<path d="m6 6 12 12M6 18 18 6"/>')
};
const COLORS = ['#4273ff', '#355edc', '#2b4fb8', '#24418e', '#1d346b', '#18233c'];
const STATUS = {new: 'พบในรายงานใหม่', added: 'จำนวนเพิ่ม', reduced: 'จำนวนลด', unchanged: 'จำนวนเท่าเดิม', exited: 'ไม่พบในรายงานนี้'};
const money = value => '$' + new Intl.NumberFormat('en-US', {notation: 'compact', maximumFractionDigits: 2}).format(value);
const number = value => new Intl.NumberFormat('en-US', {maximumFractionDigits: 0}).format(value);
const percent = value => new Intl.NumberFormat('en-US', {maximumFractionDigits: 1}).format(value) + '%';
const date = value => new Date(value + 'T12:00:00').toLocaleDateString('en-GB', {day: 'numeric', month: 'short', year: 'numeric'});
const quarter = value => `Q${Math.ceil(Number(value.slice(5, 7)) / 3)} ${value.slice(0, 4)}`;
const change = row => row.changePercent === null ? 'New' : `${row.changePercent > 0 ? '+' : row.changePercent < 0 ? '−' : ''}${percent(Math.abs(row.changePercent))}`;
const symbol = row => row.symbol || row.issuer;
const logos = {AAPL: 'AAPL.svg', AXP: 'AXP.png', GOOGL: 'GOOGL.png', GOOG: 'GOOGL.png', NVDA: 'NVDA.png', MSFT: 'MSFT.png', COHR: 'COHR.png', SNPS: 'SNPS.png'};
const logoURL = key => logos[key] ? new URL(`../../assets/brands/${logos[key]}`, import.meta.url).href : null;
let cachedData;

function ring(fund, detailed = false) {
  const rows = donutRows(fund.rows, fund.current.totalValue);
  const circumference = 2 * Math.PI * 78;
  let offset = 0;
  const circles = rows.map((row, i) => {
    const length = row.fraction * circumference;
    const arc = `<circle cx="110" cy="110" r="78" fill="none" stroke="${COLORS[i]}" stroke-width="43" stroke-dasharray="${Math.max(0, length - 1.1)} ${circumference}" stroke-dashoffset="${-offset}"/>`;
    offset += length;
    return arc;
  }).join('');
  let angle = -Math.PI / 2;
  const marks = rows.map((row, i) => {
    const mid = angle + row.fraction * Math.PI;
    angle += row.fraction * 2 * Math.PI;
    if (i > 4 || row.fraction < .075) return '';
    const x = 110 + Math.cos(mid) * 78, y = 110 + Math.sin(mid) * 78;
    const url = logoURL(row.symbol);
    const label = (row.symbol || row.issuer.split(' ')[0]).slice(0, 4);
    return `<g><circle cx="${x}" cy="${y}" r="12" fill="${url ? '#f5f7fa' : '#101726'}"/>${url ? `<image href="${url}" x="${x-8}" y="${y-8}" width="16" height="16" preserveAspectRatio="xMidYMid meet"/>` : `<text x="${x}" y="${y+3}" text-anchor="middle" fill="#fff" font-size="7.5" font-weight="600">${esc(label)}</text>`}</g>`;
  }).join('');
  const center = fund.id === 'nvidia'
    ? `<span class="sm-brand sm-brand-nvidia"><img src="${logoURL('NVDA')}" alt=""><b>NVIDIA</b></span>`
    : `<span class="sm-brand sm-brand-${esc(fund.id)}"><b>${esc(fund.monogram)}</b><small>${esc(fund.brandCaption)}</small></span>`;
  return `<div class="sm-ring${detailed ? ' sm-ring-large' : ''}" aria-hidden="true"><svg viewBox="0 0 220 220"><g transform="rotate(-90 110 110)">${circles}</g>${marks}</svg>${center}</div>`;
}

function card(fund, i) {
  const changes = fund.changes.slice(0, 2);
  return `<button class="sm-card" data-fund="${esc(fund.id)}" style="--i:${i}" aria-label="ดูพอร์ต ${esc(fund.name)} ${quarter(fund.current.reportDate)}">
    <span class="sm-card-copy">
      <span class="sm-card-name">${esc(fund.name)}</span>
      <span class="sm-card-sub">${esc(fund.subtitle)}</span>
      <span class="sm-card-value">${money(fund.current.totalValue)}<small>มูลค่าที่รายงาน</small></span>
      <span class="sm-card-changes-label">จำนวนหุ้นเทียบไตรมาสก่อน</span>
      <span class="sm-card-changes">${changes.length ? changes.map(row => `<span><b>${esc(symbol(row))}</b><em class="sm-${row.status}">${change(row)}</em></span>`).join('') : '<span class="sm-muted">จำนวนหุ้นไม่เปลี่ยน</span>'}</span>
      <span class="sm-card-date">${quarter(fund.current.reportDate)} <span>·</span> ยื่น ${date(fund.current.filedDate)}</span>
    </span>
    ${ring(fund)}
    <span class="sm-card-open" aria-hidden="true">${ICON.arrow}</span>
  </button>`;
}

export default {
  id: 'smart-money', name: 'Smart Money', icon: `<span class="sm-shell-icon">${ICON.bulb}</span>`,
  defaultSize: {w: 500, h: 790},
  mount(body) {
    body.classList.add('app-pane', 'app-smart-money');
    let funds = [], query = '', category = 'all', selected = null, filter = 'all';
    let scrollBeforeDetail = 0;
    body.innerHTML = `<header class="sm-head"><div class="sm-title"><span class="sm-mark">${ICON.bulb}</span><h1>Smart Money</h1></div><div class="sm-head-actions"><button class="sm-icon sm-search-toggle" aria-label="ค้นหาพอร์ต" aria-expanded="false">${ICON.search}</button><button class="sm-icon sm-settings" aria-label="Settings">${ICON.gear}</button></div></header>
      <div class="sm-search" hidden><span>${ICON.search}</span><input type="search" placeholder="ค้นหานักลงทุน บริษัท หรือหุ้น" aria-label="ค้นหานักลงทุน บริษัท หรือหุ้น" autocomplete="off"><button class="sm-icon sm-search-clear" aria-label="ล้างคำค้น">${ICON.close}</button></div>
      <div class="sm-content"><div class="sm-loading" role="status">กำลังเปิดรายงานพอร์ต…</div></div>`;
    const content = body.querySelector('.sm-content');
    const search = body.querySelector('.sm-search');
    const input = search.querySelector('input');
    const searchButton = body.querySelector('.sm-search-toggle');
    const scrollHost = () => body.closest('#shell-view') || body.closest('.win-body') || body;
    const focusHeading = () => body.querySelector('.sm-detail h2')?.focus({preventScroll: true});
    body.querySelector('.sm-settings').addEventListener('click', () => document.dispatchEvent(new CustomEvent('pp-settings')));

    function drawCards() {
      const filtered = funds.filter(fund => (category === 'all' || fund.category === category) && matchesFund(fund, query));
      const grid = content.querySelector('.sm-cards');
      if (!grid) return;
      grid.innerHTML = filtered.length ? filtered.map(card).join('') : `<div class="sm-empty"><b>ไม่พบพอร์ตที่ตรงกับคำค้น</b><p>ลองชื่อบริษัท ชื่อกองทุน หรือรหัสหุ้นอื่น</p><button class="sm-text-btn" data-reset>ล้างตัวกรอง</button></div>`;
      content.querySelector('.sm-results-count').textContent = `${filtered.length} พอร์ต`;
    }

    function drawList() {
      selected = null;
      content.innerHTML = `<div class="sm-intro"><p>ตามรอยพอร์ตที่เปิดเผยต่อสาธารณะ</p><span class="sm-source-badge">${ICON.check} SEC filings</span></div>
        <div class="sm-categories" aria-label="ประเภทพอร์ต"><button data-category="all" aria-pressed="${category === 'all'}">ทั้งหมด</button><button data-category="investor" aria-pressed="${category === 'investor'}">นักลงทุน</button><button data-category="company" aria-pressed="${category === 'company'}">บริษัท / สถาบัน</button><span class="sm-results-count" aria-live="polite"></span></div>
        <div class="sm-cards"></div>
        <div class="sm-disclosure"><b>อ่านพอร์ตจากวันที่ในรายงาน</b><p>13F เป็นภาพ ณ สิ้นไตรมาส อาจเผยแพร่ภายหลังได้ถึง 45 วัน และไม่ได้รวมสินทรัพย์ทุกประเภท ตัวเลขเปลี่ยนแปลงคือจำนวนหุ้นที่รายงาน ไม่ใช่ผลตอบแทนหรือราคาซื้อขาย</p><a href="https://www.investor.gov/introduction-investing/investing-basics/glossary/form-13f-reports-filed-institutional-investment" target="_blank" rel="noopener noreferrer">รู้จักรายงาน 13F ${ICON.arrow}</a></div>`;
      drawCards();
    }

    function drawHoldings() {
      const items = filter === 'exited' ? selected.exits : filter === 'changes' ? selected.changes : selected.rows;
      content.querySelector('.sm-holdings').innerHTML = items.length ? items.map(row => `<li><div class="sm-holding-id"><b>${esc(symbol(row))}</b><span>${esc(row.issuer)}${row.option ? ' · '+esc(row.option) : ''}</span></div><div class="sm-holding-value"><b>${percent(row.weight)}</b><span>${money(row.value)}</span></div><div class="sm-holding-shares"><span>${number(row.shares)} ${row.unit === 'PRN' ? 'เงินต้นตามรายงาน' : 'หุ้น'}</span><span class="sm-status sm-${row.status}">${STATUS[row.status]}${row.status === 'unchanged' ? '' : ' · '+change(row)}</span></div></li>`).join('') : '<li class="sm-empty">ไม่มีรายการในหมวดนี้</li>';
    }

    function drawDetail(id) {
      selected = funds.find(fund => fund.id === id);
      if (!selected) return;
      filter = 'all';
      const fund = selected, chart = donutRows(fund.rows, fund.current.totalValue);
      content.innerHTML = `<section class="sm-detail"><button class="sm-back">${ICON.back} ทุกพอร์ต</button><div class="sm-detail-heading"><span class="sm-kicker">${quarter(fund.current.reportDate)} · 13F snapshot</span><h2 tabindex="-1">${esc(fund.name)}</h2><p>${esc(fund.subtitle)}</p></div>
        <div class="sm-detail-summary">${ring(fund, true)}<div><span class="sm-kicker">มูลค่าในรายงาน</span><strong>${money(fund.current.totalValue)}</strong><p>${fund.rows.length} รายการ · 5 อันดับแรก ${percent(fund.topFiveWeight)}</p><p>ถือครอง ณ ${date(fund.current.reportDate)}<br>ยื่นรายงาน ${date(fund.current.filedDate)}</p></div></div>
        <ul class="sm-legend">${chart.map((row,i) => `<li><i style="background:${COLORS[i]}"></i><span>${row.id === 'other' ? 'รายการอื่น ๆ' : esc(symbol(row))}</span><b>${percent(row.fraction*100)}</b></li>`).join('')}</ul>
        <div class="sm-report-links"><a href="${esc(fund.current.source)}" target="_blank" rel="noopener noreferrer">รายงานรอบนี้ ${ICON.arrow}</a><a href="${esc(fund.previous.source)}" target="_blank" rel="noopener noreferrer">รอบก่อน ${quarter(fund.previous.reportDate)} ${ICON.arrow}</a></div>
        <p class="sm-detail-note">${esc(fund.note)} กราฟรวมรายการอื่นไว้ครบตามมูลค่า 13F เปรียบเทียบจำนวนหุ้นตามรายงาน ซึ่งอาจได้รับผลจากการแตกหุ้น การเปลี่ยนชนิดหลักทรัพย์ หรือขอบเขตการรายงาน</p>
        <div class="sm-holding-tabs" aria-label="รายการถือครอง"><button data-holdings="all" aria-pressed="true">ถือครอง ${fund.rows.length}</button><button data-holdings="changes" aria-pressed="false">เปลี่ยนแปลง ${fund.changes.length}</button><button data-holdings="exited" aria-pressed="false">ไม่พบแล้ว ${fund.exits.length}</button></div><ul class="sm-holdings"></ul>
        <p class="sm-footnote">แหล่งข้อมูล: <a href="${esc(fund.current.tableSource)}" target="_blank" rel="noopener noreferrer">SEC Information Table</a> · มูลค่าเป็น USD ณ วันในรายงาน</p></section>`;
      drawHoldings();
      scrollHost().scrollTop = 0;
      focusHeading();
    }

    searchButton.addEventListener('click', () => {
      search.hidden = !search.hidden;
      searchButton.setAttribute('aria-expanded', String(!search.hidden));
      if (!search.hidden) input.focus();
    });
    input.addEventListener('input', () => {query = input.value; if (selected) drawList(); else drawCards();});
    input.addEventListener('keydown', event => {if (event.key === 'Escape') {search.hidden = true;searchButton.setAttribute('aria-expanded','false');searchButton.focus();}});
    body.querySelector('.sm-search-clear').addEventListener('click', () => {query='';input.value='';if(selected)drawList();else drawCards();input.focus();});

    content.addEventListener('click', event => {
      const target = event.target.closest('button');
      if (!target) return;
      if (target.dataset.fund) {scrollBeforeDetail=scrollHost().scrollTop;drawDetail(target.dataset.fund);}
      else if (target.classList.contains('sm-back')) {
        const id=selected.id;drawList();scrollHost().scrollTop=scrollBeforeDetail;content.querySelector(`[data-fund="${id}"]`)?.focus({preventScroll:true});
      } else if (target.dataset.category) {
        category=target.dataset.category;content.querySelectorAll('[data-category]').forEach(button=>button.setAttribute('aria-pressed',String(button===target)));drawCards();
      } else if (target.dataset.holdings) {
        filter=target.dataset.holdings;content.querySelectorAll('[data-holdings]').forEach(button=>button.setAttribute('aria-pressed',String(button===target)));drawHoldings();
      } else if (target.hasAttribute('data-reset')) {category='all';query='';input.value='';drawList();}
      else if (target.hasAttribute('data-retry')) loadData();
    });

    async function loadData() {
      content.innerHTML='<div class="sm-loading" role="status">กำลังเปิดรายงานพอร์ต…</div>';
      try {
        if (!cachedData) {
          const response = await fetch(new URL('../../data/smart-money.json', import.meta.url));
          if (!response.ok) throw new Error('Could not load filings');
          cachedData = validateDataset(await response.json());
        }
        if (!body.isConnected) return;
        funds=cachedData.funds.map(summarizeFund);drawList();
      } catch {
        if (!body.isConnected) return;
        content.innerHTML='<div class="sm-empty" role="status"><b>ยังเปิดข้อมูลพอร์ตไม่ได้</b><p>ตรวจการเชื่อมต่อแล้วลองอีกครั้ง</p><button class="sm-text-btn" data-retry>ลองอีกครั้ง</button></div>';
      }
    }
    loadData();
  }
};
