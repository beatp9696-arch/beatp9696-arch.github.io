// One record per key: saving progress in one tab cannot replace another article's notes.
export const PREFIX = 'moatrices.reading.v1.';
export const IMPACTS = { question: 'คำถามที่ต้องตรวจต่อ', supports: 'สนับสนุน thesis', challenges: 'ท้าทาย thesis' };
const clean = (value, max) => typeof value === 'string' ? value.trim().slice(0, max) : '';
export const tickerName = value => clean(value, 16).toUpperCase().replace(/^BRK[./]B$/, 'BRK-B');
export function articlePath(value) {
  const path = String(value || '').split(/[?#]/)[0];
  return /^\/(?:articles|books)\/[a-z0-9-]+\.html$/.test(path) ? path : '';
}
const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value || '') && !Number.isNaN(Date.parse(value)) && new Date(value + 'T12:00:00Z').toISOString().slice(0, 10) === value ? value : '';
function read(key) {
  const raw = localStorage.getItem(PREFIX + key);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}
function write(key, value) {
  localStorage.setItem(PREFIX + key, JSON.stringify(value));
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('reading-change'));
  return value;
}
export function getArticle(path) {
  const value = read('article.' + articlePath(path));
  return value?.kind === 'article' && value.path === articlePath(path) ? value : null;
}
export function saveArticle(path, patch = {}) {
  path = articlePath(path);
  if (!path) throw new Error('บทความไม่ถูกต้อง');
  const previous = getArticle(path) || { kind: 'article', path, saved: false, completed: false, progress: 0, anchor: '', position: 0 };
  const next = { ...previous, updatedAt: new Date().toISOString() };
  for (const key of ['title', 'ticker', 'sourceDate']) if (key in patch) next[key] = clean(patch[key], key === 'title' ? 500 : 30);
  for (const key of ['saved', 'completed']) if (typeof patch[key] === 'boolean') next[key] = patch[key];
  if (Number.isFinite(patch.progress)) next.progress = Math.max(0, Math.min(100, Math.round(patch.progress)));
  if (Number.isFinite(patch.position)) next.position = Math.max(0, Math.min(1, patch.position));
  if ('anchor' in patch) next.anchor = /^[\w-]{1,100}$/.test(patch.anchor) ? patch.anchor : '';
  if (patch.opened) next.lastReadAt = new Date().toISOString();
  return write('article.' + path, next);
}
export function saveNote(input) {
  const path = articlePath(input.path), quote = clean(input.quote, 4000);
  const ticker = tickerName(input.ticker);
  if (!path || !quote) throw new Error('เลือกข้อความจากบทความก่อนบันทึก');
  if (ticker && !/^[A-Z0-9][A-Z0-9.-]{0,15}$/.test(ticker)) throw new Error('รหัสหุ้นไม่ถูกต้อง');
  const id = input.id || crypto.randomUUID();
  if (!/^[\w-]{1,80}$/.test(id)) throw new Error('รหัสบันทึกไม่ถูกต้อง');
  const previous = read('note.' + id);
  return write('note.' + id, {
    kind: 'note', id, path, quote, ticker, title: clean(input.title, 500),
    note: clean(input.note, 4000), impact: Object.hasOwn(IMPACTS, input.impact) ? input.impact : 'question',
    prefix: clean(input.prefix, 60), suffix: clean(input.suffix, 60),
    anchor: /^[\w-]{1,100}$/.test(input.anchor) ? input.anchor : '',
    sourceDate: clean(input.sourceDate, 40), reviewOn: validDate(input.reviewOn),
    reviewedAt: input.reviewedAt === null ? null : previous?.reviewedAt || null,
    createdAt: previous?.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString(),
  });
}
export function reviewNote(id) {
  const record = read('note.' + id);
  if (record?.kind !== 'note') return;
  return write('note.' + id, { ...record, reviewedAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
}
export function deleteNote(id) {
  if (!/^[\w-]{1,80}$/.test(id)) return;
  localStorage.removeItem(PREFIX + 'note.' + id);
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('reading-change'));
}
export function records(kind) {
  const result = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith(PREFIX + kind + '.')) continue;
    const value = read(key.slice(PREFIX.length));
    if (value?.kind === kind && articlePath(value.path) && (kind !== 'note' || /^[\w-]{1,80}$/.test(value.id))) result.push(value);
  }
  return result.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
}
export function notesFor(ticker) { return records('note').filter(note => note.ticker === tickerName(ticker)); }
export function localDay(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
export function dueNote(note, today = localDay()) { return !!note.reviewOn && note.reviewOn <= today && !note.reviewedAt; }
