/* Select a research lens without moving the page or changing the reading data. */
(function () {
  "use strict";
  var approach = document.querySelector(".home-approach");
  if (!approach) return;
  var diagram = approach.querySelector(".home-approach-diagram");
  var tabs = Array.from(diagram.querySelectorAll("[data-layer]"));
  var panel = approach.querySelector(".home-approach-panel");
  var answer = approach.querySelector(".home-approach-answer");
  var link = approach.querySelector(".home-approach-link");
  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var explanations = {
    price: {
      title: "ราคา สะท้อนความคาดหวังอะไร",
      copy: "ราคาวันนี้กำลังคาดหวังให้ธุรกิจเติบโตแค่ไหน ลองย้อนจากราคาไปหาสมมติฐานที่ต้องเกิดขึ้น",
      label: "ลอง Reverse DCF", href: "reverse-dcf.html"
    },
    news: {
      title: "ข่าวเปลี่ยนธุรกิจ หรือแค่ความรู้สึก",
      copy: "แยกข่าวที่เปลี่ยนลูกค้า ต้นทุน และการแข่งขัน ออกจากเรื่องที่กระทบเพียงอารมณ์ตลาด",
      label: "ตั้งคำถามผ่าน Research", href: "portfolio.html?view=research"
    },
    financials: {
      title: "เรื่องที่เล่า ตรงกับตัวเลขไหม",
      copy: "เชื่อมรายได้ กำไร และกระแสเงินสดเข้าด้วยกัน ดูว่าการเติบโตเปลี่ยนเป็นเงินจริงได้แค่ไหน",
      label: "เริ่มอ่านงบการเงิน", href: "series-financials.html"
    },
    business: {
      title: "อะไรทำให้ลูกค้ากลับมา",
      copy: "ใครจ่ายเงินให้บริษัท บริษัทสร้างคุณค่าอย่างไร และเมื่อโตขึ้น กำไรต่อหน่วยดีขึ้นด้วยหรือไม่",
      label: "สำรวจธุรกิจทีละบริษัท", href: "stocks.html"
    },
    moat: {
      title: "ความได้เปรียบที่ต้องพิสูจน์",
      copy: "อะไรทำให้ลูกค้าเลือกธุรกิจนี้ต่อ และคู่แข่งเลียนแบบได้ยากเพราะอะไร",
      label: "สำรวจ 7 Powers", href: "series-powers.html"
    }
  };
  var introAnimations = [];
  var detailAnimations = [];
  var observer;
  var scan = document.createElement("span");
  scan.className = "home-layer-scan";
  scan.setAttribute("aria-hidden", "true");
  diagram.prepend(scan);
  function stopIntro() {
    if (observer) observer.disconnect();
    introAnimations.forEach(function (animation) { animation.cancel(); });
    introAnimations = [];
    approach.dataset.intro = "done";
  }
  function stopDetail() {
    detailAnimations.forEach(function (animation) { animation.cancel(); });
    detailAnimations = [];
  }
  function selectLayer(tab) {
    stopIntro();
    if (tab.getAttribute("aria-selected") === "true") return;
    stopDetail();
    var index = tabs.indexOf(tab);
    var copy = explanations[tab.dataset.layer];
    tabs.forEach(function (item) {
      item.setAttribute("aria-selected", String(item === tab));
      item.tabIndex = item === tab ? 0 : -1;
    });
    approach.dataset.depth = String(index + 1);
    panel.setAttribute("aria-labelledby", tab.id);
    panel.querySelector(".home-approach-step").textContent = String(index + 1).padStart(2, "0") + " / 05 · " + tab.getAttribute("aria-label");
    panel.querySelector("h3").textContent = copy.title;
    panel.querySelector("p").textContent = copy.copy;
    link.querySelector("[data-approach-link]").textContent = copy.label;
    link.setAttribute("href", copy.href);
    if (reducedMotion.matches || !answer.animate) return;
    detailAnimations.push(answer.animate([
      { opacity: .35, transform: "translateY(7px)" },
      { opacity: 1, transform: "translateY(0)" }
    ], { duration: 240, easing: "ease-out" }));
    var trace = tab.querySelector("svg path");
    if (trace) {
      var length = trace.getTotalLength();
      detailAnimations.push(trace.animate([
        { strokeDasharray: length + " " + length, strokeDashoffset: length },
        { strokeDasharray: length + " " + length, strokeDashoffset: 0 }
      ], { duration: 500, easing: "ease-out" }));
    }
  }
  tabs.forEach(function (tab, index) {
    tab.disabled = false;
    tab.addEventListener("click", function () { selectLayer(tab); });
    tab.addEventListener("keydown", function (event) {
      var next = { ArrowDown: (index + 1) % tabs.length, ArrowUp: (index + tabs.length - 1) % tabs.length, Home: 0, End: tabs.length - 1 }[event.key];
      if (next === undefined) return;
      event.preventDefault();
      selectLayer(tabs[next]);
      tabs[next].focus({ preventScroll: true });
    });
  });
  approach.querySelector(".home-approach-hint").hidden = false;
  approach.dataset.intro = "pending";
  function playIntro() {
    if (observer) observer.disconnect();
    if (approach.dataset.intro !== "pending") return;
    if (reducedMotion.matches || !diagram.animate) { stopIntro(); return; }
    approach.dataset.intro = "playing";
    var accent = getComputedStyle(approach).getPropertyValue("--accent").trim();
    var stagger = 700;
    introAnimations = tabs.flatMap(function (tab, index) {
      var delay = index * stagger;
      var style = getComputedStyle(tab);
      var animations = [tab.parentElement.animate([
        { opacity: .6, transform: "translateY(-5px)" },
        { opacity: 1, transform: "translateY(0)" }
      ], { duration: 1000, delay: delay, easing: "cubic-bezier(.22,.61,.36,1)", fill: "backwards" }),
      tab.animate([
        { borderColor: style.borderColor, boxShadow: style.boxShadow },
        { borderColor: "color-mix(in srgb, " + accent + " 55%, " + style.borderColor + ")", boxShadow: "0 0 18px color-mix(in srgb, " + accent + " 12%, transparent)", offset: .45 },
        { borderColor: "color-mix(in srgb, " + accent + " 55%, " + style.borderColor + ")", boxShadow: "0 0 18px color-mix(in srgb, " + accent + " 12%, transparent)", offset: .6 },
        { borderColor: style.borderColor, boxShadow: style.boxShadow }
      ], { duration: 1600, delay: delay, easing: "ease-in-out" })];
      var trace = tab.querySelector("svg path");
      if (trace) {
        var length = trace.getTotalLength();
        animations.push(trace.animate([
          { strokeDasharray: length + " " + length, strokeDashoffset: length, opacity: .4 },
          { strokeDasharray: length + " " + length, strokeDashoffset: 0, opacity: 1 }
        ], { duration: 1200, delay: delay + 180, easing: "cubic-bezier(.25,.1,.25,1)", fill: "backwards" }));
      }
      return animations;
    });
    introAnimations.push(scan.animate([
      { transform: "scaleY(0)", opacity: 0 },
      { transform: "scaleY(0)", opacity: .45, offset: .07 },
      { transform: "scaleY(1)", opacity: .45, offset: .82 },
      { transform: "scaleY(1)", opacity: 0 }
    ], { duration: (tabs.length - 1) * stagger + 1800, easing: "linear" }));
    introAnimations[introAnimations.length - 1].onfinish = stopIntro;
  }
  if ("IntersectionObserver" in window) {
    observer = new IntersectionObserver(function (entries) {
      if (entries.some(function (entry) { return entry.isIntersecting && entry.intersectionRatio >= .55; })) playIntro();
    }, { threshold: .55, rootMargin: "0px 0px -24px 0px" });
    observer.observe(diagram);
  } else stopIntro();
  if (reducedMotion.addEventListener) reducedMotion.addEventListener("change", function () {
    if (reducedMotion.matches) { stopIntro(); stopDetail(); }
  });
})();
