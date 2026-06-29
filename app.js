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

  var progressBar = document.querySelector(".reading-progress");
  var btn = document.querySelector(".to-top");

  function onScroll() {
    if (progressBar) {
      var h = document.documentElement;
      var max = h.scrollHeight - h.clientHeight;
      var pct = max > 0 ? (h.scrollTop / max) * 100 : 0;
      progressBar.style.width = pct + "%";
    }
    if (btn) {
      if (window.scrollY > 400) btn.classList.add("show");
      else btn.classList.remove("show");
    }
  }

  document.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  if (btn) {
    btn.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
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
    });
  }

  // ---- สารบัญอัตโนมัติ ----
  var bylineEl = document.querySelector(".byline");
  var mainCol = document.querySelector("main .container");
  if (bylineEl && mainCol) {
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

  // ---- แท็บกรองบทความ ----
  var postList = document.querySelector(".post-list");
  if (postList) {
    var items = Array.prototype.slice.call(postList.querySelectorAll("li"));
    items.forEach(function (li) {
      var tagEl = li.querySelector(".tag");
      var txt = tagEl ? tagEl.textContent : "";
      var cat = "other";
      if (txt.indexOf("Deep-dive") !== -1) cat = "deepdive";
      else if (txt.indexOf("ซีรีส์") !== -1 || txt.indexOf("งบ") !== -1) cat = "financials";
      li.setAttribute("data-cat", cat);
    });

    var counts = { all: items.length, deepdive: 0, financials: 0 };
    items.forEach(function (li) {
      var cat = li.getAttribute("data-cat");
      if (counts.hasOwnProperty(cat)) counts[cat]++;
    });

    var filters = [
      { key: "all", label: "ทั้งหมด" },
      { key: "deepdive", label: "Deep-dive" },
      { key: "financials", label: "อ่านงบ" }
    ];
    var filterBar = document.createElement("div");
    filterBar.className = "filter-bar";
    filters.forEach(function (f, i) {
      var c = document.createElement("button");
      c.type = "button";
      c.className = "chip" + (i === 0 ? " active" : "");
      c.setAttribute("data-key", f.key);
      c.innerHTML = f.label + '<span class="chip-count">' + (counts[f.key] || 0) + '</span>';
      filterBar.appendChild(c);
    });
    postList.parentNode.insertBefore(filterBar, postList);

    filterBar.addEventListener("click", function (e) {
      var c = e.target.closest ? e.target.closest(".chip") : null;
      if (!c) return;
      var key = c.getAttribute("data-key");
      filterBar.querySelectorAll(".chip").forEach(function (x) { x.classList.toggle("active", x === c); });
      items.forEach(function (li) {
        var show = key === "all" || li.getAttribute("data-cat") === key;
        li.style.display = show ? "" : "none";
        if (show) li.classList.add("is-visible");
      });
    });
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
  var ARTICLES = [
    { f: "financials-01-income-statement.html", t: "ตอนที่ 1: งบกำไรขาดทุน" },
    { f: "financials-02-cash-flow-statement.html", t: "ตอนที่ 2: งบกระแสเงินสด" },
    { f: "financials-03-balance-sheet.html", t: "ตอนที่ 3: งบดุล + เชื่อม 3 งบ" },
    { f: "deep-dive-nflx.html", t: "ผ่าธุรกิจ NFLX (Netflix)" },
    { f: "deep-dive-meli.html", t: "ผ่าธุรกิจ MELI (MercadoLibre)" },
    { f: "deep-dive-cost.html", t: "ผ่าธุรกิจ COST (Costco)" },
    { f: "deep-dive-snps.html", t: "ผ่าธุรกิจ SNPS (Synopsys)" },
    { f: "deep-dive-axp.html", t: "ผ่าธุรกิจ AXP (American Express)" },
    { f: "deep-dive-tsm.html", t: "ผ่าธุรกิจ TSM (TSMC)" },
    { f: "deep-dive-cohr.html", t: "ผ่าธุรกิจ COHR (Coherent)" }
  ];
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

  // ---- Related: บทความหมวดเดียวกัน ----
  if (idx !== -1) {
    var curDeep = file.indexOf("deep-dive") === 0;
    var related = ARTICLES.filter(function (a) {
      return a.f !== file && (a.f.indexOf("deep-dive") === 0) === curDeep;
    }).slice(0, 3);
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

    var TICKERS = ["NFLX", "MELI", "COST", "SNPS", "AXP"];
    var chipsHtml = TICKERS.map(function (t) {
      return '<button type="button" class="search-chip" data-ticker="' + t + '">' + t + '</button>';
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
          ' placeholder="ค้นหาหุ้น เช่น AAPL, TSLA, NVDA..."' +
          ' autocomplete="off" autocorrect="off" autocapitalize="characters" spellcheck="false">' +
          '<button type="button" class="search-esc" id="search-close-btn">ESC</button>' +
        '</form>' +
        '<div class="search-footer">' +
          '<span class="search-footer-label">หุ้นที่วิเคราะห์แล้ว</span>' +
          '<div class="search-chips">' + chipsHtml + '</div>' +
        '</div>' +
        '<div class="search-kbd-hint">' +
          '<kbd>/</kbd>&nbsp;หรือ&nbsp;<kbd>&#8984;K</kbd>&nbsp;เปิดได้เสมอ' +
          '&nbsp;&middot;&nbsp;กด Enter เพื่อค้นหาบน Yahoo Finance' +
        '</div>' +
      '</div>';
    document.body.appendChild(sOverlay);

    function openSearch() {
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
    }
    function doSearch(ticker) {
      if (!ticker) return;
      window.open("https://finance.yahoo.com/quote/" + ticker.toUpperCase() + "/", "_blank", "noopener,noreferrer");
      closeSearch();
    }

    sb.addEventListener("click", openSearch);
    document.getElementById("search-close-btn").addEventListener("click", closeSearch);
    sOverlay.addEventListener("click", function (e) {
      if (e.target === sOverlay) closeSearch();
    });
    document.getElementById("search-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var val = document.getElementById("search-input").value.trim();
      if (val) doSearch(val);
    });
    sOverlay.querySelectorAll(".search-chip").forEach(function (chip) {
      chip.addEventListener("click", function () {
        doSearch(this.getAttribute("data-ticker"));
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
      { href: base + "dashboard.html", label: "Dashboard" },
      { href: base + "about.html", label: "เกี่ยวกับ" }
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

    function openDrawer() {
      drawer.classList.add("open");
      overlay.classList.add("open");
      hamBtn.setAttribute("aria-expanded", "true");
      document.body.style.overflow = "hidden";
    }
    function closeDrawer() {
      drawer.classList.remove("open");
      overlay.classList.remove("open");
      hamBtn.setAttribute("aria-expanded", "false");
      document.body.style.overflow = "";
    }

    hamBtn.addEventListener("click", openDrawer);
    overlay.addEventListener("click", closeDrawer);
    drawer.querySelector(".nav-drawer-close").addEventListener("click", closeDrawer);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && drawer.classList.contains("open")) closeDrawer();
    });
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

  var clkAnchor = document.getElementById("tv-ticker") || document.querySelector("main");
  if (clkAnchor) clkAnchor.parentNode.insertBefore(clkBar, clkAnchor);

  var clkDate = document.getElementById("clk-date");
  var clkBkk  = document.getElementById("clk-bkk");
  var clkNy   = document.getElementById("clk-ny");
  var clkMkt  = document.getElementById("clk-mkt");
  var clkTxt  = document.getElementById("clk-mkt-txt");

  function clockTick() {
    if (!clkDate) return;
    var now = new Date();
    var wd = now.getDay(), dt = now.getDate(), mo = now.getMonth(), yr = now.getFullYear();
    var hh = now.getHours(), mm = now.getMinutes(), ss = now.getSeconds();

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

  clockTick();
  setInterval(clockTick, 1000);

})();
