/* Progressive enhancement: the complete catalog and summaries are already HTML. */
(() => {
  const rail = document.querySelector('.bs-rail-tools');
  if (rail) {
    // Move the existing controls: their theme, search and keyboard behavior stays shared.
    ['.hamburger-btn', '.search-btn', '#theme-toggle'].forEach(selector => {
      const control = document.querySelector(selector);
      if (control) rail.append(control);
    });
  }
  document.querySelectorAll('.bs-cover-face img, .bs-nav-cover img').forEach(image => {
    const fallback = () => {
      image.hidden = true;
      const face = image.closest('.bs-cover-face');
      if (!face) return;
      face.setAttribute('role', 'img');
      face.setAttribute('aria-label', image.alt + ' · แสดงชื่อหนังสือแทนภาพปก');
    };
    image.addEventListener('error', fallback);
    if (image.complete && !image.naturalWidth) fallback();
  });
  const controls = document.querySelector('.bs-controls');
  if (!controls) return;
  const input = document.querySelector('#book-search');
  const buttons = [...controls.querySelectorAll('[data-category]')];
  const cards = [...document.querySelectorAll('[data-book]')];
  const empty = document.querySelector('.bs-empty');
  const normalize = value => value.normalize('NFKC').toLocaleLowerCase('th').replace(/[’‘']/g, '').replace(/\s+/g, ' ').trim();
  let category = '';
  function filter() {
    const terms = normalize(input.value).split(' ').filter(Boolean);
    let count = 0;
    for (const card of cards) {
      const matches = (!category || JSON.parse(card.dataset.categories).includes(category)) && terms.every(term => normalize(card.dataset.search).includes(term));
      card.hidden = !matches;
      if (matches) count++;
    }
    empty.hidden = count !== 0;
    document.querySelector('.bs-grid').hidden = count === 0;
    controls.querySelector('[role="status"]').textContent = `พบ ${count} จาก ${cards.length} เล่ม${category ? ' · ' + category : ''}`;
    buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.category === category)));
  }
  input.addEventListener('input', filter);
  buttons.forEach(button => button.addEventListener('click', () => { category = button.dataset.category; filter(); }));
  document.querySelector('[data-clear-filters]').addEventListener('click', () => { category = ''; input.value = ''; filter(); input.focus(); });
  controls.hidden = false;
  filter();
})();
