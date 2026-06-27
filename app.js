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
})();
