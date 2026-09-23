/* Business sequences share the same keyboard, playback and motion preferences. */
(() => {
  'use strict';
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  document.querySelectorAll('.axp-explainer').forEach(figure => {
    const buttons = [...figure.querySelectorAll('[data-sequence-select]')];
    const panels = [...figure.querySelectorAll('.axp-sequence-panel')];
    const motion = figure.querySelector('.axp-sequence-motion');
    const routes = [...figure.querySelectorAll('[data-route]')];
    const rows = [...figure.querySelectorAll('[data-reveal]')];
    let active = 0;
    let playing = !preference.matches;
    let visible = false;
    let timer;
    function sync() {
      clearTimeout(timer);
      figure.dataset.paused = String(!playing || preference.matches);
      figure.dataset.offscreen = String(!visible || document.hidden);
      motion.hidden = preference.matches;
      motion.textContent = playing ? 'หยุดภาพ' : 'เล่นลำดับ';
      motion.setAttribute('aria-pressed', String(playing));
      motion.setAttribute('aria-label', (playing ? 'หยุดภาพ: ' : 'เล่นลำดับ: ') + figure.querySelector('h3').textContent);
      if (playing && visible && !document.hidden && !preference.matches) {
        timer = setTimeout(() => select((active + 1) % panels.length, false), 8500);
      }
    }
    function select(index, manual) {
      active = index;
      if (manual) playing = false;
      figure.dataset.active = String(active);
      buttons.forEach((button, i) => button.setAttribute('aria-pressed', String(i === active)));
      panels.forEach((panel, i) => { panel.hidden = i !== active; });
      routes.forEach(route => route.classList.toggle('is-current', Number(route.dataset.route) === active));
      rows.forEach(row => {
        row.classList.toggle('is-current', Number(row.dataset.reveal) === active);
        row.classList.toggle('is-reached', Number(row.dataset.reveal) <= active);
      });
      sync();
    }
    buttons.forEach((button, i) => {
      button.addEventListener('click', () => select(i, true));
      button.addEventListener('focus', () => {
        if (button.matches(':focus-visible')) select(i, true);
      });
      button.addEventListener('keydown', event => {
        let next;
        if (event.key === 'ArrowRight') next = (i + 1) % buttons.length;
        else if (event.key === 'ArrowLeft') next = (i - 1 + buttons.length) % buttons.length;
        else if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = buttons.length - 1;
        else return;
        event.preventDefault();
        buttons[next].focus();
      });
    });
    motion.addEventListener('click', () => { playing = !playing; sync(); });
    preference.addEventListener('change', sync);
    document.addEventListener('visibilitychange', sync);
    figure.classList.add('is-enhanced');
    select(0, false);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(entries => {
        visible = entries[0].isIntersecting;
        sync();
      }, { threshold: .15 }).observe(figure);
    } else {
      visible = true;
      sync();
    }
  });
})();

/* Illustrated networks pause outside the viewport and respect reader controls. */
(() => {
  'use strict';
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  document.querySelectorAll('.axp-picture-figure').forEach(figure => {
    const toggle = figure.querySelector('.axp-picture-toggle');
    let paused = false;
    let visible = false;
    function sync() {
      figure.dataset.paused = String(paused || preference.matches);
      figure.dataset.offscreen = String(!visible || document.hidden);
      toggle.hidden = preference.matches;
      toggle.setAttribute('aria-pressed', String(paused));
      toggle.textContent = paused ? 'เล่นต่อ' : 'หยุดภาพ';
      toggle.setAttribute('aria-label', (paused ? 'เล่นภาพต่อ: ' : 'หยุดภาพ: ') + figure.querySelector('h3').textContent);
    }
    toggle.addEventListener('click', () => { paused = !paused; sync(); });
    preference.addEventListener('change', sync);
    document.addEventListener('visibilitychange', sync);
    sync();
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(entries => {
        visible = entries[0].isIntersecting;
        sync();
      }, { threshold: .1 }).observe(figure);
    } else {
      visible = true;
      sync();
    }
  });
})();

