/** Living Thesis domain. Demo money is USD billions. Library metrics specify currency/unit;
 * bank and insurer metrics are sector-specific. Margins and rates are percentages.
 * @typedef {'STRENGTHENED'|'UNCHANGED'|'WEAKENED'|'THESIS AT RISK'|'INSUFFICIENT DATA'} ThesisStatus
 * @typedef {{id:string,symbol:string,companyName:string,sector:string,portfolioWeight:number|null,shares:number,averageCost:number,currentValue:number|null,thesisId:string,lastUpdated:string|null}} Holding
 * @typedef {{id:string,holdingId:string,originalStatement:string,currentSummary:string,status:ThesisStatus,confidence:number|null,moatScore:number|null,createdAt:string,updatedAt:string}} Thesis
 * @typedef {{id:string,thesisId:string,type:string,score:number,direction:'improving'|'stable'|'weakening',confidence:number,explanation:string,uncertainty:string,updatedAt:string,evidenceIds:string[]}} MoatPillar
 * @typedef {{id:string,thesisId:string,title:string,summary:string,sourceLabel:string,sourceUrl:string,publishedAt:string,impact:string,affectedPillar:string,confidence:number,uncertainty:string,eventType:string}} Evidence
 * @typedef {{id:string,holdingId:string,period:string,revenue:number|null,grossMargin:number|null,operatingMargin:number|null,freeCashFlow:number|null,customerGrowth:number|null,netRetention:number|null,guidance:string,debt:number|null,dilution:number|null}} EarningsSnapshot
 * @typedef {{id:string,thesisId:string,title:string,description:string,metric:string,operator:string,threshold:number|null,currentState:string,status:'not triggered'|'warning'|'triggered',lastChecked:string|null,evidenceIds:string[]}} SellCondition
 * @typedef {{thesisStatus:ThesisStatus,thesisSummary:string,confidence:number|null,changedAssumptions:object[],moatPillarUpdates:MoatPillar[],supportingEvidence:Evidence[],contradictingEvidence:Evidence[],redTeamArguments:object[],sellConditionUpdates:SellCondition[],nextQuestions:object[],generatedAt:string}} AnalysisResult
 */
