import {load,save,flushStorage} from '../../core/storage.js';
import {evaluateCondition} from './model.js';
import {companyIdentity,canonicalSymbol} from '../../core/company-catalog.js';

// Separate namespaces; neither these keys nor pf.holdings are in the cloud sync allowlist.
const key=demo=>demo?'pf.living.demo.v1':'pf.living.personal.v1';
export function saveCompany(c) {
  const all=load(key(c.isDemo),{});
  save(key(c.isDemo),{...all,[c.holding.symbol]:{originalStatement:c.thesis.originalStatement,originalEdited:c.originalEdited,createdAt:c.thesis.createdAt,reviewRequested:c.reviewRequested,reviewedAt:c.reviewedAt,reviewedVersion:c.reviewedVersion,sellConditions:c.sellConditions,questions:c.questions,analysis:c.analysis}});
  return flushStorage();
}
export function hydrate(c) {
  const stored=load(key(c.isDemo),{})?.[c.holding.symbol];
  if(stored) {
    if(typeof stored.originalStatement==='string') c.thesis.originalStatement=stored.originalStatement;
    c.originalEdited=Boolean(stored.originalEdited);
    c.reviewedAt=stored.reviewedAt;
    c.reviewedVersion=stored.reviewedVersion;
    c.reviewRequested=stored.reviewRequested;
    if(stored.createdAt)c.thesis.createdAt=stored.createdAt;
    // Keep user edits and append newly available library prompts by stable id.
    for(const field of ['sellConditions','questions']) if(Array.isArray(stored[field])) {
      c[field]=[...stored[field],...c[field].filter(row=>!stored[field].some(saved=>saved.id===row.id))];
    }
    if(c.isDemo && stored.analysis?.generatedAt) c.analysis=stored.analysis;
  }
  if(c.analysis && c.isDemo) {
    c.thesis.status=c.analysis.thesisStatus;
    c.thesis.currentSummary=c.analysis.thesisSummary;
    c.thesis.confidence=c.analysis.confidence;
  }
  if(c.originalEdited) {c.thesis.status='INSUFFICIENT DATA';c.thesis.confidence=null;c.thesis.currentSummary='Your original thesis has changed. Review the assumptions against verified evidence before relying on the earlier assessment.';}
  c.sellConditions=c.sellConditions.map(s=>evaluateCondition(s,c));
  return c;
}
export function personalCompanies(library=[]) {
  const holdings=load('pf.holdings',[]);
  if(!Array.isArray(holdings)) return [];
  const complete=holdings.every(h=>Number.isFinite(h.price)&&Number.isFinite(h.shares));
  const total=holdings.reduce((s,h)=>s+(h.price??0)*(h.shares??0),0);
  return holdings.map(h=>{
    const symbol=canonicalSymbol(h.tk);
    const identity=companyIdentity(symbol);
    const research=library.find(c=>c.symbol===symbol);
    const id=`personal-${h.id??symbol}`;
    const company={
      isDemo:false,holding:{id,symbol,companyName:identity?.[0]||symbol,sector:identity?.[1]||h.sec||'Unclassified',portfolioWeight:complete&&total>0?(h.shares*h.price)/total*100:null,shares:h.shares,averageCost:h.cost,currentValue:Number.isFinite(h.price)?h.shares*h.price:null,thesisId:`thesis-${id}`,lastUpdated:research?.holding.lastUpdated||null},
      thesis:{id:`thesis-${id}`,holdingId:id,originalStatement:'',currentSummary:'Document why you own this business, then connect verified evidence to test that thesis.',status:'INSUFFICIENT DATA',confidence:null,moatScore:null,createdAt:new Date().toISOString(),updatedAt:''},
      pillars:[],evidence:[],earnings:[],assumptions:[],unknowns:['Verified business evidence and comparable earnings periods have not been connected.'],changes:'No business evidence has been connected.',redTeam:[],sellConditions:[],questions:[],reviewPriority:2,drift:null,history:[],
    };
    if(research) {
      const draft=structuredClone(research);
      const holding=company.holding;
      Object.assign(company,draft,{holding});
      company.thesis={...draft.thesis,id:holding.thesisId,holdingId:id};
      company.pillars=company.pillars.map(p=>({...p,thesisId:holding.thesisId}));
      company.evidence=company.evidence.map(e=>({...e,thesisId:holding.thesisId}));
      company.sellConditions=company.sellConditions.map(s=>({...s,thesisId:holding.thesisId}));
      company.earnings=company.earnings.map(e=>({...e,holdingId:id}));
    }
    return hydrate(company);
  });
}
