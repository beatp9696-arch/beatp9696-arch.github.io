import { stockOwnership } from '../core/smart-money-stock.js';
import { esc } from '../core/ui.js';
import { summarizeFund, donutRows, topHoldingRows, matchesFund, validateDataset, validateFund } from '../core/smart-money-model.js';
import { classifySecurity, sectorAllocation, SECTOR_LABELS } from '../core/smart-money-sectors.js';
import { canonicalSymbol, companyIdentity, companyLinks, companyLogoURL } from '../core/company-catalog.js';

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
const COLORS = ['#79c9b4', '#7f9fb8', '#ad9bc3', '#c5b28c', '#578d8c', '#364247'];
const STATUS = {new: 'พบในรายงานใหม่', added: 'จำนวนเพิ่ม', reduced: 'จำนวนลด', unchanged: 'จำนวนเท่าเดิม', exited: 'ไม่พบในรายงานนี้'};
const money = value => '$' + new Intl.NumberFormat('en-US', {notation: 'compact', maximumFractionDigits: 2}).format(value);
const number = value => new Intl.NumberFormat('en-US', {maximumFractionDigits: 0}).format(value);
const percent = value => new Intl.NumberFormat('en-US', {maximumFractionDigits: 1}).format(value) + '%';
const estimatePercent = value => value.toFixed(2) + '%';
const compactShares = value => new Intl.NumberFormat('en-US', {notation: 'compact', minimumFractionDigits: 2, maximumFractionDigits: 2}).format(value);
const date = value => new Date(value + 'T12:00:00').toLocaleDateString('en-GB', {day: 'numeric', month: 'short', year: 'numeric'});
const quarter = value => `Q${Math.ceil(Number(value.slice(5, 7)) / 3)} ${value.slice(0, 4)}`;
const change = row => row.changePercent === null ? (row.status === 'new' ? 'New' : '—') : `${row.changePercent > 0 ? '+' : row.changePercent < 0 ? '−' : ''}${percent(Math.abs(row.changePercent))}`;
const symbol = row => row.symbol || row.issuer;
const logos = {AAPL: 'AAPL.svg', AXP: 'AXP.png', GOOGL: 'GOOGL.png', GOOG: 'GOOGL.png', NVDA: 'NVDA.png', MSFT: 'MSFT.png', COHR: 'COHR.png', SNPS: 'SNPS.png', KO: 'KO.png', BAC: 'BAC.png', INTC: 'INTC.png', SpaceX: 'SPACEX.svg', BLK: 'BLK.png', BN: 'BN.png', AMZN: 'AMZN.png', UBER: 'UBER.png', QSR: 'QSR.png', SPY: 'SPY.png', IVV: 'IVV.png', TSLA: 'TSLA.png', WFC: 'WFC.png', BABA: 'BABA.png'};
const logoURL = key => companyLogoURL(key) || (logos[key] ? new URL(`../../assets/brands/${logos[key]}`, import.meta.url).href : null);
const DARK_LOGO_KEYS = new Set(['NOK', 'TEM']);
Object.assign(logos, Object.fromEntries(['CRWV','NOK','V','AVGO','AMD','TEM','HOOD','USB','TSM','GPN','MU','META','GS','DELL','OBDC','CVX','XOM','MRK'].map(key => [key, key + '.png'])));
// Issuer logos also identify disclosed instruments without a mapped stock symbol.
const issuerLogos = {'902973304': 'USB', '874039100': 'TSM', '37940XAU6': 'GPN', '595112103': 'MU', '500754106': 'KHC', '501044101': 'KR', '530909308': 'LLYVK', '650111107': 'NYT', '14040H105': 'COF', '530909100': 'LLYVA', '546347105': 'LPX', '47233W109': 'JEF'};
Object.assign(logos, Object.fromEntries(["JNJ","CSCO","GM","LRCX","UNH","GE","AMAT","LLY","NWL","COST","PM","SIRI","CAT","TXN","ABBV","VZ","HD","M","WMT","RTX","MA","PG","MO","COTY","HRB","PH","LMT","TFC","OLN","ETN","KMI","CDNS","VTR","TMUS","CCL","JBL","CTAS","TT","MTZ","IBM","MCD","BA","TMO","DUK","PLTR","SNDK","TJX","WY","OXY","URI","FIS","CMCSA","MOD","PFE","AMGN","PNC","CRM","CVS","LIN","STX","PEP","NFLX","VRTX","PTC","SCHW","FFIV","ACN","UNP","GLW","PANW","ADI","GILD","ABT","SO","COP","FAST","WELL","SBUX","FDS","GEV","ANET","AJG","ICE","VLO","RSG","PSX","BMY","MPC","JCI","EW","EQIX","ROK","PWR","TRV","BX","ABNB","MCK","VRSN","WM","CB","QCOM","CL","ORCL","HCA","TGT","UPS","HLT","WDC","PAYX","ITW","CRWD","IBKR","PYPL","DBX","RBLX","T","MORN","CLNE"].map(key => [key, key + '.png'])));
Object.assign(logos, {'BRK.A':'berkshire.svg','BRK.B':'berkshire.svg',JPM:'jpmorgan.svg'});
Object.assign(logos, Object.fromEntries(["MCO", "KHC", "DVA", "DAL", "KR", "ALLY", "LEN", "LLYVK", "NYT", "COF", "LLYVA", "LPX", "NUE", "NVR", "JEF", "DHI"].map(key => [key, key + '.png'])));
Object.assign(logos, {'LEN.B':'LEN.png'});
const stockBadge = row => {
  const key = row.symbol || issuerLogos[row.cusip] || sectorMetadata?.byCusip?.[row.cusip]?.symbol;
  const url = logoURL(key) || (key ? `https://assets.parqet.com/logos/symbol/${encodeURIComponent(key)}?format=png` : null);
  const fallback = esc((key || row.issuer).slice(0, 2));
  return url ? `<img class="sm-stock-logo" src="${url}" alt="" width="32" height="32" decoding="async" loading="lazy" referrerpolicy="no-referrer" data-fallback="${fallback}">` : `<span class="sm-stock-logo sm-stock-fallback" aria-hidden="true">${fallback}</span>`;
};
const profileImages = {
  berkshire: ['people/warren-buffett.jpg', 'photo'],
  nvidia: ['brands/NVDA.png', 'logo'],
  temasek: ['brands/temasek.svg', 'logo'],
  pershing: ['brands/pershing.svg', 'logo'],
  bridgewater: ['people/ray-dalio.jpg', 'photo'],
  ark: ['people/cathie-wood.jpg', 'photo'],
  'daily-journal': ['people/charlie-munger.jpg', 'photo'],
  soros: ['people/george-soros.jpg', 'photo'],
  blackrock: ['brands/BLK.png', 'logo'],
  'vanguard-capital': ['brands/vanguard.svg', 'logo'],
  'state-street': ['brands/state-street.svg', 'logo'],
  jpmorgan: ['brands/jpmorgan.svg', 'logo'],
  'morgan-stanley': ['brands/morgan-stanley.svg', 'logo'],
  invesco: ['brands/IVZ.png', 'logo'],
  trump: ['people/donald-trump.jpg', 'photo'],
  pelosi: ['people/nancy-pelosi.jpg', 'photo']
};
const profileImage = fund => {
  const asset = profileImages[fund.id];
  return asset ? `<img src="${new URL('../../assets/' + asset[0], import.meta.url).href}" alt="" width="240" height="240" decoding="async">` : '';
};
let ringSequence = 0;
let cachedData;
let sectorMetadata;
const detailCache = new Map();
const detailRequests = new Map();
async function loadFund(summary) {
  if (detailCache.has(summary.detailFile)) return detailCache.get(summary.detailFile);
  if (!detailRequests.has(summary.detailFile)) {
    const request = (async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);
      try {
        const response = await fetch(new URL('../../data/' + summary.detailFile, import.meta.url), {signal: controller.signal});
        if (!response.ok) throw new Error('Could not load holdings');
        const raw = validateFund(await response.json());
        if (raw.id !== summary.id || raw.current.reportDate !== summary.current.reportDate || raw.current.totalValue !== summary.current.totalValue || raw.previous.reportDate !== summary.previous.reportDate || raw.previous.totalValue !== summary.previous.totalValue) throw new Error('Mismatched report');
        const full = summarizeFund(raw);
        detailCache.set(summary.detailFile, full);
        return full;
      } finally { clearTimeout(timeout); }
    })();
    detailRequests.set(summary.detailFile, request);
    request.finally(() => detailRequests.delete(summary.detailFile)).catch(() => {});
  }
  return detailRequests.get(summary.detailFile);
}
const stockLink = (row, content, className) => `<button class="${className} sm-security-link" data-stock="${esc(row.id || row.symbol)}" aria-label="View ${esc(symbol(row))} across portfolios">${content}</button>`;
const stockCrossLinks = row => {
  const links = companyLinks(row.symbol);
  if (!links || !companyIdentity(links.ticker)) return '';
  return `<nav class="sm-company-links" aria-label="${esc(links.ticker)} links"><span>เชื่อมข้อมูลบริษัท</span>${links.research ? `<a href="${links.research}">Research ${ICON.arrow}</a>` : ''}<a href="${links.portfolio}">Portfolio thesis ${ICON.arrow}</a></nav>`;
};
const PAGE_SIZE = 50;
const ACTION = {purchase: 'ซื้อ', sale: 'ขาย', exchange: 'แลกเปลี่ยน'};
const OWNER = {SP: 'คู่สมรส (SP)', JT: 'ถือร่วม (JT)', SELF: 'ผู้ยื่นรายงาน'};
const range = row => row.valueMax === null ? `มากกว่า $${number(row.valueMin)}` : `$${number(row.valueMin)} – $${number(row.valueMax)}`;
const backButton = () => `<button class="sm-back">${ICON.back} ทุกพอร์ต</button>`;
const portrait = fund => profileImages[fund.id]
  ? `<span class="sm-portrait sm-portrait-photo sm-person-${esc(fund.id)}" aria-hidden="true">${profileImage(fund)}</span>`
  : `<span class="sm-portrait sm-person-${esc(fund.id)}" aria-hidden="true"><b>${esc(fund.monogram)}</b><span>DISCLOSURE</span></span>`;

