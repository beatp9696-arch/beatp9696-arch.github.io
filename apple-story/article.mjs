// Reading and embeds do not depend on successful WebGL/Three.js imports.
const body = document.body;
const toggle = document.getElementById('reading-toggle');
toggle.hidden = false;
toggle.addEventListener('click', () => {
  const anchor = toggle.getBoundingClientRect().top;
  const reading = body.classList.toggle('reading-mode');
  toggle.setAttribute('aria-pressed', String(reading));
  toggle.textContent = reading ? 'เปิดฉาก 3D ตามการเลื่อน' : 'อ่านแบบไม่ใช้ 3D';
  scrollBy({top: toggle.getBoundingClientRect().top-anchor, behavior:'instant'});
  dispatchEvent(new Event('resize'));
});
const controls = document.querySelector('.mix-controls');
controls.hidden = false;
controls.addEventListener('click', event => {
  const button = event.target.closest('[data-mix]');
  if (!button) return;
  const profit = button.dataset.mix === 'profit';
  const values = profit ? [57.8,42.2] : [73.8,26.2];
  for (const [i,id] of ['products-bar','services-bar'].entries()) {
    const bar = document.getElementById(id);
    bar.style.width = `${values[i]}%`;
    bar.querySelector('b').textContent = `${values[i]}%`;
  }
  document.querySelector('.mix-bar').setAttribute('aria-label', `${profit?'กำไรขั้นต้น':'รายได้'} FY2025: Products ${values[0]}%, Services ${values[1]}%`);
  document.getElementById('mix-explainer').textContent = profit
    ? 'Services สร้างกำไรขั้นต้น 42.2% ของบริษัท ยังไม่ใช่สัดส่วนกำไรสุทธิ'
    : 'Services สร้างรายได้ 26.2% ของบริษัท แต่คิดเป็น 42.2% ของกำไรขั้นต้นรวม';
  controls.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
});
import('./embed.mjs').catch(error => console.warn('Duo remains readable without interactive module.', error));
import('./story.mjs').catch(error => {
  body.dataset.ready = 'fallback';
  body.classList.remove('story-enhanced');
  console.warn('MacBook remains readable without interactive module.', error);
});
