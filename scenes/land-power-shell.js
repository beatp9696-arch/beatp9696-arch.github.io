/* Finite editorial timelines. All drawings and data are present without JavaScript. */
(() => {
  'use strict';
  const root = document.documentElement;
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const motionButton = document.getElementById('motion-toggle');
  const announcement = document.getElementById('lps-announcement');
  const scenes = [...document.querySelectorAll('.lps-scene')];
  const players = new Map();
  let paused = preference.matches;
  let frame = null;
  let lastTime = 0;
  let zoomOpen = false;

  const announce = message => { announcement.textContent = message; };
  const clamp = n => Math.max(0, Math.min(1, n));
  const ease = n => n * n * (3 - 2 * n);
  const stageNotes = [
    'Land: พื้นที่และเงื่อนไขใช้ประโยชน์ คือฐานของโครงการ — ไม่ใช่กำลังผลิตที่เปิดใช้แล้ว',
    'Shell: โครงสร้างอาคารและงานระบบ ต้องพร้อมรับอุปกรณ์ตามขอบเขตสัญญา',
    'Power: การเชื่อมระบบรับไฟต้องพร้อม ไม่ใช่เพียงมีไฟฟ้าที่ไหนสักแห่ง',
    'Compute: เมื่อเงื่อนไขพร้อม จึงติดตั้ง ทดสอบ และเริ่มสร้างงานที่ใช้งานได้'
  ];
  const factory = document.querySelector('.lps-factory');
  const stageButtons = [...document.querySelectorAll('button[data-stage]')];
  let displayedStage = -1;

  function setStageLabel(stage) {
    if (displayedStage === stage) return;
    displayedStage = stage;
    factory.dataset.stage = String(stage);
    stageButtons.forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.stage) === stage)));
    document.getElementById('factory-note').textContent = stageNotes[stage];
  }

  function paint(player) {
    const t = player.position;
    player.scene.style.setProperty('--scene-progress', String(t));
    player.scene.dataset.progress = t.toFixed(3);
    for (const actor of player.actors) {
      const progress = ease(clamp((t - actor.start) / (actor.end - actor.start)));
      if (actor.type === 'draw') {
        actor.element.style.strokeDashoffset = String(1 - progress);
      } else if (actor.type === 'fade') {
        actor.element.style.opacity = String(1 - progress * .82);
      } else {
        actor.element.style.opacity = String(actor.opacity * (.13 + .87 * progress));
      }
    }
    player.range.value = String(Math.round(t * 100));
    player.button.textContent = preference.matches ? 'ภาพนิ่ง' : player.running && t < 1 ? 'หยุดฉาก' : t >= 1 ? 'เล่นอีกครั้ง' : 'เล่นต่อ';
    player.button.setAttribute('aria-label', player.button.textContent + ': ' + player.title);
    player.button.disabled = preference.matches;
    player.scene.dataset.playing = String(player.running && player.visible && !paused && !preference.matches && !document.hidden && !zoomOpen);
    if (player.scene === factory) setStageLabel(t < .22 ? 0 : t < .48 ? 1 : t < .72 ? 2 : 3);
  }

  function canAdvance(player) {
    return player.running && player.visible && player.position < 1 &&
      !paused && !preference.matches && !document.hidden && !zoomOpen;
  }
  function tick(now) {
    frame = null;
    const dt = lastTime ? Math.min(64, now - lastTime) : 0;
    lastTime = now;
    for (const player of players.values()) {
      if (!canAdvance(player)) continue;
      player.position = clamp(player.position + dt / player.duration);
      if (player.position === 1) player.running = false;
      paint(player);
    }
    requestTick();
  }
  function requestTick() {
    if ([...players.values()].some(canAdvance)) {
      if (frame === null) frame = requestAnimationFrame(tick);
    } else {
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
      lastTime = 0;
    }
  }
  function syncMotion() {
    root.classList.toggle('lps-paused', paused || preference.matches);
    motionButton.disabled = preference.matches;
    motionButton.textContent = preference.matches ? 'โหมดลดการเคลื่อนไหว' : paused ? 'เล่นภาพเคลื่อนไหว' : 'หยุดภาพเคลื่อนไหว';
    motionButton.setAttribute('aria-pressed', String(paused || preference.matches));
    for (const player of players.values()) paint(player);
    requestTick();
  }
  function seek(player, position) {
    player.seen = true;
    player.position = clamp(position);
    player.running = false;
    paint(player);
    requestTick();
  }
  function replay(player) {
    player.seen = true;
    player.position = preference.matches ? 1 : 0;
    player.running = !preference.matches;
    if (paused && !preference.matches) paused = false;
    syncMotion();
  }

  for (const scene of scenes) {
    const svg = scene.querySelector('svg.s-art');
    if (!svg) continue; // The PUE input has its own numerical interaction.
    const actors = [...svg.querySelectorAll('[data-reveal], [data-draw], [data-fade]')].map(element => {
      const type = element.hasAttribute('data-draw') ? 'draw' : element.hasAttribute('data-fade') ? 'fade' : 'reveal';
      const [start, end] = element.getAttribute('data-' + type).split(',').map(Number);
      const opacity = Number(getComputedStyle(element).opacity);
      if (type === 'draw') element.style.strokeDasharray = '1';
      return { element, type, start, end, opacity };
    });
    const title = scene.querySelector('h3').textContent;
    const bar = document.createElement('div');
    bar.className = 'lps-motionbar';
    const button = document.createElement('button');
    button.className = 'lps-play';
    button.type = 'button';
    const range = document.createElement('input');
    range.className = 'lps-scrub';
    range.type = 'range';
    range.min = '0';
    range.max = '100';
    range.step = '1';
    range.value = '100';
    range.setAttribute('aria-label', 'ตำแหน่งแอนิเมชัน: ' + title);
    const label = document.createElement('span');
    label.className = 'lps-motion-label';
    label.textContent = 'PLAY ONCE';
    bar.append(button, range, label);
    scene.append(bar);
    const player = { scene, actors, title, button, range, position:1, duration:6800, visible:false, seen:false, running:false };
    players.set(scene, player);
    button.addEventListener('click', () => {
      if (preference.matches) return;
      if (player.position >= 1) replay(player);
      else {
        player.running = !player.running;
        if (player.running && paused) paused = false;
        syncMotion();
      }
    });
    range.addEventListener('input', () => seek(player, Number(range.value) / 100));
    paint(player);
  }

  root.classList.add('lps-enhanced');
  document.querySelectorAll('.lps-controls, #motion-toggle').forEach(element => { element.hidden = false; });
  stageButtons.forEach(button => button.addEventListener('click', () => {
    const stage = Number(button.dataset.stage);
    seek(players.get(factory), [.1, .45, .7, 1][stage]);
    setStageLabel(stage);
    announce(stageNotes[stage]);
  }));
  motionButton.addEventListener('click', () => {
    paused = !paused;
    syncMotion();
    announce(paused ? 'หยุดภาพเคลื่อนไหวทั้งหมดแล้ว' : 'เปิดภาพเคลื่อนไหวแล้ว แต่ละฉากจะหยุดเมื่อเล่นจบ');
  });
  preference.addEventListener('change', () => {
    paused = preference.matches;
    if (preference.matches) {
      for (const player of players.values()) {
        player.position = 1;
        player.running = false;
        player.seen = true;
      }
    }
    syncMotion();
  });
  document.addEventListener('visibilitychange', syncMotion);

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        entry.target.classList.toggle('lps-in-view', entry.isIntersecting);
        const player = players.get(entry.target);
        if (!player) continue;
        player.visible = entry.isIntersecting;
        if (entry.isIntersecting && !player.seen) {
          player.seen = true;
          if (!paused && !preference.matches) {
            player.position = 0;
            player.running = true;
          }
        }
        paint(player);
      }
      requestTick();
    }, { threshold:.22 });
    scenes.forEach(scene => observer.observe(scene));
  } else {
    scenes.forEach(scene => scene.classList.add('lps-in-view'));
    for (const player of players.values()) {
      player.visible = true;
      player.seen = true;
    }
  }
  syncMotion();

  const range = document.getElementById('pue-range');
  function updatePower() {
    const pue = Number(range.value);
    const it = 120 / pue;
    const overhead = 120 - it;
    const gain = (it / 80 - 1) * 100;
    document.getElementById('pue-output').textContent = pue.toFixed(2);
    document.getElementById('it-output').textContent = it.toFixed(1);
    document.getElementById('overhead-output').textContent = overhead.toFixed(1);
    document.getElementById('it-bar').style.width = (it / 120 * 100) + '%';
    document.getElementById('overhead-bar').style.width = (overhead / 120 * 100) + '%';
    range.setAttribute('aria-valuetext', 'PUE ' + pue.toFixed(2) + ', IT ' + it.toFixed(1) + ' เมกะวัตต์, ระบบสนับสนุน ' + overhead.toFixed(1) + ' เมกะวัตต์');
    document.getElementById('pue-comparison').textContent = Math.abs(gain) < .001
      ? 'จุดตั้งต้น PUE 1.50: ไฟสำหรับ IT 80.0 MW'
      : 'ไฟสำหรับ IT ' + (gain > 0 ? 'เพิ่ม' : 'ลด') + ' ' + Math.abs(gain).toFixed(1) + '% เทียบ PUE 1.50 · ไม่ใช่เปอร์เซ็นต์รายได้';
  }
  range.addEventListener('input', updatePower);
  updatePower();

  const risk = document.querySelector('.lps-risk');
  const scenarioButtons = [...document.querySelectorAll('button[data-scenario]')];
  scenarioButtons.forEach(button => button.addEventListener('click', () => {
    const isDefault = button.dataset.scenario === 'default';
    risk.dataset.scenario = button.dataset.scenario;
    scenarioButtons.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    const note = isDefault
      ? 'สถานการณ์สมมติ: ถ้าผิดนัดเข้าเงื่อนไข NVIDIA อาจต้องจ่ายภาระบางส่วนที่ค้ำไว้ ไม่ใช่ทุกกรณีต้องจ่ายเต็มเพดาน $105 พันล้าน'
      : 'ค่าเช่าเป็นภาระของผู้เช่า การค้ำประกันไม่ได้แปลว่า NVIDIA จ่าย $105 พันล้านออกไปในวันประกาศ';
    document.getElementById('risk-note').textContent = note;
    risk.querySelector('.lps-guarantee-label').textContent = isDefault ? 'NVIDIA อาจต้องจ่ายตามเงื่อนไข' : 'NVIDIA ค้ำภาระบางส่วน';
    risk.querySelector('.lps-rent-label').textContent = isDefault ? 'OpenAI: สมมติผิดนัดเข้าเงื่อนไข' : 'OpenAI จ่ายตามสัญญา';
    const player = players.get(risk);
    if (paused || preference.matches) seek(player,1);
    else replay(player);
    announce(note);
  }));

  const monitor = document.querySelector('.lps-control-room');
  const monitorNotes = {
    delivery:'วันเปิดใช้: โครงการพร้อมตามสัญญาหรือไม่ — และระหว่างรอ ใครแบกเงินที่จ่ายไปแล้ว?',
    economics:'ผลตอบแทนทุน: หลังรวมต้นทุนจริงและเงินปรับปรุงที่จำเป็น โครงการยังให้ผลตอบแทนเหนือต้นทุนทุนหรือไม่?',
    credit:'เครดิตผู้เช่า: เงินจ่ายมาจากความสามารถของธุรกิจ หรือการพยุงเพิ่ม — ภาระใดอาจย้อนกลับมาถึงผู้ค้ำ?',
    scarcity:'คู่แข่งพร้อมใช้: มีสถานที่ทดแทนที่เปิดได้จริงมากขึ้นหรือไม่ — premium ยังอยู่ถึงวันที่คืนทุนหรือเปล่า?'
  };
  const monitorButtons = [...document.querySelectorAll('button[data-monitor]')];
  monitorButtons.forEach(button => button.addEventListener('click', () => {
    monitor.dataset.monitor = button.dataset.monitor;
    monitorButtons.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    const note = monitorNotes[button.dataset.monitor];
    document.getElementById('monitor-note').textContent = note;
    const player = players.get(monitor);
    if (paused || preference.matches) seek(player,1);
    else replay(player);
    announce(note);
  }));

  // A readable full-size drawing on small screens, without loading a second asset.
  const dialog = document.createElement('dialog');
  dialog.className = 'lps-zoom-dialog';
  dialog.setAttribute('aria-labelledby','lps-zoom-title');
  const dialogHead = document.createElement('div');
  dialogHead.className = 'lps-zoom-heading';
  const dialogTitle = document.createElement('span');
  dialogTitle.id = 'lps-zoom-title';
  const close = document.createElement('button');
  close.type = 'button';
  close.textContent = 'ปิด ×';
  close.setAttribute('aria-label','ปิดแผนภาพขยาย');
  dialogHead.append(dialogTitle,close);
  const zoomScroll = document.createElement('div');
  zoomScroll.className = 'lps-zoom-scroll';
  zoomScroll.tabIndex = 0;
  zoomScroll.setAttribute('aria-label','แผนภาพขยาย เลื่อนซ้ายขวาเพื่อดูรายละเอียด');
  const hint = document.createElement('p');
  hint.className = 'lps-zoom-hint';
  hint.textContent = 'บนจอเล็กเลื่อนภาพซ้าย–ขวาได้ · กด Esc เพื่อปิด';
  dialog.append(dialogHead,zoomScroll,hint);
  document.body.append(dialog);
  let previousOverflow = '';
  let zoomTrigger = null;
  let zoomCounter = 0;
  close.addEventListener('click',()=>dialog.close());
  dialog.addEventListener('close',()=>{
    zoomOpen = false;
    zoomScroll.replaceChildren();
    document.body.style.overflow = previousOverflow;
    if (zoomTrigger) zoomTrigger.focus({preventScroll:true});
    syncMotion();
  });
  for (const [scene,player] of players) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'lps-zoom';
    button.textContent = '↗ ขยาย';
    button.setAttribute('aria-label','ขยายแผนภาพ: '+player.title);
    const art = scene.querySelector('svg.s-art');
    scene.querySelector('.lps-motionbar').append(button);
    button.addEventListener('click',()=>{
      const clone = art.cloneNode(true);
      const prefix = 'lps-zoom-'+(++zoomCounter)+'-';
      const idMap = new Map();
      clone.querySelectorAll('[id]').forEach(element=>{
        idMap.set(element.id,prefix+element.id);
        element.id = prefix+element.id;
      });
      [clone,...clone.querySelectorAll('*')].forEach(element=>{
        for (const attribute of [...element.attributes]) {
          let value = attribute.value.replace(/url\(#([^)]+)\)/g,(all,id)=>idMap.has(id)?'url(#'+idMap.get(id)+')':all);
          if (attribute.name === 'aria-labelledby' || attribute.name === 'aria-describedby') {
            value = value.split(' ').map(id=>idMap.get(id)||id).join(' ');
          }
          if (value !== attribute.value) element.setAttribute(attribute.name,value);
        }
      });
      zoomScroll.className = 'lps-zoom-scroll' + (scene===risk?' lps-risk':'') + (scene===monitor?' lps-control-room':'');
      zoomScroll.dataset.scenario = scene.dataset.scenario || '';
      zoomScroll.dataset.monitor = scene.dataset.monitor || '';
      zoomScroll.replaceChildren(clone);
      dialogTitle.textContent = player.title;
      zoomTrigger = button;
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      zoomOpen = true;
      dialog.showModal();
      close.focus();
      syncMotion();
    });
  }

  const progress = document.querySelector('.lps-progress');
  let progressPending = false;
  function paintProgress() {
    const max = root.scrollHeight - innerHeight;
    progress.style.transform = 'scaleX('+(max>0?clamp(scrollY/max):0)+')';
    progressPending = false;
  }
  function queueProgress() {
    if (!progressPending) {
      progressPending = true;
      requestAnimationFrame(paintProgress);
    }
  }
  window.addEventListener('scroll',queueProgress,{passive:true});
  window.addEventListener('resize',queueProgress);
  window.addEventListener('beforeprint',()=>{
    for (const player of players.values()) seek(player,1);
  });
  paintProgress();
})();