// The validated catalog and full report use the same total. Undated estimates
// retain their explicitly labelled top-five basis; no missing holdings are inferred.
const chartRows = fund => fund.estimatedHoldings
  ? topHoldingRows(fund.estimatedHoldings.rows.map(row => ({...row, id: row.symbol, value: row.weight})))
  : fund.chart || donutRows(fund.rows, fund.current.totalValue);
const overviewRows = fund => fund.estimatedHoldings ? chartRows(fund) : topHoldingRows(chartRows(fund).filter(row => row.id !== 'other'));
const chartLabel = row => row.id === 'other' ? 'อื่น ๆ' : symbol(row);
const chartLegend = (rows, estimated = false) => `<ul class="sm-legend">${rows.map((row,i) => `<li data-chart-security="${esc(row.id)}">${row.id === 'other' ? `<i style="background:${COLORS[i]}"></i>` : stockBadge(row)}<span title="${esc(row.issuer)}">${esc(chartLabel(row))}${row.option ? ` · ${esc(row.option)}` : ''}</span><b>${estimatePercent(row.fraction*100)}</b>${estimated ? `<small>${estimatePercent(row.weight)} of estimated portfolio</small>` : `<small>${row.id === 'other' ? 'หลักทรัพย์ที่เหลือในรายงาน' : esc(row.issuer)}</small>`}</li>`).join('')}</ul>`;
const RING_LOGO_MIN_FRACTION = .02;

// Keep the allocation ring focused on the largest visible securities. The
// validated chart contains at most six slices, including the remainder.
const rowLogoKey = row => row.symbol || issuerLogos[row.cusip] || sectorMetadata?.byCusip?.[row.cusip]?.symbol;

