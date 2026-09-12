/* Finite scene timelines, visibility-aware playback and accessible controls. */
(() => {
  'use strict';
  const root = document.documentElement;
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const motion = document.getElementById('rx-motion');
  const scenes = [...document.querySelectorAll('[data-scene]')];
  let paused = preference.matches;
  let frame = 0;
  let previous = 0;
  let studio = null;
  let studioLoading = false;
  const states = new Map(scenes.map(el => [el, {visible:false, time:0, duration:el.id === 'dispatch' ? 12 : 7, done:false}]));
  const dispatch = document.getElementById('dispatch');
  const path = document.getElementById('rx-trip-path');
  const length = path.getTotalLength();
  const car = document.getElementById('rx-map-car');
  const trail = document.getElementById('rx-trip-trail');
  let tripStep = -1;
  let targetProfit = 7;
  let shownProfit = 7;
  const profit = document.getElementById('rx-profit');
  const money = value => `${value < 0 ? '−' : '+'}$${Math.abs(value).toFixed(2)}`;
  root.classList.add('rx-motion-ready');
  motion.hidden = false;
  document.querySelectorAll('[data-replay]').forEach(button => button.hidden = false);

  function renderTrip(progress) {
    const distance = Math.max(0,Math.min(length,progress * length));
    const point = path.getPointAtLength(distance);
    const ahead = path.getPointAtLength(Math.min(length,distance + 1));
    const behind = path.getPointAtLength(Math.max(0,distance - 1));
    const angle = Math.atan2(ahead.y - behind.y,ahead.x - behind.x) * 180 / Math.PI;
    car.setAttribute('transform',`translate(${point.x} ${point.y}) rotate(${angle})`);
    trail.style.strokeDashoffset = String(1-progress);
    const step = progress >= .999 ? 3 : progress >= 340/length ? 2 : progress > .025 ? 1 : 0;
    if(step !== tripStep) {
      tripStep = step;
      const labels = ['กำลังจัดรถ','กำลังไปรับผู้โดยสาร','กำลังเดินทาง · มีค่าโดยสาร','ถึงจุดหมาย'];
      document.getElementById('rx-trip-status').textContent = labels[step];
      document.querySelectorAll('[data-trip-step]').forEach(el => el.classList.toggle('is-current',Number(el.dataset.tripStep) === step));
    }
  }

  function needsFrame() {
    if(document.hidden || paused) return false;
    return [...states].some(([el,s]) => s.visible && ((!s.done && el.id !== 'cybercab-studio') || (el.id === 'cybercab-studio' && studio?.isMoving()) || (el.id === 'economics' && Math.abs(shownProfit-targetProfit)>.005)));
  }
  function wake() {
    if(!frame && needsFrame()) {previous=0; frame=requestAnimationFrame(tick);}
  }
  function tick(now) {
    frame=0;
    const dt=previous ? Math.min((now-previous)/1000,.06) : 0;
    previous=now;
    for(const [el,state] of states) {
      const playing=state.visible && !paused && !document.hidden;
      el.dataset.playing=String(playing && !state.done);
      if(!playing) continue;
      if(el.id === 'cybercab-studio') {studio?.update(dt); continue;}
      if(!state.done) {
        state.time=Math.min(state.duration,state.time+dt);
        if(el === dispatch) renderTrip(state.time/state.duration);
        if(state.time >= state.duration) {state.done=true;el.dataset.playing='false';}
      }
      if(el.id === 'economics' && Math.abs(shownProfit-targetProfit)>.005) {
        shownProfit += (targetProfit-shownProfit)*Math.min(1,dt*12);
        if(Math.abs(shownProfit-targetProfit)<.02) shownProfit=targetProfit;
        profit.textContent=money(shownProfit);
      }
    }
    if(needsFrame()) frame=requestAnimationFrame(tick);
  }

  function syncMotion() {
    root.classList.toggle('rx-paused',paused);
    motion.textContent=preference.matches ? 'ลดการเคลื่อนไหวตามอุปกรณ์' : paused ? 'เล่นภาพเคลื่อนไหว' : 'หยุดภาพเคลื่อนไหว';
    motion.disabled=preference.matches;
    motion.setAttribute('aria-pressed',String(paused));
    document.querySelectorAll('[data-replay]').forEach(button => {button.disabled=paused;});
    const orbitButton=document.getElementById('rx-orbit');
    orbitButton.textContent=paused ? 'เปลี่ยนมุมรถ' : orbitButton.getAttribute('aria-pressed')==='true' ? 'หยุดหมุน' : 'หมุนรอบคัน';
    for(const [el,state] of states) el.dataset.playing=String(!paused && !document.hidden && state.visible && !state.done);
    if(paused || document.hidden) {cancelAnimationFrame(frame);frame=0;previous=0;}
    if(paused) {shownProfit=targetProfit;profit.textContent=money(targetProfit);}
    studio?.setReduced(paused || preference.matches);
    wake();
  }
  motion.addEventListener('click',() => {
    paused=!paused;
    syncMotion();
  });
  preference.addEventListener('change',() => {paused=preference.matches;syncMotion();});
  document.addEventListener('visibilitychange',syncMotion);
  document.querySelectorAll('[data-replay]').forEach(button => button.addEventListener('click',() => {
    const el=document.getElementById(button.dataset.replay), state=states.get(el);
    if(paused || preference.matches) {
      if(el === dispatch) renderTrip(1);
      return;
    }
    state.time=0;state.done=false;el.dataset.playing='false';el.classList.remove('rx-started');
    void el.offsetWidth;
    el.classList.add('rx-started');
    el.dataset.playing=String(state.visible);
    if(el===dispatch) renderTrip(0);
    wake();
  }));

  const slider=document.getElementById('rx-util');
  slider.disabled=false;
  document.querySelectorAll('[data-util]').forEach(button => {
    button.disabled=false;
    button.addEventListener('click',() => {slider.value=button.dataset.util;calculate();});
  });
  function calculate() {
    const utilization=Number(slider.value);
    const revenue=utilization*1.2;
    targetProfit=revenue-65;
    document.getElementById('rx-util-output').textContent=String(utilization);
    document.getElementById('rx-revenue').textContent=`$${revenue.toFixed(2)}`;
    document.getElementById('rx-revenue-bar').style.width=`${revenue/108*100}%`;
    profit.classList.toggle('is-loss',targetProfit<0);
    document.getElementById('rx-econ-verdict').textContent=targetProfit<0 ? 'รายได้ยังไม่ครอบคลุมต้นทุนระดับรถในแบบจำลองนี้' : 'สูงกว่าจุดคุ้มทุนระดับรถ · ยังไม่รวมค่าใช้จ่ายส่วนกลางที่ระบุด้านล่าง';
    document.querySelectorAll('[data-util]').forEach(button => button.setAttribute('aria-pressed',String(Number(button.dataset.util)===utilization)));
    if(paused || preference.matches || !states.get(document.getElementById('economics')).visible) {shownProfit=targetProfit;profit.textContent=money(targetProfit);}
    else wake();
  }
  slider.addEventListener('input',calculate);

  async function loadStudio() {
    if(studioLoading) return;
    studioLoading=true;
    try {
      const module=await import('./tesla-cybercab-3d.js');
      studio=module.createCybercab(document.getElementById('rx-studio'),wake,paused || preference.matches);
      document.getElementById('rx-studio-controls').hidden=false;
      const door=document.getElementById('rx-door');
      const orbit=document.getElementById('rx-orbit');
      door.addEventListener('click',() => {
        const open=door.getAttribute('aria-pressed')!=='true';
        door.setAttribute('aria-pressed',String(open));door.textContent=open?'ปิดประตู ↙':'เปิดประตู ↗';
        studio.setDoor(open);wake();
      });
      orbit.addEventListener('click',() => {
        if(paused || preference.matches) {studio.nextView();return;}
        const rotating=orbit.getAttribute('aria-pressed')!=='true';
        orbit.setAttribute('aria-pressed',String(rotating));orbit.textContent=rotating?'หยุดหมุน':'หมุนรอบคัน';
        studio.setOrbit(rotating);wake();
      });
      document.getElementById('rx-reset').addEventListener('click',() => {
        studio.reset();orbit.setAttribute('aria-pressed','false');orbit.textContent='หมุนรอบคัน';wake();
      });
      wake();
    } catch(error) {
      document.getElementById('rx-studio').dataset.fallback='true';
      // data-fallback reveals the text notice when WebGL/modules are unavailable.
      console.warn('Cybercab 3D unavailable; text notice shown.',error.message);
    }
  }
  const observer=new IntersectionObserver(entries => {
    for(const entry of entries) {
      const state=states.get(entry.target);state.visible=entry.isIntersecting;
      if(entry.isIntersecting) entry.target.classList.add('rx-started');
      entry.target.dataset.playing=String(entry.isIntersecting && !paused && !document.hidden && !state.done);
      if(entry.isIntersecting && entry.target.id==='cybercab-studio') loadStudio();
    }
    if(!needsFrame()) {cancelAnimationFrame(frame);frame=0;previous=0;} else wake();
  },{threshold:.12});
  scenes.forEach(el => observer.observe(el));
  renderTrip(paused ? 1 : 0);
  syncMotion();
})();
