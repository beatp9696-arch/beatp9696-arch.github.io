import {canonicalSymbol,companyIdentity,companySector} from '../../core/company-catalog.js';
import {needsReview as thesisNeedsReview} from '../living-thesis/model.js';
import {needsReview as researchNeedsReview} from '../../core/research-model.js';

export const SECTORS = {
  semi:{label:'Semis & AI',h:214,s:80}, software:{label:'Software',h:264,s:55},
  finance:{label:'Finance',h:172,s:48}, health:{label:'Health',h:332,s:55},
  consumer:{label:'Consumer',h:36,s:70}, space:{label:'Space & defense',h:198,s:28},
  other:{label:'Other',h:220,s:8},
};
export const shade = (sector,rank=0) => {const s=SECTORS[sector]||SECTORS.other;return `hsl(${s.h} ${s.s}% ${Math.max(34,68-rank*9)}%)`;};
export const DEFAULT_TARGETS = {holdings:{},sectors:{},tolerance:2,top3:60,top5:80,updatedAt:null};
export const DEFAULT_VIEW = {query:'',sector:'all',thesis:'all',holding:'',sort:'weight',group:'sector'};
export function viewSettings(value={}) {
  return {...DEFAULT_VIEW,...Object.fromEntries(Object.entries(value||{}).filter(([k,v])=>typeof v==='string' && Object.hasOwn(DEFAULT_VIEW,k))),
    sort:['weight','gain','value','name'].includes(value?.sort)?value.sort:'weight',
    group:value?.group==='holding'?'holding':'sector'};
}
const nonnegative = n => Number.isFinite(n) && n>=0;
const product = (a,b) => nonnegative(a)&&nonnegative(b)&&Number.isFinite(a*b)?a*b:null;
const sum = values => {const result=values.every(Number.isFinite)?values.reduce((a,b)=>a+b,0):null;return Number.isFinite(result)?result:null;};
export function stamp(value) {
  const n=typeof value==='number'?value:Date.parse(value);
  return value && Number.isFinite(n) && n>0 ? n : null;
}
export function priceStale(h,now=Date.now()) {
  const at=stamp(h.priceAt);
  const close=new Date(now);close.setUTCHours(0,0,0,0);
  while([0,6].includes(close.getUTCDay()))close.setUTCDate(close.getUTCDate()-1);
  return !at || at>now || at<close.getTime();
}
export function validateTargets(input) {
  const result={...DEFAULT_TARGETS,...input};
  for(const field of ['holdings','sectors']) {
    if(!result[field] || typeof result[field]!=='object' || Array.isArray(result[field]))throw new Error('Invalid allocation targets.');
    for(const [key,n] of Object.entries(result[field])) {
      if(!nonnegative(n)||n>100 || (field==='holdings'?!/^[A-Z0-9.-]{1,20}$/.test(key):!Object.hasOwn(SECTORS,key)))throw new Error('Targets must be between 0% and 100%.');
    }
    if(Object.values(result[field]).reduce((a,b)=>a+b,0)>100.000001)throw new Error(`${field==='holdings'?'Holding':'Sector'} targets must total 100% or less.`);
  }
  if(!['tolerance','top3','top5'].every(k=>nonnegative(result[k]) && result[k]<=100) || result.top3>result.top5)throw new Error('Use thresholds from 0% to 100%, with Top 3 no higher than Top 5.');
  return result;
}
export function targetState(actual,target,tolerance=2) {
  if(!Number.isFinite(target))return 'No target';
  if(!Number.isFinite(actual))return 'Unavailable';
  return actual>target+tolerance+1e-8?'Overweight':actual<target-tolerance-1e-8?'Underweight':'On target';
}

