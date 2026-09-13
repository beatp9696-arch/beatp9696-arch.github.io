import test from 'node:test';
import assert from 'node:assert/strict';
import {portfolioSnapshot,selectRows,DEFAULT_VIEW,validateTargets,targetState,moneyBridge,reviewQueue,priceStale} from '../js/features/portfolio/model.js';
import {sameSecurity,stockOwnership} from '../js/core/smart-money-stock.js';

const now=Date.parse('2026-09-13T12:00:00Z');
const holdings=[{tk:'SNPS',shares:2,price:100,cost:80,priceAt:now-2*86400000},{tk:'MSFT',shares:3,price:100,cost:110,priceAt:now-2*86400000}];
test('one portfolio denominator survives every table filter and does not mutate inputs',()=>{
  const before=structuredClone(holdings),s=portfolioSnapshot(holdings,undefined,[],now);
  assert.equal(s.total,500);assert.equal(s.cost,490);assert.equal(s.gain,10);
  assert.equal(s.rows.find(r=>r.tk==='SNPS').weight,40);assert.equal(s.sectors.find(r=>r.sec==='semi').weight,40);
  assert.equal(s.top3,100);assert.equal(selectRows(s.rows,{...DEFAULT_VIEW,sector:'semi'})[0].weight,40);
  assert.deepEqual(holdings,before);
  assert.equal(selectRows(s.rows,{...DEFAULT_VIEW,query:'micro'})[0].tk,'MSFT');
  assert.equal(selectRows(s.rows,{...DEFAULT_VIEW,sort:'gain'})[0].tk,'SNPS');
});
test('missing prices, cost, invalid quantities, zero values and FX never masquerade as returns',()=>{
  for(const missing of [null,undefined,NaN,-1,Infinity]) {
    const s=portfolioSnapshot([...holdings,{tk:'X',shares:2,price:missing,cost:10}]);
    assert.equal(s.total,null);assert.equal(s.gain,null);assert.equal(s.top3,null);
    assert.ok(s.rows.every(r=>r.weight===null));assert.ok(s.sectors.every(r=>r.weight===null));
  }
  const cost=portfolioSnapshot([{tk:'X',shares:2,price:10,cost:null}]);
  assert.equal(cost.total,20);assert.equal(cost.cost,null);assert.equal(cost.gain,null);
  const zero=portfolioSnapshot([{tk:'X',shares:2,price:0,cost:5}]);
  assert.equal(zero.total,0);assert.equal(zero.gain,-10);assert.equal(zero.top3,null);
  const fx=portfolioSnapshot([...holdings,{tk:'Y',shares:2,price:100,cost:80,currency:'THB'}]);
  assert.equal(fx.total,null);assert.equal(fx.cost,null);assert.ok(fx.rows.every(r=>r.weight===null));
  assert.equal(portfolioSnapshot([{tk:'X',shares:null,price:2,cost:2}]).total,null);
});
test('explicit targets, unassigned targets and thresholds are validated without inventing allocations',()=>{
  assert.equal(targetState(50,null),'No target');assert.equal(targetState(null,50),'Unavailable');
  assert.equal(targetState(52,50),'On target');assert.equal(targetState(52.1,50),'Overweight');assert.equal(targetState(47.9,50),'Underweight');
  assert.throws(()=>validateTargets({holdings:{SNPS:60,MSFT:41}}),/100% or less/);
  assert.throws(()=>validateTargets({sectors:{semi:NaN}}));assert.throws(()=>validateTargets({top3:81,top5:80}));
  const targets=validateTargets({holdings:{SNPS:0},sectors:{semi:30}});
  const s=portfolioSnapshot(holdings,targets,[],now);
  assert.equal(s.rows.find(r=>r.tk==='SNPS').targetStatus,'Overweight');
  assert.equal(s.rows.find(r=>r.tk==='MSFT').target,null);
  assert.ok(reviewQueue(s,moneyBridge([]),[],now).some(q=>q.kind==='sector'));
});
test('Money splits and roundups conserve total cash and are never added to portfolio holdings',()=>{
  const entries=[{type:'in',date:'2026-09-01',amount:1000,split:{savings:20,invest:10}},{type:'out',date:'2026-09-02',amount:105,roundup:5}];
  const copy=structuredClone(entries),b=moneyBridge(entries,'2026-09-13');
  assert.equal(b.total,895);assert.equal(b.cash,590);assert.equal(b.savings,205);assert.equal(b.reserve,100);
  assert.equal(b.cash+b.savings+b.reserve,b.total);
  assert.equal(b.transferred,null);assert.equal(b.allocated,null);assert.equal(b.available,null);
  assert.equal(portfolioSnapshot(holdings).total,500);assert.deepEqual(entries,copy);
  assert.equal(moneyBridge([...entries,{type:'in',date:'2026-10-01',amount:1000}],'2026-09-13').total,895);
  assert.equal(moneyBridge([{type:'in',date:'2026-09-01',amount:100}]).cash,100);
});
test('empty, malformed, mixed-currency and transfer Money records are unavailable',()=>{
  assert.equal(moneyBridge([]).total,null);
  for(const e of [{type:'transfer',amount:100,date:'2026-09-01'}, {type:'in',amount:100,date:'2026-09-01',transferId:'x'}, {type:'in',amount:100,date:'2026-02-30'}, {type:'in',amount:100,date:'2026-09-01',currency:'USD'}, {type:'in',amount:100,date:'2026-09-01',split:{invest:120,savings:0}}])assert.equal(moneyBridge([e]).total,null);
});
test('freshness uses recorded dates and does not mark missing/future dates fresh',()=>{
  assert.equal(priceStale(holdings[0],now),false);
  for(const priceAt of [null,'invalid',now+1,now-5*86400000])assert.equal(priceStale({priceAt},now),true);
});
test('Berkshire aliases resolve across workspaces without mixing share classes or instruments',()=>{
  assert.equal(portfolioSnapshot([{tk:'BRK.B',shares:1,price:10,cost:9}]).rows[0].tk,'BRK-B');
  assert.ok(sameSecurity({symbol:'BRK-B'},{symbol:'BRK.B',unit:'SH',option:''}));
  assert.ok(!sameSecurity({symbol:'BRK-B'},{symbol:'BRK.A',unit:'SH',option:''}));
  assert.ok(!sameSecurity({symbol:'BRK-B'},{symbol:'BRK.B',unit:'SH',option:'Call'}));
  assert.equal(stockOwnership({symbol:'BRK-B'},[],[{estimatedHoldings:{rows:[{symbol:'BRK.B'}]}}]).estimates.length,1);
});
