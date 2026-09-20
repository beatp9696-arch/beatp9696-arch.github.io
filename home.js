/* Enhance the homepage's real content links into an accessible tabbed explorer.
   Without JavaScript, every section remains readable and the links are anchors. */
(function () {
  "use strict";
  var workspace = document.getElementById("home-explore");
  if (!workspace) return;
  // Keep TARS at the end of the homepage instead of over the reader's content.
  var companion = document.querySelector(".home-companion");
  var buddy = document.getElementById("tars-buddy");
  if (companion && buddy) companion.appendChild(buddy);
  var list = workspace.querySelector(".home-tabs");
  var tabs = Array.from(list.querySelectorAll(".home-tab"));
  var panels = tabs.map(function (tab) {
    return document.getElementById(tab.hash.slice(1));
  });
  if (panels.some(function (panel) { return !panel; })) return;

  function select(index, focus) {
    tabs.forEach(function (tab, i) {
      tab.setAttribute("aria-selected", String(i === index));
      tab.tabIndex = i === index ? 0 : -1;
      panels[i].hidden = i !== index;
    });
    if (focus) tabs[index].focus();
  }

  list.setAttribute("role", "tablist");
  list.setAttribute("aria-label", "เลือกสิ่งที่อยากสำรวจ");
  var narrow = window.matchMedia("(max-width: 700px)");
  function setOrientation() {
    list.setAttribute("aria-orientation", narrow.matches ? "horizontal" : "vertical");
  }
  setOrientation();
  if (narrow.addEventListener) narrow.addEventListener("change", setOrientation);

  tabs.forEach(function (tab, index) {
    tab.setAttribute("role", "tab");
    tab.setAttribute("aria-controls", panels[index].id);
    panels[index].setAttribute("role", "tabpanel");
    panels[index].tabIndex = 0;
    tab.addEventListener("click", function (event) {
      // Preserve the anchor's normal new-tab behavior for modified clicks.
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      select(index, false);
    });
    tab.addEventListener("keydown", function (event) {
      var next = index;
      if (event.key === "ArrowRight" || event.key === "ArrowDown") next = (index + 1) % tabs.length;
      else if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = (index + tabs.length - 1) % tabs.length;
      else if (event.key === "Home") next = 0;
      else if (event.key === "End") next = tabs.length - 1;
      else if (event.key !== " ") return;
      event.preventDefault();
      select(next, true);
    });
  });
  workspace.classList.add("is-enhanced");
  function selectFromHash() {
    var index = panels.findIndex(function (panel) { return "#" + panel.id === location.hash; });
    if (index !== -1) select(index, false);
  }
  select(0, false);
  selectFromHash();
  window.addEventListener("hashchange", selectFromHash);

  var approach = document.querySelector(".home-approach");
  if (!approach) return;
  var diagram = approach.querySelector(".home-approach-diagram");
  var approachTabs = Array.from(diagram.querySelectorAll("[data-layer]"));
  var approachPanel = approach.querySelector(".home-approach-panel");
  var approachDot = approach.querySelector(".home-approach-dot");
  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var explanations = {
    price: ["ราคาบอกอะไรเรา", "ตลาดให้มูลค่าเท่าไรวันนี้ และคาดหวังอะไรจากธุรกิจ"],
    news: ["แยกเหตุการณ์ออกจากเสียงรบกวน", "ข่าวนี้เปลี่ยนลูกค้า ต้นทุน หรือความสามารถในการแข่งขันจริงไหม"],
    financials: ["สิ่งที่เล่า สะท้อนในตัวเลขไหม", "ดูรายได้ กำไร และกระแสเงินสดร่วมกัน แล้วเทียบสิ่งที่เปลี่ยนระหว่างงวด"],
    business: ["เข้าใจกลไกของธุรกิจ", "ใครคือลูกค้า ธุรกิจสร้างคุณค่าอย่างไร และอะไรทำให้ลูกค้ากลับมา"],
    moat: [approachPanel.querySelector("h3").textContent, approachPanel.querySelector("p").textContent]
  };
  var journey;
  var glow;
  var observer;
  var position = function (tab) { return tab.parentElement.offsetTop + tab.offsetHeight / 2 - 22; };
  var moveDot = function (tab) { diagram.style.setProperty("--approach-position", position(tab) + "px"); };
  var finishIntro = function () {
    if (observer) observer.disconnect();
    if (journey) journey.cancel();
    if (glow) glow.cancel();
    approach.dataset.intro = "done";
  };
  var selectApproachLayer = function (tab) {
    finishIntro();
    approachTabs.forEach(function (item) {
      item.setAttribute("aria-selected", String(item === tab));
      item.tabIndex = item === tab ? 0 : -1;
    });
    var copy = explanations[tab.dataset.layer];
    approachPanel.setAttribute("aria-labelledby", tab.id);
    approachPanel.querySelector(".home-approach-step").textContent = String(approachTabs.indexOf(tab) + 1).padStart(2, "0") + " / 05 · " + tab.textContent;
    approachPanel.querySelector("h3").textContent = copy[0];
    approachPanel.querySelector("p").textContent = copy[1];
    moveDot(tab);
  };
  approachTabs.forEach(function (tab, index) {
    tab.disabled = false;
    tab.addEventListener("click", function () { selectApproachLayer(tab); });
    tab.addEventListener("keydown", function (event) {
      var next = { ArrowDown: (index + 1) % approachTabs.length, ArrowUp: (index + approachTabs.length - 1) % approachTabs.length, Home: 0, End: approachTabs.length - 1 }[event.key];
      if (next === undefined) return;
      event.preventDefault();
      selectApproachLayer(approachTabs[next]);
      approachTabs[next].focus({ preventScroll: true });
    });
  });
  var hint = approach.querySelector(".home-approach-hint");
  hint.hidden = false;
  approach.dataset.intro = "pending";
  var playIntro = function () {
    if (observer) observer.disconnect();
    if (approach.dataset.intro !== "pending") return;
    if (reducedMotion.matches || !approachDot.animate) { finishIntro(); return; }
    approach.dataset.intro = "playing";
    var frames = approachTabs.flatMap(function (tab, index) {
      return [
        { transform: "translateY(" + position(tab) + "px)", offset: index / 5 },
        { transform: "translateY(" + position(tab) + "px)", offset: (index + .65) / 5 }
      ];
    });
    frames.push({ transform: "translateY(" + position(approachTabs[4]) + "px)", offset: 1 });
    journey = approachDot.animate(frames, { duration: 2400, easing: "ease-in-out" });
    journey.onfinish = function () { approach.dataset.intro = "done"; };
  };
  if ("IntersectionObserver" in window) {
    observer = new IntersectionObserver(function (entries) {
      if (entries.some(function (entry) { return entry.isIntersecting; })) playIntro();
    }, { threshold: .7, rootMargin: "0px 0px -70px 0px" });
    observer.observe(diagram);
  } else finishIntro();
  if (reducedMotion.addEventListener) reducedMotion.addEventListener("change", function () { if (reducedMotion.matches) finishIntro(); });
})();
