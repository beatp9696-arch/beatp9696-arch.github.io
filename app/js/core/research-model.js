export const POWERS = [
  ["scale", "Scale economies"], ["network", "Network economies"],
  ["switching", "Switching costs"], ["counter", "Counter-positioning"],
  ["brand", "Branding"], ["resources", "Cornered resource"], ["process", "Process power"],
];

const dateOK = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && Number.isFinite(Date.parse(s)) && new Date(s).toISOString().slice(0, 10) === s;
export function validateResearch(data) {
  if (data?.version !== 1 || !Array.isArray(data.companies) || !data.companies.length) throw new Error("Invalid research catalog");
  const seen = new Set();
  for (const c of data.companies) {
    if (!/^[A-Z]{1,6}$/.test(c.ticker) || seen.has(c.ticker) || !c.name || !c.thesis || !/^#[0-9a-fA-F]{6}$/.test(c.color) ||
      !dateOK(c.snapshotDate) || !dateOK(c.reviewDue) || !c.period ||
      !/^deep-dive-[a-z]+\.html$/.test(c.article) || !Array.isArray(c.monitors) ||
      !Array.isArray(c.reports) || !c.reports.length || !c.powers) throw new Error("Invalid company snapshot");
    seen.add(c.ticker);
    for (const [key, p] of Object.entries(c.powers)) {
      if (!POWERS.some(([id]) => id === key) || !["evidenced", "partial"].includes(p.status) || !p.note || !/^sec-\d+$/.test(p.source)) throw new Error("Invalid moat evidence");
    }
    for (const m of c.monitors) {
      if (!m.title || !m.observation || !m.condition || !m.gap || !/^sec-\d+$/.test(m.source)) throw new Error("Invalid monitor");
    }
    for (const r of c.reports) {
      if (!/^[a-z0-9-]+$/.test(r.id) || !r.from || !r.to || !r.note || !Array.isArray(r.metrics) || !r.metrics.length) throw new Error("Invalid report");
      for (const m of r.metrics) {
        if (!m.label || !["percent", "USD bn", "NTD bn"].includes(m.unit) ||
          !["higher", "lower", "neutral"].includes(m.favorable) || !m.note || !/^sec-\d+$/.test(m.source) ||
          ![m.previous, m.current].every((v) => v === null || (typeof v === "number" && Number.isFinite(v)))) throw new Error("Invalid metric");
      }
    }
  }
  return data;
}

export function needsReview(company, now = new Date()) {
  return now.toISOString().slice(0, 10) >= company.reviewDue;
}

export function metricDelta(metric) {
  if (!Number.isFinite(metric.previous) || !Number.isFinite(metric.current)) return null;
  const difference = metric.current - metric.previous;
  const value = metric.unit === "percent" ? difference : metric.previous === 0 ? null : difference / Math.abs(metric.previous) * 100;
  const direction = difference === 0 || metric.favorable === "neutral" ? "neutral" :
    (difference > 0) === (metric.favorable === "higher") ? "positive" : "negative";
  return { value, unit: metric.unit === "percent" ? "pp" : "%", difference, direction };
}

export function portfolioCoverage(holdings, companies) {
  const catalog = new Set(companies.map((c) => c.ticker));
  const rows = (Array.isArray(holdings) ? holdings : []).filter((h) => h && typeof h.tk === "string");
  let total = 0, coveredValue = 0, unpriced = 0;
  for (const h of rows) {
    const v = typeof h.shares === "number" && typeof h.price === "number" ? h.shares * h.price : NaN;
    if (!Number.isFinite(v) || h.shares <= 0 || h.price <= 0) { unpriced++; continue; }
    total += v;
    if (catalog.has(h.tk)) coveredValue += v;
  }
  return {
    count: rows.length, covered: rows.filter((h) => catalog.has(h.tk)).length, unpriced,
    // A percentage of a partially priced book would overstate coverage.
    percent: total > 0 && unpriced === 0 ? coveredValue / total * 100 : null,
    tickers: [...new Set(rows.filter((h) => catalog.has(h.tk)).map((h) => h.tk))],
  };
}

export const escapeHTML = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const dateLabel = (value) => new Date(`${value}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
