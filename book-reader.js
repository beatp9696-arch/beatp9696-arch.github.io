/* A single reading document: shared anchors, bookmarks and notes in both layouts. */
(() => {
  const body = document.body;
  if (!body.classList.contains('book-detail-page')) return;
  const prose = document.querySelector('.bs-prose');
  const chapters = [...prose.querySelectorAll(':scope > section[id]')];
  const readerIDs = new Set(['summary', ...prose.querySelectorAll('[id]')].map(item => typeof item === 'string' ? item : item.id));
  const legacyIDs = { 'one-line': 'question', suitable: 'reading-order', related: 'sources' };
  const title = document.querySelector('.bs-detail-copy h1');
  const titleHome = title.parentElement;
  const readerHeader = document.querySelector('.bs-reader-header');
  const toolbar = document.querySelector('.bs-reader-toolbar');
  const theme = document.querySelector('#theme-toggle');
  const themeHome = theme?.parentElement;
  const tocDialog = document.querySelector('#book-toc-dialog');
  const settings = document.querySelector('#book-reader-settings');
  const links = [...document.querySelectorAll('.bs-chapter-link')];
  const preferenceKey = 'moatrices.book-reader.v1';
  let preferences = { size: 20, spacing: 1.9 };
  let active = false;
  let scheduled = false;
  const barHeight = () => parseFloat(getComputedStyle(body).getPropertyValue('--book-bar-height')) || 76;

  function applyPreferences() {
    body.style.setProperty('--reader-size', preferences.size + 'px');
    body.style.setProperty('--reader-spacing', preferences.spacing);
    settings.querySelector(`[name="reader-size"][value="${preferences.size}"]`).checked = true;
    settings.querySelector(`[name="reader-spacing"][value="${preferences.spacing}"]`).checked = true;
  }
  try {
    const saved = JSON.parse(localStorage.getItem(preferenceKey));
    if ([18, 20, 22, 24].includes(saved?.size)) preferences.size = saved.size;
    if ([1.7, 1.9, 2.2].includes(saved?.spacing)) preferences.spacing = saved.spacing;
  } catch { /* Reading controls work even when browser storage is unavailable. */ }
  applyPreferences();

  function setMode(value) {
    if (active === value) return;
    active = value;
    body.classList.toggle('bs-reader-active', active);
    readerHeader.hidden = toolbar.hidden = !active;
    if (active) {
      document.querySelector('.bs-reader-title-slot').append(title);
      if (theme) document.querySelector('.bs-reader-theme-slot').append(theme);
    } else {
      titleHome.prepend(title);
      if (theme) themeHome.append(theme);
    }
    updateChapter();
  }

  function updateChapter() {
    const sections = [document.getElementById('book-intro'), document.getElementById('purchase'), document.getElementById('summary'), ...chapters];
    let current = active ? 'summary' : 'book-intro';
    for (const section of sections) {
      if (section.getClientRects().length && section.getBoundingClientRect().top <= barHeight() + 40) current = section.id;
    }
    for (const link of links) {
      if (link.hash === '#' + current) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    }
    const index = chapters.findIndex(section => section.id === current);
    const label = index < 0 ? 'เริ่มอ่าน' : chapters[index].querySelector('h2').textContent;
    document.querySelector('[data-current-chapter]').textContent = label;
    toolbar.querySelector('.bs-reader-current > span').textContent = index < 0 ? 'โหมดอ่าน' : `กำลังอ่าน ${index + 1} / ${chapters.length}`;
  }
  function scheduleUpdate() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => { scheduled = false; updateChapter(); });
  }
  addEventListener('scroll', scheduleUpdate, { passive: true });
  addEventListener('resize', scheduleUpdate);

  function jump(id, focus = true) {
    const section = document.getElementById(id);
    if (!section) return;
    section.scrollIntoView({ block: 'start', behavior: 'instant' });
    if (focus) {
      const heading = section.querySelector('h1, h2, h3') || section;
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
    }
    updateChapter();
  }
  function navigate(id) {
    const url = new URL(location.href);
    const reading = readerIDs.has(id);
    if (reading) url.searchParams.set('reader', '1');
    else { url.searchParams.delete('reader'); url.searchParams.delete('resume'); url.searchParams.delete('highlight'); }
    url.hash = id;
    if (url.href !== location.href) history.pushState(null, '', url);
    setMode(reading);
    jump(id);
  }
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href^="#"]');
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const id = link.hash.slice(1);
    if (!readerIDs.has(id) && !['book-intro', 'purchase'].includes(id)) return;
    event.preventDefault();
    if (tocDialog.open) tocDialog.close();
    navigate(id);
  });

  function restoreLocation() {
    const url = new URL(location.href);
    let id = url.hash.slice(1);
    if (legacyIDs[id]) {
      id = legacyIDs[id];
      url.hash = id;
      history.replaceState(null, '', url);
    }
    setMode(readerIDs.has(id) || (!['book-intro', 'purchase'].includes(id) && (url.searchParams.get('reader') === '1' || url.searchParams.get('resume') === '1' || url.searchParams.has('highlight'))));
    if (id && (readerIDs.has(id) || ['book-intro', 'purchase'].includes(id))) jump(id, false);
    else if (active && !url.searchParams.has('resume') && !url.searchParams.has('highlight')) jump('summary', false);
  }
  addEventListener('popstate', restoreLocation);
  addEventListener('hashchange', restoreLocation);
  // Reading's existing resume button can also switch layouts before measuring its anchor.
  document.addEventListener('book-reader:open', () => {
    setMode(true);
    const url = new URL(location.href);
    url.searchParams.set('reader', '1');
    if (['book-intro', 'purchase'].includes(url.hash.slice(1))) url.hash = '';
    history.replaceState(null, '', url);
  });

  document.querySelectorAll('[data-open-toc]').forEach(button => {
    button.hidden = false;
    button.addEventListener('click', () => tocDialog.showModal());
  });
  document.querySelector('[data-open-settings]').addEventListener('click', () => settings.showModal());
  for (const dialog of [tocDialog, settings]) {
    dialog.querySelector('[data-close-dialog]').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => {
      const bounds = dialog.getBoundingClientRect();
      if (event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) dialog.close();
    });
  }
  function changePreferences(next) {
    const block = [...prose.querySelectorAll('h2,h3,p,li')].find(item => item.getBoundingClientRect().bottom > barHeight() + 20);
    const top = block?.getBoundingClientRect().top;
    preferences = next;
    applyPreferences();
    if (block && active) scrollBy({ top: block.getBoundingClientRect().top - top, behavior: 'instant' });
    try { localStorage.setItem(preferenceKey, JSON.stringify(preferences)); } catch {}
    updateChapter();
  }
  settings.addEventListener('change', event => {
    if (event.target.name === 'reader-size') changePreferences({ ...preferences, size: Number(event.target.value) });
    if (event.target.name === 'reader-spacing') changePreferences({ ...preferences, spacing: Number(event.target.value) });
  });
  settings.querySelector('[data-reset-reader]').addEventListener('click', () => changePreferences({ size: 20, spacing: 1.9 }));
  restoreLocation();
  document.fonts.ready.then(() => { restoreLocation(); updateChapter(); });
  updateChapter();
})();
