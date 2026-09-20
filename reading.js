import { PREFIX, IMPACTS, articlePath, getArticle, saveArticle, saveNote, deleteNote, reviewNote, records, dueNote, localDay } from './reading-store.js';
import { esc, dayLabel, ensureReadingStyles } from './reading-ui.js';

ensureReadingStyles();
const libraryURL = new URL('./reading.html', import.meta.url).pathname;
const path = articlePath(location.pathname);
const main = document.querySelector('main > .container');
const plainText = value => String(value || '').replace(/\s+/g, ' ').trim();
let pendingSelection = null;
const toast = document.createElement('div');
toast.className = 'reading-toast'; toast.setAttribute('role', 'status'); toast.hidden = true;
document.body.append(toast);
let toastTimer;
function notify(message, error = false) {
  toast.textContent = message; toast.hidden = false; toast.classList.toggle('is-error', error);
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { toast.hidden = true; }, 5000);
}
function attempt(fn) {
  try { return fn(); } catch { notify('บันทึกไม่สำเร็จ เบราว์เซอร์อาจปิดการจัดเก็บหรือพื้นที่เต็ม กรุณาเก็บข้อความไว้แล้วลองใหม่', true); return null; }
}
function downloadNotes() {
  const data = attempt(() => ({ version: 1, exportedAt: new Date().toISOString(), articles: records('article'), notes: records('note') }));
  if (!data) return;
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob), link = document.createElement('a');
  link.href = url; link.download = 'moatrices-reading-' + localDay() + '.json'; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function noteEditor(note, opener) {
  const dialog = document.createElement('dialog'); dialog.className = 'reading-dialog';
  dialog.setAttribute('aria-labelledby', 'reading-editor-title');
  const nextWeek = new Date(); nextWeek.setDate(nextWeek.getDate() + 7);
  dialog.innerHTML = `<form><div class="reading-heading"><div><span class="reading-eyebrow">KEEP THE EVIDENCE</span><h2 id="reading-editor-title">${note.id ? 'แก้ไขบันทึก' : 'เก็บข้อความและวิธีคิด'}</h2></div><button type="button" data-close aria-label="ปิด">✕</button></div><blockquote>${esc(note.quote)}</blockquote><p class="reading-muted">จาก ${esc(note.title)}${note.sourceDate ? ' · ต้นฉบับ ' + esc(note.sourceDate) : ''}</p><div class="reading-form-row"><label>ผูกกับหุ้น <small>เว้นว่างได้</small><input name="ticker" value="${esc(note.ticker)}" placeholder="เช่น NVDA" maxlength="16" autocomplete="off"></label><label>ข้อความนี้มีผลอย่างไร<select name="impact">${Object.entries(IMPACTS).map(([key, label]) => `<option value="${key}" ${note.impact === key ? 'selected' : ''}>${label}</option>`).join('')}</select></label></div><label>เหตุผล / สิ่งที่ต้องตรวจต่อ<textarea name="note" rows="4" maxlength="4000" placeholder="ข้อความนี้เปลี่ยนสิ่งที่เราเชื่ออย่างไร?">${esc(note.note)}</textarea></label><label>กลับมาทบทวนวันที่ <small>ลบวันที่ได้หากไม่ต้องการตั้งรอบ</small><input type="date" name="reviewOn" value="${esc(note.id ? note.reviewOn : localDay(nextWeek))}"></label><p class="reading-muted">บันทึกในเบราว์เซอร์นี้ · ส่งออกสำเนาได้จากคลังอ่านของฉัน</p><p class="reading-error" role="alert" hidden></p><div class="reading-dialog-actions"><button type="button" data-close>ยกเลิก</button><button class="reading-primary" type="submit">บันทึกหลักฐาน</button></div></form>`;
  document.body.append(dialog);
  dialog.addEventListener('close', () => { dialog.remove(); if (opener?.isConnected) opener.focus({ preventScroll: true }); });
  dialog.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => dialog.close()));
  dialog.querySelector('form').addEventListener('submit', event => {
    event.preventDefault(); const data = Object.fromEntries(new FormData(event.target));
    try {
      saveNote({ ...note, ...data, reviewedAt: data.reviewOn !== note.reviewOn ? null : note.reviewedAt });
      dialog.close(); window.getSelection()?.removeAllRanges(); pendingSelection = null;
      notify(data.ticker ? `บันทึกไว้ในสมุด ${data.ticker.toUpperCase()} แล้ว` : 'บันทึกหลักฐานแล้ว');
    } catch (error) {
      const status = dialog.querySelector('[role="alert"]'); status.hidden = false;
      status.textContent = 'ยังบันทึกไม่ได้: ' + (error.name === 'QuotaExceededError' ? 'พื้นที่จัดเก็บเต็ม กรุณาส่งออกสำเนาก่อน' : 'ตรวจข้อมูลและการอนุญาตจัดเก็บ แล้วลองอีกครั้ง');
    }
  });
  dialog.showModal(); dialog.querySelector('textarea').focus();
}

