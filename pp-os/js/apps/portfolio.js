import { load, save } from "../core/storage.js";
import { SITE } from "../core/app-shell.js";
import { countUp, flush, num, stagger } from "../core/ui.js";

// Portfolio — พอร์ตส่วนตัว (ROADMAP 4.1)
// กติกาสองข้อที่คุมดีไซน์ทั้งไฟล์:
//   1. โค้ดอยู่บน repo สาธารณะ ข้อมูลไม่ใช่ → ในไฟล์นี้มีแค่ catalog (ชื่อ/กลุ่ม/บทความ)
//      ตัวเลขพอร์ตทุกตัวมาจากที่ PP กรอกเอง เก็บใน storage ของเครื่อง (sync ผ่าน secret gist เท่านั้น)
//   2. ราคาไม่เดาเอง — ไม่มี API ไม่มี estimate; PP กรอกราคา แล้วแอปเตือนเมื่อราคาเก่ากว่า 1 trading day
//      (กติกาเดียวกับ pipeline วิเคราะห์: MoS ที่คำนวณบนราคาค้าง = ผิดแบบเงียบๆ)

const KEY = "pf.holdings";

// หุ้นที่เว็บ Moatrices ผ่าแล้ว — กรอก ticker แล้วได้ชื่อ/กลุ่ม/ลิงก์บทความอัตโนมัติ
// [ชื่อเต็ม, คำอธิบายสั้น, กลุ่ม, มีโลโก้ทรงสี่เหลี่ยมไหม (wordmark ใช้ตัวย่อแทน)]
// ทุกตัวมี deep-dive-<ticker>.html บนเว็บ — SpaceX ไม่อยู่ในนี้เพราะยังไม่ IPO ถือไม่ได้
const CATALOG = {
  SNPS: ["Synopsys", "EDA", "semi", 1],
  TSM: ["TSMC", "Foundry", "semi", 1],
  NVDA: ["NVIDIA", "GPU", "semi", 1],
  ASML: ["ASML Holding", "EUV / litho", "semi", 0],
  MU: ["Micron Technology", "Memory", "semi", 0],
  MRVL: ["Marvell Technology", "Custom chip", "semi", 1],
  COHR: ["Coherent", "Optical", "semi", 1],
  AVGO: ["Broadcom", "AI chip", "semi", 0],
  MSFT: ["Microsoft", "Cloud", "software", 1],
  GOOGL: ["Alphabet", "Ads", "software", 1],
  NFLX: ["Netflix", "Streaming", "software", 1],
  LLY: ["Eli Lilly", "Pharma", "health", 1],
  UNH: ["UnitedHealth Group", "Insurance", "health", 1],
  AXP: ["American Express", "Payments", "finance", 1],
  SPGI: ["S&P Global", "Ratings", "finance", 1],
  AAPL: ["Apple", "Devices + services", "consumer", 1],
  COST: ["Costco Wholesale", "Retail", "consumer", 1],
  MELI: ["MercadoLibre", "E-commerce", "consumer", 1],
  LMT: ["Lockheed Martin", "Defense", "space", 0],
};

// สีในโดนัท = กลุ่มธุรกิจ ไม่ใช่สีสุ่มรายตัว — ตาจึงเห็น "ก้อน" ที่ขยับพร้อมกันได้ทันที
// (semi 45% ต้องดูเป็นบล็อกเดียว ไม่ใช่ 3 สีที่บังเอิญอยู่ติดกัน)
const SECTORS = {
  semi: { label: "Semis & AI", h: 214, s: 92 },
  software: { label: "Software", h: 264, s: 74 },
  finance: { label: "Finance", h: 172, s: 58 },
  health: { label: "Health", h: 332, s: 72 },
  consumer: { label: "Consumer", h: 36, s: 84 },
  space: { label: "Space & defense", h: 198, s: 28 },
  other: { label: "Other", h: 220, s: 8 },
};

