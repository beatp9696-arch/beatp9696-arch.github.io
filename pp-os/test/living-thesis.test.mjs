import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {validateDemo,selectHoldings,metricChange,evaluateCondition,needsReview,reviewed,stale,esc,average} from '../js/features/living-thesis/model.js';
import {analyzeThesis} from '../js/features/living-thesis/service.js';
const data=JSON.parse(readFileSync(new URL('../data/living-thesis.json',import.meta.url)));
validateDemo(data);
for(const c of data.companies){
 assert.equal(c.isDemo,true);
 assert.equal(c.pillars.length,7);
 assert.ok(c.evidence.length>=5);
 assert.equal(c.earnings.length,2);
 assert.ok(c.sellConditions.length>=3);
 assert.ok(c.questions.length>=3);
 assert.ok(c.redTeam.length>=5);
 const ids=new Set(c.evidence.map(e=>e.id));
 for(const row of [...c.pillars,...c.assumptions,...c.questions,...c.redTeam,...c.sellConditions]){
  for(const id of row.evidenceIds)assert.ok(ids.has(id),`Dangling evidence ${id}`);
 }
 assert.equal(c.holding.thesisId,c.thesis.id);
 for(const p of c.pillars) assert.equal(p.thesisId,c.thesis.id);
}
assert.equal(selectHoldings(data.companies,'Strengthened')[0].holding.symbol,'COST');
assert.equal(selectHoldings(data.companies,'At Risk').length,0);
assert.equal(selectHoldings(data.companies,'All','drift')[0].holding.symbol,'MSFT');
assert.equal(selectHoldings(data.companies,'All','recent')[0].holding.symbol,'COST');
assert.equal(selectHoldings(data.companies,'All','moat')[0].holding.symbol,'MSFT');
assert.equal(selectHoldings(data.companies,'All','priority','visa')[0].holding.symbol,'V');
assert.deepEqual(metricChange(null,1),null);
assert.deepEqual(metricChange(1,0),null);
assert.deepEqual(metricChange(15,10),{value:50,unit:'%'});
assert.deepEqual(metricChange(15,10,true),{value:5,unit:'pp'});
assert.equal(average([null,0,50]),25);
assert.equal(average([null]),null);
const msft=structuredClone(data.companies[0]);
const rule={metric:'grossMargin',operator:'below',threshold:70};
assert.equal(evaluateCondition(rule,msft).status,'triggered');
assert.equal(evaluateCondition({...rule,threshold:66},msft).status,'warning');
assert.equal(evaluateCondition({...rule,threshold:50},msft).status,'not triggered');
assert.equal(evaluateCondition(rule,{...msft,earnings:[]}).status,'warning');
assert.equal(evaluateCondition(rule,{...msft,earnings:[]}).lastChecked,null);
assert.deepEqual(evaluateCondition({metric:'manual',status:'triggered'},msft),{metric:'manual',status:'triggered'});
assert.equal(stale('2026-01-01',Date.parse('2026-02-02')),true);
assert.equal(stale('2026-01-01',Date.parse('2026-01-15')),false);
msft.reviewedAt=new Date().toISOString();msft.reviewedVersion=msft.thesis.updatedAt;
assert.equal(reviewed(msft),true);assert.equal(needsReview(msft),false);
msft.thesis.updatedAt='2026-09-13';assert.equal(reviewed(msft),false);
assert.equal(needsReview(msft),true);
assert.equal(esc('<script>" &'), '&lt;script&gt;&quot; &amp;');
const malformed=structuredClone(data);malformed.companies[0].pillars[0].score=101;
assert.throws(()=>validateDemo(malformed));
const previousFetch=globalThis.fetch;
globalThis.fetch=async()=>({ok:true,json:async()=>structuredClone(data)});
const c=data.companies[0];
const result=await analyzeThesis(c.holding,c.thesis,c.evidence,c.earnings,{company:c});
assert.equal(result.thesisStatus,c.thesis.status);
assert.equal(result.contradictingEvidence.length,2);
assert.ok(result.supportingEvidence.every(e=>e.impact==='strengthens'));
assert.equal(result.nextQuestions.length,3);
const amended=await analyzeThesis(c.holding,{...c.thesis,originalStatement:'A different thesis'},c.evidence,c.earnings,{company:c});
assert.equal(amended.thesisStatus,'INSUFFICIENT DATA');assert.equal(amended.confidence,null);
const empty=await analyzeThesis(c.holding,c.thesis,[],c.earnings,{company:c});
assert.equal(empty.thesisStatus,'INSUFFICIENT DATA');
await assert.rejects(()=>analyzeThesis(c.holding,c.thesis,c.evidence,c.earnings,{company:{...c,isDemo:false}}),/verified evidence/);
globalThis.fetch=async()=>({ok:false});
await assert.rejects(()=>analyzeThesis(c.holding,c.thesis,c.evidence,c.earnings,{company:c}),/could not be loaded/);
globalThis.fetch=previousFetch;
const worker=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
for(const match of worker.matchAll(/"(\.\/[^"?]+)"/g)){
 const path=new URL('../'+match[1].slice(2),import.meta.url);
 assert.ok(existsSync(path),`Missing offline asset ${match[1]}`);
}
console.log('PASS: demo relationships, evidence provenance, score bounds, null metrics, thresholds, filters, review freshness, deterministic adapter, personal-data separation, unavailable states and offline assets.');