function ring(fund, detailed = false) {
  const ringId = ++ringSequence;
  const rows = detailed ? chartRows(fund) : overviewRows(fund);
  const circumference = 2 * Math.PI * 78;
  let offset = 0;
  const circles = rows.map((row, i) => {
    const length = row.fraction * circumference;
    const arc = `<circle data-chart-security="${esc(row.id)}" data-fraction="${row.fraction}" cx="110" cy="110" r="78" fill="none" stroke="${COLORS[i]}" stroke-width="34" stroke-dasharray="${Math.max(0, length - 1.1)} ${circumference}" stroke-dashoffset="${-offset}"><title>${esc(chartLabel(row))} · ${estimatePercent(row.fraction*100)}</title></circle>`;
    offset += length;
    return arc;
  }).join('');
  let angle = -Math.PI / 2;
  const marks = rows.map((row, i) => {
    const mid = angle + row.fraction * Math.PI;
    angle += row.fraction * 2 * Math.PI;
    if (row.id === 'other' || i > 4 || row.fraction < RING_LOGO_MIN_FRACTION) return '';
    const x = 110 + Math.cos(mid) * 78, y = 110 + Math.sin(mid) * 78;
    const key = rowLogoKey(row);
    const url = logoURL(key);
    const label = (row.symbol || row.issuer.split(' ')[0]).slice(0, 4);
    const radius = Math.max(7.5, Math.min(13, 5 + row.fraction * 32));
    const imageRadius = Math.max(5.5, radius - 1.8);
    const badgeFill = DARK_LOGO_KEYS.has(key) ? '#101923' : '#f7f9fb';
    const badgeStroke = DARK_LOGO_KEYS.has(key) ? '#f7f9fb' : '#0d151d';
    const clipId = `sm-stock-${ringId}-${i}`;
    return `<g class="sm-ring-stock-mark" data-chart-logo="${esc(row.id)}" aria-hidden="true"><circle cx="${x}" cy="${y}" r="${radius}" fill="${url ? badgeFill : '#101726'}" stroke="${url ? badgeStroke : '#ffffff80'}" stroke-width="1.2"/>${url ? `<defs><clipPath id="${clipId}"><circle cx="${x}" cy="${y}" r="${imageRadius}"/></clipPath></defs><image href="${url}" x="${x-imageRadius}" y="${y-imageRadius}" width="${imageRadius*2}" height="${imageRadius*2}" preserveAspectRatio="xMidYMid meet" clip-path="url(#${clipId})"/>` : `<text x="${x}" y="${y+2.5}" text-anchor="middle" fill="#fff" font-size="${Math.max(6, radius*.55)}" font-weight="600">${esc(label)}</text>`}</g>`;
  }).join('');
  const center = profileImages[fund.id]
    ? `<span class="sm-brand sm-brand-${esc(fund.id)} sm-brand-${profileImages[fund.id][1]}">${profileImage(fund)}</span>`
    : `<span class="sm-brand sm-brand-${esc(fund.id)}"><b>${esc(fund.monogram)}</b><small>${esc(fund.brandCaption)}</small></span>`;
  const count = rows.filter(row => row.id !== 'other').length;
  const caption = fund.estimatedHoldings
    ? `Top ${count} · Estimated<br>เฉพาะกลุ่มนี้ = 100%`
    : detailed
      ? `${count} อันดับแรก${rows.some(row => row.id === 'other') ? ' + อื่น ๆ' : ''}<br>เทียบมูลค่าทั้งรายงาน`
      : `Top ${count} · เฉพาะกลุ่มนี้ = 100%<br>รวม ${estimatePercent(fund.topFiveWeight)} ของพอร์ต`;
  const basis = fund.estimatedHoldings ? 'estimated-top-five' : detailed ? 'reported-total' : 'reported-top-five';
  return `<div class="sm-chart${detailed ? ' sm-ring-large' : ''}" data-chart-basis="${basis}"><div class="sm-ring" aria-hidden="true"><svg viewBox="0 0 220 220"><g transform="rotate(-90 110 110)">${circles}</g>${marks}</svg>${center}</div><span class="sm-chart-caption">${caption}</span></div>`;
}

function card(fund, i) {
  if (fund.estimatedHoldings) {
    const estimate = fund.estimatedHoldings;
    return `<button class="sm-card sm-profile-card sm-estimated-card" data-fund="${esc(fund.id)}" style="--i:${Math.min(i,7)}" aria-label="ดูหุ้นถือครองประมาณการ ${esc(fund.name)} จากภาพอ้างอิง">
      <span class="sm-card-heading"><span><span class="sm-card-name">${esc(fund.name)}</span><span class="sm-card-sub">หุ้นถือครองจากภาพอ้างอิง</span></span><span class="sm-type-badge">ประมาณการ</span></span>
      <span class="sm-card-copy"><span class="sm-card-value">${estimate.rows.length} รายการ<small>จากภาพที่ให้มา</small></span>
      <span class="sm-card-changes-label">สัดส่วนพอร์ต (ประมาณการ)</span><span class="sm-card-changes">${estimate.rows.slice(0,2).map(row=>`<span><b>${esc(row.symbol)}</b><em>${estimatePercent(row.weight)}</em></span>`).join('')}</span>
      </span>${ring(fund)}<span class="sm-card-footer"><span class="sm-card-date">${estimate.asOf ? 'ข้อมูล ณ '+date(estimate.asOf) : 'ภาพไม่ระบุวันที่ของข้อมูล'}</span><span>ดูข้อมูล ${ICON.arrow}</span></span></button>`;
  }
  if (fund.kind === 'disclosure') {
    const report=fund.disclosure;
    return `<button class="sm-card sm-disclosure-card${fund.id === 'trump' ? ' sm-trump-card' : ''}" data-fund="${esc(fund.id)}" style="--i:${Math.min(i,7)}" aria-label="ดูข้อมูลเปิดเผย ${esc(fund.name)}">
      <span class="sm-card-copy"><span class="sm-card-name">${esc(fund.name)}</span><span class="sm-card-sub">${esc(fund.subtitle)}</span>
      <span class="sm-type-badge">${report.type === 'transactions' ? 'ธุรกรรมที่เปิดเผย' : 'ทรัพย์สินที่เปิดเผย'}</span>
      <span class="sm-card-value sm-disclosure-value">${report.entries.length} รายการ<small>คัดจากเอกสาร · มูลค่าเป็นช่วง</small></span>
      </span>${portrait(fund)}
      <span class="sm-disclosure-trades">${report.entries.slice(0,2).map(row=>`<span class="sm-disclosure-trade">${logoURL(row.symbol) ? `<img src="${logoURL(row.symbol)}" alt="" width="26" height="26">` : ''}<b>${esc(symbol(row))}</b><em class="${report.type === 'transactions' ? 'sm-action-'+row.action : ''}">${report.type === 'transactions' ? ACTION[row.action] : OWNER[row.owner]}</em></span>`).join('')}</span>
      <span class="sm-disclosure-footer"><span class="sm-card-date">${esc(report.dateLabel)} ${date(report.filedDate)}</span><span class="sm-disclosure-open">ดูรายการ ${ICON.arrow}</span></span></button>`;
  }
  const changes = fund.changes.slice(0, 2);
  return `<button class="sm-card sm-profile-card" data-fund="${esc(fund.id)}" style="--i:${Math.min(i,7)}" aria-label="ดูพอร์ต ${esc(fund.name)} ${quarter(fund.current.reportDate)}${fund.historical ? ' ข้อมูลย้อนหลัง' : ''}">
    <span class="sm-card-heading"><span><span class="sm-card-name">${esc(fund.name)}</span><span class="sm-card-sub">${esc(fund.subtitle)}</span></span><span class="sm-period-badge${fund.historical ? ' sm-historical' : ''}">${fund.historical ? 'ย้อนหลัง · ' : ''}${quarter(fund.current.reportDate)}</span></span>
    <span class="sm-card-copy">
      <span class="sm-card-value">${money(fund.current.totalValue)}<small>มูลค่าที่รายงาน · ${number(fund.positionCount ?? fund.rows.length)} รายการ</small></span>
      <span class="sm-card-changes-label">จำนวนหุ้นเทียบไตรมาสก่อน</span>
      <span class="sm-card-changes">${changes.length ? changes.map(row => `<span><b>${esc(symbol(row))}</b><em class="sm-${row.status}">${change(row)}</em></span>`).join('') : '<span class="sm-muted">จำนวนหุ้นไม่เปลี่ยน</span>'}</span>
    </span>
    ${ring(fund)}
    <span class="sm-card-footer"><span class="sm-card-date">ถือครอง ณ ${date(fund.current.reportDate)}</span><span>ดูรายงาน ${ICON.arrow}</span></span>
  </button>`;
}

