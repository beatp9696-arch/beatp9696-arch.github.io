import { escapeHTML as esc, dateLabel, needsReview } from './app/js/core/research-model.js';

// This is the same dated public catalog used by Research; no personal storage is read.
const host = document.getElementById('home-companies');
const search = document.getElementById('company-search');
let companies = [];

// Keep the existing companion and its controls in the sidebar, clear of the reading area.
const buddy = document.getElementById('tars-buddy');
const sidebar = document.querySelector('.home-sidebar');
if (buddy && sidebar) sidebar.append(buddy);

// Move the same card so reading and keyboard order follow its visual placement.
const approach = document.querySelector('.home-approach');
const coverage = document.querySelector('.home-coverage');
const workspace = document.querySelector('.home-workspace');
const compactHome = matchMedia('(max-width: 820px)');
function placeApproach() {
  if (!approach || !coverage || !workspace) return;
  const focused = approach.contains(document.activeElement) ? document.activeElement : null;
  const anchor = compactHome.matches ? coverage : workspace;
  if (anchor.nextElementSibling !== approach) anchor.after(approach);
  focused?.focus({ preventScroll: true });
}
placeApproach();
compactHome.addEventListener('change', placeApproach);

const title = document.querySelector('.site-header .site-title');
if (title) {
  title.classList.add('moa-brand');
  title.innerHTML = '<span class="moa-brand-mark" aria-hidden="true"><i></i><i></i><i></i></span>Moatrices<span class="moa-brand-section">RESEARCH</span>';
}

function render() {
  const query = search.value.trim().toLocaleLowerCase();
  const filtered = companies.filter(c => `${c.ticker} ${c.name} ${c.sector}`.toLocaleLowerCase().includes(query));
  host.innerHTML = filtered.length ? filtered.map(c => `<a class="home-company" href="portfolio.html?view=research&amp;ticker=${encodeURIComponent(c.ticker)}">
    <span class="home-company-logo"><span>${esc(c.ticker.slice(0, 2))}</span><img src="app/assets/brands/${encodeURIComponent(c.ticker)}.png" alt="" width="42" height="42"></span>
    <span class="home-company-body"><span class="home-company-identity"><b>${esc(c.name)}</b><span>${esc(c.ticker)}</span></span><span class="home-company-focus" lang="th">${esc(c.focus)}</span><span class="home-company-date">บทความอัปเดต ${esc(dateLabel(c.snapshotDate))}</span></span>
    <span class="home-company-status"><span class="${needsReview(c) ? 'is-due' : ''}">${needsReview(c) ? 'ถึงรอบทบทวน' : 'Research snapshot'}</span><span aria-hidden="true">↗</span></span>
  </a>`).join('') : '<div class="home-loading"><p>ไม่พบบริษัทใน Research ที่ตรงกับคำค้น</p><button class="home-button" type="button" data-clear-search>ดูบริษัททั้งหมด</button></div>';
  for (const img of host.querySelectorAll('img')) img.addEventListener('error', () => img.remove(), { once: true });
}

async function start() {
  search.disabled = true;
  try {
    const response = await fetch('./app/data/research.json');
    if (!response.ok) throw new Error('Research unavailable');
    const data = await response.json();
    if (!Array.isArray(data.companies) || !data.companies.length) throw new Error('Empty catalog');
    companies = data.companies;
    search.disabled = false;
    render();
  } catch {
    host.innerHTML = '<div class="home-loading"><p>โหลดรายชื่อบริษัทไม่สำเร็จ</p><button class="home-button" type="button" data-retry-research>ลองอีกครั้ง</button><a href="stocks.html">เปิดคลังหุ้น →</a></div>';
  }
}
search.addEventListener('input', render);
host.addEventListener('click', e => {
  if (e.target.closest('[data-clear-search]')) { search.value = ''; render(); search.focus(); }
  if (e.target.closest('[data-retry-research]')) { host.innerHTML = '<p class="home-loading">กำลังโหลดบริษัทใน Research…</p>'; start(); }
});
start();
