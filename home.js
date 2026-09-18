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
})();
