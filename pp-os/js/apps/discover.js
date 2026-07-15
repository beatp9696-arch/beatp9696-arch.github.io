// Discover — เบราว์บทวิเคราะห์หุ้นของ Moatrices ในสไตล์ Robinhood (screener + รายชื่อบริษัท)
// กดบริษัท/ซีรีส์แล้วเปิดอ่าน deep-dive ในแอปเลย (iframe เต็มจอ same-origin) ไม่เด้งออกเบราว์เซอร์

const svg = (p) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;

const IC = {
  search: svg('<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>'),
  chev: svg('<path d="m9 6 6 6-6 6"/>'),
  back: svg('<path d="m15 6-6 6 6 6"/>'),
  ext: svg('<path d="M14 4h6v6"/><path d="M20 4 11 13"/><path d="M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4"/>'),
  chip: svg('<rect x="7" y="7" width="10" height="10" rx="1.5"/><path d="M10 7V4M14 7V4M10 20v-3M14 20v-3M7 10H4M7 14H4M20 10h-3M20 14h-3"/>'),
  code: svg('<path d="m8 9-3 3 3 3M16 9l3 3-3 3M13 5l-2 14"/>'),
  health: svg('<path d="M12 3 5 6v5c0 4.5 3 7.6 7 9 4-1.4 7-4.5 7-9V6l-7-3Z"/><path d="M12 8.5v5M9.5 11h5"/>'),
  bank: svg('<path d="M4 10h16M5 10 12 5l7 5M6 10v7M10 10v7M14 10v7M18 10v7M4 20h16"/>'),
  bag: svg('<path d="M6 8h12l-1 12H7L6 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>'),
  rocket: svg('<path d="M12 3c3 1 5 4 5 8l-1.5 4h-7L7 11c0-4 2-7 5-8Z"/><circle cx="12" cy="9" r="1.5"/><path d="M9.5 15l-2 4M14.5 15l2 4"/>'),
  chart: svg('<path d="M4 18 9 12l4 4 7-8"/><path d="M20 6h-4M20 6v4"/>'),
};

// ที่อยู่เว็บ Moatrices — แอปเสิร์ฟที่ <root>/pp-os/ เว็บอยู่สูงขึ้นไปหนึ่งชั้น (same origin)
const SITE = location.pathname.includes("/pp-os/")
  ? location.pathname.replace(/pp-os\/.*$/, "")
  : "https://beatp9696-arch.github.io/";

const STOCKS = [
  { tk: "ASML", name: "ASML Holding", tag: "EUV / Litho", art: "articles/deep-dive-asml.html", g: "semi" },
  { tk: "SNPS", name: "Synopsys", tag: "EDA", art: "articles/deep-dive-snps.html", g: "semi" },
  { tk: "TSM", name: "TSMC", tag: "Foundry", art: "articles/deep-dive-tsm.html", g: "semi" },
  { tk: "NVDA", name: "NVIDIA", tag: "GPU", art: "articles/deep-dive-nvda.html", g: "semi" },
  { tk: "MU", name: "Micron Technology", tag: "Memory", art: "articles/deep-dive-mu.html", g: "semi" },
  { tk: "MRVL", name: "Marvell Technology", tag: "Custom chip", art: "articles/deep-dive-mrvl.html", g: "semi" },
  { tk: "COHR", name: "Coherent", tag: "Optical", art: "articles/deep-dive-cohr.html", g: "semi" },
  { tk: "AVGO", name: "Broadcom", tag: "AI chip", art: "articles/deep-dive-avgo.html", g: "semi" },
  { tk: "MSFT", name: "Microsoft", tag: "Cloud", art: "articles/deep-dive-msft.html", g: "software" },
  { tk: "GOOGL", name: "Alphabet", tag: "Ads", art: "articles/deep-dive-googl.html", g: "software" },
  { tk: "NFLX", name: "Netflix", tag: "Streaming", art: "articles/deep-dive-nflx.html", g: "software" },
  { tk: "LLY", name: "Eli Lilly", tag: "Pharma", art: "articles/deep-dive-lly.html", g: "health" },
  { tk: "UNH", name: "UnitedHealth Group", tag: "Insurance", art: "articles/deep-dive-unh.html", g: "health" },
  { tk: "AXP", name: "American Express", tag: "Payments", art: "articles/deep-dive-axp.html", g: "fin" },
  { tk: "SPGI", name: "S&P Global", tag: "Ratings", art: "articles/deep-dive-spgi.html", g: "fin" },
  { tk: "AAPL", name: "Apple", tag: "Devices + services", art: "articles/deep-dive-aapl.html", g: "consumer" },
  { tk: "COST", name: "Costco Wholesale", tag: "Retail", art: "articles/deep-dive-cost.html", g: "consumer" },
  { tk: "MELI", name: "MercadoLibre", tag: "E-commerce", art: "articles/deep-dive-meli.html", g: "consumer" },
  { tk: "SpaceX", name: "SpaceX — private", tag: "Launch", art: "articles/deep-dive-spacex.html", g: "defense" },
  { tk: "LMT", name: "Lockheed Martin", tag: "Defense", art: "articles/deep-dive-lmt.html", g: "defense" },
];

