// ผ่าธุรกิจ — interactions เล็กๆ (ไม่มี dependency)
(function () {
  "use strict";

  var bar = document.querySelector(".reading-progress");
  var btn = document.querySelector(".to-top");

  function onScroll() {
    // แถบความคืบหน้าการอ่าน
    if (bar) {
      var h = document.documentElement;
      var max = h.scrollHeight - h.clientHeight;
      var pct = max > 0 ? (h.scrollTop / max) * 100 : 0;
      bar.style.width = pct + "%";
    }
    // ปุ่มกลับขึ้นบน — โผล่เมื่อเลื่อนลงพอสมควร
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
  window.effectiveTheme = effectiveTheme; // ให้ widgets.js ใช้ตั้ง theme ของ TradingView

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

  // ---- สารบัญอัตโนมัติ (เฉพาะหน้าบทความที่มีหัวข้อหลายอัน) ----
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

  // ---- tag แยกสีตามหมวด (หน้าแรก) ----
  document.querySelectorAll(".post-list .tag").forEach(function (t) {
    if (t.textContent.indexOf("Deep-dive") !== -1) t.classList.add("tag-deepdive");
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

  // ---- scroll-reveal เนียนๆ (เฉพาะ block element) ----
  if ("IntersectionObserver" in window) {
    var revealEls = document.querySelectorAll(".post-list li, main table, main blockquote, .author-card, .toc");
    var io = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("is-visible"); obs.unobserve(e.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });
    revealEls.forEach(function (el) { el.classList.add("reveal"); io.observe(el); });
  }

  // ---- แท็บกรองบทความ (หน้าแรก) ----
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

    var filters = [
      { key: "all", label: "ทั้งหมด" },
      { key: "deepdive", label: "Deep-dive" },
      { key: "financials", label: "อ่านงบ" }
    ];
    var bar = document.createElement("div");
    bar.className = "filter-bar";
    filters.forEach(function (f, i) {
      var c = document.createElement("button");
      c.type = "button";
      c.className = "chip" + (i === 0 ? " active" : "");
      c.textContent = f.label;
      c.setAttribute("data-key", f.key);
      bar.appendChild(c);
    });
    postList.parentNode.insertBefore(bar, postList);

    bar.addEventListener("click", function (e) {
      var c = e.target.closest ? e.target.closest(".chip") : null;
      if (!c) return;
      var key = c.getAttribute("data-key");
      bar.querySelectorAll(".chip").forEach(function (x) { x.classList.toggle("active", x === c); });
      items.forEach(function (li) {
        var show = key === "all" || li.getAttribute("data-cat") === key;
        li.style.display = show ? "" : "none";
        if (show) li.classList.add("is-visible");   // กันค้าง opacity 0 จาก scroll-reveal
      });
    });
  }

  // ---- TOC scroll-spy: ไฮไลต์หัวข้อที่กำลังอ่าน ----
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
    { f: "deep-dive-axp.html", t: "ผ่าธุรกิจ AXP (American Express)" }
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
})();