function sectorPanel(fund) {
  const allocation=sectorAllocation(fund,sectorMetadata);
  if(!allocation.rows.length)return '';
  const screenshot=allocation.basis==='screenshot';
  return `<section class="sm-sectors"><h3>Sector Allocation</h3><p class="sm-sector-basis">${screenshot?'Estimated allocation across the portfolio shown in the reference data':'Based on total reported holdings value · Nasdaq sectors'}</p>
    <ul class="sm-sector-bars">${allocation.rows.map(row=>`<li><span title="${esc(row.name||row.label)}">${esc(row.label)}</span><b>${estimatePercent(row.weight)}</b><span class="sm-sector-track" aria-hidden="true"><i style="width:${Math.min(100,Math.max(0,row.weight))}%"></i></span>${row.value===undefined?'':`<small>${money(row.value)}</small>`}</li>`).join('')}</ul>
    ${screenshot?'':`<p class="sm-sector-source">Funds / ETFs are not broken down into underlying holdings. Unmatched securities are shown as “Unclassified”.<br><a href="https://www.nasdaq.com/market-activity/stocks/screener" target="_blank" rel="noopener noreferrer">Nasdaq company sectors</a> · Checked ${sectorMetadata?date(sectorMetadata.checkedAt):'date unavailable'}</p>`}</section>`;
}

