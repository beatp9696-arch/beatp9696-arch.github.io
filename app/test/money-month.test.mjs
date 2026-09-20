import assert from 'node:assert/strict';
import { monthSummary } from '../js/core/money-month.js';
const rows = [
  { type: 'in', amount: 10000, date: '2026-09-01', split: { savings: 20, invest: 10 } },
  { type: 'out', amount: 3000, cat: 'Food', date: '2026-09-15', roundup: 10 },
  { type: 'out', amount: 500, cat: 'Transport', date: '2026-09-20' },
  { type: 'out', amount: 900, cat: 'Home', date: '2026-08-31' },
  { type: 'out', amount: 800, cat: 'Food', date: '2026-09-21' },
];
const original = JSON.stringify(rows);
assert.deepEqual(monthSummary(rows, { Food: 2500, Home: 1000 }, '2026-09-20'), {
  income: 10000, spending: 3500, net: 6500, budget: 3500, budgetedSpending: 3000, remaining: 500,
  unbudgeted: 500, over: [{ category: 'Food', cap: 2500, spent: 3000 }], entries: 3,
});
assert.equal(JSON.stringify(rows), original, 'summary never changes financial records');
assert.equal(monthSummary(rows, {}, '2026-09-20').remaining, null, 'no budget is not zero available');
assert.equal(monthSummary(rows, { Food: 2000 }, '2026-09-20').remaining, -1000);
assert.equal(monthSummary(rows, {}, '2026-08-31').net, -900);
assert.equal(monthSummary([{ amount: NaN, type: 'out', date: '2026-09-20' }], {}, '2026-09-20').entries, 0);
assert.equal(monthSummary(null, null, '2026-09-20').net, 0);
console.log('Monthly summary: allocations, roundups, uncapped spending, overspend, future entries and no-data states passed.');
