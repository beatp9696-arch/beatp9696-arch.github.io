import { load, save } from "../core/storage.js";
import { countUp, stagger, timeShort } from "../core/ui.js";

// Open-Meteo — ฟรี ไม่ต้องมี API key, CORS เปิด
// export ไว้ให้หน้า Me ดึงสภาพอากาศมาโชว์ได้โดยไม่ต้องเขียน logic ซ้ำ
export const DEFAULT_LOC = { lat: 13.7563, lon: 100.5018, label: "Bangkok" };
const DAY_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// ไอคอนสภาพอากาศแบบเส้น (Lucide-style) แทนอิโมจิ — โทน monochrome คมชัด ดูโปร
const wsvg = (p) =>
  `<svg class="wx-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;

const WX_ICONS = {
  sun: wsvg('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
  partly: wsvg('<path d="M12 2v2M4.9 4.9l1.4 1.4M20 12h2M18.7 5.3l-1.4 1.4M15.9 12.6A4 4 0 1 0 10 8.1"/><path d="M13 22H7a5 5 0 1 1 4.9-6H13a3 3 0 0 1 0 6Z"/>'),
  cloud: wsvg('<path d="M17.5 19H9a7 7 0 1 1 6.7-9h1.8a4.5 4.5 0 1 1 0 9Z"/>'),
  fog: wsvg('<path d="M4 14.9A7 7 0 1 1 15.7 8h1.8a4.5 4.5 0 0 1 2.5 8.2"/><path d="M16 17H7M17 21H9"/>'),
  drizzle: wsvg('<path d="M4 14.9A7 7 0 1 1 15.7 8h1.8a4.5 4.5 0 0 1 2.5 8.2"/><path d="M8 19v1M8 14v1M16 19v1M16 14v1M12 21v1M12 16v1"/>'),
  rain: wsvg('<path d="M4 14.9A7 7 0 1 1 15.7 8h1.8a4.5 4.5 0 0 1 2.5 8.2"/><path d="M16 14v6M8 14v6M12 16v6"/>'),
  snow: wsvg('<path d="M4 14.9A7 7 0 1 1 15.7 8h1.8a4.5 4.5 0 0 1 2.5 8.2"/><path d="M8 15h.01M8 19h.01M12 17h.01M12 21h.01M16 15h.01M16 19h.01"/>'),
  storm: wsvg('<path d="M6 16.3A7 7 0 1 1 15.7 8h1.8a4.5 4.5 0 0 1 .5 9"/><path d="m13 12-3 5h4l-3 5"/>'),
};

const WMO = [
  [[0], "Clear", "sun"],
  [[1, 2], "Partly cloudy", "partly"],
  [[3], "Overcast", "cloud"],
  [[45, 48], "Fog", "fog"],
  [[51, 53, 55, 56, 57], "Drizzle", "drizzle"],
  [[61, 63, 65, 66, 67], "Rain", "rain"],
  [[71, 73, 75, 77, 85, 86], "Snow", "snow"],
  [[80, 81, 82], "Showers", "rain"],
  [[95], "Thunderstorm", "storm"],
  [[96, 99], "Hailstorm", "storm"],
];

// ไอคอนเสริม (หมุด/รีเฟรช/หยดฝน) + ไอคอนหัว tile ใน Highlights
const usvg = (p) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;

export const WX_UI = {
  pin: usvg('<path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11Z"/><circle cx="12" cy="10" r="2.5"/>'),
  refresh: usvg('<path d="M21 12a9 9 0 1 1-2.64-6.36M21 3v5h-5"/>'),
  drop: '<svg class="wx-drop" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 3s6 6.4 6 10.5A6 6 0 0 1 6 13.5C6 9.4 12 3 12 3Z"/></svg>',
  uv: usvg('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
  air: usvg('<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10Z"/><path d="M2 21c0-3 1.85-5.4 5-6"/>'),
  humid: usvg('<path d="M12 3s6 6.4 6 10.5A6 6 0 0 1 6 13.5C6 9.4 12 3 12 3Z"/>'),
  wind: usvg('<path d="M4 8h11a2.5 2.5 0 1 0-2.5-2.5M4 16h13a2.5 2.5 0 1 1-2.5 2.5M4 12h8"/>'),
  sunrise: usvg('<path d="M12 9V3M9 5.5 12 3l3 2.5M4 20h16M17 20a5 5 0 0 0-10 0M5 13l1.4 1.4M19 13l-1.4 1.4"/>'),
  sunset: usvg('<path d="M12 3v6M9 6.5 12 9l3-2.5M4 20h16M17 20a5 5 0 0 0-10 0M5 13l1.4 1.4M19 13l-1.4 1.4"/>'),
};

// UV index → ระดับ + สี + สัดส่วน (มาตรฐาน WHO)
export function uvLevel(uv) {
  if (uv == null || !Number.isFinite(uv)) return null;
  const v = Math.round(uv);
  const f = Math.min(v / 11, 1);
  if (v <= 2) return { v, label: "Low", c: "#3fb950", f };
  if (v <= 5) return { v, label: "Moderate", c: "#d4a72c", f };
  if (v <= 7) return { v, label: "High", c: "#f0883e", f };
  if (v <= 10) return { v, label: "Very high", c: "#e5534b", f };
  return { v, label: "Extreme", c: "#bc4fce", f: 1 };
}

const COMPASS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
const compass = (deg) => (deg == null ? "" : COMPASS[Math.round((deg % 360) / 45) % 8]);

export function describe(code) {
  const hit = WMO.find(([codes]) => codes.includes(code));
  const key = hit ? hit[2] : "cloud";
  return { t: hit ? hit[1] : "—", icon: WX_ICONS[key], key };
}

export async function fetchForecast({ lat, lon }) {
  const u = new URL("https://api.open-meteo.com/v1/forecast");
  u.search = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    current: "temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m,uv_index",
    hourly: "temperature_2m",
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max,sunrise,sunset",
    timezone: "auto",
    forecast_days: "6",
  });
  const res = await fetch(u);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// คุณภาพอากาศ — คนละ endpoint กับพยากรณ์ (Open-Meteo Air Quality) ฟรี ไม่ต้องมี key เหมือนกัน
export async function fetchAirQuality({ lat, lon }) {
  const u = new URL("https://air-quality-api.open-meteo.com/v1/air-quality");
  u.search = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    current: "us_aqi,pm2_5",
    timezone: "auto",
  });
  const res = await fetch(u);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// แปลงค่า US AQI → ระดับ + สีเตือน (มาตรฐาน EPA)
export function aqiLevel(aqi) {
  if (aqi == null || !Number.isFinite(aqi)) return null;
  if (aqi <= 50) return { label: "Good", c: "#3fb950" };
  if (aqi <= 100) return { label: "Moderate", c: "#d4a72c" };
  if (aqi <= 150) return { label: "Sensitive", c: "#f0883e" };
  if (aqi <= 200) return { label: "Unhealthy", c: "#e5534b" };
  if (aqi <= 300) return { label: "Very unhealthy", c: "#bc4fce" };
  return { label: "Hazardous", c: "#a11f2f" };
}

// เส้นโค้งลื่นผ่านทุกจุด (Catmull-Rom → Bézier) — เส้นหักศอกทำให้กราฟดูเป็นแผนภูมิราชการ
function smoothPath(pts) {
  if (pts.length < 3) return pts.map((p, i) => `${i ? "L" : "M"}${p.x},${p.y}`).join(" ");
  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2.x},${p2.y}`;
  }
  return d;
}