// ตัวเดียวกัน กลุ่มเดียวกัน = เฉดเดียวกัน ตัวใหญ่สว่างสุด ไล่มืดลงตามน้ำหนัก
const shade = (sec, rank) => {
  const s = SECTORS[sec] ?? SECTORS.other;
  return `hsl(${s.h} ${s.s}% ${Math.max(34, 68 - rank * 9)}%)`;
};

const usd = (n) => `$${num(Math.round(n))}`;
const usd2 = (n) => `$${num(n, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const pct = (n, d = 1) => `${n.toFixed(d)}%`;
const signed = (n, f) => `${n >= 0 ? "+" : "−"}${f(Math.abs(n))}`;

const meta = (tk) => CATALOG[tk] ?? null;
const val = (h) => (h.shares ?? 0) * (h.price ?? 0);
const basis = (h) => (h.shares ?? 0) * (h.cost ?? 0);
const article = (tk) => (CATALOG[tk] ? `${SITE}deep-dive-${tk.toLowerCase()}.html` : null);

const dayKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// วันซื้อขายล่าสุด = วันนี้ ถ้าไม่ใช่เสาร์/อาทิตย์ (ไม่นับวันหยุดตลาด — ใกล้พอสำหรับการเตือน)
function lastTradingDay() {
  const d = new Date();
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() - 1);
  return dayKey(d);
}

const isStale = (h) => !h.priceAt || dayKey(new Date(h.priceAt)) < lastTradingDay();

function priceAge(hs) {
  if (!hs.length) return null;
  const stamped = hs.filter((h) => h.priceAt);
  if (!stamped.length) return { stale: true, text: "no price entered yet" };
  const oldest = Math.min(...stamped.map((h) => h.priceAt));
  const days = Math.floor((Date.now() - oldest) / 86400000);
  return {
    stale: hs.some(isStale),
    text: days <= 0 ? "you updated these today" : days === 1 ? "last updated yesterday" : `oldest price is ${days} days old`,
  };
}

const ICO = {
  plus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>`,
  book: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H19v15H6.5A2.5 2.5 0 0 0 4 20.5Z"/><path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H19v3H6.5"/><path d="M8.5 7.5h6M8.5 11h4"/></svg>`,
};

// โลโก้จากเว็บ (origin เดียวกัน) — ตัวที่โลโก้เป็น wordmark ยาวๆ ใส่ในไทล์สี่เหลี่ยมแล้วอ่านไม่ออก
// เลยใช้ตัวย่อบนพื้นสีประจำกลุ่มแทน; ถ้ารูปโหลดไม่ขึ้น (ออฟไลน์) ก็ตกมาที่ตัวย่อเหมือนกัน
function logoHTML(tk, sec, rank) {
  const m = meta(tk);
  const mono = `<span class="pf-mono" style="--c:${shade(sec, rank)}">${tk.slice(0, 2)}</span>`;
  if (!m?.[3]) return `<span class="pf-logo">${mono}</span>`;
  const file = tk === "AAPL" ? "AAPL.svg" : `${tk}.png`;
  return `<span class="pf-logo"><img src="${SITE}logos/${file}" alt="" loading="lazy"
    onerror="this.replaceWith(this.nextElementSibling)">${mono}</span>`;
}

// ---- โดนัท ----
const R = 78;
const SW = 23;
const CIRC = 2 * Math.PI * R;
const GAP = 3.4; // ช่องว่างระหว่างชิ้น (หน่วยความยาวเส้นรอบวง)

function donutHTML(rows) {
  let off = 0;
  const arcs = rows
    .map((r, i) => {
      const len = Math.max(1.5, r.frac * CIRC - GAP);
      const c = `<circle class="pf-arc" data-tk="${r.tk}" cx="110" cy="110" r="${R}" fill="none"
        stroke="${r.color}" stroke-width="${SW}" stroke-dasharray="${len.toFixed(2)} ${CIRC.toFixed(2)}"
        stroke-dashoffset="${(-off).toFixed(2)}" style="--len:${len.toFixed(2)};--c:${CIRC.toFixed(2)};--i:${i}"/>`;
      off += r.frac * CIRC;
      return c;
    })
    .join("");
  return `<svg class="pf-ring" viewBox="0 0 220 220" role="img" aria-label="Allocation by holding">
    <circle class="pf-track" cx="110" cy="110" r="${R}" fill="none" stroke-width="${SW}"/>
    <g transform="rotate(-90 110 110)">${arcs}</g>
  </svg>`;
}

export default {
  id: "portfolio",
  name: "Portfolio",
  icon: "🥧",
  defaultSize: { w: 430, h: 780 },
  mount(body) {
    body.classList.add("app-pane", "app-pf");
    let firstPaint = true;
    let selected = null; // ticker ที่แตะค้างไว้ในโดนัท

    const read = () => load(KEY, []);
    const write = (hs) => save(KEY, hs);

    const render = () => {
      const holdings = read();
      const total = holdings.reduce((s, h) => s + val(h), 0);
      const cost = holdings.reduce((s, h) => s + basis(h), 0);

      // เรียงตามมูลค่า แล้วให้สีตามกลุ่ม (rank ในกลุ่ม = ความเข้ม)
      const sorted = [...holdings].sort((a, b) => val(b) - val(a));
      const seen = {};
      const rows = sorted.map((h) => {
        const sec = h.sec ?? meta(h.tk)?.[2] ?? "other";
        const rank = (seen[sec] = (seen[sec] ?? -1) + 1);
        return { h, tk: h.tk, sec, rank, v: val(h), frac: total > 0 ? val(h) / total : 0, color: shade(sec, rank) };
      });

      if (!holdings.length) {
        renderEmpty();
        return;
      }

      const gain = total - cost;
      const gainPct = cost > 0 ? (gain / cost) * 100 : 0;
      const age = priceAge(holdings);
      const top3 = rows.slice(0, 3).reduce((s, r) => s + r.frac, 0) * 100;

      // รวมตามกลุ่ม — การ์ด Concentration ทั้งใบสร้างจากตรงนี้
      const bySec = {};
      for (const r of rows) {
        const b = (bySec[r.sec] ??= { sec: r.sec, v: 0, tks: [] });
        b.v += r.v;
        b.tks.push(r.tk);
      }
      const secs = Object.values(bySec)
        .map((b) => ({ ...b, frac: total > 0 ? b.v / total : 0 }))
        .sort((a, b) => b.v - a.v);

      body.innerHTML = `
        <header class="page-head pf-head">
          <div>
            <div class="eyebrow">Portfolio</div>
            <div class="pf-total"></div>
            <div class="pf-delta ${gain >= 0 ? "up" : "down"}">
              <span class="pf-arrow">${gain >= 0 ? "▲" : "▼"}</span>
              ${signed(gain, usd)} · ${signed(gainPct, (n) => pct(n))} all time
            </div>
          </div>
          <div class="head-actions">
            <button class="icon-btn pf-add" aria-label="Add a holding" title="Add a holding">${ICO.plus}</button>
          </div>
        </header>

        <button class="pf-asof${age.stale ? " stale" : ""}">
          <span class="pf-dot"></span>
          <span class="pf-asof-t"><b>${age.stale ? "Prices are stale" : "Prices are current"}</b>
            <small>Your numbers, not a feed — ${age.text}</small></span>
          <span class="pf-asof-go">Update</span>
        </button>

        <section class="card pf-chart-card">
          <div class="pf-chart">
            ${donutHTML(rows)}
            <div class="pf-mid"></div>
          </div>
        </section>

        <section class="card pf-conc">
          <div class="card-head">
            <span class="card-title">Concentration</span>
            <span class="card-meta">Top 3 · ${pct(top3, 0)}</span>
          </div>
          <div class="pf-stack">
            ${secs
              .map(
                (s) =>
                  `<span class="pf-stack-seg" style="--w:${(s.frac * 100).toFixed(2)}%;--c:${shade(s.sec, 0)}" title="${
                    SECTORS[s.sec]?.label ?? s.sec
                  }"></span>`
              )
              .join("")}
          </div>
          <div class="pf-legend">
            ${secs
              .map(
                (s) => `<div class="pf-leg">
                  <span class="pf-leg-dot" style="background:${shade(s.sec, 0)}"></span>
                  <span class="pf-leg-l"><b>${SECTORS[s.sec]?.label ?? s.sec}</b><small>${s.tks.join(" · ")}</small></span>
                  <span class="pf-leg-v">${pct(s.frac * 100, 0)}</span>
                </div>`
              )
              .join("")}
          </div>
          ${flags(rows, secs).map((f) => `<p class="pf-flag">${f}</p>`).join("")}
        </section>

        <section class="card pf-book">
          <div class="card-head">
            <span class="card-title">Holdings</span>
            <span class="card-meta">${holdings.length} · by weight</span>
          </div>
          <div class="list pf-list">
            ${rows.map((r) => rowHTML(r, rows[0].frac)).join("")}
          </div>
        </section>

        <p class="pf-foot">Held on this device only — never in the code, never on a server.</p>
      `;

      const totalEl = body.querySelector(".pf-total");
      if (firstPaint) countUp(totalEl, total, { fmt: usd, dur: 900 });
      else totalEl.textContent = usd(total);

      paintMid();

      body.querySelector(".pf-add").addEventListener("click", () => openHolding(null));
      body.querySelector(".pf-asof").addEventListener("click", openPrices);

      for (const arc of body.querySelectorAll(".pf-arc")) {
        arc.addEventListener("click", () => {
          selected = selected === arc.dataset.tk ? null : arc.dataset.tk;
          paintMid();
        });
      }
      for (const row of body.querySelectorAll(".pf-row")) {
        row.addEventListener("click", () => openHolding(read().find((h) => h.tk === row.dataset.tk)));
      }

      stagger(body);
      firstPaint = false;

      // ---- ตรงกลางโดนัท: ปกติสรุปทั้งพอร์ต แตะชิ้นไหนก็เล่าตัวนั้น ----
      function paintMid() {
        const mid = body.querySelector(".pf-mid");
        const ring = body.querySelector(".pf-ring");
        const r = rows.find((x) => x.tk === selected);
        ring.classList.toggle("dim", !!r);
        for (const a of body.querySelectorAll(".pf-arc")) a.classList.toggle("on", a.dataset.tk === selected);
        for (const el of body.querySelectorAll(".pf-row")) el.classList.toggle("on", el.dataset.tk === selected);

        if (!r) {
          mid.innerHTML = `<span class="pf-mid-k">Holdings</span>
            <span class="pf-mid-v">${holdings.length}</span>
            <span class="pf-mid-s">Top 3 · ${pct(top3, 0)}</span>`;
          return;
        }
        const g = r.v - basis(r.h);
        const gp = basis(r.h) > 0 ? (g / basis(r.h)) * 100 : 0;
        mid.innerHTML = `<span class="pf-mid-k">${r.tk}</span>
          <span class="pf-mid-v" style="color:${r.color}">${pct(r.frac * 100)}</span>
          <span class="pf-mid-s">${usd(r.v)} · <i class="${g >= 0 ? "up" : "down"}">${signed(gp, (n) => pct(n))}</i></span>`;
      }
    };

    // ---- แถวหุ้น: น้ำหนักอ่านได้สองทาง — ตัวเลข กับเส้นใต้แถวที่ยาวตามสัดส่วน ----
    function rowHTML(r, maxFrac) {
      const m = meta(r.tk);
      const g = r.v - basis(r.h);
      const gp = basis(r.h) > 0 ? (g / basis(r.h)) * 100 : 0;
      const sub = m ? `${m[0]} · ${m[1]}` : `${num(r.h.shares)} shares`;
      // จุดเหลืองเกาะอยู่กับชื่อหุ้น ไม่ใช่ลอยข้างตัวเลข — มันบอกว่า "ราคาของตัวนี้เก่า" ไม่ใช่ว่ากำไรผิด
      const dot = isStale(r.h) ? `<i class="pf-stale" title="Price is older than the last close">●</i>` : "";
      return `<button class="pf-row" data-tk="${r.tk}">
        ${logoHTML(r.tk, r.sec, r.rank)}
        <span class="pf-name"><b>${r.tk}${dot}</b><small>${sub}</small></span>
        <span class="pf-num"><b>${pct(r.frac * 100)}</b><small>${usd(r.v)}</small></span>
        <span class="pf-gl ${g >= 0 ? "up" : "down"}">${signed(gp, (n) => pct(n))}</span>
        <span class="pf-bar" style="--w:${maxFrac > 0 ? ((r.frac / maxFrac) * 100).toFixed(1) : 0}%;--c:${r.color}"></span>
      </button>`;
    }

    // ---- ข้อสังเกตที่พอร์ตกำลังบอก — เขียนเฉพาะตอนตัวเลขถึงเกณฑ์จริงๆ ไม่ใช่คำสอนลอยๆ ----
    function flags(rows, secs) {
      const out = [];
      const big = rows[0];
      if (big && big.frac >= 0.2) {
        out.push(`<b>${big.tk} is ${pct(big.frac * 100)}</b> — one kill condition on one name decides the whole book.`);
      }
      const top = secs[0];
      if (top && top.frac >= 0.35 && top.tks.length > 1) {
        out.push(
          `<b>${SECTORS[top.sec]?.label ?? top.sec} is ${pct(top.frac * 100)}</b> — ${top.tks.join(
            " + "
          )} turn on the same cycle. That's one bet, not ${top.tks.length}.`
        );
      }
      return out.slice(0, 2);
    }

    function renderEmpty() {
      body.innerHTML = `
        <header class="page-head">
          <div>
            <div class="eyebrow">Portfolio</div>
            <div class="page-title">Your book</div>
            <div class="page-sub">Concentrated by design — few names, understood deeply</div>
          </div>
        </header>
        <section class="card pf-blank">
          <svg class="pf-blank-art" viewBox="0 0 220 220" aria-hidden="true">
            <circle cx="110" cy="110" r="78" fill="none" stroke-width="23" />
            <circle class="pf-blank-hint" cx="110" cy="110" r="78" fill="none" stroke-width="23" />
          </svg>
          <b>Nothing here yet</b>
          <p>Holdings live on this device only — never in the code, never on a server.
             Prices are the ones you type in; the app never guesses one for you.</p>
          <button class="btn pf-add">Add your first holding</button>
          <div class="pf-quick-l">Or start from a name you've already pulled apart</div>
          <div class="chips pf-quick">
            ${["SNPS", "TSM", "GOOGL", "NVDA", "MSFT", "AXP"]
              .map((tk) => `<button class="chip pf-qtk" data-tk="${tk}">${tk}</button>`)
              .join("")}
          </div>
        </section>
      `;
      body.querySelector(".pf-add").addEventListener("click", () => openHolding(null));
      for (const b of body.querySelectorAll(".pf-qtk")) {
        b.addEventListener("click", () => openHolding(null, b.dataset.tk));
      }
      stagger(body);
    }

    // ---- ชีตกลาง ----
    function sheet(inner, { onClose } = {}) {
      const host = document.createElement("div");
      host.className = "pf-sheet";
      host.innerHTML = `<div class="sheet"><div class="sheet-card">${inner}</div></div>`;
      body.append(host);
      const close = () => {
        host.remove();
        removeEventListener("keydown", onKey);
        onClose?.();
      };
      const onKey = (e) => e.key === "Escape" && close();
      addEventListener("keydown", onKey);
      host.querySelector(".sheet").addEventListener("click", (e) => e.target.classList.contains("sheet") && close());
      host.querySelector(".sheet-x")?.addEventListener("click", close);
      return { host, close };
    }

    // ---- เพิ่ม / แก้ / ลบ หุ้นหนึ่งตัว ----
    function openHolding(existing, presetTk = "") {
      const h = existing ?? null;
      const tk0 = h?.tk ?? presetTk;
      const m0 = meta(tk0);

      const stat = () => {
        if (!h) return "";
        const all = read();
        const total = all.reduce((s, x) => s + val(x), 0);
        const g = val(h) - basis(h);
        const gp = basis(h) > 0 ? (g / basis(h)) * 100 : 0;
        return `<div class="pf-stat">
          <div><b>${total > 0 ? pct((val(h) / total) * 100) : "—"}</b><small>weight</small></div>
          <div><b>${usd(val(h))}</b><small>value</small></div>
          <div><b class="${g >= 0 ? "up" : "down"}">${signed(gp, (n) => pct(n))}</b><small>${signed(g, usd)}</small></div>
        </div>`;
      };

      const art = tk0 ? article(tk0) : null;
      const { host, close } = sheet(`
        <div class="sheet-h">
          <span>${h ? `${h.tk} · ${meta(h.tk)?.[0] ?? "Holding"}` : "Add a holding"}</span>
          <button class="sheet-x" aria-label="Close">✕</button>
        </div>
        ${stat()}
        <form class="qa-form pf-form">
          <label class="pf-f">
            <span>Ticker</span>
            <input name="tk" list="pf-tks" value="${tk0}" placeholder="SNPS" autocomplete="off"
              spellcheck="false" ${h ? "readonly" : ""} required>
          </label>
          <datalist id="pf-tks">${Object.keys(CATALOG).map((t) => `<option value="${t}">`).join("")}</datalist>
          <div class="pf-known">${m0 ? `${m0[0]} · ${SECTORS[m0[2]].label}` : ""}</div>
          <label class="pf-f pf-f-sec${m0 ? " hidden" : ""}">
            <span>Sector</span>
            <select name="sec">
              ${Object.entries(SECTORS)
                .map(([k, s]) => `<option value="${k}"${(h?.sec ?? "other") === k ? " selected" : ""}>${s.label}</option>`)
                .join("")}
            </select>
          </label>
          <div class="pf-f2">
            <label class="pf-f"><span>Shares</span>
              <input name="shares" type="number" inputmode="decimal" step="any" min="0" value="${h?.shares ?? ""}" placeholder="0" required></label>
            <label class="pf-f"><span>Avg cost / share</span>
              <input name="cost" type="number" inputmode="decimal" step="any" min="0" value="${h?.cost ?? ""}" placeholder="0.00" required></label>
          </div>
          <label class="pf-f"><span>Price now — the one you looked up</span>
            <input name="price" type="number" inputmode="decimal" step="any" min="0" value="${h?.price ?? ""}" placeholder="0.00" required></label>
          <button class="qa-submit" type="submit">${h ? "Save changes" : "Add to portfolio"}</button>
        </form>
        ${art ? `<a class="pf-read" href="${art}" data-art="${tk0}">${ICO.book}<b>Read the deep-dive</b><span>›</span></a>` : ""}
        ${h ? `<button class="pf-del">Remove from portfolio</button>` : ""}
      `);

      const form = host.querySelector("form");
      const known = host.querySelector(".pf-known");
      const secField = host.querySelector(".pf-f-sec");

      // พิมพ์ ticker ที่เว็บผ่าแล้ว → ชื่อกับกลุ่มมาเอง ไม่ต้องเลือก
      form.tk.addEventListener("input", () => {
        const tk = form.tk.value.trim().toUpperCase();
        const m = meta(tk);
        known.textContent = m ? `${m[0]} · ${SECTORS[m[2]].label}` : "";
        secField.classList.toggle("hidden", !!m);
      });

      host.querySelector("[data-art]")?.addEventListener("click", (e) => {
        e.preventDefault();
        const tk = e.currentTarget.dataset.art;
        close();
        document.dispatchEvent(
          new CustomEvent("pp-open-web", { detail: { url: article(tk), title: `${tk} · deep-dive` } })
        );
      });

      // ลบ = สองจังหวะ ไม่มี dialog ให้กดพลาด
      const del = host.querySelector(".pf-del");
      let armed = false;
      del?.addEventListener("click", () => {
        if (!armed) {
          armed = true;
          del.classList.add("armed");
          del.textContent = `Tap again to remove ${h.tk}`;
          return;
        }
        write(read().filter((x) => x.id !== h.id));
        close();
        render();
      });

      form.addEventListener("submit", (e) => {
        e.preventDefault();
        const tk = form.tk.value.trim().toUpperCase();
        const shares = parseFloat(form.shares.value);
        const cost = parseFloat(form.cost.value);
        const price = parseFloat(form.price.value);
        if (!tk || ![shares, cost, price].every((n) => Number.isFinite(n) && n >= 0)) return;

        const all = read();
        const sec = meta(tk)?.[2] ?? form.sec.value;
        if (h) {
          const hit = all.find((x) => x.id === h.id);
          Object.assign(hit, { shares, cost, sec, ...(price !== h.price ? { price, priceAt: Date.now() } : { price }) });
        } else {
          const dup = all.find((x) => x.tk === tk);
          if (dup) {
            Object.assign(dup, { shares, cost, price, priceAt: Date.now() });
          } else {
            all.push({ id: Date.now(), tk, sec, shares, cost, price, priceAt: Date.now() });
          }
        }
        write(all);
        close();
        selected = null;
        render();
      });

      if (!h) form.tk.focus();
    }

    // ---- อัปเดตราคาทั้งพอร์ตในชีตเดียว (ยาวสุด 20 ตัว พิมพ์รวดเดียวจบ) ----
    function openPrices() {
      const all = read();
      if (!all.length) return;
      const sorted = [...all].sort((a, b) => val(b) - val(a));

      const { host, close } = sheet(`
        <div class="sheet-h"><span>Update prices</span><button class="sheet-x" aria-label="Close">✕</button></div>
        <p class="sheet-p">Prices come from you — the app has no feed and never estimates.
          Type the last close you looked up; anything you leave alone keeps its old stamp.</p>
        <form class="pf-prices">
          ${sorted
            .map((h) => {
              const sec = h.sec ?? meta(h.tk)?.[2] ?? "other";
              return `<label class="pf-price-row${isStale(h) ? " stale" : ""}">
                ${logoHTML(h.tk, sec, 0)}
                <span class="pf-price-t"><b>${h.tk}</b><small>${
                  h.priceAt ? `was ${usd2(h.price)}` : "no price yet"
                }</small></span>
                <input name="p_${h.id}" type="number" inputmode="decimal" step="any" min="0"
                  value="${h.price ?? ""}" aria-label="${h.tk} price">
              </label>`;
            })
            .join("")}
          <button class="qa-submit" type="submit">Save prices</button>
        </form>
      `);

      host.querySelector("form").addEventListener("submit", (e) => {
        e.preventDefault();
        const cur = read();
        for (const h of cur) {
          const input = e.target.elements[`p_${h.id}`];
          if (!input) continue;
          const v = parseFloat(input.value);
          if (!Number.isFinite(v) || v < 0) continue;
          if (v !== h.price || isStale(h)) {
            h.price = v;
            h.priceAt = Date.now();
          }
        }
        write(cur);
        close();
        render();
      });
    }

    flush(body);
    render();
  },
};
