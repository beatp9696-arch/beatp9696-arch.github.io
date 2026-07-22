// ผ่าธุรกิจ — interactions เล็กๆ (ไม่มี dependency)
(function () {
  "use strict";

  // ---- skip to content (a11y): ลิงก์ซ่อน โผล่ตอนกด Tab ----
  var mainForSkip = document.querySelector("main");
  if (mainForSkip) {
    if (!mainForSkip.id) mainForSkip.id = "main-content";
    mainForSkip.setAttribute("tabindex", "-1");
    var skip = document.createElement("a");
    skip.className = "skip-link";
    skip.href = "#" + mainForSkip.id;
    skip.textContent = "ข้ามไปเนื้อหาหลัก";
    document.body.insertBefore(skip, document.body.firstChild);
  }

  // ---- ตั้งค่า optional (เปิดใช้เมื่อกรอกค่า) ----
  var GOATCOUNTER_CODE = "moatrices"; // สมัครฟรีที่ goatcounter.com แล้วใส่ code เช่น "moatrices" → นับผู้เข้าชม
  // Giscus เปิดใช้แล้ว (11 ก.ค. 2026): Discussions + giscus app ติดตั้งครบ
  var GISCUS = { repo: "beatp9696-arch/beatp9696-arch.github.io", repoId: "R_kgDOTG4Dqg",
                 category: "Announcements", categoryId: "DIC_kwDOTG4Dqs4DA9O5" };

  // ---- base path: หน้า root vs หน้าใน articles/ ----
  var IS_ARTICLE_DIR = location.pathname.indexOf("/articles/") !== -1;
  var BASE = IS_ARTICLE_DIR ? "../" : "";

  // ---- ข้อมูลบทความ (แหล่งเดียว — ใช้ทั้ง prev/next, related, search, sector filter) ----
  // เรียงเก่า → ใหม่ ตาม datePublished — บทความใหม่ต้อง "ต่อท้าย" array เสมอ ห้ามแทรกหัว
  // (prev/next, ป้ายใหม่สุดใน 404, ลำดับผลค้นหา ทั้งหมดพึ่งลำดับนี้ — build.py มี drift check)
  // sec: semi | software | health | finance | consumer | space | market | basics
  var ARTICLES = [
    { f: "financials-02-cash-flow-statement.html", t: "ตอนที่ 2: งบกระแสเงินสด", sec: "basics" },
    { f: "financials-03-balance-sheet.html", t: "ตอนที่ 3: งบดุล + เชื่อม 3 งบ", sec: "basics" },
    { f: "deep-dive-snps.html", t: "ผ่าธุรกิจ SNPS (Synopsys)", tk: "SNPS", sec: "semi" },
    { f: "deep-dive-axp.html", t: "ผ่าธุรกิจ AXP (American Express)", tk: "AXP", sec: "finance" },
    { f: "buffett-4-pillars.html", t: "4 เสาหลักความคิดของ Warren Buffett", sec: "basics" },
    { f: "deep-dive-cost.html", t: "ผ่าธุรกิจ COST (Costco)", tk: "COST", sec: "consumer" },
    { f: "deep-dive-meli.html", t: "ผ่าธุรกิจ MELI (MercadoLibre)", tk: "MELI", sec: "consumer" },
    { f: "deep-dive-nflx.html", t: "ผ่าธุรกิจ NFLX (Netflix)", tk: "NFLX", sec: "software" },
    { f: "deep-dive-tsm.html", t: "ผ่าธุรกิจ TSM (TSMC)", tk: "TSM", sec: "semi" },
    { f: "deep-dive-cohr.html", t: "ผ่าธุรกิจ COHR (Coherent)", tk: "COHR", sec: "semi" },
    { f: "deep-dive-nvda.html", t: "ผ่าธุรกิจ NVDA (NVIDIA)", tk: "NVDA", sec: "semi" },
    { f: "deep-dive-googl.html", t: "ผ่าธุรกิจ GOOGL (Alphabet)", tk: "GOOGL", sec: "software" },
    { f: "deep-dive-spacex.html", t: "ผ่าธุรกิจ SpaceX", tk: "SPACEX", sec: "space" },
    { f: "deep-dive-lly.html", t: "ผ่าธุรกิจ LLY (Eli Lilly)", tk: "LLY", sec: "health" },
    { f: "deep-dive-msft.html", t: "ผ่าธุรกิจ MSFT (Microsoft)", tk: "MSFT", sec: "software" },
    { f: "deep-dive-unh.html", t: "ผ่าธุรกิจ UNH (UnitedHealth)", tk: "UNH", sec: "health" },
    { f: "deep-dive-spgi.html", t: "ผ่าธุรกิจ SPGI (S&amp;P Global)", tk: "SPGI", sec: "finance" },
    { f: "deep-dive-mu.html", t: "ผ่าธุรกิจ MU (Micron)", tk: "MU", sec: "semi" },
    { f: "deep-dive-mrvl.html", t: "ผ่าธุรกิจ MRVL (Marvell)", tk: "MRVL", sec: "semi" },
    { f: "deep-dive-ai-bubble.html", t: "AI = ฟองสบู่ dot-com รอบใหม่?", sec: "market" },
    { f: "financials-00-mindset.html", t: "ตอนที่ 0: งบคือรอยเท้า ไม่ใช่คะแนนสอบ", sec: "basics" },
    { f: "financials-01-income-statement.html", t: "ตอนที่ 1: งบกำไรขาดทุน", sec: "basics" },
    { f: "deep-dive-avgo.html", t: "ผ่าธุรกิจ AVGO (Broadcom)", tk: "AVGO", sec: "semi" },
    { f: "deep-dive-lmt.html", t: "ผ่าธุรกิจ LMT (Lockheed Martin)", tk: "LMT", sec: "space" },
    { f: "deep-dive-aapl.html", t: "ผ่าธุรกิจ AAPL (Apple)", tk: "AAPL", sec: "consumer" },
    { f: "deep-dive-asml.html", t: "ผ่าธุรกิจ ASML", tk: "ASML", sec: "semi" },
    { f: "books-mind-habit-time.html", t: "3 เล่ม: สมอง นิสัย เวลา", sec: "basics" },
    { f: "poor-charlies-almanack.html", t: "Poor Charlie's Almanack", sec: "basics" },
    { f: "buffett-talks-01-superinvestors.html", t: "Buffett Talks 1: Superinvestors (1984)", sec: "basics" },
    { f: "buffett-talks-02-florida-mba-1998.html", t: "Buffett Talks 2: Florida MBA (1998)", sec: "basics" },
    { f: "buffett-talks-03-stock-market-1999.html", t: "Buffett Talks 3: Stock Market (1999)", sec: "basics" },
    { f: "buffett-talks-04-notre-dame-1991.html", t: "Buffett Talks 4: Notre Dame (1991)", sec: "basics" },
    { f: "buffett-talks-05-punch-card.html", t: "Buffett Talks 5: Punch Card", sec: "basics" },
    { f: "munger-talks-01-worldly-wisdom.html", t: "Munger Talks 1: Worldly Wisdom (1994)", sec: "basics" },
    { f: "munger-talks-02-practical-thought.html", t: "Munger Talks 2: Glotz Coca-Cola (1996)", sec: "basics" },
    { f: "munger-talks-03-misjudgment-1995.html", t: "Munger Talks 3: Misjudgment (1995)", sec: "basics" },
    { f: "munger-talks-04-guaranteed-misery.html", t: "Munger Talks 4: Guaranteed Misery (1986)", sec: "basics" },
    { f: "munger-talks-05-usc-law-2007.html", t: "Munger Talks 5: USC Law (2007)", sec: "basics" },
    { f: "deep-dive-ai-oil-shock.html", t: "AI Capex vs Oil Shock 1970s", sec: "market" },
    { f: "powers-01-scale-economies.html", t: "7 Powers 1: Scale Economies (Costco)", sec: "basics" },
    { f: "powers-02-network-economies.html", t: "7 Powers 2: Network Economies (MercadoLibre)", sec: "basics" },
    { f: "powers-03-counter-positioning.html", t: "7 Powers 3: Counter-Positioning (Netflix)", sec: "basics" },
    { f: "powers-04-switching-costs.html", t: "7 Powers 4: Switching Costs (Synopsys)", sec: "basics" },
    { f: "powers-05-branding.html", t: "7 Powers 5: Branding (Apple)", sec: "basics" },
    { f: "powers-06-cornered-resource.html", t: "7 Powers 6: Cornered Resource (ASML)", sec: "basics" },
    { f: "powers-07-process-power.html", t: "7 Powers 7: Process Power (TSMC)", sec: "basics" },
    { f: "moat-break-01-kodak.html", t: "คูเมืองแตก 1: Kodak", sec: "basics" },
    { f: "moat-break-02-nokia.html", t: "คูเมืองแตก 2: Nokia", sec: "basics" },
    { f: "moat-break-03-intel.html", t: "คูเมืองแตก 3: Intel", sec: "semi" },
    { f: "moat-break-04-ge.html", t: "คูเมืองแตก 4: GE", sec: "basics" },
    { f: "moat-break-05-boeing.html", t: "คูเมืองแตก 5: Boeing", sec: "basics" },
    { f: "interstellar-investing.html", t: "Interstellar × การลงทุน", sec: "basics" },
    { f: "buffett-deals-01-sees-candies.html", t: "ดีลที่สร้างบัฟเฟตต์ 1: See's Candies 1972", sec: "basics" },
    { f: "buffett-deals-02-washington-post.html", t: "ดีลที่สร้างบัฟเฟตต์ 2: Washington Post 1973", sec: "basics" },
    { f: "buffett-deals-03-geico.html", t: "ดีลที่สร้างบัฟเฟตต์ 3: GEICO 1976", sec: "basics" },
    { f: "buffett-deals-04-nebraska-furniture-mart.html", t: "ดีลที่สร้างบัฟเฟตต์ 4: Nebraska Furniture Mart 1983", sec: "basics" },
    { f: "buffett-deals-05-coca-cola.html", t: "ดีลที่สร้างบัฟเฟตต์ 5: Coca-Cola 1988", sec: "basics" },
    { f: "case-study-01-dominos.html", t: "เคสศึกษา 1: Domino's Pizza", sec: "other" }
  ];

  var progressBar = document.querySelector(".reading-progress");
  var btn = document.querySelector(".to-top");

  // rAF-throttle: scroll ยิงถี่กว่า frame — อัปเดตครั้งเดียวต่อเฟรมพอ
  var scrollTicking = false;
  function onScrollWork() {
    scrollTicking = false;
    if (progressBar) {
      var h = document.documentElement;
      var max = h.scrollHeight - h.clientHeight;
      var pct = max > 0 ? h.scrollTop / max : 0;
      // scaleX แทน width — งานอยู่ฝั่ง compositor ไม่ trigger layout
      progressBar.style.transform = "scaleX(" + pct + ")";
    }
    if (btn) {
      if (window.scrollY > 400) btn.classList.add("show");
      else btn.classList.remove("show");
    }
  }
  function onScroll() {
    if (scrollTicking) return;
    scrollTicking = true;
    requestAnimationFrame(onScrollWork);
  }

  document.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  if (btn) {
    btn.addEventListener("click", function () {
      var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    });
  }

  // ---- ปุ่มสลับโหมดสว่าง/มืด ----
  function effectiveTheme() {
    var attr = document.documentElement.getAttribute("data-theme");
    if (attr === "light" || attr === "dark") return attr;
    return (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) ? "dark" : "light";
  }
  window.effectiveTheme = effectiveTheme;

  var nav = document.querySelector(".site-nav");
  if (nav) {
    var b = document.createElement("button");
    b.className = "theme-toggle";
    b.id = "theme-toggle";
    b.setAttribute("aria-label", "สลับโหมดสว่าง/มืด");
    b.setAttribute("title", "สลับโหมดสว่าง/มืด");
    b.innerHTML =
      '<svg class="ic ic-moon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">' +
      '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" fill="currentColor"/></svg>' +
      '<svg class="ic ic-sun" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">' +
      '<circle cx="12" cy="12" r="4.5" fill="currentColor"/>' +
      '<g stroke="currentColor" stroke-width="2" stroke-linecap="round">' +
      '<line x1="12" y1="2.5" x2="12" y2="4.5"/><line x1="12" y1="19.5" x2="12" y2="21.5"/>' +
      '<line x1="2.5" y1="12" x2="4.5" y2="12"/><line x1="19.5" y1="12" x2="21.5" y2="12"/>' +
      '<line x1="5.2" y1="5.2" x2="6.6" y2="6.6"/><line x1="17.4" y1="17.4" x2="18.8" y2="18.8"/>' +
      '<line x1="5.2" y1="18.8" x2="6.6" y2="17.4"/><line x1="17.4" y1="6.6" x2="18.8" y2="5.2"/></g></svg>';
    nav.appendChild(b);

    function syncIcon() { b.setAttribute("data-mode", effectiveTheme()); }
    syncIcon();

    b.addEventListener("click", function () {
      var next = effectiveTheme() === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      try { localStorage.setItem("theme", next); } catch (e) {}
      syncIcon();
      if (window.renderTradingViewWidgets) window.renderTradingViewWidgets();
      var giFrame = document.querySelector("iframe.giscus-frame");
      if (giFrame && giFrame.contentWindow) {
        giFrame.contentWindow.postMessage({ giscus: { setConfig: { theme: next } } }, "https://giscus.app");
      }
    });
  }

  // ---- สารบัญอัตโนมัติ (fallback) ----
  // build.py ฝัง <nav class="toc"> ตอน build แล้ว (กัน CLS) — บล็อกนี้ทำงานเฉพาะหน้า
  // ที่ยังไม่มี TOC ฝังไว้ เพื่อไม่ให้สร้างซ้ำ
  var bylineEl = document.querySelector(".byline");
  var mainCol = document.querySelector("main .container");
  if (bylineEl && mainCol && !document.querySelector(".toc")) {
    var hs = mainCol.querySelectorAll("h2");
    if (hs.length >= 4) {
      var toc = document.createElement("nav");
      toc.className = "toc";
      var inner = '<div class="toc-title">ในบทความนี้</div><ol>';
      hs.forEach(function (h, i) {
        if (!h.id) h.id = "sec-" + (i + 1);
        inner += '<li><a href="#' + h.id + '">' + h.textContent + "</a></li>";
      });
      inner += "</ol>";
      toc.innerHTML = inner;
      bylineEl.insertAdjacentElement("afterend", toc);
    }
  }

  // เมนู "บทความ" + "หุ้น" เป็นลิงก์ static ใน header/footer ทุกหน้าแล้ว (10 ก.ค. 2026)
  // — เลิก inject ด้วย JS ที่นี่ เพราะจะซ้ำ 2 ชุด

  // ---- ไฮไลต์เมนูของหน้าปัจจุบัน ----
  var here = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".site-nav a").forEach(function (a) {
    if (a.getAttribute("href").split("/").pop() === here) a.classList.add("active");
  });

  // ---- tag แยกสีตามหมวด ----
  document.querySelectorAll(".post-list .tag").forEach(function (t) {
    if (t.textContent.indexOf("Deep-dive") !== -1) t.classList.add("tag-deepdive");
    if (t.textContent.indexOf("ซีรีส์") !== -1) t.classList.add("tag-financials");
  });

  // ---- header หดตอนเลื่อน ----
  var headerEl = document.querySelector(".site-header");
  if (headerEl) {
    var condense = function () {
      if (window.scrollY > 40) headerEl.classList.add("condensed");
      else headerEl.classList.remove("condensed");
    };
    document.addEventListener("scroll", condense, { passive: true });
    condense();
  }

  // ---- ห่อตารางด้วยกรอบเลื่อนแนวนอน (กันตารางกว้างดันหน้าล้นบนมือถือ) ----
  document.querySelectorAll("main table").forEach(function (t) {
    if (t.parentElement && t.parentElement.classList.contains("table-scroll")) return;
    var w = document.createElement("div");
    w.className = "table-scroll";
    t.parentNode.insertBefore(w, t);
    w.appendChild(t);
  });

  // ---- scroll-reveal ----
  if ("IntersectionObserver" in window) {
    var revealEls = document.querySelectorAll(".post-list li, main table, main blockquote, .author-card, .toc, .pf-chart");
    var io = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("is-visible"); obs.unobserve(e.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });
    revealEls.forEach(function (el) { el.classList.add("reveal"); io.observe(el); });
  }

  // ---- scroll-reveal การ์ด grid (featured/series/stock) ไล่จังหวะตามลำดับในแถว
  //      จบแล้วถอด .reveal ทิ้ง — ไม่งั้น transition 0.6s ของ .reveal ทับ hover 0.18s ของการ์ด ----
  if ("IntersectionObserver" in window) {
    var gridCards = document.querySelectorAll(".featured-card, .series-card, .stock-card");
    var gio = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target;
        el.classList.add("is-visible");
        obs.unobserve(el);
        window.setTimeout(function () {
          el.classList.remove("reveal", "is-visible");
          el.style.transitionDelay = "";
        }, 1000);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });
    gridCards.forEach(function (el) {
      var i = Array.prototype.indexOf.call(el.parentElement.children, el);
      el.style.transitionDelay = (Math.min(i, 5) * 60) + "ms";
      el.classList.add("reveal");
      gio.observe(el);
    });
  }

  // ---- scene player: ฉากเริ่มเล่นเมื่อเลื่อนมาถึง (เล่นครั้งเดียว จบแล้วค้างที่สถานะจบ) ----
  if ("IntersectionObserver" in window) {
    var scenePanels = document.querySelectorAll(".ph-panel");
    var sio = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("playing"); obs.unobserve(e.target); }
      });
    }, { threshold: 0.35 });
    scenePanels.forEach(function (p) { sio.observe(p); });
  }

  // ---- ป้าย "ใหม่" — บทความอายุ ≤ 7 วัน สูงสุด 3 อันแรก (ทุกหน้าที่มี list) ----
  var anyPostList = document.querySelector(".post-list");
  if (anyPostList) {
    var badged = 0;
    Array.prototype.slice.call(anyPostList.querySelectorAll("li")).forEach(function (li) {
      if (badged >= 3) return;
      var tEl = li.querySelector("time[datetime]");
      if (!tEl) return;
      var d = new Date(tEl.getAttribute("datetime") + "T00:00:00");
      if (Date.now() - d.getTime() <= 7 * 864e5) {
        var nb = document.createElement("span");
        nb.className = "new-badge";
        nb.textContent = "ใหม่";
        var row = li.querySelector(".article-meta-row");
        if (row) { row.insertBefore(nb, row.firstChild); badged++; }
      }
    });
  }

  // ---- hero stats + ปุ่มดูทั้งหมด (หน้าแรก) — นับจาก ARTICLES (SoT) ----
  // หน้าแรกโชว์แค่บทล่าสุด นับจาก DOM ไม่ได้แล้ว: deep-dive = มี ticker (tk)
  // "บทความ" นับซีรีส์ทั้งชุดเป็น 1 เรื่อง — prefix ต้อง sync กับ SERIES ใน build.py
  var SERIES_PREFIXES = ["financials-", "buffett-talks-", "munger-talks-", "powers-", "moat-break-", "buffett-deals-"];
  var nDeep = 0, nEp = 0, seriesSeen = {};
  ARTICLES.forEach(function (a) {
    if (a.tk) nDeep++;
    SERIES_PREFIXES.forEach(function (p) {
      if (a.f.indexOf(p) === 0) { nEp++; seriesSeen[p] = 1; }
    });
  });
  var nWorks = ARTICLES.length - nEp + Object.keys(seriesSeen).length;
  document.querySelectorAll(".hero-stat").forEach(function (st) {
    var label = st.querySelector(".hero-stat-label");
    var num = st.querySelector(".hero-stat-num");
    if (!label || !num) return;
    var lt = label.textContent.trim();
    if (lt === "บทความ") num.textContent = nWorks;
    else if (lt === "Deep-dive") num.textContent = nDeep;
  });
  document.querySelectorAll(".view-all-count").forEach(function (el) {
    el.textContent = nWorks;
  });

  // ---- เลข hero นับขึ้นตอนโหลด (ครั้งเดียว, เคารพ reduced-motion) ----
  var rm = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!rm) {
    Array.prototype.slice.call(document.querySelectorAll(".hero-stat-num")).forEach(function (el) {
      var target = parseInt(el.textContent, 10);
      if (!target || target < 2) return;
      var t0 = null, dur = 900;
      el.textContent = "0";
      var tick = function (ts) {
        if (!t0) t0 = ts;
        var p = Math.min(1, (ts - t0) / dur);
        el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }

  // ---- แท็บกรองบทความ (หมวด × กลุ่มธุรกิจ) — เฉพาะหน้าคลังบทความ ----
  var postList = document.querySelector(".post-list--all");
  if (postList) {
    var SEC_BY_FILE = {};
    ARTICLES.forEach(function (a) { SEC_BY_FILE[a.f] = a.sec || "other"; });

    var items = Array.prototype.slice.call(postList.querySelectorAll("li"));
    items.forEach(function (li) {
      var tagEl = li.querySelector(".tag");
      var txt = tagEl ? tagEl.textContent : "";
      var cat = "other";
      if (txt.indexOf("Deep-dive") !== -1) cat = "deepdive";
      else if (txt.indexOf("สุนทรพจน์") !== -1) cat = "talks";
      else if (txt.indexOf("ซีรีส์") !== -1 || txt.indexOf("งบ") !== -1) cat = "financials";
      else if (txt.indexOf("หนังสือ") !== -1) cat = "book";
      else if (txt.indexOf("บทวิเคราะห์") !== -1) cat = "analysis";
      li.setAttribute("data-cat", cat);
      var link = li.querySelector("a[href]");
      var fname = link ? link.getAttribute("href").split("/").pop() : "";
      li.setAttribute("data-sec", SEC_BY_FILE[fname] || "other");
    });

    var counts = { all: items.length, deepdive: 0, financials: 0, book: 0, analysis: 0, talks: 0 };
    var secCounts = {};
    items.forEach(function (li) {
      var cat = li.getAttribute("data-cat");
      if (counts.hasOwnProperty(cat)) counts[cat]++;
      var sec = li.getAttribute("data-sec");
      secCounts[sec] = (secCounts[sec] || 0) + 1;
    });

    var filters = [
      { key: "all", label: "ทั้งหมด" },
      { key: "deepdive", label: "Deep-dive" },
      { key: "analysis", label: "บทวิเคราะห์" },
      { key: "financials", label: "อ่านงบ" },
      { key: "book", label: "หนังสือ" },
      { key: "talks", label: "สุนทรพจน์" }
    ];
    var filterBar = document.createElement("div");
    filterBar.className = "filter-bar";
    filters.forEach(function (f, i) {
      if (f.key !== "all" && !counts[f.key]) return;
      var c = document.createElement("button");
      c.type = "button";
      c.className = "chip" + (i === 0 ? " active" : "");
      c.setAttribute("data-key", f.key);
      c.innerHTML = f.label + '<span class="chip-count">' + (counts[f.key] || 0) + '</span>';
      filterBar.appendChild(c);
    });
    postList.parentNode.insertBefore(filterBar, postList);

    var SECTORS = [
      { key: "all", label: "ทุกกลุ่ม" },
      { key: "semi", label: "เซมิ & AI" },
      { key: "software", label: "ซอฟต์แวร์ & อินเทอร์เน็ต" },
      { key: "health", label: "สุขภาพ" },
      { key: "finance", label: "การเงิน" },
      { key: "consumer", label: "ผู้บริโภค" }
    ];
    var sectorBar = document.createElement("div");
    sectorBar.className = "filter-bar filter-bar--sector";
    SECTORS.forEach(function (s, i) {
      if (s.key !== "all" && !secCounts[s.key]) return;
      var c = document.createElement("button");
      c.type = "button";
      c.className = "chip chip--sm" + (i === 0 ? " active" : "");
      c.setAttribute("data-key", s.key);
      c.innerHTML = s.label + (s.key === "all" ? "" : '<span class="chip-count">' + secCounts[s.key] + '</span>');
      sectorBar.appendChild(c);
    });
    postList.parentNode.insertBefore(sectorBar, postList);

    var activeCat = "all";
    var activeSec = "all";
    function applyFilters() {
      items.forEach(function (li) {
        var okCat = activeCat === "all" || li.getAttribute("data-cat") === activeCat;
        var okSec = activeSec === "all" || li.getAttribute("data-sec") === activeSec;
        var show = okCat && okSec;
        li.style.display = show ? "" : "none";
        if (show) li.classList.add("is-visible");
      });
    }
    filterBar.addEventListener("click", function (e) {
      var c = e.target.closest ? e.target.closest(".chip") : null;
      if (!c) return;
      activeCat = c.getAttribute("data-key");
      filterBar.querySelectorAll(".chip").forEach(function (x) { x.classList.toggle("active", x === c); });
      applyFilters();
    });
    sectorBar.addEventListener("click", function (e) {
      var c = e.target.closest ? e.target.closest(".chip") : null;
      if (!c) return;
      activeSec = c.getAttribute("data-key");
      sectorBar.querySelectorAll(".chip").forEach(function (x) { x.classList.toggle("active", x === c); });
      applyFilters();
    });

    // preset จาก hash เช่น articles.html#cat=talks หรือ #cat=deepdive&sec=semi
    function presetChip(bar, key) {
      var target = bar.querySelector('.chip[data-key="' + key + '"]');
      if (!target) return false;
      bar.querySelectorAll(".chip").forEach(function (x) { x.classList.toggle("active", x === target); });
      return true;
    }
    if (location.hash.length > 1) {
      location.hash.slice(1).split("&").forEach(function (kv) {
        var p = kv.split("=");
        if (p[0] === "cat" && presetChip(filterBar, p[1])) activeCat = p[1];
        else if (p[0] === "sec" && presetChip(sectorBar, p[1])) activeSec = p[1];
      });
      applyFilters();
    }
  }

  // ---- TOC scroll-spy ----
  var tocLinks = document.querySelectorAll(".toc a");
  if (tocLinks.length && "IntersectionObserver" in window) {
    var linkFor = {};
    tocLinks.forEach(function (a) { linkFor[a.getAttribute("href").slice(1)] = a; });
    var activeLink = null;
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          var a = linkFor[en.target.id];
          if (a && a !== activeLink) {
            if (activeLink) activeLink.classList.remove("active");
            a.classList.add("active");
            activeLink = a;
          }
        }
      });
    }, { rootMargin: "-84px 0px -68% 0px", threshold: 0 });
    Object.keys(linkFor).forEach(function (id) {
      var el = document.getElementById(id);
      if (el) spy.observe(el);
    });
  }

  // ---- Prev / Next ท้ายบทความ ----
  var file = location.pathname.split("/").pop();
  var idx = -1;
  ARTICLES.forEach(function (a, i) { if (a.f === file) idx = i; });
  if (idx !== -1) {
    var anchor = document.querySelector(".author-card") || document.querySelector(".back");
    if (anchor) {
      var prev = idx > 0 ? ARTICLES[idx - 1] : null;
      var next = idx < ARTICLES.length - 1 ? ARTICLES[idx + 1] : null;
      var html = "";
      if (prev) html += '<a class="article-nav-link prev" href="' + prev.f + '">' +
        '<span class="article-nav-label">← บทก่อนหน้า</span>' +
        '<span class="article-nav-title">' + prev.t + '</span></a>';
      if (next) html += '<a class="article-nav-link next" href="' + next.f + '">' +
        '<span class="article-nav-label">บทถัดไป →</span>' +
        '<span class="article-nav-title">' + next.t + '</span></a>';
      if (html) {
        var navEl = document.createElement("nav");
        navEl.className = "article-nav";
        navEl.setAttribute("aria-label", "บทความก่อนหน้า/ถัดไป");
        navEl.innerHTML = html;
        anchor.insertAdjacentElement("afterend", navEl);
      }
    }
  }

  // ---- Related: กลุ่มธุรกิจเดียวกันก่อน แล้วเติมบทอื่น (ใหม่สุดก่อน) ----
  // เฉพาะบทที่ build.py ยังไม่ได้ฝัง curated block (.related) ไว้ — ไม่งั้นซ้ำ 2 ชุด
  if (idx !== -1 && !document.querySelector(".related")) {
    var curArt = ARTICLES[idx];
    var pool = ARTICLES.slice().reverse().filter(function (a) { return a.f !== file; });
    var sameSec = pool.filter(function (a) { return curArt.sec && a.sec === curArt.sec; });
    var others = pool.filter(function (a) { return sameSec.indexOf(a) === -1; });
    var related = sameSec.concat(others).slice(0, 3);
    var relAnchor = document.querySelector(".article-nav") || document.querySelector(".author-card");
    if (related.length && relAnchor) {
      var relHtml = '<h3 class="related-title">บทความที่เกี่ยวข้อง</h3><div class="related-grid">';
      related.forEach(function (a) {
        relHtml += '<a class="related-card" href="' + a.f + '">' + a.t + '</a>';
      });
      relHtml += '</div>';
      var relEl = document.createElement("section");
      relEl.className = "related";
      relEl.setAttribute("aria-label", "บทความที่เกี่ยวข้อง");
      relEl.innerHTML = relHtml;
      relAnchor.insertAdjacentElement("afterend", relEl);
    }
  }

  // ---- Heading anchor links (บทความ): hover หัวข้อ → # คัดลอกลิงก์ ----
  var artContainer = document.querySelector("main .container");
  if (artContainer && document.querySelector(".byline")) {
    artContainer.querySelectorAll("h2, h3").forEach(function (h, i) {
      if (h.classList.contains("related-title") || h.closest(".toc")) return;
      if (!h.id) h.id = "h-" + (i + 1);
      var a = document.createElement("a");
      a.className = "heading-anchor";
      a.href = "#" + h.id;
      a.setAttribute("aria-label", "คัดลอกลิงก์หัวข้อนี้");
      a.textContent = "#";
      a.addEventListener("click", function (e) {
        e.preventDefault();
        history.replaceState(null, "", "#" + h.id);
        var url = location.origin + location.pathname + "#" + h.id;
        if (navigator.clipboard) {
          navigator.clipboard.writeText(url);
          a.classList.add("copied");
          setTimeout(function () { a.classList.remove("copied"); }, 1400);
        }
      });
      h.appendChild(a);
    });
  }

  // ---- Share bar (บทความเท่านั้น) ----
  var articleH1 = document.querySelector("h1");
  var backEl = document.querySelector(".back");
  if (articleH1 && backEl && document.querySelector(".byline")) {
    var pageUrl = window.location.href;
    var pageTitle = articleH1.textContent.trim();
    var twitterUrl = "https://twitter.com/intent/tweet?text=" +
      encodeURIComponent(pageTitle + " — Moatrices") + "&url=" + encodeURIComponent(pageUrl);
    var lineUrl = "https://social-plugins.line.me/lineit/share?url=" + encodeURIComponent(pageUrl);

    var ICON_X = '<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.732-8.836L1.254 2.25H8.08l4.257 5.63L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z"/></svg>';
    var ICON_LINE = '<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/></svg>';
    var ICON_COPY = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
    var ICON_CHECK = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>';

    var shareEl = document.createElement("div");
    shareEl.className = "share-bar";
    shareEl.innerHTML =
      '<span class="share-label">แชร์บทความ</span>' +
      '<a class="share-btn share-x" href="' + twitterUrl + '" target="_blank" rel="noopener noreferrer">' + ICON_X + 'X (Twitter)</a>' +
      '<a class="share-btn share-line" href="' + lineUrl + '" target="_blank" rel="noopener noreferrer">' + ICON_LINE + 'LINE</a>' +
      '<button class="share-btn share-copy" id="share-copy-btn">' + ICON_COPY + 'คัดลอกลิงก์</button>';

    backEl.insertAdjacentElement("beforebegin", shareEl);

    var copyBtn = document.getElementById("share-copy-btn");
    copyBtn.addEventListener("click", function () {
      var self = this;
      function onCopied() {
        self.innerHTML = ICON_CHECK + "คัดลอกแล้ว!";
        self.classList.add("copied");
        setTimeout(function () {
          self.innerHTML = ICON_COPY + "คัดลอกลิงก์";
          self.classList.remove("copied");
        }, 2000);
      }
      if (navigator.clipboard) {
        navigator.clipboard.writeText(pageUrl).then(onCopied).catch(fallback);
      } else { fallback(); }
      function fallback() {
        var ta = document.createElement("textarea");
        ta.value = pageUrl; ta.style.cssText = "position:fixed;opacity:0;";
        document.body.appendChild(ta); ta.focus(); ta.select();
        try { document.execCommand("copy"); } catch (e) {}
        document.body.removeChild(ta);
        onCopied();
      }
    });
  }

  // ---- a11y: focus trap + คืนโฟกัสให้ปุ่มที่เปิด (ใช้ร่วมกัน search modal + drawer มือถือ) ----
  var FOCUSABLE_SEL = 'a[href], button:not([disabled]), input:not([disabled]),' +
    ' textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
  function trapTab(container, e) {
    if (e.key !== "Tab") return;
    var nodes = Array.prototype.slice.call(container.querySelectorAll(FOCUSABLE_SEL))
      .filter(function (n) { return n.offsetParent !== null; });  // เฉพาะที่มองเห็นจริง
    if (!nodes.length) return;
    var first = nodes[0], last = nodes[nodes.length - 1], active = document.activeElement;
    if (!container.contains(active)) { e.preventDefault(); first.focus(); return; }  // โฟกัสหลุดออกนอก → ดึงกลับ
    if (e.shiftKey && active === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
  }
  function restoreFocus(saved, fallbackEl) {
    var t = (saved && saved.focus && saved !== document.body) ? saved : fallbackEl;
    if (t && t.focus) t.focus();
  }

  // ---- Search modal ----
  var themeToggleBtn = document.getElementById("theme-toggle");
  if (themeToggleBtn) {
    var ICON_SEARCH = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>';

    var sb = document.createElement("button");
    sb.className = "search-btn";
    sb.setAttribute("aria-label", "ค้นหาหุ้น");
    sb.setAttribute("title", "ค้นหาหุ้น  /");
    sb.innerHTML = ICON_SEARCH;
    themeToggleBtn.parentNode.insertBefore(sb, themeToggleBtn);

    // ค้นบทความในเว็บก่อน — Yahoo Finance เป็นแค่ fallback
    var searchItems = ARTICLES.map(function (a) {
      return { f: a.f, title: a.t.replace(/&amp;/g, "&"), tk: a.tk || "", sec: a.sec || "" };
    }).reverse(); // ใหม่สุดก่อน
    function articleUrl(f) { return BASE + "articles/" + f; }

    // k: กรองเจาะจงตาม ticker หรือกลุ่มธุรกิจ (เช่น k:snps, k:semi, k:การเงิน) แทน full-text
    var SEC_KW = {
      semi: ["semi", "เซมิ", "ชิป", "chip", "ai", "เอไอ"],
      software: ["software", "ซอฟต์แวร์", "internet", "อินเทอร์เน็ต", "cloud"],
      health: ["health", "สุขภาพ", "pharma", "ยา", "bio"],
      finance: ["finance", "การเงิน", "bank", "ธนาคาร", "payment"],
      consumer: ["consumer", "ผู้บริโภค", "retail", "ค้าปลีก", "ecommerce"],
      space: ["space", "อวกาศ", "defense", "กลาโหม"],
      market: ["market", "ตลาด", "macro", "มหภาค"],
      basics: ["basics", "พื้นฐาน", "book", "หนังสือ", "talks", "สุนทรพจน์", "งบ"]
    };
    function matchKeyword(a, kw) {
      if (a.tk && a.tk.toLowerCase().indexOf(kw) === 0) return true;  // ticker ขึ้นต้นด้วย kw
      if (a.sec === kw) return true;
      var al = SEC_KW[a.sec] || [];
      return al.some(function (x) { return x === kw || (kw.length >= 2 && x.indexOf(kw) === 0); });
    }
    var chipsHtml = searchItems.filter(function (a) { return a.tk; }).map(function (a) {
      return '<button type="button" class="search-chip" data-file="' + a.f + '">' + a.tk + '</button>';
    }).join("");

    var sOverlay = document.createElement("div");
    sOverlay.className = "search-overlay";
    sOverlay.setAttribute("role", "dialog");
    sOverlay.setAttribute("aria-modal", "true");
    sOverlay.setAttribute("aria-label", "ค้นหาหุ้น");
    sOverlay.innerHTML =
      '<div class="search-box">' +
        '<form class="search-form" id="search-form">' +
          '<span class="search-form-icon">' + ICON_SEARCH + '</span>' +
          '<input class="search-input" id="search-input" type="text"' +
          ' placeholder="ค้นหาบทความ เช่น NVDA, Micron, งบดุล..."' +
          ' autocomplete="off" autocorrect="off" autocapitalize="characters" spellcheck="false">' +
          '<button type="button" class="search-esc" id="search-close-btn">ESC</button>' +
        '</form>' +
        '<div class="search-results" id="search-results"></div>' +
        '<div class="search-footer">' +
          '<span class="search-footer-label">หุ้นที่ผ่าแล้ว · กดเพื่อเปิดบทความ</span>' +
          '<div class="search-chips">' + chipsHtml + '</div>' +
        '</div>' +
        '<div class="search-kbd-hint">' +
          '<kbd>/</kbd>&nbsp;หรือ&nbsp;<kbd>&#8984;K</kbd>&nbsp;เปิดได้เสมอ' +
          '&nbsp;&middot;&nbsp;<kbd>k:</kbd>&nbsp;กรองตามหุ้น/หมวด เช่น k:semi' +
          '&nbsp;&middot;&nbsp;Enter เปิดผลลัพธ์แรก · ไม่พบบทความ = ค้นบน Yahoo Finance' +
        '</div>' +
      '</div>';
    document.body.appendChild(sOverlay);

    var lastFocusedBeforeSearch = null;
    function openSearch() {
      lastFocusedBeforeSearch = document.activeElement;
      sOverlay.classList.add("open");
      document.body.style.overflow = "hidden";
      setTimeout(function () {
        var inp = document.getElementById("search-input");
        if (inp) { inp.focus(); inp.select(); }
      }, 40);
    }
    function closeSearch() {
      sOverlay.classList.remove("open");
      document.body.style.overflow = "";
      restoreFocus(lastFocusedBeforeSearch, sb);  // คืนโฟกัสจุดเดิม (fallback = ปุ่มค้นหา)
    }
    function doSearch(ticker) {
      if (!ticker) return;
      window.open("https://finance.yahoo.com/quote/" + ticker.toUpperCase() + "/", "_blank", "noopener,noreferrer");
      closeSearch();
    }
    function isKw(q) { return /^k:/i.test(q.trim()); }
    function findArticles(q) {
      q = q.trim().toLowerCase();
      if (!q) return [];
      var km = q.match(/^k:\s*(.*)$/);
      if (km) {
        var kw = km[1].trim();
        if (!kw) return searchItems.slice(0, 20);  // "k:" เปล่า → โชว์ทั้งหมด
        return searchItems.filter(function (a) { return matchKeyword(a, kw); }).slice(0, 20);
      }
      return searchItems.filter(function (a) {
        return a.title.toLowerCase().indexOf(q) !== -1 || (a.tk && a.tk.toLowerCase().indexOf(q) !== -1);
      }).slice(0, 6);
    }
    function renderResults(q) {
      var box = document.getElementById("search-results");
      if (!box) return;
      if (!q.trim()) { box.innerHTML = ""; return; }
      var hits = findArticles(q);
      if (!hits.length) {
        box.innerHTML = isKw(q)
          ? '<div class="search-empty">ไม่พบหุ้น/หมวดที่ตรงกับ “' + q.replace(/</g, "&lt;") + '”</div>'
          : '<div class="search-empty">ไม่พบบทความ — กด Enter เพื่อค้น "' +
            q.replace(/</g, "&lt;") + '" บน Yahoo Finance</div>';
        return;
      }
      box.innerHTML = hits.map(function (a) {
        return '<a class="search-result" href="' + articleUrl(a.f) + '">' +
          (a.tk ? '<span class="search-result-tk">' + a.tk + '</span>' : '') +
          '<span class="search-result-title">' + a.title + '</span></a>';
      }).join("");
    }

    sb.addEventListener("click", openSearch);
    document.getElementById("search-close-btn").addEventListener("click", closeSearch);
    sOverlay.addEventListener("click", function (e) {
      if (e.target === sOverlay) closeSearch();
    });
    document.getElementById("search-input").addEventListener("input", function () {
      renderResults(this.value);
    });
    document.getElementById("search-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var val = document.getElementById("search-input").value.trim();
      if (!val) return;
      var hits = findArticles(val);
      if (hits.length) { window.location.href = articleUrl(hits[0].f); closeSearch(); }
      else if (!isKw(val)) doSearch(val);  // k: กรองในเว็บอย่างเดียว ไม่ fallback ไป Yahoo
    });
    sOverlay.addEventListener("keydown", function (e) { trapTab(sOverlay, e); });
    sOverlay.querySelectorAll(".search-chip").forEach(function (chip) {
      chip.addEventListener("click", function () {
        window.location.href = articleUrl(this.getAttribute("data-file"));
        closeSearch();
      });
    });
    document.addEventListener("keydown", function (e) {
      var isOpen = sOverlay.classList.contains("open");
      if (isOpen && e.key === "Escape") { closeSearch(); return; }
      if (!isOpen && (e.key === "/" || ((e.metaKey || e.ctrlKey) && e.key === "k"))) {
        var tag = document.activeElement ? document.activeElement.tagName : "";
        if (tag !== "INPUT" && tag !== "TEXTAREA") {
          e.preventDefault();
          openSearch();
        }
      }
    });
  }

  // ---- Hamburger + slide-out drawer (มือถือ) ----
  var headerContainer = document.querySelector(".site-header .container");
  var siteTitle = document.querySelector(".site-title");
  if (headerContainer && siteTitle) {
    var hamBtn = document.createElement("button");
    hamBtn.className = "hamburger-btn";
    hamBtn.setAttribute("aria-label", "เปิดเมนู");
    hamBtn.setAttribute("aria-expanded", "false");
    hamBtn.innerHTML =
      '<svg width="22" height="22" viewBox="0 0 22 22" fill="none" ' +
      'stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">' +
      '<line x1="3" y1="6" x2="19" y2="6"/>' +
      '<line x1="3" y1="11" x2="19" y2="11"/>' +
      '<line x1="3" y1="16" x2="19" y2="16"/>' +
      '</svg>';
    headerContainer.insertBefore(hamBtn, siteTitle);

    var overlay = document.createElement("div");
    overlay.className = "nav-overlay";
    document.body.appendChild(overlay);

    var isInArticles = location.pathname.indexOf("/articles/") !== -1;
    var base = isInArticles ? "../" : "";
    var NAV_LINKS = [
      { href: base + "index.html", label: "หน้าแรก" },
      { href: base + "articles.html", label: "บทความทั้งหมด" },
      { href: base + "stocks.html", label: "หุ้นทั้งหมด" },
      { href: base + "tools.html", label: "เครื่องมือ" },
      { href: base + "dashboard.html", label: "Dashboard" },
      { href: base + "about.html", label: "เกี่ยวกับ" },
      { href: "/pp-os/", label: "แอป (PP OS)" }
    ];

    var drawer = document.createElement("div");
    drawer.className = "nav-drawer";
    drawer.setAttribute("role", "navigation");
    drawer.setAttribute("aria-label", "เมนูหลัก");

    var dHtml = '<div class="nav-drawer-header">' +
      '<a class="nav-drawer-brand" href="' + base + 'index.html">Moatrices</a>' +
      '<button class="nav-drawer-close" aria-label="ปิดเมนู">✕</button>' +
      '</div><nav>';
    NAV_LINKS.forEach(function (link) {
      var active = link.href.split("/").pop() === here;
      dHtml += '<a href="' + link.href + '"' + (active ? ' class="active"' : '') + '>' + link.label + '</a>';
    });
    dHtml += '</nav>';
    drawer.innerHTML = dHtml;
    document.body.appendChild(drawer);

    var lastFocusedBeforeDrawer = null;
    function openDrawer() {
      lastFocusedBeforeDrawer = document.activeElement;
      drawer.classList.add("open");
      overlay.classList.add("open");
      hamBtn.setAttribute("aria-expanded", "true");
      document.body.style.overflow = "hidden";
      var closeBtn = drawer.querySelector(".nav-drawer-close");
      if (closeBtn) closeBtn.focus();  // ย้ายโฟกัสเข้า drawer
    }
    function closeDrawer() {
      drawer.classList.remove("open");
      overlay.classList.remove("open");
      hamBtn.setAttribute("aria-expanded", "false");
      document.body.style.overflow = "";
      restoreFocus(lastFocusedBeforeDrawer, hamBtn);  // คืนโฟกัสให้ปุ่มแฮมเบอร์เกอร์
    }

    hamBtn.addEventListener("click", openDrawer);
    overlay.addEventListener("click", closeDrawer);
    drawer.querySelector(".nav-drawer-close").addEventListener("click", closeDrawer);
    drawer.addEventListener("keydown", function (e) { trapTab(drawer, e); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && drawer.classList.contains("open")) closeDrawer();
    });
  }

  // ---- Analytics (GoatCounter) — ทำงานเมื่อกรอก GOATCOUNTER_CODE ด้านบน ----
  if (GOATCOUNTER_CODE) {
    var gc = document.createElement("script");
    gc.async = true;
    gc.src = "https://gc.zgo.at/count.js";
    gc.setAttribute("data-goatcounter", "https://" + GOATCOUNTER_CODE + ".goatcounter.com/count");
    document.body.appendChild(gc);
  }

  // ---- Comments (giscus) — ท้ายบทความ ทำงานเมื่อกรอก GISCUS ครบ ----
  if (GISCUS.repo && GISCUS.repoId && GISCUS.categoryId && document.querySelector(".byline")) {
    var giscusHost = document.querySelector(".related") || document.querySelector(".article-nav") || document.querySelector(".back");
    if (giscusHost) {
      var giscusWrap = document.createElement("section");
      giscusWrap.className = "comments";
      giscusWrap.innerHTML = '<h3 class="related-title">ความเห็น</h3>';
      giscusHost.insertAdjacentElement("afterend", giscusWrap);
      var gs = document.createElement("script");
      gs.src = "https://giscus.app/client.js";
      gs.setAttribute("data-repo", GISCUS.repo);
      gs.setAttribute("data-repo-id", GISCUS.repoId);
      gs.setAttribute("data-category", GISCUS.category);
      gs.setAttribute("data-category-id", GISCUS.categoryId);
      gs.setAttribute("data-mapping", "pathname");
      gs.setAttribute("data-reactions-enabled", "1");
      gs.setAttribute("data-input-position", "top");
      gs.setAttribute("data-theme", effectiveTheme() === "dark" ? "dark" : "light");
      gs.setAttribute("data-lang", "th");
      gs.crossOrigin = "anonymous";
      gs.async = true;
      giscusWrap.appendChild(gs);
    }
  }

  // ---- 404: บทความแนะนำ — ดึงจาก ARTICLES (SoT) ให้ไม่มีวันค้าง ----
  var suggestBox = document.getElementById("suggested-articles");
  if (suggestBox) {
    var latest = ARTICLES.slice(-4).reverse(); // ใหม่สุด 4 บท (ARTICLES เรียงเก่า→ใหม่)
    suggestBox.innerHTML = latest.map(function (a) {
      return '<li><a href="/articles/' + a.f + '">' + a.t.replace(/&amp;/g, "&") + "</a></li>";
    }).join("");
  }

  // ---- Market Clock — นาฬิกา BKK + NY + สถานะตลาด US ----
  var TH_DAYS_CLK = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];
  var TH_MONTHS_CLK = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];

  function pad2(n) { return n < 10 ? "0" + n : "" + n; }

  function getMktStatus(now) {
    var nyStr = now.toLocaleString("en-US", { timeZone: "America/New_York" });
    var et = new Date(nyStr);
    var day = et.getDay();
    var mins = et.getHours() * 60 + et.getMinutes();
    if (day === 0 || day === 6) return { cls: "closed", label: "ปิดสุดสัปดาห์" };
    if (mins >= 570  && mins < 960)  return { cls: "open",   label: "US: เปิด" };
    if (mins >= 240  && mins < 570)  return { cls: "pre",    label: "Pre-market" };
    if (mins >= 960  && mins < 1200) return { cls: "after",  label: "After-hours" };
    return { cls: "closed", label: "US: ปิด" };
  }

  var clkBar = document.createElement("div");
  clkBar.className = "market-clock";
  clkBar.innerHTML =
    '<div class="market-clock-inner">' +
      '<span class="clock-date" id="clk-date"></span>' +
      '<div class="clock-mid">' +
        '<span class="clock-zone-badge">BKK</span>' +
        '<span class="clock-bkk" id="clk-bkk"></span>' +
      '</div>' +
      '<div class="clock-right">' +
        '<span class="clock-zone-badge">NY</span>' +
        '<span class="clock-ny" id="clk-ny"></span>' +
        '<span class="clock-divider"></span>' +
        '<span class="clock-mkt closed" id="clk-mkt">' +
          '<span class="clock-mkt-dot"></span>' +
          '<span id="clk-mkt-txt"></span>' +
        '</span>' +
      '</div>' +
    '</div>';

  // แสดงเฉพาะหน้าที่มีแถบราคา (index + dashboard) — เลี่ยง CLS + timer ทิ้งบนหน้าบทความ
  var clkAnchor = document.getElementById("tv-ticker");
  if (clkAnchor) clkAnchor.parentNode.insertBefore(clkBar, clkAnchor);

  var clkDate = document.getElementById("clk-date");
  var clkBkk  = document.getElementById("clk-bkk");
  var clkNy   = document.getElementById("clk-ny");
  var clkMkt  = document.getElementById("clk-mkt");
  var clkTxt  = document.getElementById("clk-mkt-txt");

  function clockTick() {
    if (!clkDate) return;
    var now = new Date();
    // เวลา/วันที่ฝั่งซ้ายคือ "BKK" — ต้องปักโซนเวลาไทยจริง ไม่ใช่เวลาเครื่องผู้อ่าน
    var bkk = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
    var wd = bkk.getDay(), dt = bkk.getDate(), mo = bkk.getMonth(), yr = bkk.getFullYear();
    var hh = bkk.getHours(), mm = bkk.getMinutes(), ss = bkk.getSeconds();

    clkDate.textContent = TH_DAYS_CLK[wd] + " " + dt + " " + TH_MONTHS_CLK[mo] + " " + yr;

    var sep = ss % 2 === 0
      ? '<span class="clk-sep">:</span>'
      : '<span class="clk-sep clk-sep-off">:</span>';
    clkBkk.innerHTML = pad2(hh) + sep + pad2(mm) + '<span class="clk-sec">' + pad2(ss) + '</span>';

    clkNy.textContent = now.toLocaleTimeString("en-US", {
      timeZone: "America/New_York", hour12: false, hour: "2-digit", minute: "2-digit"
    });

    var ms = getMktStatus(now);
    clkMkt.className = "clock-mkt " + ms.cls;
    clkTxt.textContent = ms.label;
  }

  if (clkAnchor) {
    clockTick();
    setInterval(clockTick, 1000);
  }

})();