function noteCard(note) {
  return `<article class="reading-note" id="note-${esc(note.id)}"><div class="reading-note-meta"><span class="reading-tag">${esc(note.ticker || 'บันทึกทั่วไป')}</span><span>${IMPACTS[note.impact] || IMPACTS.question}</span>${dueNote(note) ? '<span class="reading-due">ถึงรอบทบทวน</span>' : ''}</div><blockquote>${esc(note.quote)}</blockquote>${note.note ? `<p class="reading-note-copy">${esc(note.note)}</p>` : ''}<a class="reading-source" href="${esc(note.path)}?highlight=${encodeURIComponent(note.id)}${note.anchor ? '#' + esc(note.anchor) : ''}">${esc(note.title)} ↗</a><div class="reading-note-foot"><small>บันทึก ${dayLabel(note.createdAt)}${note.sourceDate ? ' · ต้นฉบับ ' + esc(note.sourceDate) : ''}${note.reviewedAt ? ' · ทบทวนแล้ว ' + dayLabel(note.reviewedAt) : note.reviewOn ? ' · ทบทวน ' + dayLabel(note.reviewOn) : ''}</small><div><button data-edit-note="${esc(note.id)}">แก้ไข</button>${!note.reviewedAt ? `<button data-review-note="${esc(note.id)}">ทบทวนแล้ว</button>` : ''}<button data-delete-note="${esc(note.id)}">ลบ</button></div></div></article>`;
}
function wireNotes(host, getNotes) {
  host.addEventListener('click', event => {
    const button = event.target.closest('button'); if (!button) return;
    const id = button.dataset.editNote || button.dataset.reviewNote || button.dataset.deleteNote;
    if (!id) return;
    const note = getNotes().find(record => record.id === id); if (!note) return;
    if (button.dataset.editNote) noteEditor(note, button);
    if (button.dataset.reviewNote) attempt(() => { reviewNote(id); notify('บันทึกการทบทวนแล้ว'); });
    if (button.dataset.deleteNote) {
      const dialog = document.createElement('dialog'); dialog.className = 'reading-dialog reading-dialog--small';
      dialog.innerHTML = '<h2>ลบบันทึกนี้?</h2><p>ข้อความในบทความต้นทางยังอยู่ตามเดิม</p><div class="reading-dialog-actions"><button data-cancel>เก็บไว้</button><button data-delete>ลบบันทึก</button></div>';
      document.body.append(dialog); dialog.showModal();
      dialog.querySelector('[data-cancel]').onclick = () => dialog.close();
      dialog.querySelector('[data-delete]').onclick = () => attempt(() => { deleteNote(id); dialog.close(); notify('ลบบันทึกแล้ว'); });
      dialog.onclose = () => { dialog.remove(); if (button.isConnected) button.focus(); };
    }
  });
}
function articleCard(article) {
  return `<article class="reading-article-card"><div><span class="reading-eyebrow">${esc(article.ticker || 'MOATRICES')} · ${article.completed ? 'อ่านจบแล้ว' : article.progress ? 'อ่านถึง ' + article.progress + '%' : 'บันทึกไว้อ่าน'}</span><a href="${esc(article.path)}${article.progress && !article.completed ? '?resume=1' : ''}"><h3>${esc(article.title || article.path)}</h3></a><div class="reading-track" aria-hidden="true"><span style="width:${Number(article.progress) || 0}%"></span></div></div><button class="reading-save" data-save-path="${esc(article.path)}" aria-pressed="${!!article.saved}" aria-label="${article.saved ? 'นำออกจากรายการไว้อ่าน' : 'บันทึกไว้อ่าน'}">${article.saved ? '✓ ไว้อ่าน' : '＋ ไว้อ่าน'}</button></article>`;
}

