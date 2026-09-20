import { notesFor, IMPACTS } from './reading-store.js';
export const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
export const dayLabel = value => value ? new Date(value.length === 10 ? value + 'T12:00:00' : value).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
export function ensureReadingStyles() {
  if (!document.getElementById('reading-styles')) {
    const link = document.createElement('link');
    link.id = 'reading-styles'; link.rel = 'stylesheet'; link.href = new URL('./reading.css', import.meta.url).href;
    document.head.append(link);
  }
}
export function evidenceHTML(ticker) {
  ensureReadingStyles();
  let notes;
  try { notes = notesFor(ticker); } catch { return '<p class="reading-error">เปิดบันทึกในเบราว์เซอร์นี้ไม่สำเร็จ</p>'; }
  return `<section class="reading-evidence" data-reading-company="${esc(ticker)}"><div class="reading-heading"><div><span class="reading-eyebrow">MY EVIDENCE</span><h2>หลักฐานที่ฉันบันทึก <small>${notes.length}</small></h2></div><a href="${new URL('./reading.html', import.meta.url).pathname}?company=${encodeURIComponent(ticker)}&view=notes">เปิดสมุดบันทึก ↗</a></div><p class="reading-muted">ข้อความจากบทความและความเห็นของคุณ · ใช้ประกอบการทบทวน thesis</p>${notes.length ? notes.slice(0, 3).map(note => `<article class="reading-note-preview"><span class="reading-tag">${IMPACTS[note.impact] || IMPACTS.question}</span><blockquote>${esc(note.quote)}</blockquote>${note.note ? `<p>${esc(note.note)}</p>` : ''}<a href="${esc(note.path)}?highlight=${encodeURIComponent(note.id)}${note.anchor ? '#' + esc(note.anchor) : ''}">อ่านบริบทต้นทาง ↗</a><small>บันทึก ${dayLabel(note.createdAt)}</small></article>`).join('') : '<p class="reading-empty">เลือกข้อความขณะอ่านบทความ แล้วบันทึกพร้อมรหัสหุ้นนี้ไว้ที่นี่</p>'}</section>`;
}
function refreshEvidence() {
  document.querySelectorAll('[data-reading-company]').forEach(element => {
    const host = document.createElement('div'); host.innerHTML = evidenceHTML(element.dataset.readingCompany);
    element.replaceWith(host.firstElementChild);
  });
}
if (typeof window !== 'undefined') {
  window.addEventListener('reading-change', refreshEvidence);
  window.addEventListener('storage', event => { if (event.key === null || event.key?.startsWith('moatrices.reading.')) refreshEvidence(); });
}
