/* ฉบับอ่านรวมเล่ม (series-*.html): แถบ tick ซ้ายและปุ่มสารบัญลอย ติดตามตอน/หัวข้อที่กำลังอ่าน
   HTML ทั้งหมด gen โดย build.py write_series — ไฟล์นี้แค่สลับสถานะ ไม่สร้าง DOM เอง */
(() => {
  const flow = document.querySelector('.book-flow');
  if (!flow) return;
  const chapters = [...flow.querySelectorAll(':scope > .book-chapter')];
  const railItems = [...document.querySelectorAll('.book-rail .rail-ch')];
  const pill = document.querySelector('.book-pill');
  const pillNow = pill?.querySelector('[data-pill-now]');
  const pillCount = pill?.querySelector('[data-pill-count]');
  const pillLinks = pill ? [...pill.querySelectorAll('.pill-sheet a')] : [];
  // หัวข้อย่อยของแต่ละตอน (id = ep<n>-sec-<k>) คู่กับขีดย่อยบนแถบ
  const sections = chapters.map((chapter, i) => {
    const subs = railItems[i] ? [...railItems[i].querySelectorAll('.rail-sub')] : [];
    return subs.map(link => ({ link, heading: document.getElementById(link.hash.slice(1)) }))
      .filter(item => item.heading);
  });
  let shownChapter = -2;
  let shownSection = -2;
  let scheduled = false;

  function setCurrent(link, on) {
    if (on) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  }

  function update() {
    scheduled = false;
    // เส้นอ่าน: หัวบท/หัวข้อที่เลื่อนผ่านเส้นนี้แล้ว = กำลังอ่านอยู่
    const line = Math.min(innerHeight * 0.3, 280);
    let current = -1;
    chapters.forEach((chapter, i) => { if (chapter.getBoundingClientRect().top <= line) current = i; });

    if (current !== shownChapter) {
      shownChapter = current;
      shownSection = -2;
      railItems.forEach((item, i) => {
        item.classList.toggle('is-active', i === current);
        item.classList.toggle('is-read', i < current);
        setCurrent(item.querySelector('.rail-tick'), i === current);
      });
      pillLinks.forEach((link, i) => setCurrent(link, i === current));
      if (pill) {
        pill.classList.toggle('is-shown', current >= 0);
        if (current < 0) pill.open = false;
        else {
          pillNow.textContent = chapters[current].dataset.short || '';
          pillCount.textContent = (current + 1) + '/' + chapters.length;
        }
      }
    }

    const list = current >= 0 ? sections[current] : [];
    let section = -1;
    list.forEach((item, i) => { if (item.heading.getBoundingClientRect().top <= line) section = i; });
    if (section !== shownSection) {
      shownSection = section;
      list.forEach((item, i) => {
        item.link.classList.toggle('is-read', i < section);
        setCurrent(item.link, i === section);
      });
    }
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(update);
  }

  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule);
  update();

  if (pill) {
    const summary = pill.querySelector('summary');
    pill.addEventListener('click', event => {
      if (event.target.closest('.pill-sheet a')) pill.open = false;
    });
    document.addEventListener('click', event => {
      if (pill.open && !pill.contains(event.target)) pill.open = false;
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && pill.open) {
        pill.open = false;
        summary.focus();
      }
    });
  }
})();
