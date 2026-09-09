import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {summarizeFund, donutRows, matchesFund, validateDataset} from '../js/core/smart-money-model.js';

const source=JSON.parse(readFileSync(new URL('../data/smart-money.json',import.meta.url),'utf8'));
validateDataset(source);
const funds=source.funds.map(summarizeFund);
for(const fund of funds){
  assert.ok(Math.abs(fund.rows.reduce((s,r)=>s+r.weight,0)-100)<1e-8);
  assert.ok(Math.abs(donutRows(fund.rows,fund.current.totalValue).reduce((s,r)=>s+r.fraction,0)-1)<1e-8);
  assert.equal(new Set(fund.rows.map(r=>r.id)).size,fund.rows.length);
}
const brk=funds.find(f=>f.id==='berkshire');
assert.equal(brk.current.totalValue,299253556246);
assert.equal(brk.rows.find(r=>r.symbol==='AAPL').shares,227917808); // 12 manager rows combined.
assert.equal(brk.rows.find(r=>r.symbol==='AAPL').status,'unchanged'); // Price/value growth is not buying.
const nv=funds.find(f=>f.id==='nvidia');
assert.equal(nv.rows.find(r=>r.symbol==='SpaceX').status,'new');
assert.equal(nv.rows.find(r=>r.symbol==='SpaceX').changePercent,null); // No divide-by-zero percentage.
const ps=funds.find(f=>f.id==='pershing');
assert.ok(ps.exits.length>0);
assert.ok(ps.exits.every(r=>r.value===0&&r.weight===0&&r.status==='exited'));
const tm=funds.find(f=>f.id==='temasek');
assert.ok(donutRows(tm.rows,tm.current.totalValue).at(-1).fraction>.6); // Other is not dropped or renormalized away.
assert.ok(matchesFund(brk,'  apple '));
assert.ok(matchesFund(nv,'NVDA'));
assert.ok(matchesFund(nv,'nvidia'));
const broken=structuredClone(source);broken.funds[0].current.totalValue+=100;
assert.throws(()=>validateDataset(broken),/reconcile/);
const duplicate=structuredClone(source);duplicate.funds[0].current.holdings.push(duplicate.funds[0].current.holdings[0]);
assert.throws(()=>validateDataset(duplicate),/position/);
assert.deepEqual(donutRows([],0),[]);
console.log('PASS: SEC totals; aggregation; share changes vs value changes; new/exited positions; full allocation; search; malformed data rejection.');