// Dated public research may enrich positions, but never supply positions or investor rationale.
const {validateLibrary}=await import('../js/features/living-thesis/model.js');
const {companyLogoURL,canonicalSymbol}=await import('../js/core/company-catalog.js');
const library=validateLibrary(JSON.parse(readFileSync(new URL('../data/living-thesis-library.json',import.meta.url))));
assert.equal(library.companies.length,16);
assert.equal(canonicalSymbol('brk.b'),'BRK-B');
const expected=['MELI','LLY','GOOGL','SNPS','NVDA','COST','BRK-B','MSFT','TSM','SPGI','UNH','AXP','AAPL','AMZN','NFLX','BAC'];
assert.deepEqual(library.companies.map(c=>c.symbol).sort(),expected.sort());
for(const c of library.companies){
 assert.equal(c.thesis.originalStatement,'');
 assert.equal(c.drift,null);assert.deepEqual(c.history,[]);
 assert.equal(c.pillars.length,7);assert.ok(c.evidence.length>=5);
 assert.equal(c.redTeam.length,5);assert.equal(c.sellConditions.length,3);assert.equal(c.questions.length,3);
 assert.equal(c.thesis.moatScore,Math.round(c.pillars.reduce((sum,p)=>sum+p.score,0)/7));
 assert.ok(c.metrics.some(([id,,unit])=>unit!=='text'&&c.earnings.every(e=>Number.isFinite(e[id]))));
 assert.ok(c.sellConditions.every(s=>s.isSuggested&&s.lastChecked===null));
 assert.ok(existsSync(new URL(companyLogoURL(c.symbol))),c.symbol+' logo');
 for(const key of ['shares','currentValue','averageCost','portfolioWeight'])assert.equal(c.holding[key],undefined);
 for(const e of c.evidence){
  if(e.sourceUrl.startsWith('../')){
   const [path,anchor]=e.sourceUrl.split('#');
   const article=readFileSync(new URL('../'+path,import.meta.url),'utf8');
   assert.ok(article.includes('id="'+anchor+'"'),c.symbol+' missing source section '+anchor);
  }
 }
}
const tsm=library.companies.find(c=>c.symbol==='TSM');
assert.equal(tsm.metrics.find(m=>m[0]==='revenue')[2],'ntd');
assert.match(evaluateCondition({metric:'freeCashFlow',operator:'below',threshold:1100},tsm).currentState,/B NTD/);
const bac=library.companies.find(c=>c.symbol==='BAC');
assert.equal(bac.metricImpacts.efficiency,'Supports');
assert.equal(bac.earnings[1].grossMargin,'Not applicable');
const broken=structuredClone(library);broken.companies[0].questions[0].evidenceIds=['missing'];
assert.throws(()=>validateLibrary(broken));
console.log('PASS: all 16 research drafts, local logos and source anchors, no invented positions/history, sector units, explicit missing data, draft boundaries and evidence relationships.');