export const PILLARS = [['brand','Brand'],['network','Network Effects'],['switching','Switching Costs'],['cost','Cost Advantage'],['scale','Scale'],['distribution','Regulatory or Distribution Advantage'],['runway','Reinvestment Runway']];
export const STATUSES = ['STRENGTHENED','UNCHANGED','WEAKENED','THESIS AT RISK','INSUFFICIENT DATA'];
export const tone = (status) => ({ STRENGTHENED:'green', UNCHANGED:'neutral', WEAKENED:'red', 'THESIS AT RISK':'red', 'INSUFFICIENT DATA':'muted', strengthens:'green', weakens:'red', mixed:'amber', neutral:'neutral', improving:'green', stable:'neutral', weakening:'red', triggered:'red', warning:'amber', 'not triggered':'green' }[status] || 'muted');
export const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const date = v => v && Number.isFinite(Date.parse(v)) ? new Date(v).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric',timeZone:'UTC'}) : 'Not recorded';
export const stale = (v, now=Date.now()) => !v || now-Date.parse(v)>30*86400000;
export const signed = n => `${n>0?'+':''}${n}`;
export const average = values => { const ns=values.filter(Number.isFinite); return ns.length ? Math.round(ns.reduce((a,b)=>a+b,0)/ns.length) : null; };
export const reviewed = c => Boolean(c.reviewedAt && !stale(c.reviewedAt) && c.reviewedVersion === c.thesis.updatedAt);
export const needsReview = c => !reviewed(c) && (['WEAKENED','THESIS AT RISK','INSUFFICIENT DATA'].includes(c.thesis.status) || stale(c.holding.lastUpdated) || c.reviewPriority>=2 || c.reviewRequested || c.originalEdited);
export const priority = c => c.thesis.status==='THESIS AT RISK' ? 4 : needsReview(c) ? (c.reviewPriority || 2) : 0;
export function selectHoldings(companies, filter='All', sort='priority', query='') {
  const mapped = {Strengthened:'STRENGTHENED',Unchanged:'UNCHANGED',Weakened:'WEAKENED','At Risk':'THESIS AT RISK'};
  return companies.filter(c => (filter==='All' || (filter==='Needs Review' ? needsReview(c) : c.thesis.status===mapped[filter])) && `${c.holding.symbol} ${c.holding.companyName}`.toLowerCase().includes(query.toLowerCase())).sort((a,b) => {
    if(sort==='moat') return (a.thesis.moatScore??-1)-(b.thesis.moatScore??-1);
    if(sort==='drift') return Math.abs(b.drift??0)-Math.abs(a.drift??0);
    if(sort==='recent') return (Date.parse(b.holding.lastUpdated)||0)-(Date.parse(a.holding.lastUpdated)||0);
    return priority(b)-priority(a) || Math.abs(b.drift??0)-Math.abs(a.drift??0);
  });
}
export function metricChange(current, previous, percentage=false) {
  if(!Number.isFinite(current)||!Number.isFinite(previous)) return null;
  if(percentage) return {value:current-previous,unit:'pp'};
  return previous===0 ? null : {value:(current-previous)/Math.abs(previous)*100,unit:'%'};
}
export function evaluateCondition(condition, company) {
  const value = condition.metric==='moatScore' ? company.thesis.moatScore : company.earnings.at(-1)?.[condition.metric];
  if(condition.metric==='manual') return {...condition};
  if(!Number.isFinite(value)||!Number.isFinite(condition.threshold)) return {...condition,currentState:'Insufficient evidence to evaluate',status:'warning',lastChecked:null,evidenceIds:[]};
  const unit=company.metrics?.find(m=>m[0]===condition.metric)?.[2];
  const suffix=unit?({percent:'%',money:'B USD',ntd:'B NTD',usd:' USD',count:''}[unit]||''):['grossMargin','operatingMargin','dilution','customerGrowth'].includes(condition.metric)?'%':condition.metric==='debt'?'B USD':' / 100';
  const hit = condition.operator==='below' ? value<condition.threshold : value>condition.threshold;
  const near = !hit && Math.abs(value-condition.threshold)<=Math.abs(condition.threshold)*0.1;
  return {...condition,currentState:`${value}${suffix} · threshold ${condition.operator} ${condition.threshold}`,status:hit?'triggered':near?'warning':'not triggered',lastChecked:company.holding.lastUpdated,evidenceIds:company.evidence.filter(e=>e.eventType==='Earnings').map(e=>e.id)};
}
export function validateDemo(data) {
  if(data?.schemaVersion!==1||!Array.isArray(data.companies)) throw new Error('The sample analysis format is unavailable.');
  const seen=new Set();
  for(const c of data.companies) {
    if(!/^[A-Z.\-]{1,10}$/.test(c.holding?.symbol)||seen.has(c.holding.symbol)||!STATUSES.includes(c.thesis?.status)||!Array.isArray(c.evidence)||!Array.isArray(c.earnings)||!Array.isArray(c.pillars)||!Array.isArray(c.sellConditions)||!Array.isArray(c.questions)) throw new Error('The sample analysis is incomplete.');
    seen.add(c.holding.symbol);
    for(const p of c.pillars) if(!PILLARS.some(([id])=>id===p.type)||!Number.isFinite(p.score)||p.score<0||p.score>100||!Number.isFinite(p.confidence)||p.confidence<0||p.confidence>100) throw new Error('Invalid moat pillar.');
    for(const e of c.evidence) if(!Number.isFinite(Date.parse(e.publishedAt))||!Number.isFinite(e.confidence)||!e.sourceLabel||!/^https:\/\//.test(e.sourceUrl)) throw new Error('Invalid sample evidence.');
  }
  return data;
}

export function validateLibrary(data) {
  const fail=()=>{throw new Error('The research library format is unavailable.');};
  if(data?.kind!=='research-library'||data.schemaVersion!==1||!Array.isArray(data.companies))fail();
  const symbols=new Set();
  for(const c of data.companies) {
    if(c.isDemo!==false||c.researchKind!=='library'||!c.draftStatement||!STATUSES.includes(c.thesis?.status)||!Array.isArray(c.evidence)||!Array.isArray(c.metrics)||!Array.isArray(c.pillars)||symbols.has(c.symbol))fail();
    symbols.add(c.symbol);
    const ids=new Set(c.evidence.map(e=>e.id));
    if(ids.size!==c.evidence.length)fail();
    for(const e of c.evidence)if(!e.sourceLabel||!Number.isFinite(Date.parse(e.publishedAt))||!(/^(https:\/\/|\.\.\/articles\/deep-dive-[a-z]+\.html#sec-\d+$)/.test(e.sourceUrl)))fail();
    for(const p of c.pillars)if(!PILLARS.some(([id])=>id===p.type)||!Number.isFinite(p.score)||p.score<0||p.score>100)fail();
    for(const rows of [c.pillars,c.assumptions,c.redTeam,c.sellConditions,c.questions]) {
      if(!Array.isArray(rows))fail();
      for(const row of rows)if(!Array.isArray(row.evidenceIds)||row.evidenceIds.some(id=>!ids.has(id)))fail();
    }
    if(!Array.isArray(c.earnings)||c.earnings.length!==2)fail();
    for(const [id,,unit] of c.metrics) {
      if(!['money','ntd','usd','percent','count','text'].includes(unit)||!c.metricNotes?.[id])fail();
      for(const e of c.earnings)if(e[id]!==null&&(unit==='text'?typeof e[id]!=='string':!Number.isFinite(e[id])))fail();
    }
  }
  return data;
}
