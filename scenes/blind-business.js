/* Finite, optional diagram animations. Article text is never animated or gated. */
(() => {
  'use strict';
  const figures = [...document.querySelectorAll('[data-bb-scene]')];
  if (!figures.length || !('IntersectionObserver' in window)) return;

  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const setting = document.querySelector('.bb-motion-setting');
  const toggle = setting.querySelector('button');
  const message = setting.querySelector('.bb-motion-message');
  const duration = 7200;
  let paused = false;
  let frame = 0;
  let previousTime = null;
  let printing = false;
  const clamp = n => Math.max(0, Math.min(1, n));
  const range = value => value.split(',').map(Number);
  const localProgress = (progress, [start, end]) => clamp((progress - start) / (end - start));

  const scenes = figures.map(el => ({
    el, progress: 0, visible: false, state: '',
    controls: el.querySelector('.bb-scene-controls'),
    status: el.querySelector('.bb-scene-status'),
    steps: [...el.querySelectorAll('[data-bb-seq]')].map(node => ({node, range: range(node.dataset.bbSeq)})),
    fills: [...el.querySelectorAll('[data-bb-fill]')].map(node => ({node, range: range(node.dataset.bbFill)})),
    travellers: [...el.querySelectorAll('[data-bb-path]')].map(node => {
      const path = document.getElementById(node.dataset.bbPath);
      return {node, path, length: path.getTotalLength(), range: range(node.dataset.bbWindow)};
    })
  }));

  function render(scene) {
    const p = scene.progress;
    scene.el.style.setProperty('--bb-progress', p.toFixed(4));
    scene.steps.forEach(({node, range: [start, end]}) => {
      node.classList.toggle('bb-step-active', p >= start && p < end);
      node.classList.toggle('bb-step-done', p >= end);
    });
    scene.fills.forEach(({node, range}) => {
      const t = localProgress(p, range);
      node.style.transform = `scaleX(${1 - Math.pow(1 - t, 3)})`;
    });
    scene.travellers.forEach(({node, path, length, range}) => {
      const point = path.getPointAtLength(length * localProgress(p, range));
      node.setAttribute('cx', point.x);
      node.setAttribute('cy', point.y);
      node.style.opacity = p >= range[0] && p < range[1] ? '1' : '0';
    });
  }

  function isRunning(scene) {
    return !preference.matches && !paused && !printing && !document.hidden && scene.visible && scene.progress < 1;
  }

  function setState(scene) {
    const state = preference.matches || printing ? 'static' : scene.progress === 1 ? 'complete' : paused ? 'paused' : !scene.visible || document.hidden ? 'waiting' : 'playing';
    if (state === scene.state) return;
    scene.state = state;
    scene.el.dataset.bbState = state;
    // These are intentionally not live regions: passive motion must not
    // interrupt a screen reader while it is reading the article.
    scene.status.textContent = {static: 'ภาพนิ่ง', complete: 'ครบลำดับแล้ว', paused: 'พักภาพอยู่', waiting: 'ภาพประกอบตามลำดับ', playing: 'กำลังแสดงลำดับ'}[state];
  }

  function tick(time) {
    frame = 0;
    const elapsed = previousTime === null ? 0 : Math.min(time - previousTime, 100);
    previousTime = time;
    scenes.forEach(scene => {
      if (isRunning(scene)) {
        scene.progress = clamp(scene.progress + elapsed / duration);
        render(scene);
      }
      setState(scene);
    });
    if (scenes.some(isRunning)) frame = requestAnimationFrame(tick);
    else previousTime = null;
  }

  function sync() {
    scenes.forEach(setState);
    if (scenes.some(isRunning)) {
      if (!frame) frame = requestAnimationFrame(tick);
    } else {
      cancelAnimationFrame(frame);
      frame = 0;
      previousTime = null;
    }
  }

  function applyPreference() {
    setting.hidden = preference.matches;
    scenes.forEach(scene => {
      scene.controls.hidden = preference.matches;
      if (preference.matches) scene.progress = 1;
      render(scene);
    });
    sync();
  }

  toggle.addEventListener('click', () => {
    paused = !paused;
    toggle.setAttribute('aria-pressed', String(paused));
    message.textContent = paused ? 'พักภาพทั้งหมดแล้ว · อ่านต่อได้ตามปกติ' : 'ภาพประกอบจะเล่นหนึ่งรอบเมื่อเลื่อนมาถึง';
    sync();
  });
  scenes.forEach(scene => {
    scene.el.querySelector('.bb-replay').addEventListener('click', () => {
      if (preference.matches) return;
      scene.progress = 0;
      render(scene);
      // Replay respects the global pause setting.
      sync();
    });
  });

  const byElement = new Map(scenes.map(scene => [scene.el, scene]));
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      byElement.get(entry.target).visible = entry.isIntersecting && entry.intersectionRatio >= 0.15;
    });
    sync();
  }, {threshold: [0, 0.15], rootMargin: '-70px 0px -30px 0px'});

  figures.forEach(el => observer.observe(el));
  document.addEventListener('visibilitychange', sync);
  preference.addEventListener('change', applyPreference);
  window.addEventListener('beforeprint', () => { printing = true; sync(); });
  window.addEventListener('afterprint', () => { printing = false; sync(); });
  window.addEventListener('pagehide', () => { cancelAnimationFrame(frame); frame = 0; previousTime = null; });
  window.addEventListener('pageshow', sync);
  applyPreference();
})();
