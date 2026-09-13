import {companyLogoURL} from '../../core/company-catalog.js';
import {researchIcon} from '../../core/research-store.js';
import {esc,date,tone,signed,PILLARS} from './model.js';
export const icon=researchIcon;
export const button=(text,action,glyph='',kind='',extra='')=>`<button type="button" class="lt-btn ${kind}" data-action="${action}" ${extra}>${glyph?icon(glyph):''}${text}</button>`;
export const badge=status=>`<span class="lt-badge lt-${tone(status)}"><i></i>${esc(status)}</span>`;
export const number=(v,suffix='')=>Number.isFinite(v)?`${Math.round(v)}${suffix}`:'—';
export const pillarName=type=>PILLARS.find(([id])=>id===type)?.[1]||type;
export const logo=c=>`<span class="lt-logo"><b aria-hidden="true">${esc(c.holding.symbol.slice(0,2))}</b>${companyLogoURL(c.holding.symbol)?`<img src="${esc(companyLogoURL(c.holding.symbol))}" alt="${esc(c.holding.companyName)} logo">`:''}</span>`;
export const analysisLabel=c=>c.isDemo?'Demo analysis':c.researchKind==='library'?'Research draft':'Your thesis';
export const evidenceURL=value=>{
  if(/^\.\.\/articles\/deep-dive-[a-z]+\.html#sec-\d+$/.test(value||''))return new URL('../../../'+value,import.meta.url).href;
  return safeURL(value);
};

export const score=(value,cls='')=>`<span class="lt-score ${cls}"><b>${number(value)}</b><span class="lt-bar"><i style="width:${Number.isFinite(value)?Math.max(0,Math.min(100,value)):0}%"></i></span></span>`;
export const empty=(title,copy,action='')=>`<div class="lt-empty">${icon('book-open')}<h2>${title}</h2><p>${copy}</p>${action}</div>`;
export function sparkline(c) {
  if(!c.history?.length) return '<span class="lt-muted">No history</span>';
  const points=c.history.map((v,i)=>`${i*16+2},${43-(v-75)*1.5}`).join(' ');
  return `<svg class="lt-spark lt-${c.drift<0?'red':c.drift>0?'green':'neutral'}" viewBox="0 0 100 46" role="img" aria-label="Sample moat score history: ${c.history.join(', ')}"><path d="M0 38H100" stroke="currentColor" opacity=".15"/><polyline points="${points}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><circle cx="98" cy="${43-(c.history.at(-1)-75)*1.5}" r="2.5" fill="currentColor"/></svg>`;
}
export function evidenceRows(c,ids=c.evidence.map(e=>e.id)) {
  const events=ids.map(id=>c.evidence.find(e=>e.id===id)).filter(Boolean);
  if(!events.length) return '<div class="lt-no-evidence">No evidence mapped yet. This is an information gap, not a neutral finding.</div>';
  return events.map(e=>`<details class="lt-evidence" data-evidence-id="${esc(e.id)}"><summary><span class="lt-event-dot lt-${tone(e.impact)}"></span><span><b>${esc(e.title)}</b><small>${date(e.publishedAt)} · ${esc(e.sourceLabel)} · ${e.confidence}% confidence</small></span><span class="lt-expand" aria-hidden="true">+</span></summary><div class="lt-evidence-copy"><p>${esc(e.summary)}</p><div class="lt-meta"><span class="lt-${tone(e.impact)}">${esc(e.impact)} thesis</span><span>${esc(pillarName(e.affectedPillar))}</span></div><p class="lt-uncertainty"><b>Still uncertain</b> ${esc(e.uncertainty)}</p><a href="${esc(evidenceURL(e.sourceUrl))}" target="_blank" rel="noopener noreferrer">${c.isDemo?'Open background source':'Read source'} ${icon('arrow-up-right')}</a><small class="lt-source-note">${c.isDemo?'Sample evidence. The linked reference does not substantiate this fictional event.':`${esc(e.dateLabel||'Source date')} · ${date(e.publishedAt)}. ${esc(e.sourceNote)} ผลต่อ thesis และ confidence เป็นการตีความของผู้เขียน ไม่ใช่ข้อสรุปจากบริษัท`}</small></div></details>`).join('');
}
export function safeURL(value) { try {const url=new URL(value);return url.protocol==='https:'?url.href:'';}catch{return '';}}
export function provenance(c,{confidence=c.thesis.confidence,date:stamp=c.holding.lastUpdated,evidenceIds=c.evidence.slice(0,1).map(e=>e.id),uncertainty=c.unknowns?.[0]||'Verified business evidence has not been connected.'}={}) {
  return `<div class="lt-provenance"><div class="lt-meta"><span>${number(confidence,'%')} confidence</span><span>${date(stamp)}</span><span>${analysisLabel(c)}</span></div><p class="lt-uncertainty"><b>Still uncertain</b> ${esc(uncertainty)}</p>${evidenceRows(c,evidenceIds)}</div>`;
}
export const sectionHead=(title,kicker='',action='')=>`<div class="lt-section-head"><div>${kicker?`<span class="lt-kicker">${kicker}</span>`:''}<h2>${title}</h2></div>${action}</div>`;
export function sellRows(c) {
  if(!c.sellConditions.length) return empty('Define your boundaries','Write the business changes that would make you reconsider ownership.',button('Add a sell condition','add-condition','book-open'));
  return c.sellConditions.map(s=>`<article class="lt-condition"><div class="lt-condition-head"><div><span class="lt-kicker">${esc(s.isSuggested?'Suggested boundary':s.metric==='manual'?'Qualitative condition':'Measured threshold')}</span><h3>${esc(s.title)}</h3></div>${button('Edit','edit-condition','','lt-quiet',`data-id="${esc(s.id)}" aria-label="Edit ${esc(s.title)}"`)}</div><p>${esc(s.description)}</p><div class="lt-condition-state">${badge(s.status.toUpperCase()).replace('lt-muted',`lt-${tone(s.status)}`)}<span>${esc(s.currentState)}</span></div><div class="lt-meta"><span>Last checked ${date(s.lastChecked)}</span><span>${s.metric==='manual'?'Investor assessment':`${number(c.thesis.confidence,'%')} confidence · ${c.isDemo?'sample data':'available evidence'}`}</span></div><p class="lt-uncertainty">${s.metric==='manual'?'Qualitative conditions require your judgment.':'One observation cannot establish a sustained deterioration.'}</p>${evidenceRows(c,s.evidenceIds||[])}</article>`).join('');
}
export function questions(c) {
  return `<section class="lt-section">${sectionHead('Next questions','THE RESEARCH AGENDA',`<span class="lt-meta">${c.questions.filter(q=>q.status!=='resolved').length} open</span>`)}${!c.questions.length?empty('Start with the business','What must stay true for your original thesis to work?'):c.questions.map((q,i)=>`<article class="lt-question ${q.status==='resolved'?'is-resolved':''}"><span class="lt-question-num">0${i+1}</span><div><h3>${esc(q.title)}</h3><div class="lt-meta"><span>${q.status==='resolved'?'Resolved':q.status==='investigating'?'Investigating':'Open question'}</span>${q.watchlisted?'<span class="lt-green">On watchlist</span>':''}<span>${number(q.confidence,'%')} confidence · ${date(q.date)} · ${analysisLabel(c)}</span></div><p class="lt-uncertainty">${esc(q.uncertainty)}</p><div class="lt-question-actions">${button('Investigate','investigate','search','lt-quiet',`data-id="${esc(q.id)}"`)}${button(q.status==='resolved'?'Reopen':'Mark as resolved','resolve','check','lt-quiet',`data-id="${esc(q.id)}"`)}${button(q.watchlisted?'Remove from watchlist':'Add to watchlist','watch','bookmark','lt-quiet',`data-id="${esc(q.id)}" aria-pressed="${q.watchlisted}"`)}</div></div></article>`).join('')}</section>`;
}