// กราฟ 24 ชม. ข้างหน้า — จุดทุก 3 ชม. + พื้นไล่เฉดใต้เส้น
function hourlyChart(hourly) {
  if (!hourly?.time?.length) return "";
  const nowMs = Date.now();
  let start = hourly.time.findIndex((t) => new Date(t).getTime() >= nowMs);
  if (start < 0) start = 0;

  const raw = [];
  for (let i = 0; i < 8; i++) {
    const j = start + i * 3;
    if (j >= hourly.time.length) break;
    const d = new Date(hourly.time[j]);
    raw.push({ h: d.getHours(), t: hourly.temperature_2m[j] });
  }
  if (raw.length < 3) return "";

  const label = (h) => `${((h + 11) % 12) + 1}${h < 12 ? "am" : "pm"}`;
  const min = Math.min(...raw.map((p) => p.t));
  const max = Math.max(...raw.map((p) => p.t));
  const span = Math.max(1, max - min);
  const W = 330;
  const H = 104;
  const pts = raw.map((p, i) => ({
    ...p,
    x: +(22 + (i * (W - 44)) / (raw.length - 1)).toFixed(1),
    y: +(32 + (1 - (p.t - min) / span) * 40).toFixed(1),
  }));

  const line = smoothPath(pts);
  const area = `${line} L${pts.at(-1).x},${H - 20} L${pts[0].x},${H - 20} Z`;

  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Temperature over the next 24 hours">
    <defs>
      <linearGradient id="wxg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="currentColor" stop-opacity="0.16"/>
        <stop offset="100%" stop-color="currentColor" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <path d="${area}" fill="url(#wxg)"/>
    <path class="wx-line-path" d="${line}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" opacity="0.75"/>
    ${pts
      .map(
        (p, i) => `<circle cx="${p.x}" cy="${p.y}" r="${i === 0 ? 3.6 : 2.4}" fill="currentColor"${i === 0 ? "" : ' opacity="0.5"'}/>
      <text x="${p.x}" y="${(p.y - 10).toFixed(1)}" text-anchor="middle" font-size="10.5" font-family="Inter, sans-serif" font-weight="600" fill="currentColor">${Math.round(p.t)}°</text>
      <text x="${p.x}" y="${H - 4}" text-anchor="middle" font-size="9.5" font-family="IBM Plex Mono, monospace" fill="currentColor" opacity="0.45">${label(p.h)}</text>`
      )
      .join("")}
  </svg>`;
}

export default {
  id: "weather",
  name: "Weather",
  icon: "⛅",
  defaultSize: { w: 420, h: 700 },
  mount(body) {
    body.classList.add("app-pane", "app-weather");
    let loc = load("weather.loc", DEFAULT_LOC);
    let firstPaint = true;

    body.innerHTML = `
      <header class="page-head">
        <div>
          <div class="eyebrow">Weather</div>
          <h1 class="page-title loc"></h1>
        </div>
        <div class="head-actions">
          <button class="icon-btn use-geo" title="Use current location" aria-label="Use current location">${WX_UI.pin}</button>
          <button class="icon-btn refresh" title="Refresh" aria-label="Refresh">${WX_UI.refresh}</button>
        </div>
      </header>
      <div class="wx-main"><div class="card"><div class="empty">Loading…</div></div></div>
    `;

    const locEl = body.querySelector(".loc");
    const main = body.querySelector(".wx-main");
    locEl.textContent = loc.label;

    const render = (data, ts, stale = false, air = null) => {
      const c = data.current;
      const now = describe(c.weather_code);
      const d = data.daily;
      const aqi = air?.current?.us_aqi;
      const lvl = aqiLevel(aqi);
      const uv = uvLevel(c.uv_index ?? d.uv_index_max?.[0]);
      const sunrise = d.sunrise?.[0] ? timeShort(new Date(d.sunrise[0])) : "—";
      const sunset = d.sunset?.[0] ? timeShort(new Date(d.sunset[0])) : "—";
      const windDir = compass(c.wind_direction_10m);

      // สเกลร่วมทั้งสัปดาห์ — pill ของแต่ละวันวางบนแกน min→max เดียวกัน เทียบข้ามวันได้ด้วยตา
      const weekMin = Math.min(...d.temperature_2m_min);
      const weekMax = Math.max(...d.temperature_2m_max);
      const weekSpan = Math.max(1, weekMax - weekMin);
      const chart = hourlyChart(data.hourly);

      main.innerHTML = `
        <div class="card">
          <div class="card-head"><span class="card-title">Right Now</span></div>
          <div class="wx-now">
            <span class="emoji">${now.icon}</span>
            <div>
              <div class="t"></div>
              <div class="desc">${now.t} · feels ${Math.round(c.apparent_temperature)}°</div>
            </div>
          </div>
          <div class="wx-hilo">
            <span class="up">H:${Math.round(d.temperature_2m_max[0])}°</span>
            <span class="dn">L:${Math.round(d.temperature_2m_min[0])}°</span>
          </div>
        </div>

        ${
          chart
            ? `<div class="card">
                <div class="card-head"><span class="card-title">Next 24 Hours</span></div>
                <div class="wx-chart">${chart}</div>
              </div>`
            : ""
        }

        <div class="card">
          <div class="card-head"><span class="card-title">Next 6 Days</span></div>
          <div class="list wx-days">
            ${d.time
              .map((t, i) => {
                const w = describe(d.weather_code[i]);
                const day = i === 0 ? "Today" : DAY_EN[new Date(t).getDay()];
                const lo = d.temperature_2m_min[i];
                const hi = d.temperature_2m_max[i];
                const left = ((lo - weekMin) / weekSpan) * 100;
                const width = Math.max(8, ((hi - lo) / weekSpan) * 100);
                return `<div class="wx-day">
                  <span class="d">${day}</span><span class="e">${w.icon}</span>
                  <span class="rain">${WX_UI.drop}${d.precipitation_probability_max[i] ?? 0}%</span>
                  <span class="wx-range">
                    <span class="lo">${Math.round(lo)}°</span>
                    <span class="track"><span class="pill" style="left:${left.toFixed(1)}%;width:${width.toFixed(1)}%;animation-delay:${i * 60}ms"></span></span>
                    <span class="hi">${Math.round(hi)}°</span>
                  </span>
                </div>`;
              })
              .join("")}
          </div>
        </div>

        <div class="card">
          <div class="card-head"><span class="card-title">Highlights</span></div>
          <div class="wx-tiles">
            ${
              uv
                ? `<div class="wx-tile">
                    <div class="wt-head">${WX_UI.uv}<span>UV Index</span></div>
                    <div class="wt-big">${uv.v}</div>
                    <div class="wt-meter"><i class="wt-mark" style="left:${uv.f * 100}%"></i></div>
                    <div class="wt-sub">${uv.label}</div>
                  </div>`
                : ""
            }
            ${
              lvl
                ? `<div class="wx-tile">
                    <div class="wt-head">${WX_UI.air}<span>Air Quality</span></div>
                    <div class="wt-big">${Math.round(aqi)}</div>
                    <div class="wt-sub"><i class="aqi-dot" style="background:${lvl.c}"></i>${lvl.label}</div>
                  </div>`
                : ""
            }
            <div class="wx-tile">
              <div class="wt-head">${WX_UI.humid}<span>Humidity</span></div>
              <div class="wt-big">${c.relative_humidity_2m}<span class="wt-unit">%</span></div>
              <div class="wt-bar"><span style="width:${c.relative_humidity_2m}%"></span></div>
            </div>
            <div class="wx-tile">
              <div class="wt-head">${WX_UI.wind}<span>Wind</span></div>
              <div class="wt-big">${Math.round(c.wind_speed_10m)}<span class="wt-unit">km/h</span></div>
              <div class="wt-sub">${windDir ? "from " + windDir : "light air"}</div>
            </div>
            <div class="wx-tile">
              <div class="wt-head">${WX_UI.sunrise}<span>Sunrise</span></div>
              <div class="wt-big wt-time">${sunrise}</div>
            </div>
            <div class="wx-tile">
              <div class="wt-head">${WX_UI.sunset}<span>Sunset</span></div>
              <div class="wt-big wt-time">${sunset}</div>
            </div>
          </div>
        </div>

        <div class="wx-note">${stale ? "Offline · " : ""}Updated ${timeShort(new Date(ts))}</div>
      `;

      stagger(body);
      const tEl = main.querySelector(".wx-now .t");
      if (firstPaint) countUp(tEl, Math.round(c.temperature_2m), { fmt: (n) => `${Math.round(n)}°`, dur: 650 });
      else tEl.textContent = `${Math.round(c.temperature_2m)}°`;
      firstPaint = false;
    };

    const refresh = async () => {
      const cache = load("weather.cache");
      if (cache) render(cache.data, cache.ts, true, cache.air);
      try {
        const [data, air] = await Promise.all([
          fetchForecast(loc),
          fetchAirQuality(loc).catch(() => null), // AQI ล้มก็ยังโชว์อากาศได้ ไม่ให้ทั้งหน้าพัง
        ]);
        const ts = Date.now();
        save("weather.cache", { data, air, ts });
        render(data, ts, false, air);
      } catch {
        if (!cache) main.innerHTML = `<div class="card"><div class="empty">Couldn't load — check your connection and hit ⟳</div></div>`;
      }
    };

    body.querySelector(".refresh").addEventListener("click", refresh);

    body.querySelector(".use-geo").addEventListener("click", () => {
      if (!navigator.geolocation) return;
      locEl.textContent = "Locating…";
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          loc = { lat: pos.coords.latitude, lon: pos.coords.longitude, label: "My location" };
          save("weather.loc", loc);
          locEl.textContent = loc.label;
          firstPaint = true;
          refresh();
        },
        () => {
          locEl.textContent = loc.label;
          main.insertAdjacentHTML("beforeend", `<div class="wx-note">Location unavailable — showing ${loc.label}</div>`);
        },
        { timeout: 8000 }
      );
    });

    refresh();
  },
};
