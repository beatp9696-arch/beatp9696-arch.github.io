import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { POWERS, validateResearch, metricDelta, needsReview, portfolioCoverage, escapeHTML } from "../js/core/research-model.js";

const data = JSON.parse(readFileSync(new URL("../data/research.json", import.meta.url), "utf8"));
assert.equal(validateResearch(data), data);
assert.equal(POWERS.length, 7);
assert.deepEqual(data.companies.map((c) => c.ticker), ["SNPS", "TSM", "NVDA"]);
for (const c of data.companies) {
  const article = readFileSync(new URL(`../../articles/${c.article}`, import.meta.url), "utf8");
  const evidence = [...Object.values(c.powers), ...c.monitors, ...c.reports.flatMap((r) => r.metrics)];
  for (const item of evidence) assert.ok(article.includes(`id="${item.source}"`), `${c.ticker} ${item.source}`);
  assert.ok(existsSync(new URL(`../assets/brands/${c.ticker}.png`, import.meta.url)));
  assert.equal(needsReview(c, new Date("2026-09-12T00:00:00Z")), true);
  assert.equal(needsReview(c, new Date("2026-01-01T00:00:00Z")), false);
}
const nvda = data.companies[2].reports[0];
const gm = metricDelta(nvda.metrics[1]);
assert.ok(Math.abs(gm.value + 3.9) < 1e-9);
assert.equal(gm.unit, "pp");
assert.equal(gm.direction, "negative");
assert.equal(metricDelta(nvda.metrics[2]).direction, "negative");
assert.equal(metricDelta(data.companies[0].reports[1].metrics[0]).direction, "positive");
assert.equal(metricDelta({ previous: null, current: 2, unit: "USD bn" }), null);
assert.equal(metricDelta({ previous: 0, current: 2, unit: "USD bn", favorable: "higher" }).value, null);
assert.equal(metricDelta({ previous: 0, current: 2, unit: "percent", favorable: "higher" }).value, 2);
assert.equal(metricDelta({ previous: 2, current: 0, unit: "USD bn", favorable: "higher" }).value, -100);
assert.equal(metricDelta({ previous: 2, current: 2, unit: "USD bn", favorable: "higher" }).direction, "neutral");
const holdings = Object.freeze([Object.freeze({ tk: "SNPS", shares: 2, price: 100 }), Object.freeze({ tk: "MSFT", shares: 3, price: 100 })]);
const before = JSON.stringify(holdings);
assert.deepEqual(portfolioCoverage(holdings, data.companies), { count: 2, covered: 1, unpriced: 0, percent: 40, tickers: ["SNPS"] });
assert.equal(JSON.stringify(holdings), before);
assert.equal(portfolioCoverage([...holdings, { tk: "TSM", shares: 1, price: null }], data.companies).percent, null);
assert.equal(portfolioCoverage([{ tk: "TSM", shares: -1, price: 1 }], data.companies).percent, null);
assert.equal(portfolioCoverage(null, data.companies).count, 0);
assert.equal(portfolioCoverage([], data.companies).percent, null);
assert.equal(escapeHTML('<img onerror="x">'), "&lt;img onerror=&quot;x&quot;&gt;");
for (const mutate of [
  (d) => { d.version = 2; }, (d) => { d.companies[0].ticker = "<script>"; },
  (d) => { d.companies[0].reports[0].metrics[0].current = "0"; },
  (d) => { d.companies[0].reports[0].metrics[0].previous = undefined; },
  (d) => { d.companies[0].powers.scale.status = "safe"; },
  (d) => { d.companies[0].article = "https://external.invalid"; },
  (d) => { d.companies.push(d.companies[0]); },
]) {
  const broken = structuredClone(data); mutate(broken); assert.throws(() => validateResearch(broken));
}
const sync = readFileSync(new URL("../js/core/sync.js", import.meta.url), "utf8");
assert.ok(!sync.includes('"research.notes"'));
assert.ok(!sync.includes('"research.watchlist"'));
console.log("Research model: schema, source anchors, comparisons, freshness, private coverage and cache assets passed.");