export default {
  id: 'smart-money', name: 'Smart Money', icon: `<span class="sm-shell-icon">${ICON.bulb}</span>`,
  defaultSize: {w: 500, h: 790},
  mount(body) {
    body.classList.add('app-pane', 'app-smart-money');
    let funds = [], query = '', category = 'all', selected = null, filter = 'all';
    let requestId=0, visibleCount=PAGE_SIZE, holdingQuery='';
    let scrollBeforeDetail = 0;
    let stockTarget = null, stockOrigin = null;
    body.innerHTML = `<header class="sm-head"><a class="moa-brand" href="index.html"><span class="moa-brand-mark" aria-hidden="true"><i></i><i></i><i></i></span>Moatrices<span class="moa-brand-section">SMART MONEY</span></a><div class="sm-head-actions"><button class="sm-icon sm-search-toggle" aria-label="ค้นหาพอร์ต">${ICON.search}</button><button class="sm-icon sm-settings" aria-label="Settings">${ICON.gear}</button></div></header>
      <div class="sm-page-head"><div><span class="sm-eyebrow">REPORTED HOLDINGS. A CLEARER PERSPECTIVE.</span><h1>Smart Money<span>.</span></h1><p>ศึกษานักลงทุนและสถาบัน ผ่านข้อมูลที่เปิดเผย</p></div><div class="sm-search"><span>${ICON.search}</span><input type="search" placeholder="ค้นหานักลงทุน บริษัท หรือหุ้น" aria-label="ค้นหานักลงทุน บริษัท หรือหุ้น" autocomplete="off"><button class="sm-icon sm-search-clear" aria-label="ล้างคำค้น">${ICON.close}</button></div></div>
      <div class="sm-content"><div class="sm-loading" role="status">กำลังเปิดรายงานพอร์ต…</div></div>`;
    const content = body.querySelector('.sm-content');
    content.addEventListener('error', event => {
      const img = event.target;
      if (!img.matches?.('img.sm-stock-logo')) return;
      const fallback = document.createElement('span');
      fallback.className = 'sm-stock-logo sm-stock-fallback';
      fallback.setAttribute('aria-hidden', 'true');
      fallback.textContent = img.dataset.fallback;
      img.replaceWith(fallback);
    }, true);
    const search = body.querySelector('.sm-search');
    const input = search.querySelector('input');
    const searchButton = body.querySelector('.sm-search-toggle');
    const pageHead = body.querySelector('.sm-page-head');
    const scrollHost = () => body.closest('#shell-view') || body.closest('.win-body') || body;
    const focusHeading = () => body.querySelector('.sm-detail h2')?.focus({preventScroll: true});
    body.querySelector('.sm-settings').addEventListener('click', () => document.dispatchEvent(new CustomEvent('pp-settings')));

    function drawCards() {
      const filtered = funds.filter(fund => (category === 'all' || fund.category === category) && matchesFund(fund, query));
      const grid = content.querySelector('.sm-cards');
      if (!grid) return;
      grid.innerHTML = filtered.length ? filtered.map(card).join('') : `<div class="sm-empty"><b>ไม่พบพอร์ตที่ตรงกับคำค้น</b><p>ลองชื่อบริษัท ชื่อกองทุน หรือรหัสหุ้นอื่น</p><button class="sm-text-btn" data-reset>ล้างตัวกรอง</button></div>`;
      content.querySelector('.sm-results-count').textContent = `${filtered.length} รายการ`;
    }

    function drawList() {
      pageHead.hidden = false;
      selected = null;
      stockTarget = null;stockOrigin = null;
      requestId++;
      content.innerHTML = `<div class="sm-categories" aria-label="ประเภทพอร์ต">${[['all','ทั้งหมด'],['investor','นักลงทุน'],['institution','สถาบัน'],['company','บริษัท'],['public-figure','บุคคลสาธารณะ']].map(([id,label])=>`<button data-category="${id}" aria-pressed="${category===id}">${label}</button>`).join('')}<span class="sm-results-count" aria-live="polite"></span></div>
        <div class="sm-intro"><p>กราฟรายงาน: 5 อันดับแรก + อื่น ๆ · ข้อมูลประมาณการแยกป้ายกำกับ</p><span class="sm-source-badge">${ICON.check} วันที่กำกับแต่ละพอร์ต</span></div>
        <div class="sm-cards"></div>
        <div class="sm-disclosure"><b>อ่านข้อมูลตามประเภทและวันที่ในรายงาน</b><p>13F แสดงหลักทรัพย์ ณ สิ้นไตรมาสที่สถาบันรายงาน อาจเผยแพร่ภายหลังได้ถึง 45 วัน และไม่ได้รวมสินทรัพย์ทุกประเภท การเปลี่ยนแปลงคือจำนวนหุ้นตามรายงาน ส่วนเอกสารของบุคคลสาธารณะแสดงช่วงมูลค่าหรือธุรกรรมตามต้นฉบับ</p><p>แฟ้ม Charlie Munger เป็นข้อมูลย้อนหลังปี 2023 · ตรวจแหล่งข้อมูล ${date(cachedData.checkedAt)}</p><a href="https://www.investor.gov/introduction-investing/investing-basics/glossary/form-13f-reports-filed-institutional-investment" target="_blank" rel="noopener noreferrer">รู้จักรายงาน 13F ${ICON.arrow}</a><p><a href="${new URL('../../assets/credits.html', import.meta.url).href}" target="_blank" rel="noopener noreferrer">เครดิตภาพและโลโก้ ${ICON.arrow}</a></p></div>`;
      drawCards();
    }

    function drawHoldings() {
      const all = filter === 'exited' ? selected.exits : filter === 'changes' ? selected.changes : selected.rows;
      const needle=holdingQuery.trim().toLocaleLowerCase();
      const items=all.filter(row=>[row.symbol||'',row.issuer,row.cusip].some(text=>text.toLocaleLowerCase().includes(needle)));
      content.querySelector('.sm-holdings').innerHTML = items.length ? items.slice(0,visibleCount).map(row => `<li tabindex="-1">${stockLink(row, `${stockBadge(row)}<div class="sm-holding-label"><b>${esc(symbol(row))}</b><span>${esc(row.issuer)}${row.option ? ' · '+esc(row.option) : ''}</span></div>`, 'sm-holding-id')}<div class="sm-holding-value"><b>${estimatePercent(row.weight)}</b><span>${money(row.value)}</span></div><div class="sm-holding-shares"><span>${number(row.shares)} ${row.unit === 'PRN' ? 'เงินต้นตามรายงาน' : 'หุ้นอ้างอิง'}</span><span class="sm-status sm-${row.status}">${STATUS[row.status]}${row.status === 'unchanged' ? '' : ' · '+change(row)}</span></div></li>`).join('') : '<li class="sm-empty">ไม่มีรายการที่ตรงกับตัวกรอง</li>';
      content.querySelector('.sm-holding-count').textContent=`แสดง ${Math.min(visibleCount,items.length)} จาก ${number(items.length)} รายการ`;
      content.querySelector('[data-more]').hidden=visibleCount>=items.length;
    }

    const profileTabs = (fund, view) => fund.estimatedHoldings ? `<div class="sm-holding-tabs sm-profile-tabs" aria-label="Data view"><button data-profile-view="holdings" aria-pressed="${view === 'holdings'}">Estimated holdings</button><button data-profile-view="transactions" aria-pressed="${view === 'transactions'}">${fund.disclosure.type==='transactions'?'OGE transactions':'Disclosed assets'}</button></div>` : '';

    function drawEstimatedRows() {
      const estimate=selected.estimatedHoldings, needle=holdingQuery.trim().toLocaleLowerCase();
      const rows=estimate.rows.filter(row=>[row.symbol,row.issuer].some(value=>value.toLocaleLowerCase().includes(needle)));
      content.querySelector('.sm-estimated-table tbody').innerHTML=rows.length?rows.slice(0,visibleCount).map(row=>`<tr><th scope="row">${stockLink(row, `${stockBadge(row)}<div><b>${esc(row.symbol)}</b><span title="${esc(row.issuer)}">${esc(row.issuer)}</span></div>`, 'sm-estimated-stock')}</th><td>${estimatePercent(row.weight)}</td><td>${compactShares(row.shares)}</td></tr>`).join(''):'<tr><td colspan="3" class="sm-empty">No matching holdings</td></tr>';
      content.querySelector('.sm-estimate-count').textContent=`Showing ${Math.min(rows.length,visibleCount)} of ${rows.length} holdings`;
      content.querySelector('[data-estimate-more]').hidden=visibleCount>=rows.length;
    }

    function drawEstimatedHoldings(fund) {
      holdingQuery='';visibleCount=PAGE_SIZE;
      const estimate = fund.estimatedHoldings;
      const top = chartRows(fund);
      const topWeight = top.reduce((sum,row) => sum + row.weight, 0);
      content.innerHTML = `<section class="sm-detail sm-estimated-detail"><button class="sm-back">${ICON.back} All portfolios</button><div class="sm-detail-header"><div class="sm-detail-heading"><span class="sm-kicker sm-history-label">Holdings · Estimates</span><h2 tabindex="-1">${esc(fund.name)}</h2><p>${estimate.asOf ? 'Reference date: '+date(estimate.asOf) : 'Reference data is undated'}</p></div><div class="sm-detail-total"><span class="sm-kicker">Holdings in reference data</span><strong>${estimate.rows.length}</strong><p>estimated holdings</p></div></div>
        ${profileTabs(fund, 'holdings')}
        <div class="sm-allocation-panel sm-estimated-allocation">${ring(fund, true)}<div class="sm-allocation-copy"><h3>Top ${top.length} · Estimated holdings</h3><p class="sm-chart-note">Chart percentages are within this group only (= 100%). Together these holdings represent ${estimatePercent(topWeight)} of the estimated portfolio. Portfolio weights appear beneath each chart percentage and in the holdings table.</p>${chartLegend(top, true)}</div></div>
        <p class="sm-estimate-note">${esc(estimate.note)}</p>
        ${sectorPanel(fund)}
        <label class="sm-holding-search sm-estimate-search">Search holdings<input type="search" placeholder="Symbol or company name" autocomplete="off"></label>
        <div class="sm-estimated-table-wrap"><table class="sm-estimated-table"><caption>${esc(estimate.coverage)}</caption><thead><tr><th scope="col">Name / Symbol</th><th scope="col">Portfolio %<br><small>Estimated</small></th><th scope="col">Shares held<br><small>Estimated</small></th></tr></thead><tbody>
        </tbody></table></div><div class="sm-pagination"><span class="sm-estimate-count" aria-live="polite"></span><button class="sm-text-btn" data-estimate-more>Show ${PAGE_SIZE} more</button></div><p class="sm-footnote">${esc(estimate.coverage)} · Total displayed weight: ${estimatePercent(estimate.rows.reduce((sum,row)=>sum+row.weight,0))}</p></section>`;
      drawEstimatedRows();
      scrollHost().scrollTop=0;focusHeading();
    }

    function drawDisclosure(fund) {
      const report=fund.disclosure;
      content.innerHTML=`<section class="sm-detail">${backButton()}<div class="sm-detail-heading"><span class="sm-kicker">${esc(report.periodLabel)}</span><h2 tabindex="-1">${esc(fund.name)}</h2><p>${esc(fund.subtitle)}</p></div>
        ${profileTabs(fund, 'transactions')}<div class="sm-disclosure-summary">${portrait(fund)}<div><strong>${report.entries.length} รายการ</strong><p>${esc(report.coverage)}</p><p>${esc(report.dateLabel)} ${date(report.filedDate)}</p></div></div>
        <p class="sm-detail-note">${esc(fund.note)}</p><div class="sm-report-links"><a href="${esc(report.source)}" target="_blank" rel="noopener noreferrer">${esc(report.sourceLabel)} ${ICON.arrow}</a></div>
        <h3 class="sm-section-title">${esc(report.title)}</h3><p class="sm-range-caption">${report.type==='transactions' ? 'ช่วงมูลค่าธุรกรรม' : 'ช่วงมูลค่าทรัพย์สิน'} · USD ตามเอกสาร</p>
        <ul class="sm-disclosed-list">${report.entries.map(row=>`<li><div class="sm-disclosed-heading">${stockLink(row, `${stockBadge(row)}<b>${esc(symbol(row))}</b>`, 'sm-disclosed-stock')}<span>${report.type==='transactions' ? ACTION[row.action]+' · '+date(row.date) : OWNER[row.owner]}</span></div><p>${esc(row.issuer)}</p><strong>${range(row)}</strong><a href="${esc(report.source)}#page=${row.page}" target="_blank" rel="noopener noreferrer">${esc(row.reference)} · หน้า ${row.page} ${ICON.arrow}</a></li>`).join('')}</ul></section>`;
      scrollHost().scrollTop=0;focusHeading();
    }

    function stockReportCard({fund, row}) {
      const unit = row.unit === 'PRN' ? 'principal (USD)' : row.option ? 'underlying shares' : 'shares';
      const status = {new:'New in report', added:'Increased', reduced:'Decreased', unchanged:'Unchanged', exited:'No longer reported'}[row.status];
      const delta = row.delta === null ? '—' : `${row.delta > 0 ? '+' : row.delta < 0 ? '−' : ''}${number(Math.abs(row.delta))}`;
      const changeRate = row.previousShares > 0 && row.changePercent !== null ? ` (${row.changePercent > 0 ? '+' : ''}${percent(row.changePercent)})` : '';
      return `<article class="sm-owner-card" data-owner="${esc(fund.id)}">
        <div class="sm-owner-heading"><span class="sm-owner-photo${profileImages[fund.id]?.[1] === 'logo' ? ' sm-owner-logo' : ''}" aria-hidden="true">${profileImage(fund)}</span><div><button class="sm-owner-name" data-stock-fund="${esc(fund.id)}">${esc(fund.name)} ${ICON.arrow}</button><p>${esc(fund.subtitle)}</p></div><span class="sm-owner-weight">${estimatePercent(row.weight)}<small>of reported portfolio</small></span></div>
        ${fund.historical ? '<p class="sm-stock-historical">Historical snapshot · not a current portfolio</p>' : ''}
        <p class="sm-owner-instrument">${esc(row.shareClass || 'Reported security')}${row.option ? ' · '+esc(row.option)+' option' : ''} · ${esc(row.cusip)}</p>
        <dl class="sm-owner-numbers"><div><dt>Reported ${unit}</dt><dd>${number(row.shares)}</dd></div><div><dt>Previous ${unit}</dt><dd>${row.previousShares === null ? '—' : number(row.previousShares)}</dd></div><div><dt>Change in ${unit}</dt><dd class="sm-${row.status}">${delta}<small>${status}${changeRate}</small></dd></div></dl>
        <div class="sm-owner-dates"><span>Holdings as of <b>${date(fund.current.reportDate)}</b></span><span>Compared with <b>${date(fund.previous.reportDate)}</b></span><span>Filed <b>${date(fund.current.filedDate)}</b></span><a href="${esc(fund.current.source)}" target="_blank" rel="noopener noreferrer">SEC filing ${ICON.arrow}</a></div>
      </article>`;
    }

    function drawStock(loaded, failed, loading) {
      const result = stockOwnership(stockTarget, loaded, cachedData.disclosures);
      const title = stockTarget.symbol || stockTarget.cusip || stockTarget.issuer;
      const total = cachedData.funds.length;
      const section = (heading, entries, className) => entries.length ? `<section class="${className}"><h3>${heading} <span>${entries.length}</span></h3><div class="sm-owner-list">${entries.map(stockReportCard).join('')}</div></section>` : '';
      content.innerHTML = `<section class="sm-detail sm-stock-detail"><button class="sm-back" data-stock-back>${ICON.back} Back to ${esc(selected?.name || 'all portfolios')}</button>
        <div class="sm-detail-heading sm-stock-heading">${stockBadge(stockTarget)}<div><span class="sm-kicker">Across portfolios · Reported holdings</span><h2 tabindex="-1">${esc(title)}</h2><p>${esc(stockTarget.issuer)}</p>${stockCrossLinks(stockTarget)}</div></div>
        ${stockTarget.option || stockTarget.unit === 'PRN' ? `<p class="sm-stock-historical">${stockTarget.option ? esc(stockTarget.option)+' options · underlying share counts' : 'Principal instrument · amounts are not share counts'}. Only the same instrument is compared.</p>` : ''}
        <div class="sm-stock-summary"><strong>${result.portfolioCount}<span>portfolios report holdings${loading || failed.length ? ' · partial' : ''}</span></strong><strong>${loaded.length} / ${total}<span>filings checked</span></strong></div>
        <p class="sm-stock-note">Each weight refers to that portfolio’s reported total. Dates differ across portfolios. Share changes compare two filings and may reflect stock splits or reporting changes; they are not a trade history.</p>
        <div class="sm-stock-coverage" role="status">${loading ? `Checking portfolio reports… ${loaded.length} of ${total} available.` : failed.length ? `Partial results · ${failed.length} portfolio reports could not be loaded.` : `Checked all ${total} available portfolio reports.`}${failed.length ? `<p>${failed.map(fund=>esc(fund.name)).join(', ')}</p><button class="sm-text-btn" data-stock-retry>Retry missing reports</button>` : ''}</div>
        ${section('Reported holdings', result.current, 'sm-stock-current')}
        ${!result.current.length ? '<p class="sm-empty">No matching holdings in the reports checked so far.</p>' : ''}
        ${section('No longer reported', result.exited, 'sm-stock-exited')}
        ${section('Historical reports', result.historical, 'sm-stock-history')}
        ${result.estimates.length ? `<section class="sm-stock-estimates"><h3>Estimated holdings <span>${result.estimates.length}</span></h3><p class="sm-stock-note">From reference data supplied for these profiles. These estimates are separate from filing figures; no comparable previous period is available.</p><div class="sm-owner-list">${result.estimates.map(({fund,row})=>`<article class="sm-owner-card" data-estimated-owner="${esc(fund.id)}"><div class="sm-owner-heading"><span class="sm-owner-photo${profileImages[fund.id]?.[1] === 'logo' ? ' sm-owner-logo' : ''}" aria-hidden="true">${profileImage(fund)}</span><div><button class="sm-owner-name" data-stock-fund="${esc(fund.id)}">${esc(fund.name)} ${ICON.arrow}</button><p>Estimated · ${fund.estimatedHoldings.asOf ? date(fund.estimatedHoldings.asOf) : 'Date unavailable'}</p></div><span class="sm-owner-weight">${estimatePercent(row.weight)}<small>estimated portfolio weight</small></span></div><dl class="sm-owner-numbers"><div><dt>Estimated shares</dt><dd>${number(row.shares)}</dd></div><div><dt>Change in shares</dt><dd>—<small>No comparable period</small></dd></div></dl></article>`).join('')}</div></section>` : ''}
      </section>`;
    }

    async function openStock() {
      const request = ++requestId;
      const available = () => cachedData.funds.map(fund => detailCache.get(fund.detailFile)).filter(Boolean);
      const pending = cachedData.funds.filter(fund => !detailCache.has(fund.detailFile));
      drawStock(available(), [], pending.length > 0);
      scrollHost().scrollTop=0;focusHeading();
      if (!pending.length) return;
      const failed = [];
      let next = 0;
      // Download full reports only when a stock is opened; reuse visited reports
      // and limit parallel requests so large portfolios do not flood the network.
      await Promise.all(Array.from({length: Math.min(4, pending.length)}, async () => {
        while (next < pending.length && request === requestId && body.isConnected) {
          const summary = pending[next++];
          try { await loadFund(summary); } catch { failed.push(summary); }
        }
      }));
      if (request !== requestId || !body.isConnected) return;
      const wasHeadingFocused = document.activeElement === content.querySelector('h2');
      const top = scrollHost().scrollTop;
      drawStock(available(), failed, false);
      scrollHost().scrollTop=top;
      if (wasHeadingFocused) focusHeading();
    }

    async function openDetail(id) {
      const summary=funds.find(fund=>fund.id===id);
      if(!summary)return;
      stockTarget=null;stockOrigin=null;
      selected=summary;pageHead.hidden=true;const request=++requestId;
      if(summary.kind==='disclosure'){summary.estimatedHoldings ? drawEstimatedHoldings(summary) : drawDisclosure(summary);return;}
      content.innerHTML=`<section class="sm-detail">${backButton()}<div class="sm-loading" role="status">กำลังเปิดรายงาน ${esc(summary.name)}…</div></section>`;
      scrollHost().scrollTop=0;
      try {
        const full = await loadFund(summary);
        if(request!==requestId || !body.isConnected)return;
        selected=full;drawDetail();
      } catch {
        if(request!==requestId || !body.isConnected)return;
        content.innerHTML=`<section class="sm-detail">${backButton()}<div class="sm-empty" role="status"><b>ยังเปิดรายละเอียดไม่ได้</b><p>ตรวจการเชื่อมต่อแล้วลองดาวน์โหลดรายงานนี้อีกครั้ง</p><button class="sm-text-btn" data-retry-detail>ลองอีกครั้ง</button></div></section>`;
      }
    }

    function drawDetail() {
      filter = 'all';visibleCount=PAGE_SIZE;holdingQuery='';
      const fund = selected, chart = chartRows(fund);
      const topCount = chart.filter(row => row.id !== 'other').length;
      content.innerHTML = `<section class="sm-detail">${backButton()}<div class="sm-detail-header"><div class="sm-detail-heading"><span class="sm-kicker${fund.historical ? ' sm-history-label' : ''}">${quarter(fund.current.reportDate)} · ${fund.historical ? 'แฟ้มย้อนหลัง · ' : ''}13F snapshot</span><h2 tabindex="-1">${esc(fund.name)}</h2><p>${esc(fund.subtitle)}</p><p class="sm-detail-dates">ถือครอง ณ ${date(fund.current.reportDate)} · ยื่น ${date(fund.current.filedDate)}</p></div><div class="sm-detail-total"><span class="sm-kicker">มูลค่าในรายงาน</span><strong>${money(fund.current.totalValue)}</strong><p>${number(fund.rows.length)} รายการ</p></div></div>
        <div class="sm-allocation-panel">${ring(fund, true)}<div class="sm-allocation-copy"><h3>${topCount} อันดับแรก${chart.some(row => row.id === 'other') ? ' และส่วนที่เหลือ' : ''}</h3><p class="sm-chart-note">สัดส่วนเทียบมูลค่าทั้งรายงาน · ${topCount} อันดับแรกรวม ${estimatePercent(fund.topFiveWeight)}</p>${chartLegend(chart)}</div></div>
        ${sectorPanel(fund)}<div class="sm-report-links"><a href="${esc(fund.current.source)}" target="_blank" rel="noopener noreferrer">รายงานรอบนี้ ${ICON.arrow}</a><a href="${esc(fund.previous.source)}" target="_blank" rel="noopener noreferrer">รอบก่อน ${quarter(fund.previous.reportDate)} ${ICON.arrow}</a></div>
        <p class="sm-detail-note">${esc(fund.note)} กราฟและรายการถือครองใช้มูลค่ารวมตามรายงาน 13F เป็นฐานเดียวกัน “อื่น ๆ” คือหลักทรัพย์ที่เหลือนอก ${topCount} อันดับแรก เปรียบเทียบจำนวนหุ้นตามรายงาน ซึ่งอาจได้รับผลจากการแตกหุ้น การเปลี่ยนชนิดหลักทรัพย์ หรือขอบเขตการรายงาน ${fund.profileSource ? `<a href="${esc(fund.profileSource)}" target="_blank" rel="noopener noreferrer">ความเกี่ยวข้องกับบุคคล</a>` : ''}</p>
        <details class="sm-filing-sources"><summary>เอกสารและฉบับแก้ไขที่ใช้</summary>${[fund.current,fund.previous].map(period=>`<div><b>${quarter(period.reportDate)}</b>${period.sources.map(ref=>`<a href="${esc(ref.source)}" target="_blank" rel="noopener noreferrer">${esc(ref.label)} ${ICON.arrow}</a>`).join('')}${period.reconciliationDifference ? `<p>ใช้ผลรวมตาราง $${number(period.totalValue)} ซึ่งต่างจากยอดหน้าปกรวม $${number(period.coverTotalValue)} อยู่ $${number(Math.abs(period.reconciliationDifference))}</p>` : ''}</div>`).join('')}</details>
        <div class="sm-holding-tabs" aria-label="รายการถือครอง"><button data-holdings="all" aria-pressed="true">ถือครอง ${number(fund.rows.length)}</button><button data-holdings="changes" aria-pressed="false">เปลี่ยนแปลง ${number(fund.changes.length)}</button><button data-holdings="exited" aria-pressed="false">ไม่พบแล้ว ${number(fund.exits.length)}</button></div>
        <label class="sm-holding-search">ค้นหาในพอร์ตนี้<input type="search" placeholder="ชื่อหุ้น บริษัท หรือ CUSIP" autocomplete="off"></label><ul class="sm-holdings"></ul><div class="sm-pagination"><span class="sm-holding-count" aria-live="polite"></span><button class="sm-text-btn" data-more>ดูอีก ${PAGE_SIZE} รายการ</button></div>
        <p class="sm-footnote">แหล่งข้อมูล: <a href="${esc(fund.current.tableSource)}" target="_blank" rel="noopener noreferrer">SEC Information Table</a> · มูลค่าเป็น USD ณ วันในรายงาน · เครื่องหมาย — หมายถึงคำนวณเปอร์เซ็นต์ไม่ได้เมื่อจำนวนรอบก่อนเป็นศูนย์</p></section>`;
      drawHoldings();
      scrollHost().scrollTop = 0;
      focusHeading();
    }

    searchButton.addEventListener('click', () => {
      if (selected) drawList();
      input.focus();
    });
    input.addEventListener('input', () => {query = input.value; if (selected) drawList(); else drawCards();});
    input.addEventListener('keydown', event => {if (event.key === 'Escape') searchButton.focus();});
    body.querySelector('.sm-search-clear').addEventListener('click', () => {query='';input.value='';if(selected)drawList();else drawCards();input.focus();});

    content.addEventListener('click', event => {
      const target = event.target.closest('button');
      if (!target) return;
      if (target.hasAttribute('data-stock')) {
        const rows = [...(selected?.rows || []), ...(selected?.exits || []), ...(selected?.estimatedHoldings?.rows || []), ...(selected?.disclosure?.entries || [])];
        const row = rows.find(row => (row.id || row.symbol) === target.dataset.stock);
        if (row) {
          stockOrigin = {nodes: [...content.childNodes], scrollTop: scrollHost().scrollTop, focus: target};
          stockTarget = row;
          openStock();
        }
      } else if (target.hasAttribute('data-stock-back')) {
        requestId++;
        const origin = stockOrigin;
        stockTarget=null;stockOrigin=null;
        if (!origin) { const url = new URL(location.href); url.searchParams.delete('stock'); history.replaceState(history.state, '', url); drawList(); return; }
        content.replaceChildren(...origin.nodes);
        scrollHost().scrollTop=origin.scrollTop;
        origin.focus?.focus({preventScroll:true});
      } else if (target.hasAttribute('data-stock-retry')) openStock();
      else if (target.dataset.stockFund) openDetail(target.dataset.stockFund);
      else if (target.dataset.fund) {scrollBeforeDetail=scrollHost().scrollTop;openDetail(target.dataset.fund);}
      else if (target.classList.contains('sm-back')) {
        const id=selected.id;drawList();scrollHost().scrollTop=scrollBeforeDetail;content.querySelector(`[data-fund="${id}"]`)?.focus({preventScroll:true});
      } else if (target.dataset.category) {
        category=target.dataset.category;content.querySelectorAll('[data-category]').forEach(button=>button.setAttribute('aria-pressed',String(button===target)));drawCards();
      } else if (target.dataset.holdings) {
        filter=target.dataset.holdings;visibleCount=PAGE_SIZE;content.querySelectorAll('[data-holdings]').forEach(button=>button.setAttribute('aria-pressed',String(button===target)));drawHoldings();
      } else if (target.dataset.profileView && selected?.estimatedHoldings) {
        target.dataset.profileView === 'holdings' ? drawEstimatedHoldings(selected) : drawDisclosure(selected);
      } else if (target.hasAttribute('data-reset')) {category='all';query='';input.value='';drawList();}
      else if (target.hasAttribute('data-retry')) loadData();
      else if (target.hasAttribute('data-retry-detail')) openDetail(selected.id);
      else if (target.hasAttribute('data-more')) {const index=visibleCount;visibleCount+=PAGE_SIZE;drawHoldings();content.querySelectorAll('.sm-holdings>li')[index]?.focus();}
      else if (target.hasAttribute('data-estimate-more')) {visibleCount+=PAGE_SIZE;drawEstimatedRows();}
    });
    content.addEventListener('input',event=>{if(event.target.matches('.sm-holding-search input')){holdingQuery=event.target.value;visibleCount=PAGE_SIZE;selected.estimatedHoldings ? drawEstimatedRows() : drawHoldings();}});

    async function loadData() {
      content.innerHTML='<div class="sm-loading" role="status">กำลังเปิดรายงานพอร์ต…</div>';
      try {
        if (!cachedData) {
          const response = await fetch(new URL('../../data/smart-money.json', import.meta.url));
          if (!response.ok) throw new Error('Could not load filings');
          cachedData = validateDataset(await response.json());
        }
        if (!body.isConnected) return;
        if(!sectorMetadata){
          try {
            const response=await fetch(new URL('../../data/smart-money-sectors.json',import.meta.url));
            if(response.ok)sectorMetadata=await response.json();
          } catch { /* Unmatched holdings remain explicitly unclassified. */ }
        }
        const order=['berkshire','trump','bridgewater','ark','daily-journal','soros','pelosi','pershing','blackrock','vanguard-capital','state-street','jpmorgan','morgan-stanley','invesco','nvidia','temasek'];
        funds=[...cachedData.funds,...cachedData.disclosures].sort((a,b)=>order.indexOf(a.id)-order.indexOf(b.id));drawList();
        const stock=canonicalSymbol(new URLSearchParams(location.search).get('stock'));
        if(/^[A-Z0-9.-]{1,20}$/.test(stock)){stockTarget={symbol:stock,issuer:companyIdentity(stock)?.[0]||stock,unit:'SH',option:''};selected=null;stockOrigin=null;openStock();}
      } catch {
        if (!body.isConnected) return;
        content.innerHTML='<div class="sm-empty" role="status"><b>ยังเปิดข้อมูลพอร์ตไม่ได้</b><p>ตรวจการเชื่อมต่อแล้วลองอีกครั้ง</p><button class="sm-text-btn" data-retry>ลองอีกครั้ง</button></div>';
      }
    }
    loadData();
  }
};