function initLibrary() {
  const host = document.getElementById('reading-library'); if (!host) return;
  document.body.classList.add('reading-library-page');
  const params = new URLSearchParams(location.search);
  const allowed = ['all', 'saved', 'progress', 'notes', 'due'];
  let view = allowed.includes(params.get('view')) ? params.get('view') : 'all', query = '', company = params.get('company') || '';
  host.innerHTML = `<div class="reading-library-tools"><nav class="reading-filters" aria-label="แสดงคลังอ่าน">${[['all','ทั้งหมด'],['progress','อ่านต่อ'],['saved','ไว้อ่าน'],['notes','หลักฐาน'],['due','ถึงรอบทบทวน']].map(([id,label]) => `<button data-reading-view="${id}" aria-pressed="${id === view}">${label}</button>`).join('')}</nav><div class="reading-library-search"><label><span class="reading-sr">ค้นหาในคลังอ่าน</span><input type="search" placeholder="ค้นหาบทความ หุ้น หรือโน้ต" aria-label="ค้นหาในคลังอ่าน"></label><label><span class="reading-sr">หุ้นในบันทึก</span><select aria-label="หุ้นในบันทึก"><option value="">ทุกหุ้น</option></select></label><button data-export>ส่งออกสำเนา</button></div></div><div class="reading-library-status" role="status"></div><div class="reading-library-results"></div>`;
  const result = host.querySelector('.reading-library-results'), select = host.querySelector('select');
  let notes = [];
  function render() {
    let articles;
    try { articles = records('article'); notes = records('note'); } catch {
      result.innerHTML = '<p class="reading-error" role="alert">เปิดคลังอ่านไม่ได้ กรุณาอนุญาตการจัดเก็บในเบราว์เซอร์</p>'; return;
    }
    const tickers = [...new Set([...articles, ...notes].map(item => item.ticker).filter(Boolean))].sort();
    if (company && !tickers.includes(company)) tickers.push(company);
    select.innerHTML = '<option value="">ทุกหุ้น</option>' + tickers.map(ticker => `<option ${company === ticker ? 'selected' : ''}>${esc(ticker)}</option>`).join('');
    const matches = record => (!company || record.ticker === company) && `${record.title} ${record.ticker} ${record.quote || ''} ${record.note || ''}`.toLocaleLowerCase().includes(query.toLocaleLowerCase().trim());
    const selectedArticles = articles.filter(matches).filter(article => view === 'saved' ? article.saved : view === 'progress' ? article.progress > 0 && !article.completed : article.saved || article.progress > 0 || article.completed);
    const selectedNotes = notes.filter(matches).filter(note => view !== 'due' || dueNote(note));
    const showArticles = ['all', 'saved', 'progress'].includes(view), showNotes = ['all', 'notes', 'due'].includes(view);
    const count = (showArticles ? selectedArticles.length : 0) + (showNotes ? selectedNotes.length : 0);
    host.querySelector('.reading-library-status').textContent = `${count} รายการ${company ? ' · ' + company : ''}`;
    result.innerHTML = count ? `${showArticles && selectedArticles.length ? `<div class="reading-card-grid">${selectedArticles.map(articleCard).join('')}</div>` : ''}${showNotes && selectedNotes.length ? `<div class="reading-notes-list">${selectedNotes.map(noteCard).join('')}</div>` : ''}` : `<div class="reading-empty-state"><span class="reading-eyebrow">A PLACE FOR YOUR QUESTIONS</span><h2>${view === 'due' ? 'ไม่มีบันทึกถึงรอบทบทวน' : query || company ? 'ยังไม่พบรายการที่ตรงกัน' : 'เริ่มเก็บสิ่งที่อยากกลับมาอ่าน'}</h2><p>เปิดบทความ กดไว้อ่าน หรือเลือกข้อความแล้วบันทึกหลักฐานพร้อมความเห็นของคุณ</p><a class="reading-primary" href="articles.html">สำรวจคลังบทความ →</a></div>`;
  }
  host.querySelector('input').addEventListener('input', event => { query = event.target.value; render(); });
  select.addEventListener('change', event => { company = event.target.value; route(); render(); });
  function route() {
    const url = new URL(location.href); url.searchParams.set('view', view);
    company ? url.searchParams.set('company', company) : url.searchParams.delete('company');
    history.replaceState(null, '', url);
  }
  host.addEventListener('click', event => {
    const button = event.target.closest('button'); if (!button) return;
    if (button.dataset.readingView) {
      view = button.dataset.readingView;
      host.querySelectorAll('[data-reading-view]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
      route(); render();
    }
    if (button.hasAttribute('data-export')) downloadNotes();
    if (button.dataset.savePath) attempt(() => { const record = getArticle(button.dataset.savePath); saveArticle(record.path, { saved: !record.saved }); });
  });
  wireNotes(host, () => notes);
  window.addEventListener('reading-change', render);
  window.addEventListener('storage', event => { if (event.key?.startsWith(PREFIX) || event.key === null) render(); });
  render();
}

function initHome() {
  const slot = document.getElementById('home-reading-slot'); if (!slot) return;
  const section = document.createElement('section'); section.className = 'reading-home';
  section.setAttribute('aria-label', 'คลังอ่านของฉัน'); slot.append(section);
  function render() {
    let articles, notes;
    try { articles = records('article'); notes = records('note'); } catch { section.hidden = true; return; }
    const progress = articles.filter(item => item.progress > 0 && !item.completed).sort((a,b) => String(b.lastReadAt).localeCompare(String(a.lastReadAt))).slice(0, 2);
    const saved = articles.filter(item => item.saved).length, due = notes.filter(note => dueNote(note)).length;
    section.hidden = false;
    section.classList.toggle('is-empty', !progress.length);
    section.innerHTML = `<div class="reading-heading"><div><span class="reading-eyebrow">YOUR READING DESK</span><h2>${progress.length ? 'อ่านต่อจากครั้งก่อน' : 'เก็บเรื่องที่สนใจ ไว้กลับมาอ่าน'}</h2></div><a href="${libraryURL}">คลังอ่านของฉัน ↗</a></div>${progress.length ? `<div class="reading-card-grid">${progress.map(articleCard).join('')}</div>` : '<p class="reading-muted">บันทึกบทความ ไฮไลต์ และคำถามไว้ในคลังอ่านของคุณ</p>'}${saved || due ? `<div class="reading-home-links">${saved ? `<a href="${libraryURL}?view=saved">${saved} เรื่องไว้อ่าน →</a>` : ''}${due ? `<a href="${libraryURL}?view=due">${due} บันทึกถึงรอบทบทวน →</a>` : ''}</div>` : ''}`;
  }
  section.addEventListener('click', event => {
    const button = event.target.closest('[data-save-path]'); if (!button) return;
    attempt(() => { const article = getArticle(button.dataset.savePath); saveArticle(article.path, { saved: !article.saved }); });
  });
  window.addEventListener('reading-change', render); window.addEventListener('storage', render); render();
}

function initCards() {
  document.querySelectorAll('.post-list > li, .stock-card').forEach(card => {
    const link = card.querySelector('a[href*="articles/"]'); if (!link) return;
    const url = new URL(link.href), key = articlePath(url.pathname); if (!key) return;
    const button = document.createElement('button'); button.type = 'button'; button.className = 'reading-card-save';
    button.textContent = '＋ ไว้อ่าน'; button.setAttribute('aria-label', 'บันทึกไว้อ่าน: ' + link.textContent.trim());
    function refresh() { try { const saved = !!getArticle(key)?.saved; button.setAttribute('aria-pressed', String(saved)); button.textContent = saved ? '✓ ไว้อ่าน' : '＋ ไว้อ่าน'; } catch { button.disabled = true; } }
    button.onclick = event => {
      event.preventDefault(); event.stopPropagation();
      attempt(() => saveArticle(key, { title: link.textContent.trim(), ticker: card.querySelector('.stock-tk, .ticker-badge:not(.cat-badge)')?.textContent.trim() || '', saved: !getArticle(key)?.saved })); refresh();
    };
    card.append(button); refresh(); window.addEventListener('reading-change', refresh); window.addEventListener('storage', refresh);
  });
  if (!document.querySelector('.home-page') && !path && !document.getElementById('reading-library') && main && document.querySelector('.post-list--all, .stock-grid')) {
    const link = document.createElement('a'); link.className = 'reading-library-link'; link.href = libraryURL; link.textContent = 'เปิดคลังอ่านของฉัน · ไว้อ่าน / ไฮไลต์ / โน้ต ↗';
    main.querySelector('h1')?.after(link);
  }
}

function initArticle() {
  if (!path || !main) return;
  const title = main.querySelector('h1')?.textContent.trim() || document.title;
  const ticker = main.querySelector('.company-ticker')?.firstChild?.textContent.trim() || '';
  let sourceDate = '';
  document.querySelectorAll('script[type="application/ld+json"]').forEach(script => {
    try { const data = JSON.parse(script.textContent); sourceDate ||= data.dateModified || data.datePublished || ''; } catch {}
  });
  const meta = { title, ticker, sourceDate };
  let previous; try { previous = getArticle(path); } catch {}
  const bar = document.createElement('div'); bar.className = 'reading-toolbar';
  bar.innerHTML = `<button data-bookmark aria-pressed="false">＋ ไว้อ่าน</button><button data-notebook>หลักฐานของบทนี้ <span>0</span></button><button data-complete aria-pressed="false">อ่านจบแล้ว</button><a href="${libraryURL}">คลังของฉัน ↗</a>`;
  (main.querySelector('.byline') || main.querySelector('h1')).after(bar);
  const popup = document.createElement('button'); popup.type = 'button'; popup.className = 'reading-selection reading-primary'; popup.hidden = true;
  popup.textContent = '✎ บันทึกข้อความที่เลือก'; document.body.append(popup);
  const corpus = () => {
    const walker = document.createTreeWalker(main, NodeFilter.SHOW_TEXT, { acceptNode(node) {
      return node.parentElement.closest('script,style,nav,button,textarea,input,select,dialog,.reading-toolbar,.reading-resume,.reading-toast,.reading-selection,[aria-hidden="true"]') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
    } });
    const nodes = []; let raw = '', node;
    while ((node = walker.nextNode())) { nodes.push({ node, start: raw.length }); raw += node.textContent; }
    // The browser collapses HTML indentation in selections. Keep a map back to
    // the original text nodes so highlights still span inline bold/link elements.
    let text = ''; const starts = [], ends = [];
    for (let i = 0; i < raw.length; i++) {
      const char = /\s/.test(raw[i]) ? ' ' : raw[i];
      if (char === ' ' && text.endsWith(' ')) { ends[ends.length - 1] = i + 1; continue; }
      text += char; starts.push(i); ends.push(i + 1);
    }
    return { nodes, text, starts, ends };
  };
  function paint() {
    let notes, record;
    try { notes = records('note').filter(note => note.path === path); record = getArticle(path); } catch { return; }
    bar.querySelector('[data-bookmark]').textContent = record?.saved ? '✓ ไว้อ่าน' : '＋ ไว้อ่าน';
    bar.querySelector('[data-bookmark]').setAttribute('aria-pressed', String(!!record?.saved));
    bar.querySelector('[data-complete]').setAttribute('aria-pressed', String(!!record?.completed));
    bar.querySelector('[data-complete]').textContent = record?.completed ? '✓ อ่านจบแล้ว' : 'อ่านจบแล้ว';
    bar.querySelector('[data-notebook] span').textContent = notes.length;
    if (!window.CSS?.highlights || !window.Highlight) return;
    const data = corpus(), ranges = [];
    const selectedID = new URLSearchParams(location.search).get('highlight');
    for (const note of notes) {
      const quote = plainText(note.quote);
      let start = data.text.indexOf(quote);
      while (start !== -1) {
        const before = data.text.slice(Math.max(0, start - 60), start).trim();
        const after = data.text.slice(start + quote.length, start + quote.length + 60).trim();
        if ((!note.prefix || before.endsWith(plainText(note.prefix))) && (!note.suffix || after.startsWith(plainText(note.suffix)))) break;
        start = data.text.indexOf(quote, start + 1);
      }
      if (start < 0) continue;
      const end = data.ends[start + quote.length - 1], rawStart = data.starts[start];
      const first = data.nodes.find(item => item.start + item.node.length > rawStart), last = data.nodes.find(item => item.start + item.node.length >= end);
      if (!first || !last) continue;
      const range = document.createRange(); range.setStart(first.node, rawStart - first.start); range.setEnd(last.node, end - last.start); ranges.push(range);
      if (selectedID === note.id && !paint.scrolled) { first.node.parentElement.scrollIntoView({ block: 'center' }); paint.scrolled = true; }
    }
    CSS.highlights.set('reading-evidence', new Highlight(...ranges));
  }
  function selection() {
    if (document.querySelector('.reading-dialog[open]')) return;
    const selected = window.getSelection();
    if (!selected?.rangeCount || selected.isCollapsed || !main.contains(selected.anchorNode) || !main.contains(selected.focusNode) || selected.anchorNode.parentElement?.closest('.reading-toolbar, nav')) { popup.hidden = true; return; }
    const quote = plainText(selected.toString()); if (quote.length < 8 || quote.length > 4000) { popup.hidden = true; return; }
    const data = corpus(), range = selected.getRangeAt(0);
    const nodeInfo = data.nodes.find(item => item.node === range.startContainer) || data.nodes.find(item => range.intersectsNode(item.node));
    const rawStart = nodeInfo ? nodeInfo.start + (nodeInfo.node === range.startContainer ? range.startOffset : 0) : 0;
    const from = data.ends.findIndex(end => end > rawStart);
    const offset = data.text.indexOf(quote, Math.max(0, from));
    if (offset < 0) { popup.hidden = true; return; }
    let heading = '';
    for (const node of main.querySelectorAll('h2[id], h3[id]')) if (node.compareDocumentPosition(range.startContainer) & Node.DOCUMENT_POSITION_FOLLOWING) heading = node.id;
    pendingSelection = { ...meta, path, quote, prefix: data.text.slice(Math.max(0, offset - 60), offset).trim(), suffix: data.text.slice(offset + quote.length, offset + quote.length + 60).trim(), anchor: heading };
    popup.hidden = false;
  }
  document.addEventListener('selectionchange', selection);
  popup.addEventListener('pointerdown', event => event.preventDefault());
  popup.onclick = () => { if (pendingSelection) noteEditor(pendingSelection, bar.querySelector('[data-notebook]')); };
  bar.querySelector('[data-bookmark]').onclick = () => attempt(() => saveArticle(path, { ...meta, saved: !getArticle(path)?.saved }));
  bar.querySelector('[data-complete]').onclick = () => attempt(() => saveArticle(path, { ...meta, completed: !getArticle(path)?.completed }));
  bar.querySelector('[data-notebook]').onclick = event => {
    const dialog = document.createElement('dialog'); dialog.className = 'reading-dialog'; dialog.setAttribute('aria-label', 'หลักฐานของบทความนี้');
    dialog.innerHTML = `<div class="reading-heading"><h2>หลักฐานของบทนี้</h2><button aria-label="ปิด" data-close>✕</button></div><p class="reading-muted">เลือกข้อความในบทความเพื่อเพิ่มไฮไลต์และโน้ต</p><div data-notes></div><a class="reading-library-link" href="${libraryURL}">เปิดคลังอ่านทั้งหมด ↗</a>`;
    const getNotes = () => records('note').filter(note => note.path === path);
    const render = () => { const notes = attempt(getNotes) || []; dialog.querySelector('[data-notes]').innerHTML = notes.length ? notes.map(noteCard).join('') : '<p class="reading-empty">ยังไม่มีหลักฐานที่บันทึกไว้ในบทนี้</p>'; };
    wireNotes(dialog, getNotes); render(); document.body.append(dialog); dialog.showModal();
    window.addEventListener('reading-change', render);
    dialog.querySelector('[data-close]').onclick = () => dialog.close();
    const opener = event.currentTarget;
    dialog.onclose = () => { window.removeEventListener('reading-change', render); dialog.remove(); opener.focus(); };
  };
  let paused = true, timer;
  function progress() {
    if (paused) return;
    const top = main.getBoundingClientRect().top + scrollY, end = top + main.offsetHeight - innerHeight;
    const position = Math.max(0, Math.min(1, (scrollY - top) / Math.max(1, end - top)));
    if (scrollY < top + 30) return;
    let anchor = '';
    main.querySelectorAll('h2[id], h3[id]').forEach(heading => { if (heading.getBoundingClientRect().top < innerHeight / 2) anchor = heading.id; });
    try { saveArticle(path, { ...meta, progress: position * 100, position, anchor, opened: true }); }
    catch { if (!progress.warned) { notify('ยังจำตำแหน่งอ่านไม่ได้ กรุณาอนุญาตการจัดเก็บในเบราว์เซอร์', true); progress.warned = true; } }
  }
  async function resume() {
    if (!previous) return;
    await document.fonts.ready;
    const heading = previous.anchor && document.getElementById(previous.anchor);
    if (heading) heading.scrollIntoView({ block: 'start' });
    else { const top = main.getBoundingClientRect().top + scrollY; window.scrollTo(0, top + previous.position * Math.max(1, main.offsetHeight - innerHeight)); }
  }
  if (previous?.progress > 2 && !previous.completed) {
    const banner = document.createElement('div'); banner.className = 'reading-resume';
    banner.innerHTML = `<span>ครั้งก่อนอ่านถึง ${previous.progress}%</span><button>อ่านต่อจากเดิม →</button>`;
    bar.after(banner); banner.querySelector('button').onclick = resume;
    if (new URLSearchParams(location.search).get('resume') === '1' && !location.hash) resume();
  }
  setTimeout(() => { paused = false; }, 700);
  window.addEventListener('scroll', () => { clearTimeout(timer); timer = setTimeout(progress, 500); }, { passive: true });
  document.addEventListener('visibilitychange', () => { if (document.hidden) progress(); }); window.addEventListener('pagehide', progress);
  window.addEventListener('reading-change', paint); window.addEventListener('storage', event => { if (event.key?.startsWith(PREFIX)) paint(); }); paint();
}

initArticle(); initLibrary(); initHome(); initCards();