const COLLECTIONS = [
  { g: "semi", label: "Semiconductors & AI", c: "#3b82f6", icon: IC.chip },
  { g: "software", label: "Software & Internet", c: "#8b5cf6", icon: IC.code },
  { g: "consumer", label: "Consumer", c: "#f59e0b", icon: IC.bag },
  { g: "fin", label: "Financials", c: "#22c55e", icon: IC.bank },
  { g: "health", label: "Healthcare", c: "#14b8a6", icon: IC.health },
  { g: "defense", label: "Aerospace & Defense", c: "#ef4444", icon: IC.rocket },
];

const GROUP_C = Object.fromEntries(COLLECTIONS.map((c) => [c.g, c.c]));

const SERIES = [
  ["7 Powers", "series-powers.html"],
  ["Moat Break", "series-moat-break.html"],
  ["Reading financials", "series-financials.html"],
  ["Buffett Talks", "series-buffett-talks.html"],
  ["Munger Talks", "series-munger-talks.html"],
];

export default {
  id: "discover",
  name: "Discover",
  icon: IC.chart, // ใช้ในโหมด desktop/taskbar — เป็น SVG ไม่ใช่อิโมจิ
  defaultSize: { w: 440, h: 760 },
  mount(body) {
    body.classList.add("app-pane", "app-discover");
    let filter = null; // null = ทุกบริษัท, ไม่งั้นเป็น group key
    let q = "";

    body.innerHTML = `
      <div class="disc-search">
        <span class="ds-ico">${IC.search}</span>
        <input type="search" placeholder="Search companies…" autocomplete="off" aria-label="Search companies">
      </div>

      <div class="disc-sec-lbl">Collections</div>
      <div class="disc-collections">
        ${COLLECTIONS.map((col) => {
          const n = STOCKS.filter((s) => s.g === col.g).length;
          return `<button class="disc-col" data-g="${col.g}">
            <span class="dc-ico" style="color:${col.c};background:color-mix(in srgb, ${col.c} 16%, transparent)">${col.icon}</span>
            <span class="dc-txt"><b>${col.label}</b><small>${n} ${n === 1 ? "company" : "companies"} analyzed</small></span>
            <span class="dc-chev">${IC.chev}</span>
          </button>`;
        }).join("")}
      </div>

      <div class="disc-sec-lbl">Series</div>
      <div class="disc-pills">
        ${SERIES.map(([label, path]) => `<button class="disc-pill" data-path="${path}" data-title="${label}">${label}</button>`).join("")}
      </div>

      <div class="disc-sec-lbl companies-head">
        <span class="ch-title">All companies</span>
        <button class="ch-clear hidden">Clear filter</button>
      </div>
      <div class="disc-list"></div>

      <div class="disc-foot">${STOCKS.length} deep dives · tap to read in-app · from Moatrices</div>
    `;

    const listEl = body.querySelector(".disc-list");
    const headTitle = body.querySelector(".ch-title");
    const clearBtn = body.querySelector(".ch-clear");
    const searchInput = body.querySelector(".disc-search input");

    const monogram = (tk) => tk.replace(/[^A-Za-z]/g, "").slice(0, 4).toUpperCase();

    const renderList = () => {
      const ql = q.trim().toLowerCase();
      // พิมพ์ค้นหา = ค้นทุกบริษัท (ข้าม filter หมวด), ไม่พิมพ์ = กรองตามหมวดที่เลือก
      const rows = STOCKS.filter((s) => {
        if (ql) return `${s.tk} ${s.name} ${s.tag}`.toLowerCase().includes(ql);
        return !filter || s.g === filter;
      });

      const col = COLLECTIONS.find((c) => c.g === filter);
      headTitle.textContent = ql ? "Results" : col ? col.label : "All companies";
      clearBtn.classList.toggle("hidden", !filter && !ql);

      listEl.innerHTML = rows.length
        ? rows
            .map((s) => {
              const c = GROUP_C[s.g];
              return `<button class="disc-row" data-path="${s.art}" data-title="${s.name}">
                <span class="dr-mono" style="color:${c};background:color-mix(in srgb, ${c} 15%, transparent)">${monogram(s.tk)}</span>
                <span class="dr-meta"><b>${s.tk}</b><small>${s.name} · ${s.tag}</small></span>
                <span class="dr-chev">${IC.chev}</span>
              </button>`;
            })
            .join("")
        : `<div class="disc-empty">No companies match “${q}”.</div>`;
    };

    // ---- reader overlay: เปิดหน้าเว็บ Moatrices ในแอป ----
    const openReader = (path, title) => {
      const url = SITE + path;
      const ov = document.createElement("div");
      ov.className = "disc-reader";
      ov.innerHTML = `
        <header class="dr-bar">
          <button class="dr-close" aria-label="Back">${IC.back}</button>
          <span class="dr-title"></span>
          <a class="dr-ext" href="${url}" target="_blank" rel="noopener" aria-label="Open in browser">${IC.ext}</a>
        </header>
        <div class="dr-load">Loading ${title}…</div>
        <iframe class="dr-frame" src="${url}" title="${title}" referrerpolicy="no-referrer"></iframe>
      `;
      ov.querySelector(".dr-title").textContent = title;
      document.body.append(ov);
      requestAnimationFrame(() => ov.classList.add("open"));

      const close = () => {
        removeEventListener("keydown", onKey);
        ov.classList.remove("open");
        setTimeout(() => ov.remove(), 220);
      };
      const onKey = (e) => e.key === "Escape" && close();
      ov.querySelector(".dr-close").addEventListener("click", close);
      addEventListener("keydown", onKey);

      const frame = ov.querySelector(".dr-frame");
      frame.addEventListener("load", () => {
        ov.querySelector(".dr-load")?.remove();
        frame.classList.add("ready");
        try {
          const t = frame.contentDocument?.title;
          if (t) ov.querySelector(".dr-title").textContent = t.replace(/\s*[·|—-]\s*Moatrices.*$/i, "");
        } catch {
          /* ต่าง origin ตอน dev — ใช้ชื่อเดิม */
        }
      });
    };

    body.querySelector(".disc-collections").addEventListener("click", (e) => {
      const btn = e.target.closest(".disc-col");
      if (!btn) return;
      filter = filter === btn.dataset.g ? null : btn.dataset.g;
      body.querySelectorAll(".disc-col").forEach((b) => b.classList.toggle("on", b.dataset.g === filter));
      renderList();
      body.querySelector(".companies-head").scrollIntoView({ behavior: "smooth", block: "start" });
    });

    body.querySelector(".disc-pills").addEventListener("click", (e) => {
      const pill = e.target.closest(".disc-pill");
      if (pill) openReader(pill.dataset.path, pill.dataset.title);
    });

    listEl.addEventListener("click", (e) => {
      const row = e.target.closest(".disc-row");
      if (row) openReader(row.dataset.path, row.dataset.title);
    });

    clearBtn.addEventListener("click", () => {
      filter = null;
      q = "";
      searchInput.value = "";
      body.querySelectorAll(".disc-col").forEach((b) => b.classList.remove("on"));
      renderList();
    });

    searchInput.addEventListener("input", () => {
      q = searchInput.value;
      renderList();
    });

    renderList();
  },
};
