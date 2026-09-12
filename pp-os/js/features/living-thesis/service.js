import { validateDemo, evaluateCondition } from './model.js';

export async function loadDemo({signal}={}) {
  const response=await fetch(new URL('../../../data/living-thesis.json',import.meta.url),{cache:'no-cache',signal});
  if(!response.ok) throw new Error('Sample analysis could not be loaded. Check your connection and try again.');
  return validateDemo(await response.json());
}

/** Replace this adapter with a same-origin server endpoint; keep credentials on that server.
 * Demo evidence is never used to analyze personal holdings. No generative API is called.
 * @type {{analyzeThesis: (holding:object, thesis:object, evidence:object[], earningsData:object[], context?:object) => Promise<import('./model.js').AnalysisResult>}}
 */
export const demoAdapter = {
  async analyzeThesis(holding, thesis, evidence, earningsData, {company, signal}={}) {
    if(!company?.isDemo) throw new Error('Analysis unavailable. This holding needs verified evidence and a connected analysis service. Your thesis is saved on this device.');
    const data=await loadDemo({signal});
    const fixture=data.companies.find(c=>c.holding.symbol===holding.symbol);
    if(!fixture) throw new Error('No sample analysis is available for this holding.');
    const originalEdited=thesis.originalStatement!==fixture.thesis.originalStatement;
    const insufficient=!evidence.length || originalEdited;
    return {
      thesisStatus:insufficient?'INSUFFICIENT DATA':fixture.thesis.status,
      thesisSummary:insufficient ? (originalEdited?'Your original thesis has changed. The sample analysis cannot assess the new statement; review the assumptions against the evidence.':'There is not enough evidence to assess this thesis.') : fixture.thesis.currentSummary,
      confidence:insufficient?null:fixture.thesis.confidence,
      changedAssumptions:insufficient?[]:structuredClone(fixture.assumptions),
      moatPillarUpdates:insufficient?[]:structuredClone(fixture.pillars),
      supportingEvidence:evidence.filter(e=>e.impact==='strengthens'),
      contradictingEvidence:evidence.filter(e=>e.impact==='weakens'),
      redTeamArguments:insufficient?[]:structuredClone(fixture.redTeam),
      sellConditionUpdates:company.sellConditions.map(c=>evaluateCondition(c,{...company,earnings:earningsData})),
      nextQuestions:structuredClone(company.questions),
      generatedAt:new Date().toISOString(),
    };
  },
};
export const analyzeThesis=(holding,thesis,evidence,earningsData,context)=>demoAdapter.analyzeThesis(holding,thesis,evidence,earningsData,context);