// One complete-book denominator feeds the ring, concentration, targets and table.
// Never renormalize priced positions or a filtered subset to 100%.
export function portfolioSnapshot(holdings=[],targets=DEFAULT_TARGETS,companies=[],now=Date.now()) {
  let targetError='';try{targets=validateTargets(targets);}catch(e){targets=DEFAULT_TARGETS;targetError=e.message;}
  const rows=(Array.isArray(holdings)?holdings:[]).map(h=>{
    const tk=canonicalSymbol(h.tk),company=companies.find(c=>c.holding.symbol===tk);
    const sec=Object.hasOwn(SECTORS,h.sec)?h.sec:companySector(tk);
    const currency=h.currency||'USD';
    const value=product(h.shares,h.price),cost=product(h.shares,h.cost);
    const gain=value!==null&&cost!==null?value-cost:null;
    return {h,tk,name:companyIdentity(tk)?.[0]||h.name||tk,sec,currency,value,cost,gain,
      gainPercent:gain!==null&&cost>0?gain/cost*100:null,company,
      thesis:company?.thesis.status||'INSUFFICIENT DATA',target:targets.holdings[tk]??null,
      priceAt:stamp(h.priceAt),stale:priceStale(h,now)};
  }).sort((a,b)=>(b.value??-1)-(a.value??-1)||a.tk.localeCompare(b.tk));
  const compatible=rows.every(r=>r.currency==='USD');
  const total=compatible?sum(rows.map(r=>r.value)):null;
  const cost=compatible?sum(rows.map(r=>r.cost)):null;
  const gain=total!==null&&cost!==null?total-cost:null;
  const ranks={};
  for(const r of rows) {
    r.weight=total>0 && compatible?r.value/total*100:null;
    r.frac=r.weight===null?null:r.weight/100;r.v=r.value;
    r.rank=ranks[r.sec]=(ranks[r.sec]??-1)+1;r.color=shade(r.sec,r.rank);
    r.targetStatus=targetState(r.weight,r.target,targets.tolerance);
  }
  const sectors=Object.keys(SECTORS).filter(sec=>rows.some(r=>r.sec===sec)||Object.hasOwn(targets.sectors,sec)).map(sec=>{
    const members=rows.filter(r=>r.sec===sec),value=compatible?sum(members.map(r=>r.value)):null;
    const weight=total>0?value/total*100:null,target=targets.sectors[sec]??null;
    return {sec,name:SECTORS[sec].label,value,weight,target,targetStatus:targetState(weight,target,targets.tolerance),tks:members.map(r=>r.tk),color:shade(sec)};
  }).sort((a,b)=>(b.value??-1)-(a.value??-1));
  const top=n=>total>0?rows.slice(0,n).reduce((s,r)=>s+r.weight,0):null;
  const dated=rows.map(r=>r.priceAt).filter(Boolean);
  return {rows,sectors,total,cost,gain,gainPercent:gain!==null&&cost>0?gain/cost*100:null,top3:top(3),top5:top(5),
    missing:rows.filter(r=>r.value===null).length,compatible,stale:rows.some(r=>r.stale),
    oldest:dated.length?Math.min(...dated):null,undated:rows.filter(r=>!r.priceAt).length,targets,targetError};
}
export function selectRows(rows,view) {
  const q=view.query.trim().toLowerCase();
  return rows.filter(r=>(!q||`${r.tk} ${r.name}`.toLowerCase().includes(q)) &&
    (view.sector==='all'||r.sec===view.sector) && (!view.holding||r.tk===view.holding) &&
    (view.thesis==='all'||r.thesis===view.thesis)).sort((a,b)=>{
    if(view.sort==='name')return a.name.localeCompare(b.name);
    const key={weight:'weight',gain:'gain',value:'value'}[view.sort]||'weight';
    return (b[key]??-Infinity)-(a[key]??-Infinity)||a.tk.localeCompare(b.tk);
  });
}

