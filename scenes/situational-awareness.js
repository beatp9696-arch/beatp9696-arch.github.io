(() => {
  'use strict';
  const root = document.documentElement;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const panels = [...document.querySelectorAll('.ph-panel')];
  const motionButton = document.getElementById('motion-toggle');
  let paused = false;
  let observer;
  function syncMotion() {
    root.classList.toggle('js-motion', !reduced.matches);
    root.classList.toggle('motion-paused', paused && !reduced.matches);
    motionButton.hidden = reduced.matches;
    document.querySelectorAll('[data-replay]').forEach(button => { button.hidden = reduced.matches; });
  }
  function replay(panel) {
    if (reduced.matches) return;
    panel.classList.remove('playing');
    void panel.offsetWidth;
    panel.classList.add('playing');
  }
  if ('IntersectionObserver' in window) {
    observer = new IntersectionObserver(entries => {
      entries.forEach(({ target, isIntersecting }) => {
        target.classList.toggle('in-view', isIntersecting);
        if (isIntersecting) target.classList.add('playing');
      });
    }, { threshold: 0.15 });
    panels.forEach(panel => observer.observe(panel));
  } else {
    panels.forEach(panel => panel.classList.add('playing', 'in-view'));
  }
  syncMotion();
  reduced.addEventListener('change', syncMotion);
  motionButton.addEventListener('click', () => {
    paused = !paused;
    motionButton.setAttribute('aria-pressed', String(paused));
    motionButton.textContent = paused ? 'เล่นภาพเคลื่อนไหวต่อ' : 'หยุดภาพเคลื่อนไหว';
    syncMotion();
  });
  document.addEventListener('visibilitychange', () => {
    root.classList.toggle('hidden-tab', document.hidden);
  });
  document.querySelectorAll('[data-replay]').forEach(button => {
    button.addEventListener('click', () => replay(button.closest('.ph-panel')));
  });
  const workspace = document.getElementById('workspace-scene');
  workspace.querySelector('.mode-tabs').hidden = false;
  workspace.querySelectorAll('button[data-mode]').forEach(button => {
    button.addEventListener('click', () => {
      workspace.dataset.mode = button.dataset.mode;
      workspace.querySelectorAll('button[data-mode]').forEach(b => {
        b.setAttribute('aria-pressed', String(b === button));
      });
      workspace.querySelector('[data-mode-status]').textContent = button.dataset.mode === 'agent'
        ? 'เอเจนต์ใช้บริบทและเครื่องมือเพื่อทำงานต่อจนส่งผลให้มนุษย์ตรวจ'
        : 'แชตบอตส่งคำตอบ แต่ยังไม่ได้ลงมือทดลองหรือทดสอบผล';
      replay(workspace);
    });
  });
  const lab = document.getElementById('lab-scene');
  const bottleneck = lab.querySelector('[data-bottleneck]');
  bottleneck.hidden = false;
  bottleneck.addEventListener('click', () => {
    const blocked = lab.classList.toggle('lab-blocked');
    bottleneck.setAttribute('aria-pressed', String(blocked));
    bottleneck.textContent = blocked ? 'คืนกำลังทดลอง' : 'ลองจำกัดกำลังทดลอง';
    lab.querySelector('.lab-conclusion').hidden = blocked;
    lab.querySelector('.constraint-note').hidden = !blocked;
    lab.querySelector('[data-lab-status]').textContent = blocked
      ? 'กำลังทดลองจำกัด รอบถัดไปต้องรอ แม้มีแนวคิดพร้อมแล้ว'
      : 'ผลวิจัยสะสมจากรอบก่อนเพื่อพัฒนาระบบรุ่นถัดไป';
    replay(lab);
  });
  const power = document.getElementById('power-scene');
  const powerButton = power.querySelector('[data-power-toggle]');
  powerButton.hidden = false;
  powerButton.addEventListener('click', () => {
    const on = power.dataset.power !== 'on';
    power.dataset.power = on ? 'on' : 'off';
    powerButton.setAttribute('aria-pressed', String(on));
    power.querySelector('[data-power-label]').textContent = on ? 'ไฟฟ้าเปิดอยู่ · ลองปิด' : 'ไฟฟ้าปิดอยู่ · ลองเปิด';
    power.querySelector('.power-warning').hidden = on;
    power.querySelector('.power-status').textContent = on ? 'ระบบพร้อมรับงานประมวลผล' : 'งานประมวลผลต้องรอพลังงาน';
    power.querySelector('svg').setAttribute('aria-label', on
      ? 'ไฟฟ้าจ่ายพลังงานผ่านสายส่งไปยังเซิร์ฟเวอร์ ระบบพร้อมรับงาน'
      : 'ไฟฟ้าหยุดจ่าย เซิร์ฟเวอร์หยุดประมวลผลและงานต้องรอ');
    if (on) replay(power);
  });
  const oversight = document.getElementById('oversight-scene');
  const oversightButton = oversight.querySelector('[data-oversight-toggle]');
  oversightButton.hidden = false;
  oversightButton.addEventListener('click', () => {
    const assisted = oversight.dataset.oversight !== 'assist';
    oversight.dataset.oversight = assisted ? 'assist' : 'human';
    oversightButton.setAttribute('aria-pressed', String(assisted));
    oversightButton.textContent = assisted ? 'ตรวจด้วยมนุษย์ล้วน' : 'ให้ AI ช่วยตรวจ';
    oversight.querySelector('[data-oversight-note]').hidden = !assisted;
    oversight.querySelector('svg').setAttribute('aria-label', assisted
      ? 'AI ช่วยส่องเฉพาะจุดในกองงานที่ใหญ่เกินกำลังมนุษย์ พื้นที่ที่ยังไม่ถูกตรวจเล็กลงแต่ไม่หมดไป'
      : 'ผู้ตรวจที่เป็นมนุษย์ส่องลำแสงไปยังงานสามกอง กองเล็กตรวจได้ทั้งกอง กองกลางตรวจได้เฉพาะส่วนล่าง กองใหญ่เกินกำลังจะตรวจ');
    oversight.querySelector('.oversight-status').textContent = assisted
      ? 'AI ช่วยชี้จุดที่ควรตรวจ ขยายการกำกับได้ไกลขึ้น แต่ไม่ถึงกับรับประกัน'
      : 'มนุษย์ตรวจเองล้วน ๆ งานระดับเหนือมนุษย์จึงตรวจไม่ได้';
    replay(oversight);
  });
  const forecast = document.getElementById('forecast-scene');
  const forecastButton = forecast.querySelector('[data-view-toggle]');
  forecastButton.hidden = false;
  forecastButton.addEventListener('click', () => {
    const signal = forecast.dataset.view !== 'signal';
    forecast.dataset.view = signal ? 'signal' : 'forecast';
    forecastButton.setAttribute('aria-pressed', String(signal));
    forecastButton.textContent = signal ? 'ดูเป็นคำทำนาย' : 'ดูเป็นตัวชี้วัด';
    forecast.querySelectorAll('[data-forecast]').forEach(node => { node.hidden = signal; });
    forecast.querySelectorAll('[data-signal]').forEach(node => { node.hidden = !signal; });
    forecast.querySelector('svg').setAttribute('aria-label', signal
      ? 'แผนภาพเส้นเวลาที่มีเส้นวัดต่อเนื่องถึงวันนี้ และช่วงคาดการณ์แบบเส้นประหลังจากนั้น'
      : 'แผนภาพเส้นเวลา โหมดคำทำนายแสดงเพียงเส้นประของปีเป้าหมายโดยไม่มีข้อมูล');
    forecast.querySelector('.forecast-status').textContent = signal
      ? 'เปลี่ยนเป็นตัวชี้วัดที่ติดตามได้ทีละไตรมาส แทนการรอถึงปีเป้าหมาย'
      : 'กำลังแสดงคำทำนายตามปีที่เอกสารระบุ';
    replay(forecast);
  });
  const chapters = [...document.querySelectorAll('.chapter')];
  const links = [...document.querySelectorAll('.toc a')];
  const progress = document.querySelector('.reading-progress');
  let pending = false;
  function updateReading() {
    const max = root.scrollHeight - window.innerHeight;
    progress.style.transform = `scaleX(${max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 1})`;
    let current = chapters[0].id;
    for (const chapter of chapters) {
      if (chapter.getBoundingClientRect().top < window.innerHeight * 0.35) current = chapter.id;
    }
    for (const link of links) {
      const active = link.hash === `#${current}`;
      link.classList.toggle('active', active);
      if (active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    }
    pending = false;
  }
  function scheduleReading() {
    if (!pending) { pending = true; requestAnimationFrame(updateReading); }
  }
  window.addEventListener('scroll', scheduleReading, { passive: true });
  window.addEventListener('resize', scheduleReading);
  document.fonts.ready.then(scheduleReading);
  updateReading();
})();
