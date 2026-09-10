import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {summarizeFund} from '../js/core/smart-money-model.js';
import {sameSecurity, stockOwnership} from '../js/core/smart-money-stock.js';

const position = {id:'037833100|SH|',cusip:'037833100',symbol:'AAPL',issuer:'Apple',unit:'SH',option:'',shares:100,value:1000};
const fund = (id, current, previous, historical = false) => summarizeFund({id,name:id,historical,
  current:{holdings:current,totalValue:10000}, previous:{holdings:previous,totalValue:10000}});
const added = fund('added',[position],[{...position,shares:80}]);
const reduced = fund('reduced',[{...position,shares:40}],[position]);
const fresh = fund('new',[position],[]);
const zeroBase = fund('zero',[position],[{...position,shares:0}]);
const exited = fund('exited',[],[position]);
const historical = fund('history',[position],[position],true);
const call = {...position,id:'037833100|SH|Call',option:'Call'};
const put = {...position,id:'037833100|SH|Put',option:'Put'};
const debt = {...position,id:'037833100|PRN|',unit:'PRN'};
const instruments = fund('instruments',[call,put,debt],[]);
const estimates = [{id:'estimate',estimatedHoldings:{asOf:null,rows:[{symbol:'AAPL',weight:5.66,shares:171230}]}},
  {id:'transactions-only',disclosure:{entries:[{symbol:'AAPL',action:'purchase'}]}}];
const result = stockOwnership(position,[added,reduced,fresh,zeroBase,exited,historical,instruments],estimates);
assert.equal(result.portfolioCount,4);
assert.equal(result.current.length,4);
assert.equal(result.exited.length,1);
assert.equal(result.historical.length,1);
assert.deepEqual(result.current.find(x=>x.fund.id==='added').row.delta,20);
assert.equal(result.current.find(x=>x.fund.id==='reduced').row.delta,-60);
assert.equal(result.current.find(x=>x.fund.id==='new').row.delta,null);
assert.equal(result.current.find(x=>x.fund.id==='zero').row.changePercent,null);
assert.equal(result.exited[0].row.delta,-100);
assert.equal(result.estimates.length,1);
assert.equal(result.estimates[0].row.delta,undefined);
assert.equal(stockOwnership(call,[instruments],estimates).current.length,1);
assert.equal(stockOwnership(call,[instruments],estimates).estimates.length,0);
assert.equal(stockOwnership(debt,[instruments],estimates).estimates.length,0);
assert.equal(stockOwnership({symbol:'AAPL'},[added,instruments],estimates).current.length,1);
assert.equal(sameSecurity(position,{...position,symbol:null}),true); // Exact identity works without a ticker.
assert.equal(sameSecurity(position,{...position,cusip:'OTHER'}),false);
assert.equal(sameSecurity({symbol:'GOOG'},{...position,symbol:'GOOGL'}),false);
assert.equal(sameSecurity({issuer:'Apple'},position),false); // Never match by issuer name.

const catalog=JSON.parse(readFileSync(new URL('../data/smart-money.json',import.meta.url)));
const funds=catalog.funds.map(f=>summarizeFund(JSON.parse(readFileSync(new URL('../data/'+f.detailFile,import.meta.url)))));
const apple=stockOwnership(position,funds,catalog.disclosures);
const berkshire=apple.current.find(x=>x.fund.id==='berkshire');
assert.equal(berkshire.row.shares,227917808);
assert.equal(berkshire.row.delta,0);
assert.equal(berkshire.fund.current.reportDate,'2026-06-30');
assert.equal(apple.current.filter(x=>x.fund.id==='blackrock').length,1); // Its AAPL call is a separate instrument.
assert.equal(apple.estimates.length,2);
assert.equal(apple.portfolioCount,10);
console.log('PASS: exact security matching; share classes, options and principal separated; increases, decreases, new, zero-base, exits, historical and estimated holdings; real AAPL figures.');