/* Event-driven controls; the diagram's motion stays in CSS. */
(() => {
  'use strict';
  const figure = document.querySelector('.axp-flywheel');
  if (!figure) return;
  const nodes = [...figure.querySelectorAll('.axp-node')];
  const descriptions = [...figure.querySelectorAll('.axp-flywheel-detail p')];
  const pause = figure.querySelector('.axp-motion');
  const select = node => {
    nodes.forEach(item => item.setAttribute('aria-pressed', String(item === node)));
    descriptions.forEach(item => { item.hidden = item.id !== node.getAttribute('aria-describedby'); });
  };
  nodes.forEach(node => {
    ['mouseenter', 'focus', 'click'].forEach(event => node.addEventListener(event, () => select(node)));
  });
  // Delegated focus handling keeps keyboard navigation reliable when a node is
  // reached via Tab after a jump link, where the target may already be focused.
  figure.addEventListener('focusin', event => {
    if (event.target.matches('.axp-node')) select(event.target);
  });
  select(nodes[0]);
  pause.hidden = false;
  pause.addEventListener('click', () => {
    const paused = figure.dataset.paused !== 'true';
    figure.dataset.paused = String(paused);
    pause.setAttribute('aria-pressed', String(paused));
    pause.textContent = paused ? 'เล่นต่อ' : 'หยุดภาพ';
    pause.setAttribute('aria-label', paused ? 'เล่นภาพเคลื่อนไหวต่อ' : 'หยุดภาพเคลื่อนไหว');
  });
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let inView = true;
  const syncMotion = () => {
    pause.hidden = reducedMotion.matches;
    figure.dataset.offscreen = String(document.hidden || !inView);
  };
  reducedMotion.addEventListener('change', syncMotion);
  document.addEventListener('visibilitychange', syncMotion);
  syncMotion();
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      inView = entries[0].isIntersecting;
      syncMotion();
    }, { rootMargin: '80px' });
    observer.observe(figure);
  }
})();

/* A small state machine lets CSS move the three original card illustrations.
   No animation library or continuous JavaScript render loop is needed. */
(() => {
  'use strict';
  const scene = document.querySelector('.axp-card-scene');
  if (!scene) return;
  const cards = [...scene.querySelectorAll('[data-card]')];
  const selectors = [...scene.querySelectorAll('[data-card-select]')];
  const stories = [...scene.querySelectorAll('.axp-card-story')];
  const motion = scene.querySelector('.axp-card-motion');
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  let active = 0;
  let paused = false;
  let hovering = false;
  let visible = false;
  let timer = null;

  function sync() {
    clearTimeout(timer);
    timer = null;
    scene.dataset.paused = String(paused || preference.matches);
    scene.dataset.offscreen = String(!visible || document.hidden);
    motion.hidden = preference.matches;
    motion.setAttribute('aria-pressed', String(paused));
    motion.textContent = paused ? 'เล่นต่อ ▷' : 'หยุดภาพ Ⅱ';
    motion.setAttribute('aria-label', paused ? 'เล่นภาพเคลื่อนไหวของบัตรต่อ' : 'หยุดภาพเคลื่อนไหวของบัตร');
    if (visible && !document.hidden && !paused && !preference.matches && !hovering) {
      timer = setTimeout(() => select((active + 1) % cards.length, false), 7000);
    }
  }
  function select(index, manual) {
    active = index;
    if (manual) paused = true;
    scene.dataset.active = String(active);
    cards.forEach((card, i) => {
      card.dataset.slot = String((i - active + cards.length) % cards.length);
      card.setAttribute('aria-pressed', String(i === active));
    });
    selectors.forEach((button, i) => button.setAttribute('aria-pressed', String(i === active)));
    stories.forEach((story, i) => { story.hidden = i !== active; });
    sync();
  }
  cards.forEach((card, i) => {
    card.addEventListener('click', () => select(i, true));
  });
  selectors.forEach((button, i) => button.addEventListener('click', () => select(i, true)));
  // Hover holds the current story temporarily; leaving resumes automatic cycling.
  // A deliberate selection pauses until the reader chooses to play again.
  scene.addEventListener('pointerenter', event => {
    if (event.pointerType === 'mouse' || event.pointerType === 'pen') {
      hovering = true;
      sync();
    }
  });
  scene.addEventListener('pointerleave', () => { hovering = false; sync(); });
  scene.addEventListener('focusin', event => {
    const button = event.target.closest('[data-card], [data-card-select]');
    if (button && button.matches(':focus-visible')) {
      select(Number(button.dataset.card ?? button.dataset.cardSelect), true);
    }
  });
  motion.addEventListener('click', () => { paused = !paused; sync(); });
  preference.addEventListener('change', sync);
  document.addEventListener('visibilitychange', sync);
  scene.classList.add('is-enhanced');
  select(0, false);
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      sync();
    }, { threshold: .15 });
    observer.observe(scene);
  } else {
    visible = true;
    sync();
  }
})();
