import assert from 'node:assert/strict';
import {balances,monthTotals,cashFlow,budgetRows,category,makeEntry,roundup,validateAmount,validateSplit,shiftMonth,validDate,selectEntries,allocatedToGoals,fundGoal,billOccurrence,exportCSV,importCSV,entryFingerprint} from '../js/features/money/model.js';

const today='2026-09-13';
const ledger=[
  {id:1,date:'2026-08-31',type:'in',amount:1000,cat:'เงินเดือน',note:'Legacy income'},
  {id:2,date:'2026-09-01',type:'in',amount:10000,cat:'Salary',split:{savings:20,invest:10}},
  {id:3,date:'2026-09-05',type:'out',amount:123.45,roundup:6.55,cat:'Food',note:'Dinner',reviewed:true},
  {id:4,date:'2026-09-14',type:'in',amount:999999,cat:'Other'},
];
const copy=structuredClone(ledger);
assert.deepEqual(balances(ledger,today),{cash:7870,savings:2006.55,invest:1000,total:10876.55});
assert.deepEqual(ledger,copy,'Reading an old ledger must not mutate it');
assert.equal(category(ledger[0]),'Salary');
const month=monthTotals(ledger,'2026-09',today);
assert.deepEqual({...month,rate:undefined},{income:10000,expense:123.45,net:9876.55,rate:undefined,count:2});
assert.ok(Math.abs(month.rate-98.7655)<1e-8);
assert.equal(monthTotals([],'2026-09',today).rate,null);
assert.equal(cashFlow(ledger,'2026-09',6,today)[0].month,'2026-04');
assert.equal(shiftMonth('2026-01',-1),'2025-12');
assert.equal(shiftMonth('2025-12',1),'2026-01');
assert.equal(validDate('2024-02-29'),true);
assert.equal(validDate('2026-02-29'),false);
assert.equal(validDate('2026-09-31'),false);
assert.equal(roundup(123.45),6.55);assert.equal(roundup(130),0);assert.equal(roundup(.01),9.99);
for(const bad of [0,-1,Infinity,NaN,'oops',.001,1e13])assert.throws(()=>validateAmount(bad));
assert.equal(validateAmount(1000000000.01),1000000000.01);
assert.throws(()=>validateSplit({savings:80,invest:30}));
assert.throws(()=>validateSplit({savings:-1,invest:20}));
const income=makeEntry({date:today,type:'in',amount:20,cat:'Salary'},{previous:ledger[0],split:{savings:80,invest:10},today});
assert.deepEqual(income.split,{savings:0,invest:0},'Legacy all-cash income must not inherit a new allocation');
const modified=makeEntry({date:today,type:'in',amount:20000,cat:'Salary',note:'Updated'},{previous:ledger[1],split:{savings:80,invest:10},today});
assert.deepEqual(modified.split,{savings:20,invest:10});
const expense=makeEntry({date:today,type:'out',amount:101,cat:'Food'},{previous:ledger[2],roundups:false,today});
assert.equal(expense.roundup,9,'An edited rounded expense keeps its rounding behavior');
const newEntry=makeEntry({date:today,type:'out',amount:12.05,cat:'Food'},{roundups:true,today});
assert.equal(newEntry.roundup,7.95);
assert.throws(()=>makeEntry({date:'2026-09-14',type:'out',amount:1,cat:'Food'},{today}));
assert.equal(selectEntries(ledger,{query:'dinner'})[0].id,3);
assert.equal(selectEntries(ledger,{month:'2026-09',review:'reviewed'}).length,1);
assert.equal(selectEntries(ledger,{cat:'Salary'}).length,2);
assert.equal(selectEntries(ledger,{sort:'largest'})[0].id,4);
const budget=budgetRows(ledger,{Food:100,Transport:500},'2026-09',today);
assert.equal(budget.find(r=>r.cat==='Food').left,-23.45);
assert.equal(budget.find(r=>r.cat==='Food').status,'over');
assert.equal(budget.find(r=>r.cat==='Transport').status,'within');
assert.equal(budget.find(r=>r.cat==='Other').ratio,null);
assert.equal(allocatedToGoals([{saved:0.1},{saved:0.2}]),0.3);
assert.equal(fundGoal({saved:30},20,'add',20).saved,50);
assert.equal(fundGoal({saved:30},20,'release',0).saved,10);
assert.throws(()=>fundGoal({saved:30},31,'release',0));
assert.throws(()=>fundGoal({saved:30},21,'add',20));
const bill={id:'bill',day:31,startDate:'2026-01-31',amount:100};
assert.equal(billOccurrence(bill,'2026-02',[]).dueDate,'2026-02-28');
assert.equal(billOccurrence(bill,'2026-03',[]).dueDate,'2026-03-31');
assert.equal(billOccurrence(bill,'2025-12',[]),null);
assert.equal(billOccurrence(bill,'2026-02',[{recurringId:'bill',occurrence:'2026-02',amount:100}]).payment.amount,100);
const exported=ledger.slice(0,3).map(e=>({...e,note:'=HYPERLINK("evil"), ไทย\nsecond line'}));
const csv=exportCSV(exported);
assert.ok(csv.includes("'=HYPERLINK"),'Spreadsheet formulas must be neutralized');
const imported=importCSV(csv,today);
assert.deepEqual(imported.map(entryFingerprint),exported.map(entryFingerprint));
assert.deepEqual(balances(imported,today),balances(exported,today),'CSV round trips retain allocations and roundups');
assert.throws(()=>importCSV('Date,Type,Amount,Category\n2026-09-31,out,10,Food',today),/Row 2/);
assert.throws(()=>importCSV('Date,Type,Amount,Category\n2026-09-01,out,-10,Food',today),/Row 2/);
assert.throws(()=>importCSV('Date,Type,Amount,Category\n2026-09-01,out,10,"Food',today),/quotation/);
assert.throws(()=>importCSV('hello\nworld',today),/Required columns/);
assert.deepEqual(importCSV('Date,Type,Amount,Category\n2026-09-01,income,100,Salary',today)[0].split,{savings:0,invest:0});
console.log('PASS: Money historical allocations, satang arithmetic, dates, future exclusion, edit semantics, filters, budgets, goal funding limits, monthly bills and safe CSV round trips.');
