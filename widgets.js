// Moatrices — TradingView widgets (ticker tape + market overview)
// ฝังเฉพาะหน้าที่มี #tv-ticker / #tv-overview · theme ตามปุ่มสว่าง/มืด (re-render ได้)
(function () {
  "use strict";

  function theme() {
    if (window.effectiveTheme) return window.effectiveTheme();
    return (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) ? "dark" : "light";
  }

  function inject(id, src, config) {
    var host = document.getElementById(id);
    if (!host) return;
    host.innerHTML = "";              // เคลียร์ก่อน เผื่อ re-render ตอนสลับ theme
    config.colorTheme = theme();

    var container = document.createElement("div");
    container.className = "tradingview-widget-container";
    var widget = document.createElement("div");
    widget.className = "tradingview-widget-container__widget";
    container.appendChild(widget);

    var s = document.createElement("script");
    s.type = "text/javascript";
    s.async = true;
    s.src = src;
    s.text = JSON.stringify(config);
    container.appendChild(s);

    host.appendChild(container);
  }

  var TICKER   = "https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js";
  var OVERVIEW = "https://s3.tradingview.com/external-embedding/embed-widget-market-overview.js";

  function renderAll() {
    // --- แถบราคาเลื่อนผ่าน (ดัชนี + MAG 7) ---
    inject("tv-ticker", TICKER, {
      symbols: [
        { proName: "FOREXCOM:DJI",    title: "Dow" },
        { proName: "FOREXCOM:SPXUSD", title: "S&P 500" },
        { proName: "FOREXCOM:NSXUSD", title: "Nasdaq 100" },
        { proName: "NASDAQ:AAPL",  title: "Apple" },
        { proName: "NASDAQ:MSFT",  title: "Microsoft" },
        { proName: "NASDAQ:GOOGL", title: "Alphabet" },
        { proName: "NASDAQ:AMZN",  title: "Amazon" },
        { proName: "NASDAQ:NVDA",  title: "Nvidia" },
        { proName: "NASDAQ:META",  title: "Meta" },
        { proName: "NASDAQ:TSLA",  title: "Tesla" }
      ],
      showSymbolLogo: true,
      isTransparent: true,
      displayMode: "adaptive",
      locale: "en"
    });

    // --- Market overview (แท็บ Indices / Magnificent 7 + กราฟเล็ก) ---
    inject("tv-overview", OVERVIEW, {
      title: "Markets",
      width: "100%",
      height: 520,
      showChart: true,
      showSymbolLogo: true,
      isTransparent: true,
      locale: "en",
      tabs: [
        {
          title: "Indices",
          symbols: [
            { s: "FOREXCOM:DJI",    d: "Dow Jones" },
            { s: "FOREXCOM:SPXUSD", d: "S&P 500" },
            { s: "FOREXCOM:NSXUSD", d: "Nasdaq 100" }
          ]
        },
        {
          title: "Magnificent 7",
          symbols: [
            { s: "NASDAQ:AAPL",  d: "Apple" },
            { s: "NASDAQ:MSFT",  d: "Microsoft" },
            { s: "NASDAQ:GOOGL", d: "Alphabet" },
            { s: "NASDAQ:AMZN",  d: "Amazon" },
            { s: "NASDAQ:NVDA",  d: "Nvidia" },
            { s: "NASDAQ:META",  d: "Meta" },
            { s: "NASDAQ:TSLA",  d: "Tesla" }
          ]
        }
      ]
    });
  }

  window.renderTradingViewWidgets = renderAll; // ให้ปุ่ม toggle เรียก re-render ได้
  renderAll();
})();