// money.entries is a THB income/expense ledger with virtual allocation buckets.
// It has no broker balances, settled transfers, executions or FX records. Income
// splits are earmarks within the ledger, never an additional asset or a transfer.
function ledgerDay() {
  const d=new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
export function moneyBridge(entries=[],today=ledgerDay()) {
  const missing={total:null,cash:null,savings:null,reserve:null,transferred:null,allocated:null,available:null,asOf:null,currency:'THB'};
  if(!Array.isArray(entries)||!entries.length)return {...missing,reason:'No Money transactions recorded.'};
  const validDate=d=>typeof d==='string' && /^\d{4}-\d{2}-\d{2}$/.test(d) && Number.isFinite(Date.parse(d)) && new Date(d).toISOString().slice(0,10)===d;
  if(entries.some(e=>!e || !['in','out'].includes(e.type) || !nonnegative(e.amount) || !validDate(e.date) || (e.currency && e.currency!=='THB') || e.transferId || e.transfer || (e.split && (!nonnegative(e.split.savings)||!nonnegative(e.split.invest)||e.split.savings+e.split.invest>100)) || (e.roundup!=null&&!nonnegative(e.roundup))))return {...missing,reason:'Money includes an unsupported transaction or transfer. Reconcile the ledger before using this balance.'};
  const posted=entries.filter(e=>e.date<=today);
  if(!posted.length)return {...missing,reason:'No posted Money transactions.'};
  let cash=0,savings=0,reserve=0;
  for(const e of posted) {
    if(e.type==='in') {const s=e.amount*(e.split?.savings||0)/100,i=e.amount*(e.split?.invest||0)/100;cash+=e.amount-s-i;savings+=s;reserve+=i;}
    else {cash-=e.amount+(e.roundup||0);savings+=e.roundup||0;}
  }
  return {...missing,total:cash+savings+reserve,cash,savings,reserve,asOf:posted.map(e=>e.date).sort().at(-1),
    reason:'Broker cash, settled transfers and purchases are not linked. Ready-to-invest cash is unavailable.'};
}
export function reviewQueue(snapshot,bridge,research=[],now=Date.now()) {
  const items=[];
  for(const r of snapshot.rows) {
    if(r.targetStatus==='Overweight')items.push({kind:'holding',symbol:r.tk,title:`${r.tk} exceeds target`,note:`${r.weight.toFixed(1)}% actual · ${r.target}% target`,action:'holding'});
    const c=r.company;
    if(c && thesisNeedsReview(c))items.push({kind:'thesis',symbol:r.tk,title:`${r.tk} · Thesis needs review`,note:c.holding.lastUpdated?`Evidence ${c.holding.lastUpdated.slice(0,10)}`:'No dated evidence connected',action:'thesis'});
    else if(stamp(c?.reviewedAt) && stamp(c.reviewedAt)+30*86400000<=now+7*86400000) {
      const overdue=stamp(c.reviewedAt)+30*86400000<=now;
      items.push({kind:'thesis',symbol:r.tk,title:`${r.tk} · Thesis review ${overdue?'overdue':'due soon'}`,note:`30-day review interval · ${overdue?'review expired':'due within 7 days'}`,action:'thesis'});
    }
    const article=research.find(c=>canonicalSymbol(c.ticker)===r.tk);
    if(article && researchNeedsReview(article,new Date(now)))items.push({kind:'research',symbol:r.tk,title:`${r.tk} · Research review due`,note:`Library snapshot ${article.snapshotDate} · review ${article.reviewDue}`,action:'research'});
  }
  for(const s of snapshot.sectors)if(s.targetStatus==='Overweight')items.push({kind:'sector',sector:s.sec,title:`${s.name} exceeds target`,note:`${s.weight.toFixed(1)}% actual · ${s.target}% target`,action:'sector'});
  for(const n of [3,5])if(snapshot[`top${n}`]>snapshot.targets[`top${n}`])items.push({kind:'concentration',title:`Top ${n} concentration`,note:`${snapshot[`top${n}`].toFixed(1)}% · alert threshold ${snapshot.targets[`top${n}`]}%`,action:'targets'});
  if(bridge.reserve>0)items.push({kind:'cash',title:'Investment reserve needs reconciliation',note:'Money earmarks exist; allocation to broker purchases is unverified.',action:'money'});
  return items;
}
