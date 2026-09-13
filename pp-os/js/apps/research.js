import { load, save } from "../core/storage.js";
import { getResearch, researchIcon as icon } from "../core/research-store.js";
import { POWERS, escapeHTML as esc, dateLabel, metricDelta, needsReview } from "../core/research-model.js";

const WATCH_KEY = "research.watchlist";
const NOTES_KEY = "research.notes";
const views = [["monitor", "activity", "Overview"], ["earnings", "git-compare-arrows", "Earnings"], ["matrix", "table-2", "Moat Matrix"]];
const number = (n) => n.toLocaleString("en-US", { maximumFractionDigits: 3 });
const sourceURL = (c, section = "") => new URL(`../../../articles/${c.article}${section ? `#${section}` : ""}`, import.meta.url).href;
const libraryURL = new URL("../../../index.html", import.meta.url).href;
const brand = () => `<div class="rx-topbar"><a class="moa-brand" href="${libraryURL}"><span class="moa-brand-mark" aria-hidden="true"><i></i><i></i><i></i></span>Moatrices<span class="moa-brand-section">RESEARCH</span></a><a class="rx-library-link" href="${new URL('articles.html', libraryURL).href}">${icon('book-open')}<span>Library</span>${icon('arrow-up-right')}</a></div>`;
const logo = (c, cls = "") => `<span class="rx-logo ${cls}" style="--company:${c.color}"><b>${c.ticker.slice(0, 2)}</b><img src="./assets/brands/${c.ticker}.png" alt="" loading="eager"></span>`;
const amount = (m, v) => v === null ? '<span class="rx-missing">Not recorded</span>' : `${m.unit === "USD bn" ? "$" : m.unit === "NTD bn" ? "NT$" : ""}${number(v)}${m.unit === "percent" ? "%" : "B"}`;
function deltaHTML(m) {
  const d = metricDelta(m);
  if (!d || d.value === null) return '<span class="rx-missing">Not comparable</span>';
  return `<span class="rx-delta ${d.direction}">${d.value > 0 ? "+" : ""}${d.value.toFixed(1)}${d.unit === "pp" ? " pp" : "%"}</span>`;
}
const iconButton = (name, label, attributes = "") => `<button type="button" class="rx-icon-btn" aria-label="${label}" title="${label}" ${attributes}>${icon(name)}</button>`;
const badge = (c) => `<span class="rx-badge">${icon("clock-3")}${needsReview(c) ? "Review due" : "Snapshot only"}</span>`;

export default {
  id: "research", name: "Research", icon: icon("activity"), defaultSize: { w: 1060, h: 780 },
  mount(body, options = {}) {
    body.classList.add("app-pane", "app-research");
    const initialView = new URLSearchParams(location.search).get("view");
    let catalog = [], state = { view: views.some(([id]) => id === initialView) ? initialView : "monitor", scope: "all", query: "", ticker: options.ticker || null, detailTab: "thesis", earningsTicker: "NVDA", report: null, selected: [], scroll: 0 };
    const stored = load(WATCH_KEY, []);
    const following = new Set(Array.isArray(stored) ? stored.filter((v) => typeof v === "string") : []);
    const drafts = new Map();
    const scrollHost = () => body.closest("#shell-view") || body.closest(".win-body") || body;
    const syncRoute = () => {
      if (!body.closest('#shell-view')) return;
      const url = new URL(location.href);
      if (state.view === 'monitor') url.searchParams.delete('view');
      else url.searchParams.set('view', state.view);
      if (state.ticker) url.searchParams.set('company', state.ticker);
      else url.searchParams.delete('company');
      history.replaceState(history.state, '', url);
    };
    const company = (ticker) => catalog.find((c) => c.ticker === ticker);
    const followButton = (c, large = false) => `<button class="${large ? "rx-command" : "rx-follow"}${following.has(c.ticker) ? " is-following" : ""}" data-follow="${c.ticker}" aria-pressed="${following.has(c.ticker)}" aria-label="${following.has(c.ticker) ? "Unfollow" : "Follow"} ${c.ticker}">${icon(following.has(c.ticker) ? "check" : "bookmark")}<span>${following.has(c.ticker) ? "Following" : "Follow"}</span></button>`;
    const viewTabs = () => `<nav class="rx-tabs" aria-label="Research views" data-no-swipe>${views.map(([id, glyph, label]) => `<button data-view="${id}" aria-current="${state.view === id ? "page" : "false"}" class="${state.view === id ? "active" : ""}">${icon(glyph)}${label}</button>`).join("")}</nav>`;
    const statusLine = (c) => `<div class="rx-snapshot">${badge(c)}<span>Library snapshot · ${esc(c.period)}<br>Article updated ${dateLabel(c.snapshotDate)}</span></div>`;

    async function start(retry = false) {
      body.innerHTML = `<div class="rx-wrap">${brand()}<div class="rx-empty" role="status">Loading research snapshots...</div></div>`;
      try {
        const data = await getResearch({ retry });
        if (!body.isConnected) return;
        catalog = data.companies;
        state.selected = catalog.map((c) => c.ticker);
        if (state.ticker && !company(state.ticker)) state.ticker = null;
        if (!company(state.earningsTicker)) state.earningsTicker = catalog[0].ticker;
        render();
      } catch {
        if (body.isConnected) body.innerHTML = `<div class="rx-wrap">${brand()}<div class="rx-empty" role="alert"><h2>Research unavailable</h2><p>โหลด snapshot ไม่สำเร็จ ข้อมูลพอร์ตของคุณไม่ได้เปลี่ยนแปลง</p><button class="rx-command" data-retry>${icon("activity")}Try again</button></div></div>`;
      }
    }

    function render(focusTarget) {
      body.innerHTML = `<div class="rx-wrap">${brand()}${state.ticker ? detail(company(state.ticker)) : overview()}</div><div class="rx-live" aria-live="polite" role="status"></div>`;
      for (const img of body.querySelectorAll(".rx-logo img")) img.addEventListener("error", () => img.remove(), { once: true });
      if (focusTarget) body.querySelector(focusTarget)?.focus({ preventScroll: true });
    }

    function overview() {
      return `<header class="rx-head"><div><div class="rx-eyebrow">BUSINESS FIRST. EVIDENCE ALWAYS.</div><h1>Research Overview<span class="rx-title-dot">.</span></h1><p class="rx-intro">เข้าใจธุรกิจ ติดตามคูเมือง และทบทวนสิ่งที่เราเชื่อ</p></div><a class="rx-command rx-home-link" href="${libraryURL}" aria-label="Open Moatrices library">${icon("book-open")}เปิดคลังความรู้ ${icon("arrow-up-right")}</a></header>
        ${viewTabs()}${state.view === "monitor" ? monitor() : state.view === "matrix" ? matrix() : earnings(company(state.earningsTicker))}
        <footer class="rx-foot"><span><i class="rx-footer-dot"></i> MOATRICES · RESEARCH</span><span>Library snapshots · Not a live data feed<br>หลักฐานที่ยังไม่ประเมิน ไม่ได้แปลว่าไม่มี moat</span></footer>`;
    }

    function monitor() {
      const holdings = load("pf.holdings", []);
      const owned = new Set((Array.isArray(holdings) ? holdings : []).map((h) => h?.tk));
      const scope = catalog.filter((c) => state.scope === "all" || (state.scope === "following" ? following.has(c.ticker) : state.scope === "due" ? needsReview(c) : owned.has(c.ticker)));
      const filtered = scope.filter((c) => `${c.ticker} ${c.name} ${c.sector}`.toLowerCase().includes(state.query.toLowerCase().trim()));
      return `<section class="rx-summary" aria-label="Coverage summary"><div><span>In coverage</span><strong>${catalog.length}<small>companies</small></strong></div><div><button class="rx-summary-filter" data-scope="due" aria-pressed="${state.scope === 'due'}"><span>Review due ${icon('arrow-up-right')}</span><strong class="rx-amber">${catalog.filter((c) => needsReview(c)).length}<small>snapshots</small></strong></button></div><div><span>Following</span><strong>${catalog.filter((c) => following.has(c.ticker)).length}<small>on this device</small></strong></div></section>
        <div class="rx-section-head"><div><span class="rx-eyebrow">RESEARCH COVERAGE</span><h2>Your research desk</h2></div><span class="rx-meta">${filtered.length} of ${catalog.length} companies${state.scope === 'due' ? ' · Review due' : ''}</span></div>
        <div class="rx-toolbar"><div class="rx-segment" aria-label="Company filter" data-no-swipe>${[["all", "All coverage"], ["following", "Following"], ["holdings", "My holdings"]].map(([v, label]) => `<button data-scope="${v}" aria-pressed="${state.scope === v}">${label}</button>`).join("")}</div><label class="rx-search">${icon("search")}<input type="search" aria-label="Search companies" placeholder="Search companies" value="${esc(state.query)}" maxlength="100"></label></div>
        <div class="rx-grid">${filtered.map(card).join("")}</div>
        ${filtered.length ? "" : `<div class="rx-empty"><h3>${state.query ? "No companies found" : state.scope === "following" ? "No followed companies" : state.scope === "due" ? "No reviews due" : "No covered holdings"}</h3><p>${state.scope === "holdings" && !state.query ? "Research coverage: SNPS, TSM, NVDA. Your holdings remain private." : "SNPS · TSM · NVDA"}</p><button class="rx-command" data-reset>${icon("arrow-left")}All coverage</button></div>`}
        <div class="rx-desk-bottom"><div><span class="rx-eyebrow">A NOTE ON THE EVIDENCE</span><h3>วันที่ข้อมูล เป็นส่วนหนึ่งของคำตอบ</h3><p>ข้อมูลชุดนี้มาจากบทวิเคราะห์ในคลัง วันที่แสดงคือวันอัปเดตบทความ ส่วน Review due คือกำหนดทบทวนภายใน เปิดบริษัทเพื่ออ่านแหล่งที่มาและสิ่งที่ยังต้องตรวจสอบ</p></div><a class="rx-reading-link" href="${new URL('series-powers.html', libraryURL).href}">${icon('book-open')}<span><small>BUILD YOUR FRAMEWORK</small><b>อ่านคูเมืองทั้ง 7 แบบ</b><span>7 Powers · Hamilton Helmer</span></span>${icon('arrow-up-right')}</a></div>`;
    }

    function card(c) {
      const count = Object.values(c.powers).filter((p) => p.status === "evidenced").length;
      return `<article class="rx-card"><button class="rx-company" data-company="${c.ticker}" aria-label="Open ${c.ticker} research"><div class="rx-card-top">${logo(c)}<div class="rx-identity"><span class="rx-ticker">${c.ticker} <span>· ${esc(c.sector)}</span></span><h3>${esc(c.name)}</h3></div>${icon('arrow-up-right')}</div><h4>${esc(c.headline)}</h4><p lang="th">${esc(c.focus)}</p><div class="rx-power-count"><span class="rx-power-bars" aria-hidden="true">${POWERS.map(([id]) => `<i class="${c.powers[id]?.status || ''}"></i>`).join('')}</span><span>${count} / 7 powers evidenced</span></div></button><div class="rx-card-foot"><span class="rx-card-date">${badge(c)}<small>Article updated ${dateLabel(c.snapshotDate)}</small><small>${esc(c.period)}</small></span>${followButton(c)}</div></article>`;
    }

    function detail(c) {
      return `<header class="rx-detail-head">${iconButton("arrow-left", "Back to research", "data-back")}<div class="rx-detail-identity">${logo(c)}<div><span class="rx-meta">${c.ticker} / ${esc(c.sector)}</span><h1>${esc(c.name)}</h1></div></div>${followButton(c, true)}</header>
        ${statusLine(c)}<nav class="rx-tabs" aria-label="Company research views" data-no-swipe>${[["thesis", "activity", "Thesis"], ["earnings", "git-compare-arrows", "Earnings"], ["moat", "table-2", "Moat"]].map(([id, glyph, label]) => `<button data-detail-tab="${id}" class="${state.detailTab === id ? "active" : ""}" aria-current="${state.detailTab === id ? "page" : "false"}">${icon(glyph)}${label}</button>`).join("")}</nav>
        ${state.detailTab === "thesis" ? thesis(c) : state.detailTab === "earnings" ? earnings(c, true) : moat(c)}
        <footer class="rx-foot"><a href="${sourceURL(c)}" target="_blank" rel="noopener">Read ${c.ticker} deep dive ${icon("arrow-up-right")}</a><span>Article snapshot · ${dateLabel(c.snapshotDate)} · Not live</span></footer>`;
    }

    function thesis(c) {
      const storedNotes = load(NOTES_KEY, {});
      const note = drafts.get(c.ticker) ?? (storedNotes && typeof storedNotes[c.ticker] === "string" ? storedNotes[c.ticker] : "");
      return `<section class="rx-thesis"><div class="rx-eyebrow">INVESTMENT THESIS</div><p lang="th">${esc(c.thesis)}</p></section>
        <div class="rx-section-head"><h2>Conditions to review</h2><span class="rx-meta">${c.monitors.length} open checks</span></div>
        <div class="rx-checks">${c.monitors.map((m, i) => `<article class="rx-check"><div class="rx-check-number">${String(i + 1).padStart(2, "0")}</div><div><div class="rx-check-heading"><h3>${esc(m.title)}</h3><span class="rx-meta">Needs verification</span></div><p class="rx-observation">${esc(m.observation)}</p><dl><div><dt>THRESHOLD</dt><dd lang="th">${esc(m.condition)}</dd></div><div><dt>STILL NEEDED</dt><dd lang="th">${esc(m.gap)}</dd></div></dl><button class="rx-text-btn" data-evidence="monitor:${c.ticker}:${i}">${icon("book-open")}Source & context ${icon("arrow-up-right")}</button></div></article>`).join("")}</div>
        <form class="rx-note" data-note="${c.ticker}"><div class="rx-section-head"><label for="rx-note-${c.ticker}">My investment note</label><span class="rx-meta">This device only</span></div><textarea id="rx-note-${c.ticker}" name="note" maxlength="6000" rows="4" placeholder="${c.ticker} investment note">${esc(note)}</textarea><div class="rx-note-actions"><span class="rx-note-status" aria-live="polite"></span><button class="rx-command" type="submit">${icon("check")}Save note</button></div></form>`;
    }

    function earnings(c, inDetail = false) {
      const report = c.reports.find((r) => r.id === state.report) || c.reports[0];
      const changes = report.metrics.map(metricDelta);
      return `<div class="rx-section-head rx-earnings-title"><div><div class="rx-eyebrow">FINANCIAL SNAPSHOTS</div><h2>Earnings Diff</h2></div>${iconButton("download", "Download comparison CSV", `data-export="${c.ticker}:${report.id}"`)}</div>
        <div class="rx-report-controls">${inDetail ? "" : `<label><span>Company</span><select data-earnings-company aria-label="Earnings company">${catalog.map((x) => `<option value="${x.ticker}" ${c.ticker === x.ticker ? "selected" : ""}>${x.ticker} · ${esc(x.name)}</option>`).join("")}</select></label>`}<label><span>Comparison period</span><select data-report aria-label="Comparison period">${c.reports.map((r) => `<option value="${r.id}" ${r.id === report.id ? "selected" : ""}>${esc(r.from)} → ${esc(r.to)}</option>`).join("")}</select></label></div>
        <div class="rx-report-heading">${logo(c)}<div><h3>${esc(c.name)}</h3><span>${esc(report.from)} ${icon("arrow-up-right")} ${esc(report.to)}</span></div><span class="rx-report-stamp">Article snapshot<br>${dateLabel(c.snapshotDate)}</span></div>
        <div class="rx-change-summary"><span><i class="positive"></i>${changes.filter((d) => d?.direction === "positive").length} favorable</span><span><i class="negative"></i>${changes.filter((d) => d?.direction === "negative").length} adverse</span><span><i class="neutral"></i>${changes.filter((d) => !d || d.direction === "neutral").length} unclassified</span></div>
        <div class="rx-table-scroll" data-no-swipe tabindex="0" role="region" aria-label="Earnings comparison"><table class="rx-table rx-earnings-table"><thead><tr><th scope="col">Metric</th><th scope="col">${esc(report.from)}</th><th scope="col">${esc(report.to)}</th><th scope="col">Change</th><th scope="col"><span class="rx-sr">Evidence</span></th></tr></thead><tbody>${report.metrics.map((m, i) => `<tr><th scope="row">${esc(m.label)}<small>${esc(m.unit === "percent" ? "% / change in pp" : m.unit)}</small></th><td>${amount(m, m.previous)}</td><td class="rx-current">${amount(m, m.current)}</td><td>${deltaHTML(m)}</td><td>${iconButton("arrow-up-right", `Evidence: ${esc(m.label)}`, `data-evidence="metric:${c.ticker}:${report.id}:${i}"`)}</td></tr>`).join("")}</tbody></table></div>
        <p class="rx-data-note" lang="th">${esc(report.note)}</p>
        <div class="rx-section-head"><h3>What changed</h3><span class="rx-meta">${report.metrics.length} observations</span></div><div class="rx-observations">${report.metrics.map((m, i) => `<button data-evidence="metric:${c.ticker}:${report.id}:${i}"><span class="rx-observation-index">${String(i + 1).padStart(2, "0")}</span><span><b>${esc(m.label)}</b><span lang="th">${esc(m.note)}</span></span>${icon("arrow-up-right")}</button>`).join("")}</div>
        <p class="rx-data-note">Direction is relative to each metric, not a thesis verdict. Missing values are not zero.</p>`;
    }

    function matrix() {
      const selected = catalog.filter((c) => state.selected.includes(c.ticker));
      return `<div class="rx-section-head rx-earnings-title"><div><div class="rx-eyebrow">COMPETITIVE ADVANTAGE</div><h2>Moat Matrix</h2></div><span class="rx-meta">7 Powers</span></div>
        <div class="rx-matrix-select">${catalog.map((c) => `<label>${logo(c)}<span>${c.ticker}</span><input type="checkbox" data-compare="${c.ticker}" ${state.selected.includes(c.ticker) ? "checked" : ""} aria-label="Compare ${c.ticker}"></label>`).join("")}</div>
        <div class="rx-matrix-legend"><span><i class="evidenced"></i>Evidenced</span><span><i class="partial"></i>Partial</span><span><i></i>Not assessed</span></div>
        ${selected.length ? `<div class="rx-table-scroll" data-no-swipe tabindex="0" role="region" aria-label="Moat comparison"><table class="rx-table rx-matrix"><thead><tr><th scope="col">Power / evidence</th>${selected.map((c) => `<th scope="col"><button class="rx-matrix-company" data-company="${c.ticker}">${logo(c)}<span>${c.ticker}<small>${esc(c.name)}</small></span>${icon("arrow-up-right")}</button></th>`).join("")}</tr></thead><tbody>${POWERS.map(([id, label], i) => `<tr><th scope="row"><span class="rx-row-number">0${i + 1}</span>${label}</th>${selected.map((c) => { const p = c.powers[id]; return `<td><button class="rx-evidence-cell ${p?.status || "unassessed"}" data-evidence="power:${c.ticker}:${id}">${icon(p?.status === "evidenced" ? "check" : "search")}<span>${p?.status === "evidenced" ? "Evidenced" : p?.status === "partial" ? "Partial" : "Not assessed"}</span></button></td>`; }).join("")}</tr>`).join("")}<tr class="rx-matrix-dates"><th scope="row">Article snapshot</th>${selected.map((c) => `<td>${dateLabel(c.snapshotDate)}</td>`).join("")}</tr></tbody></table></div>` : '<div class="rx-empty"><h3>No companies selected</h3><button class="rx-command" data-select-all>Compare all companies</button></div>'}
        <p class="rx-data-note" lang="th">จัดหมวดหมู่จากหลักฐานในบทความ Moatrices ไม่ใช่คะแนน moat หรืออันดับหุ้น ช่องที่ยังไม่ประเมินไม่ได้แปลว่าไม่มี competitive advantage</p>`;
    }

    function moat(c) {
      return `<div class="rx-section-head rx-earnings-title"><h2>Moat evidence</h2><span class="rx-meta">7 Powers</span></div><div class="rx-moat-list">${POWERS.map(([id, label], i) => `<button data-evidence="power:${c.ticker}:${id}"><span class="rx-row-number">0${i + 1}</span><span><b>${label}</b><small>${c.powers[id] ? esc(c.powers[id].note) : "Not assessed in this snapshot"}</small></span><span class="rx-power-status ${c.powers[id]?.status || ""}">${c.powers[id] ? icon("check") : icon("search")}</span>${icon("arrow-up-right")}</button>`).join("")}</div>`;
    }

    function evidence(key, opener) {
      const [kind, ticker, id, index] = key.split(":");
      const c = company(ticker);
      if (!c) return;
      const item = kind === "monitor" ? c.monitors[Number(id)] : kind === "metric" ? c.reports.find((r) => r.id === id)?.metrics[Number(index)] : c.powers[id];
      const title = kind === "power" ? POWERS.find(([p]) => p === id)?.[1] : item?.title || item?.label;
      const dialog = document.createElement("dialog");
      dialog.className = "rx-dialog";
      dialog.setAttribute("aria-labelledby", "rx-evidence-title");
      dialog.innerHTML = `<header><span class="rx-eyebrow">${ticker} / EVIDENCE</span>${iconButton("x", "Close evidence", "data-close")}</header><h2 id="rx-evidence-title">${esc(title)}</h2><p class="rx-dialog-date">Article snapshot · ${dateLabel(c.snapshotDate)}</p><div class="rx-dialog-copy" lang="th">${item ? `<p>${esc(item.observation || item.note)}</p>${kind === "monitor" ? `<h3>Thesis condition</h3><p>${esc(item.condition)}</p><h3>Still needed</h3><p>${esc(item.gap)}</p>` : ""}` : "<p>ยังไม่ได้จัดหมวดหมู่หลักฐานสำหรับ power นี้ใน snapshot ไม่ควรตีความว่าไม่มี moat</p>"}</div><div class="rx-dialog-source"><span>Source</span><a href="${sourceURL(c, item?.source)}" target="_blank" rel="noopener">Moatrices · ${esc(c.name)} deep dive ${icon("arrow-up-right")}</a><small>บทความที่มีอยู่ในคลัง ไม่ใช่ transcript diff อัตโนมัติหรือการยืนยันข้อมูลล่าสุดจากบริษัท</small></div>`;
      body.append(dialog);
      dialog.addEventListener("close", () => { dialog.remove(); if (opener.isConnected) opener.focus({ preventScroll: true }); }, { once: true });
      dialog.querySelector("[data-close]").addEventListener("click", () => dialog.close());
      dialog.addEventListener("click", (e) => { if (e.target === dialog) { const r = dialog.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dialog.close(); } });
      dialog.showModal();
    }

    function exportCSV(key) {
      const [ticker, id] = key.split(":");
      const c = company(ticker), r = c.reports.find((report) => report.id === id);
      const rows = [["Ticker", "Metric", "Unit", "Previous period", "Previous value", "Current period", "Current value", "Change", "Change unit", "Snapshot date", "Source"], ...r.metrics.map((m) => {
        const d = metricDelta(m);
        return [ticker, m.label, m.unit, r.from, m.previous ?? "", r.to, m.current ?? "", d?.value ?? "", d?.unit ?? "", c.snapshotDate, sourceURL(c, m.source)];
      })];
      const csv = rows.map((row) => row.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(",")).join("\r\n");
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
      const a = document.createElement("a"); a.href = url; a.download = `moatrices-${ticker}-${id}.csv`; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    body.addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b || b.closest("dialog")) return;
      if (b.hasAttribute("data-retry")) { start(true); return; }
      if (b.dataset.follow) {
        const ticker = b.dataset.follow;
        following.has(ticker) ? following.delete(ticker) : following.add(ticker);
        save(WATCH_KEY, [...following]);
        const top = scrollHost().scrollTop;
        render(`[data-follow="${ticker}"]`); scrollHost().scrollTop = top;
        body.querySelector(".rx-live").textContent = `${ticker} ${following.has(ticker) ? "followed" : "unfollowed"}`;
      } else if (b.dataset.company) {
        state.scroll = scrollHost().scrollTop; state.ticker = b.dataset.company; state.detailTab = "thesis"; state.report = null;
        syncRoute();
        render("[data-back]"); scrollHost().scrollTop = 0;
      } else if (b.hasAttribute("data-back")) {
        const ticker = state.ticker; state.ticker = null; state.report = null; syncRoute(); render(`[data-company="${ticker}"]`); scrollHost().scrollTop = state.scroll;
      } else if (b.dataset.view) {
        state.view = b.dataset.view; state.report = null; syncRoute(); render(`[data-view="${state.view}"]`); scrollHost().scrollTop = 0;
      } else if (b.dataset.detailTab) {
        state.detailTab = b.dataset.detailTab; state.report = null; render(`[data-detail-tab="${state.detailTab}"]`);
      } else if (b.dataset.scope) {
        state.scope = b.dataset.scope; render(`[data-scope="${state.scope}"]`);
      } else if (b.hasAttribute("data-reset")) {
        state.scope = "all"; state.query = ""; render("[data-scope='all']");
      } else if (b.dataset.evidence) evidence(b.dataset.evidence, b);
      else if (b.dataset.export) exportCSV(b.dataset.export);
      else if (b.hasAttribute("data-select-all")) { state.selected = catalog.map((c) => c.ticker); render("[data-compare]"); }
    });
    body.addEventListener("input", (e) => {
      if (e.target.matches(".rx-search input")) {
        state.query = e.target.value;
        if (e.isComposing) return;
        const start = e.target.selectionStart, end = e.target.selectionEnd;
        render(".rx-search input");
        // Search inputs do not support setSelectionRange in every browser.
        if (start !== null && end !== null) body.querySelector(".rx-search input").setSelectionRange(start, end);
      } else if (e.target.matches(".rx-note textarea")) {
        drafts.set(state.ticker, e.target.value);
        body.querySelector(".rx-note-status").textContent = "Unsaved changes";
      }
    });
    body.addEventListener("compositionend", (e) => {
      if (e.target.matches(".rx-search input")) { state.query = e.target.value; render(".rx-search input"); }
    });
    body.addEventListener("change", (e) => {
      if (e.target.matches("[data-earnings-company]")) { state.earningsTicker = e.target.value; state.report = null; render("[data-earnings-company]"); }
      else if (e.target.matches("[data-report]")) { state.report = e.target.value; render("[data-report]"); }
      else if (e.target.matches("[data-compare]")) {
        const ticker = e.target.dataset.compare;
        state.selected = e.target.checked ? [...state.selected, ticker] : state.selected.filter((t) => t !== ticker);
        render(`[data-compare="${ticker}"]`);
      }
    });
    body.addEventListener("submit", (e) => {
      if (!e.target.matches("[data-note]")) return;
      e.preventDefault();
      const existing = load(NOTES_KEY, {});
      const notes = existing && typeof existing === "object" && !Array.isArray(existing) ? existing : {};
      save(NOTES_KEY, { ...notes, [e.target.dataset.note]: new FormData(e.target).get("note").trim() });
      body.querySelector(".rx-note-status").textContent = "Saved on this device";
    });
    body.addEventListener("research-company", (e) => {
      state.ticker = e.detail?.ticker || null;
      state.detailTab = "thesis"; state.report = null;
      if (catalog.length) {
        if (!company(state.ticker)) state.ticker = null;
        render(state.ticker ? "[data-back]" : "[data-view='monitor']");
        scrollHost().scrollTop = 0;
      }
    });
    start();
  },
};
