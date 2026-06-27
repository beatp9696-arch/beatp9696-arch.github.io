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
})();
