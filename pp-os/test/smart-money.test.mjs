import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {summarizeFund, donutRows, topHoldingRows, matchesFund, validateDataset, validateFund} from '../js/core/smart-money-model.js';

const source=JSON.parse(readFileSync(new URL('../data/smart-money.json',import.meta.url),'utf8'));
validateDataset(source);
const funds=source.funds.map(summary=>{
  const payload=readFileSync(new URL('../data/'+summary.detailFile,import.meta.url),'utf8');
  const hash=createHash('sha256').update(payload).digest('hex').slice(0,12);
  assert.ok(summary.detailFile.endsWith('-'+hash+'.json'));
  const fund=summarizeFund(validateFund(JSON.parse(payload)));
  assert.equal(fund.id,summary.id);assert.equal(fund.rows.length,summary.positionCount);
  assert.equal(fund.changes.length,summary.changeCount);assert.equal(fund.exits.length,summary.exitCount);
  assert.equal(fund.current.totalValue,summary.current.totalValue);
  assert.ok(Math.abs(fund.topFiveWeight-summary.topFiveWeight)<1e-9);
  const chart=donutRows(fund.rows,fund.current.totalValue);
  assert.deepEqual(chart.map(r=>[r.id,r.value]),summary.chart.map(r=>[r.id,r.value]));
  const focused = topHoldingRows(fund.rows);
  const allocation = rows => rows.map(({id, value, fraction}) => ({id, value, fraction}));
  assert.deepEqual(allocation(focused), allocation(topHoldingRows(summary.rows)));
  assert.ok(focused.length <= 5 && focused.every(row => row.id !== 'other'));
  assert.ok(Math.abs(focused.reduce((sum, row) => sum + row.fraction, 0) - 1) < 1e-10);
  assert.deepEqual(focused.map(row => row.weight), fund.rows.slice(0, 5).map(row => row.weight));
  assert.deepEqual(fund.changes.slice(0,2).map(r=>[r.id,r.status,r.changePercent]),summary.changes.map(r=>[r.id,r.status,r.changePercent]));
  assert.ok(matchesFund(summary,fund.rows.at(-1).issuer)); // Search includes holdings outside chart.
  return fund;
});
assert.equal(funds.length,14);assert.equal(source.disclosures.length,2);
assert.equal(funds.filter(f=>f.category==='institution').length,6);
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
// The focused visual excludes Other; the underlying full-portfolio data remains intact.
assert.deepEqual(topHoldingRows([]), []);
assert.deepEqual(topHoldingRows([{id:'zero',value:0},{id:'other',value:99}]), []);
const unordered = [{id:'a',value:1},{id:'b',value:3},{id:'c',value:2}];
assert.deepEqual(topHoldingRows(unordered,2).map(row=>[row.id,row.fraction]), [['b',.6],['c',.4]]);
assert.deepEqual(unordered.map(row=>row.id), ['a','b','c']);
assert.ok(matchesFund(brk,'  apple '));
assert.ok(matchesFund(nv,'NVDA'));
assert.ok(matchesFund(nv,'nvidia'));
const broken=structuredClone(source);broken.funds[0].current.totalValue+=100;
assert.throws(()=>validateDataset(broken));
const duplicate=structuredClone(brk);duplicate.current.holdings.push(duplicate.current.holdings[0]);
assert.throws(()=>validateFund(duplicate),/position/);
const munger=funds.find(f=>f.id==='daily-journal');
assert.equal(munger.historical,true);assert.equal(munger.current.reportDate,'2023-09-30');
assert.equal(munger.current.totalValue,158665348);assert.ok(matchesFund(munger,'Charles Munger'));
const vanguard=funds.find(f=>f.id==='vanguard-capital');
assert.equal(vanguard.previous.sources.length,3);
assert.equal(vanguard.previous.totalValue,3995910438125+46987828353);
const ivz=funds.find(f=>f.id==='invesco');
assert.equal(ivz.previous.reconciliationDifference,-898);
assert.equal(ivz.previous.totalValue,1023963243529);
const zeroBase=funds.find(f=>f.id==='jpmorgan').rows.filter(r=>r.previousShares===0&&r.shares>0);
assert.ok(zeroBase.length>0);
assert.ok(zeroBase.every(r=>r.status==='added'&&r.changePercent===null)); // Present at zero shares is not a new position.
const trump=source.disclosures.find(f=>f.id==='trump');
const pelosi=source.disclosures.find(f=>f.id==='pelosi');
assert.equal(trump.disclosure.type,'transactions');assert.equal(pelosi.disclosure.type,'assets');
assert.equal(trump.disclosure.entries.filter(r=>r.symbol==='GS').length,2); // Separate buy and sale, never netted into holdings.
assert.ok(pelosi.disclosure.entries.every(r=>r.owner==='SP'));
assert.ok(matchesFund(pelosi,'MSFT'));assert.ok(matchesFund(trump,'ทรัมป์'));
const estimate = trump.estimatedHoldings;
assert.equal(estimate.sourceType, 'user-screenshot');
assert.equal(estimate.asOf, null);
assert.equal(estimate.rows.length, 145);
assert.equal(pelosi.estimatedHoldings.rows.length, 22);
assert.deepEqual(pelosi.estimatedHoldings.rows[0], {symbol:'NVDA',issuer:'NVIDIA',weight:12.93,shares:85430});
assert.deepEqual(estimate.rows[0], {symbol:'AAPL',issuer:'Apple',weight:5.66,shares:171230});
assert.equal(estimate.rows.find(row=>row.symbol==='NVDA').weight,4.72);
assert.ok(estimate.rows.some(row=>row.symbol==='GOOG'));
assert.ok(estimate.rows.some(row=>row.symbol==='GOOGL')); // The expanded screenshots include both share classes.
assert.ok(matchesFund(trump,'MRK'));
assert.ok(Math.abs(estimate.rows.slice(0,5).reduce((sum,row)=>sum+row.weight,0)-20.83)<1e-10);
const disclosureSource=JSON.parse(readFileSync(new URL('../data/smart-money-disclosures.json',import.meta.url),'utf8'));
assert.deepEqual(source.disclosures,disclosureSource);
const badEstimate=structuredClone(source);badEstimate.disclosures[0].estimatedHoldings.rows[0].weight=101;
assert.throws(()=>validateDataset(badEstimate),/estimate/);
const badEstimateSource=structuredClone(source);badEstimateSource.disclosures[0].estimatedHoldings.sources[0].image='../private.png';
assert.throws(()=>validateDataset(badEstimateSource),/estimate/);
const invalidRange=structuredClone(source);invalidRange.disclosures[0].disclosure.entries[0].valueMax=1;
assert.throws(()=>validateDataset(invalidRange),/range/);
const unsafe=structuredClone(source);unsafe.disclosures[0].disclosure.source='javascript:alert(1)';
assert.throws(()=>validateDataset(unsafe),/source/);
const traversal=structuredClone(source);traversal.funds[0].detailFile='../private.json';
assert.throws(()=>validateDataset(traversal),/detail/);
const fabricatedPortfolio=structuredClone(source);fabricatedPortfolio.disclosures[0].chart=[];
assert.throws(()=>validateDataset(fabricatedPortfolio),/disclosure/);
assert.deepEqual(donutRows([],0),[]);
console.log('PASS: 16 profiles; catalog/detail hashes and figures agree; SEC totals and amendments; historical attribution; ranges and spouse ownership; search; malformed data rejection.');