/* ============================================================
   OS tab bar — แถบล่างชุดเดียวกับ PP OS (Moatrices / Health / Money / Portfolio / Me)
   โผล่เฉพาะจอมือถือ: เว็บกับแอปเลยรู้สึกเป็นแอปเดียวกัน สลับไปมาได้จากทุกหน้า
   ซ่อนตัวเองเมื่อถูกฝังใน iframe ของแอป (แท็บ Moatrices ในแอปมี tabbar ของมันอยู่แล้ว = ห้ามซ้อนสองแถบ)
   ============================================================ */
(function () {
  if (window.self !== window.top) return;

  var APP = "/pp-os/?mode=app&tab=";
  var HOME = (location.pathname.indexOf("/articles/") !== -1 ? "../" : "") + "index.html";
  var svg = function (d) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + "</svg>";
  };

  var TABS = [
    // ไอคอนต้องตรงกับ ICONS.moatrices ใน pp-os/js/core/app-shell.js เป๊ะ — แถบนี้กับแถบในแอปคือแถบเดียวกัน
    { id: "moatrices", label: "Moatrices", icon: svg('<path d="M4 20h16"/><rect x="5" y="12" width="3.4" height="6" rx="1"/><rect x="10.3" y="8" width="3.4" height="10" rx="1"/><rect x="15.6" y="4" width="3.4" height="14" rx="1"/>') },
    { id: "health", label: "Health", icon: svg('<path d="M20.4 6.9a4.6 4.6 0 0 0-7.8-2L12 5.6l-.6-.7a4.6 4.6 0 0 0-7.8 2c-.5 2 .3 3.9 1.8 5.5L12 19l6.6-6.6c1.5-1.6 2.3-3.5 1.8-5.5Z"/><path d="M3.4 12h3.3l1.5-2.4 2 4.4 1.6-3 1.1 1h4.2"/>') },
    { id: "money", label: "Money", icon: svg('<rect x="3" y="6" width="18" height="13" rx="3"/><path d="M3 10h18"/><circle cx="16.5" cy="14.5" r="1.4"/><path d="M6.5 3.8 15 6"/>') },
    // Weather ออกจากแถบแล้ว (17 ก.ค.) — หน้าเต็มยังอยู่ เข้าทางการ์ดในหน้า Me ของแอป
    { id: "portfolio", label: "Portfolio", icon: svg('<circle cx="12" cy="12" r="8.4"/><circle cx="12" cy="12" r="3.2"/><path d="M12 3.6v5.2M14.8 13.6l4.5 2.6M9.2 13.6l-4.5 2.6"/>') },
    { id: "me", label: "Me", icon: svg('<circle cx="12" cy="8" r="3.6"/><path d="M4.8 20a7.2 7.2 0 0 1 14.4 0"/>') }
  ];

  var bar = document.createElement("nav");
  bar.className = "os-tabbar";
  bar.setAttribute("aria-label", "PP OS");

  var html = "";
  for (var i = 0; i < TABS.length; i++) {
    var t = TABS[i];
    // อยู่บนเว็บ = อยู่ในแท็บ Moatrices อยู่แล้ว → ไฮไลต์ตัวเอง ส่วนแท็บอื่นเด้งเข้าแอป
    var on = t.id === "moatrices" ? ' class="on" aria-current="page"' : "";
    var href = t.id === "moatrices" ? HOME : APP + t.id;
    html += '<a href="' + href + '"' + on + ">" + t.icon + "<span>" + t.label + "</span></a>";
  }
  bar.innerHTML = html;
  document.body.appendChild(bar);
  document.body.classList.add("has-os-tabbar");
})();

