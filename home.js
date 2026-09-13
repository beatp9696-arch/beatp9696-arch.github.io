import { escapeHTML as esc, dateLabel, needsReview } from './app/js/core/research-model.js';

// This is the same dated public catalog used by Research; no personal storage is read.
const host = document.getElementById('home-companies');
const search = document.getElementById('company-search');
const pulseReview = document.querySelector('[data-pulse-review]');
const pulseEvidence = document.querySelector('[data-pulse-evidence]');
const pulseLatest = document.querySelector('[data-pulse-latest]');
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

if (approach) {
  const diagram = approach.querySelector('.home-approach-diagram');
  const tabs = [...diagram.querySelectorAll('[data-layer]')];
  const panel = approach.querySelector('.home-approach-panel');
  const dot = approach.querySelector('.home-approach-dot');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const explanations = {
    price: ['ราคาบอกอะไรเรา', 'ตลาดให้มูลค่าเท่าไรวันนี้ และคาดหวังอะไรจากธุรกิจ'],
    news: ['ข่าวต้องแยก Macro กับ Micro', 'Macro คือแรงจากดอกเบี้ย เงินเฟ้อ ค่าเงิน วัฏจักร และกติกาที่เปลี่ยนสนามแข่งขัน · Micro คือสิ่งที่เกิดกับลูกค้า คู่แข่ง ราคา ต้นทุน และผู้บริหาร อ่านข่าวต่อเมื่อมันเปลี่ยนกำไร กระแสเงินสด หรือ moat ของบริษัทจริง'],
    financials: ['งบ 3 ใบต้องเล่าเรื่องเดียวกัน', 'Income Statement บอกว่าขายและทำกำไรอย่างไร · Balance Sheet บอกว่าธุรกิจใช้สินทรัพย์ หนี้ และทุนเท่าไร · Cash Flow Statement บอกว่ากำไรกลายเป็นกระแสเงินสดจริงหรือไม่ อ่านทั้งสามใบเพื่อวัดคุณภาพกำไรและความแข็งแรงของธุรกิจ'],
    business: ['ธุรกิจสร้างและเก็บคุณค่าอย่างไร', 'ลูกค้าคือใคร ยอมจ่ายอะไร รายได้มาจากไหน ต้นทุนหลักอยู่ตรงไหน และเมื่อธุรกิจโตขึ้น กำไรต่อหน่วยดีขึ้นหรือแย่ลง'],
    moat: [panel.querySelector('h3').textContent, panel.querySelector('p').textContent],
  };
  let observer, journey, glow;
  const position = tab => tab.parentElement.offsetTop + tab.offsetHeight / 2 - 22;
  const moveDot = tab => diagram.style.setProperty('--approach-position', `${position(tab)}px`);
  function finishIntro() {
    observer?.disconnect();
    journey?.cancel();
    glow?.cancel();
    approach.dataset.intro = 'done';
  }
  function selectLayer(tab) {
    finishIntro();
    for (const item of tabs) {
      item.setAttribute('aria-selected', String(item === tab));
      item.tabIndex = item === tab ? 0 : -1;
    }
    const [heading, copy] = explanations[tab.dataset.layer];
    panel.setAttribute('aria-labelledby', tab.id);
    panel.querySelector('.home-approach-step').textContent = `${String(tabs.indexOf(tab) + 1).padStart(2, '0')} / 05 · ${tab.textContent}`;
    panel.querySelector('h3').textContent = heading;
    panel.querySelector('p').textContent = copy;
    moveDot(tab);
  }
  for (const tab of tabs) {
    tab.disabled = false;
    tab.addEventListener('click', () => selectLayer(tab));
    tab.addEventListener('keydown', event => {
      const index = tabs.indexOf(tab);
      const next = { ArrowDown: (index + 1) % tabs.length, ArrowUp: (index + tabs.length - 1) % tabs.length, Home: 0, End: tabs.length - 1 }[event.key];
      if (next === undefined) return;
      event.preventDefault();
      selectLayer(tabs[next]);
      tabs[next].focus({ preventScroll: true });
    });
  }
  approach.querySelector('.home-approach-hint').hidden = false;
  approach.dataset.intro = 'pending';
  function playIntro() {
    observer?.disconnect();
    if (approach.dataset.intro !== 'pending') return;
    if (reducedMotion.matches || !dot.animate) { finishIntro(); return; }
    approach.dataset.intro = 'playing';
    const frames = tabs.flatMap((tab, i) => [
      { transform: `translateY(${position(tab)}px)`, offset: i / 5 },
      { transform: `translateY(${position(tab)}px)`, offset: (i + .65) / 5 },
    ]);
    frames.push({ transform: `translateY(${position(tabs[4])}px)`, offset: 1 });
    journey = dot.animate(frames, { duration: 2400, easing: 'ease-in-out' });
    journey.onfinish = () => {
      approach.dataset.intro = 'done';
      if (reducedMotion.matches) return;
      glow = tabs[4].animate([
        { boxShadow: '0 0 0 0 rgba(121,201,180,.3)' },
        { boxShadow: '0 0 0 9px rgba(121,201,180,0)' },
      ], { duration: 650, easing: 'ease-out' });
    };
  }
  if ('IntersectionObserver' in window) {
    observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) playIntro();
    }, { threshold: .7, rootMargin: '0px 0px -70px 0px' });
    observer.observe(diagram);
  } else finishIntro();
  reducedMotion.addEventListener('change', () => { if (reducedMotion.matches) finishIntro(); });
}

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
    <span class="home-company-body"><span class="home-company-identity"><b>${esc(c.name)}</b><span>${esc(c.ticker)}</span></span><span class="home-company-focus" lang="th">${esc(c.focus)}</span><span class="home-company-metrics"><span>${c.monitors.length} จุดติดตาม</span><span>${Object.values(c.powers || {}).filter(p => ['evidenced', 'partial'].includes(p.status)).length} หลักฐานคูเมือง</span></span><span class="home-company-date">บทความอัปเดต ${esc(dateLabel(c.snapshotDate))}</span></span>
    <span class="home-company-status"><span class="${needsReview(c) ? 'is-due' : ''}">${needsReview(c) ? 'ถึงรอบทบทวน' : 'Research snapshot'}</span><span aria-hidden="true">↗︎</span></span>
  </a>`).join('') : '<div class="home-loading"><p>ไม่พบบริษัทใน Research ที่ตรงกับคำค้น</p><button class="home-button" type="button" data-clear-search>ดูบริษัททั้งหมด</button></div>';
  for (const img of host.querySelectorAll('img')) img.addEventListener('error', () => img.remove(), { once: true });
}

function renderPulse() {
  if (!pulseReview || !pulseEvidence || !pulseLatest || !companies.length) return;
  pulseReview.textContent = companies.filter(c => needsReview(c)).length;
  pulseEvidence.textContent = companies.reduce((sum, c) => sum + Object.values(c.powers || {}).filter(p => ['evidenced', 'partial'].includes(p.status)).length, 0);
  const latest = companies.reduce((date, c) => c.snapshotDate > date ? c.snapshotDate : date, '');
  pulseLatest.textContent = latest ? dateLabel(latest) : '—';
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
    renderPulse();
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