/* ============================================================
   TARS — มาสคอตบอกสถานะ (ลอยมุมล่างขวาทุกหน้าที่โหลด app.js)
   หมุนสลับ: สถานะตลาดสหรัฐ (NYSE) ⇄ ทักทาย + คำคมลงทุน
   static ล้วน (ไม่มี backend); ไม่โผล่บน 404 (หน้านั้นไม่โหลด app.js)
   ============================================================ */
(function () {
  "use strict";
  if (document.getElementById("tars-buddy")) return;   // กันซ้ำ
  if (window.self !== window.top) return;               // ไม่โผล่ในกรอบ iframe (ฉากฝัง)

  // ---- ตลาดสหรัฐ: อ่านเวลา ET ผ่าน Intl (จัดการ DST เอง) ----
  var HAS_TZ = true;
  try { new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York" }).format(new Date()); }
  catch (e) { HAS_TZ = false; }
  // NYSE full-day holidays 2026 (ไม่รวมครึ่งวัน) — ปีอื่นตรรกะเสาร์-อาทิตย์ยังถูก แค่วันหยุดอาจคลาด
  var HOLIDAYS = ["2026-01-01", "2026-01-19", "2026-02-16", "2026-04-03", "2026-05-25",
    "2026-06-19", "2026-07-03", "2026-09-07", "2026-11-26", "2026-12-25"];
  function etParts(offsetDays) {
    var d = new Date(Date.now() + (offsetDays || 0) * 86400000);
    var f = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", weekday: "short",
      year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false });
    var p = {}; f.formatToParts(d).forEach(function (x) { p[x.type] = x.value; });
    var hh = parseInt(p.hour, 10); if (hh === 24) hh = 0;
    var wk = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    return { min: hh * 60 + parseInt(p.minute, 10), dow: wk[p.weekday], ymd: p.year + "-" + p.month + "-" + p.day };
  }
  function tradingDay(pp) { return pp.dow >= 1 && pp.dow <= 5 && HOLIDAYS.indexOf(pp.ymd) === -1; }
  function fmtDur(m) {
    if (m < 60) return m + " นาที";
    if (m < 1440) { var h = Math.floor(m / 60), mm = m % 60; return h + " ชม" + (mm ? " " + mm + " น" : ""); }
    var dd = Math.floor(m / 1440), h2 = Math.floor((m % 1440) / 60); return dd + " วัน" + (h2 ? " " + h2 + " ชม" : "");
  }
  function marketLine() {
    var p = etParts(0);
    if (tradingDay(p) && p.min >= 570 && p.min < 960) {
      return { t: "ตลาดสหรัฐ<b>เปิดอยู่</b> · ปิดใน " + fmtDur(960 - p.min), cls: "open" };
    }
    var mins = null;
    if (tradingDay(p) && p.min < 570) { mins = 570 - p.min; }
    else { for (var off = 1; off <= 8; off++) { var q = etParts(off); if (tradingDay(q)) { mins = (1440 - p.min) + (off - 1) * 1440 + 570; break; } } }
    return { t: "ตลาดสหรัฐ<b>ปิด</b>" + (mins != null ? " · เปิดอีก " + fmtDur(mins) : ""), cls: "closed" };
  }

  // ---- ทักทายตามเวลาเครื่องผู้อ่าน + คำคมลงทุน ----
  var QUOTES = [
    { q: "ราคาคือสิ่งที่คุณจ่าย มูลค่าคือสิ่งที่คุณได้", a: "Buffett" },
    { q: "จงกลัวเมื่อคนอื่นโลภ และโลภเมื่อคนอื่นกลัว", a: "Buffett" },
    { q: "เวลาคือเพื่อนของธุรกิจที่ยอดเยี่ยม และเป็นศัตรูของธุรกิจธรรมดา", a: "Buffett" },
    { q: "ซื้อบริษัทยอดเยี่ยมในราคาเหมาะสม ดีกว่าบริษัทเหมาะสมในราคายอดเยี่ยม", a: "Buffett" },
    { q: "เงินก้อนใหญ่ไม่ได้อยู่ที่การซื้อขาย แต่อยู่ที่การรอเป็น", a: "Munger" },
    { q: "ลงทุนเฉพาะในสิ่งที่คุณเข้าใจจริงๆ", a: "Buffett" }
  ];
  function greetLine() {
    var h = new Date().getHours();
    var g = h < 5 ? "ดึกแล้วนะครับ พักบ้างนะ" : h < 12 ? "สวัสดีตอนเช้าครับ" :
      h < 17 ? "สวัสดีตอนบ่ายครับ" : h < 21 ? "สวัสดีตอนเย็นครับ" : "สวัสดีตอนค่ำครับ";
    var q = QUOTES[Math.floor(Math.random() * QUOTES.length)];
    return { t: "<b>" + g + "</b> «" + q.q + "» — " + q.a, cls: "idle" };
  }

  var PROVIDERS = HAS_TZ ? [marketLine, greetLine] : [greetLine];

  // ---- TARS SVG (ใช้ทั้งการ์ดและปุ่มพับ) ----
  var TARS_SVG =
    '<svg class="tarsb-bot" viewBox="0 0 47 58" role="img" aria-label="TARS">' +
    '<defs><linearGradient id="tarsbSteel" x1="0" y1="0" x2="1" y2="0">' +
    '<stop offset="0" stop-color="#3b414a"/><stop offset=".45" stop-color="#171a20"/>' +
    '<stop offset="1" stop-color="#0d1015"/></linearGradient></defs>' +
    '<g fill="url(#tarsbSteel)" stroke="#05070b" stroke-width=".6">' +
    '<rect x="3.5" y="6" width="8.6" height="48" rx="1.6"/>' +
    '<rect x="14.2" y="6" width="8.6" height="48" rx="1.6"/>' +
    '<rect x="24.9" y="2" width="8.6" height="48" rx="1.6"/>' +
    '<rect x="35.6" y="6" width="8.6" height="48" rx="1.6"/></g>' +
    '<g stroke="#05070b" stroke-width=".7" opacity=".75">' +
    '<line x1="4.1" y1="22" x2="11.5" y2="22"/><line x1="4.1" y1="38" x2="11.5" y2="38"/>' +
    '<line x1="14.8" y1="22" x2="22.2" y2="22"/><line x1="14.8" y1="38" x2="22.2" y2="38"/>' +
    '<line x1="25.5" y1="18" x2="32.9" y2="18"/><line x1="25.5" y1="34" x2="32.9" y2="34"/>' +
    '<line x1="36.2" y1="22" x2="43.6" y2="22"/><line x1="36.2" y1="38" x2="43.6" y2="38"/></g>' +
    '<rect x="5.2" y="11" width="5.2" height="3.2" rx="1" fill="#0a1a26" stroke="#7fc7ff" stroke-width=".5"/>' +
    '<circle cx="39.9" cy="10.6" r="1.2" fill="#ffb763"/></svg>';

  var wrap = document.createElement("div");
  wrap.className = "tarsb"; wrap.id = "tars-buddy";
  wrap.innerHTML =
    '<div class="tarsb-card">' +
      '<div class="tarsb-bubble">' +
        '<div class="tarsb-head"><span class="tarsb-dot idle"></span><span class="tarsb-name">TARS</span>' +
          '<button class="tarsb-min" type="button" aria-label="ย่อ TARS" title="ย่อเก็บ">–</button></div>' +
        '<p class="tarsb-msg">…</p>' +
      '</div>' + TARS_SVG +
    '</div>' +
    '<button class="tarsb-tab" type="button" aria-label="เปิด TARS">' + TARS_SVG +
      '<span class="tarsb-dot idle"></span></button>';
  document.body.appendChild(wrap);

  var msg = wrap.querySelector(".tarsb-msg");
  var dots = wrap.querySelectorAll(".tarsb-dot");
  var idx = 0;
  function tick() {
    var line = PROVIDERS[idx % PROVIDERS.length]();
    msg.innerHTML = line.t;
    for (var i = 0; i < dots.length; i++) dots[i].className = "tarsb-dot " + line.cls;
    idx++;
  }

  // พับเก็บ (จำสถานะ)
  var KEY = "tarsCollapsed";
  function setCollapsed(v) { wrap.setAttribute("data-collapsed", v ? "true" : "false"); try { localStorage.setItem(KEY, v ? "1" : "0"); } catch (e) {} }
  var stored = "0"; try { stored = localStorage.getItem(KEY) || "0"; } catch (e) {}
  setCollapsed(stored === "1");
  wrap.querySelector(".tarsb-min").addEventListener("click", function () { setCollapsed(true); });
  wrap.querySelector(".tarsb-tab").addEventListener("click", function () { setCollapsed(false); });
  wrap.querySelector(".tarsb-card .tarsb-bot").addEventListener("click", tick); // แตะ TARS = ข้อความถัดไป

  tick();                       // แสดง market ก่อน (ถ้ารองรับ)
  setInterval(tick, 8000);      // หมุนทุก 8 วินาที
})();
