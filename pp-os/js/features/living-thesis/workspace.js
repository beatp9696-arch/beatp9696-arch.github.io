import allocation from '../../apps/portfolio-allocation.js';
import {load,save} from '../../core/storage.js';
import {esc,needsReview,date,evaluateCondition,stale} from './model.js';
import {loadDemo,loadResearchLibrary,analyzeThesis} from './service.js';
import {hydrate,personalCompanies,saveCompany} from './store.js';
import {overview,holdingURL} from './overview.js';
import {detail,TABS} from './detail.js';
import {icon,button,empty,evidenceRows} from './components.js';

export function mountWorkspace(body) {
  body.classList.add('app-pane','app-living-thesis');
  const params=new URLSearchParams(location.search);
  const real=personalCompanies();
  const state={scope:params.get('book')||load('pf.living.scope',real.length?'personal':'demo'),symbol:params.get('symbol'),tab:params.get('thesis')||'thesis',view:params.get('portfolioView')||'health',filter:'All',sort:'priority',query:'',loading:true,error:'',message:''};
  if(!['demo','personal'].includes(state.scope)) state.scope='demo';
  if(!TABS.some(([id])=>id===state.tab)) state.tab='thesis';
  let samples=[],library=[],libraryLoaded=false,request=null;
  const life=new AbortController();
  const scrollHost=()=>body.closest('#shell-view')||body.closest('.win-body')||body;
  const companies=()=>state.scope==='demo'?samples:personalCompanies(library);
  const current=()=>companies().find(c=>c.holding.symbol===state.symbol);
  const remember=async c=>{const saved=await saveCompany(c);if(!saved){state.error='The device could not confirm this save. Keep this page open and try saving again.';const dialog=body.querySelector('dialog');if(dialog){let error=dialog.querySelector('[data-save-error]');if(!error){error=document.createElement('p');error.dataset.saveError='';error.setAttribute('role','alert');dialog.append(error);}error.textContent=state.error;}else render();return false;}if(c.isDemo){const index=samples.findIndex(s=>s.holding.symbol===c.holding.symbol);if(index>=0)samples[index]=c;}return true;};
  const detector=new MutationObserver(()=>{if(!body.isConnected){life.abort();request?.abort();detector.disconnect();}});
  detector.observe(document.body,{childList:true,subtree:true});

  function route({replace=false}={}) {
    const url=new URL(location.href);
    url.searchParams.set('tab','portfolio');url.searchParams.set('open','portfolio');url.searchParams.set('book',state.scope);
    url.searchParams.delete('company');
    for(const [key,value] of [['symbol',state.symbol],['thesis',state.symbol?state.tab:null],['portfolioView',state.view==='allocation'?'allocation':null]]) value?url.searchParams.set(key,value):url.searchParams.delete(key);
    history[replace?'replaceState':'pushState']({livingThesis:true},'',url);
  }
  function render(focus) {
    const active=body.querySelector('dialog');
    if(active?.open) active.close();
    const c=current();
    body.innerHTML=`<div class="lt-wrap"><div class="lt-topbar"><a class="lt-wordmark" href="?mode=app&tab=portfolio" data-action="back"><span class="lt-brand-mark" aria-hidden="true"><i></i><i></i><i></i></span>Moatrices<span class="lt-wordmark-sub">PORTFOLIO</span></a><div class="lt-scope" aria-label="Portfolio data source">${button('My portfolio','personal','','',`aria-pressed="${state.scope==='personal'}"`)}${button('Demo portfolio','demo','','',`aria-pressed="${state.scope==='demo'}"`)}</div></div>
      ${state.scope==='demo'&&state.view!=='allocation'?'<div class="lt-demo-strip"><span class="lt-demo-label">DEMO ANALYSIS</span><p>Sample portfolio, fictional events and mock financial data. For exploring the workspace; not verified research.</p><span class="lt-local">'+icon('book-open')+' Saved on this device</span></div>':''}
      ${state.scope==='personal'&&state.view!=='allocation'&&libraryLoaded?'<div class="lt-demo-strip lt-library-strip"><span class="lt-demo-label">RESEARCH DRAFTS</span><p>บทวิเคราะห์จากคลัง · มีวันที่และแหล่งอ้างอิง · ไม่ใช่ข้อมูลสดหรือเหตุผลที่คุณซื้อ คะแนนเป็นการประเมินเชิงคุณภาพ</p></div>':''}
      ${state.error?`<div class="lt-alert" role="alert"><div><b>Analysis unavailable</b><p>${esc(state.error)}</p></div>${button('Try again','retry','activity')}${button('Dismiss','dismiss','x','lt-quiet')}</div>`:''}
      ${state.message?`<div class="lt-success" role="status">${icon('check')}<span>${esc(state.message)}</span>${button('Dismiss','dismiss','x','lt-quiet')}</div>`:''}
      ${state.loading?`<div class="lt-loading" role="status" aria-label="Loading analysis"><span>${icon('activity')} ${state.scope==='demo'&&samples.length?'Refreshing demo analysis…':'Loading thesis workspace…'}</span><div class="lt-skeleton"></div><div class="lt-skeleton"></div><div class="lt-skeleton"></div></div>`:''}
      <div class="lt-content" ${state.loading?'aria-busy="true"':''}>${state.view==='allocation'?`<div class="lt-allocation-back">${button('Portfolio Health','health','arrow-left','lt-quiet')}<span>Your original holdings, prices and allocation</span></div><div class="lt-allocation"></div>`:state.symbol?(c?detail(c,state):state.loading?'':empty('Holding not found','This business is not in the selected portfolio.',button('Back to Portfolio Health','back','arrow-left'))):overview(companies(),state)}</div>
      <footer class="lt-footer"><span><i></i> MATRICES · THE LIVING THESIS</span><span>${state.scope==='demo'?'Demo analysis · Sample evidence · Mock data':'Private thesis notes · Stored on this device'}</span><span>Conviction, held accountable.</span></footer></div>`;
    for(const img of body.querySelectorAll('.lt-logo img')) img.addEventListener('error',()=>img.remove(),{once:true});
    if(state.view==='allocation') allocation.mount(body.querySelector('.lt-allocation'), {
      onOpenHealth() {
        state.scope='personal';state.symbol=null;state.view='health';state.error='';state.message='';
        route();render();if(!libraryLoaded)fetchLibrary();scrollHost().scrollTop=0;
        body.querySelector('h1')?.setAttribute('tabindex','-1');
        body.querySelector('h1')?.focus({preventScroll:true});
      },
    });
    if(focus) body.querySelector(focus)?.focus({preventScroll:true});
  }
  async function fetchSamples() {
    request?.abort();request=new AbortController();
    const timer=setTimeout(()=>request.abort(),12000);
    state.loading=true;state.error='';render();
    try {
      const data=await loadDemo({signal:request.signal});
      if(life.signal.aborted)return;
      samples=data.companies.map(c=>hydrate(c));
    } catch(error) {if(!life.signal.aborted)state.error=error.name==='AbortError'?'The sample request timed out. Please try again.':error.message;}
    finally {clearTimeout(timer);state.loading=false;if(!life.signal.aborted)render();}
  }
  async function fetchLibrary() {
    request?.abort();request=new AbortController();
    const timer=setTimeout(()=>request.abort(),12000);
    state.loading=true;state.error='';render();
    try {
      const data=await loadResearchLibrary({signal:request.signal});
      if(life.signal.aborted)return;
      library=data.companies;libraryLoaded=true;
    } catch(error) {if(!life.signal.aborted)state.error=error.name==='AbortError'?'The research library request timed out. Please try again.':error.message;}
    finally {clearTimeout(timer);state.loading=false;if(!life.signal.aborted)render();}
  }
  async function refresh() {
    if(state.loading)return;
    if(state.scope==='personal'){await fetchLibrary();if(!state.error){state.message='Research library reloaded. Source dates are unchanged; no live analysis was generated. Your thesis and notes are preserved.';render();}return;}
    const targets=state.symbol?[current()].filter(Boolean):companies();
    if(!targets.length){
      if(state.scope==='demo') await fetchSamples();
      else {state.message='Add a holding before requesting a thesis analysis.';render();}
      return;
    }
    state.loading=true;state.error='';state.message='';render();
    request?.abort();request=new AbortController();
    const timer=setTimeout(()=>request.abort(),12000);
    try {
      // Atomic: retain the previous analyses if any request fails.
      const results=await Promise.all(targets.map(c=>analyzeThesis(c.holding,c.thesis,c.evidence,c.earnings,{company:c,signal:request.signal})));
      if(life.signal.aborted)return;
      for(const [i,result] of results.entries()){
        const c=targets[i];c.analysis=result;c.thesis.status=result.thesisStatus;c.thesis.currentSummary=result.thesisSummary;c.thesis.confidence=result.confidence;c.sellConditions=result.sellConditionUpdates;if(!await remember(c))throw new Error(state.error);
      }
      state.message='Demo analysis refreshed. Sample source dates are unchanged; no live evidence was fetched.';
    } catch(error){if(!life.signal.aborted)state.error=error.name==='AbortError'?'Analysis timed out. The last saved assessment is still available.':error.message;}
    finally{clearTimeout(timer);state.loading=false;if(!life.signal.aborted)render('[data-action="refresh"]');}
  }
  function navigate(symbol,tab='thesis') {
    state.symbol=symbol;state.tab=tab;state.view='health';state.error='';state.message='';route();render();scrollHost().scrollTop=0;body.querySelector('h1')?.setAttribute('tabindex','-1');body.querySelector('h1')?.focus({preventScroll:true});
  }
  function showDialog(title,content,trigger) {
    const dialog=document.createElement('dialog');dialog.className='lt-dialog';dialog.innerHTML=`<header><h2>${title}</h2>${button('','close-dialog','x','lt-quiet','aria-label="Close dialog" title="Close dialog"')}</header>${content}`;
    body.append(dialog);
    dialog.addEventListener('close',()=>{dialog.remove();(trigger?.isConnected?trigger:body.querySelector('[data-action="review"]'))?.focus({preventScroll:true});},{once:true});
    dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
    dialog.showModal();return dialog;
  }
  function editThesis(c,trigger) {
    const dialog=showDialog('The original investment thesis',`<p>Write why you own the business, the advantage you expect to endure, and what must stay true.</p><form data-form="thesis"><label>Original thesis<textarea name="statement" required maxlength="6000" rows="8">${esc(c.thesis.originalStatement||c.draftStatement)}</textarea></label><p class="lt-form-note">${c.isDemo?'Editing this statement flags the sample analysis for reassessment.':'Your statement is saved on this device.'}</p><div class="lt-form-actions">${button('Cancel','close-dialog')}<button class="lt-btn lt-primary" type="submit">Save original thesis</button></div></form>`,trigger);
    dialog.querySelector('form').addEventListener('submit',async e=>{e.preventDefault();const statement=new FormData(e.target).get('statement').trim();if(!statement){e.target.statement.setCustomValidity('Write your original thesis.');e.target.statement.reportValidity();return;}
      c.thesis.createdAt ||= new Date().toISOString();c.thesis.originalStatement=statement;c.originalEdited=(c.isDemo||c.researchKind==='library')?statement!==c.baseline:true;c.reviewedAt=null;
      if(c.originalEdited){c.thesis.status='INSUFFICIENT DATA';c.thesis.confidence=null;c.thesis.currentSummary='Your original thesis has changed. Review the assumptions against verified evidence before relying on the earlier assessment.';}
      if(!await remember(c))return;dialog.close();state.message=c.originalEdited?'Original thesis saved on this device. Reassessment is required.':'Thesis saved on this device. The dated research draft is now your baseline.';render('[data-action="edit-thesis"]');
    });
    dialog.querySelector('textarea').addEventListener('input',e=>e.target.setCustomValidity(''));
  }
  function editCondition(c,id,trigger) {
    const s=c.sellConditions.find(s=>s.id===id);
    const options=c.metrics?[['manual','Qualitative condition'],['moatScore','Moat score'],...c.metrics.filter(m=>m[2]!=='text').map(m=>[m[0],m[1]+' ('+({money:'USD billions',ntd:'NTD billions',percent:'%',usd:'USD',count:'count'}[m[2]]||m[2])+')'])]:[['moatScore','Moat score'],['grossMargin','Gross margin (%)'],['operatingMargin','Operating margin (%)'],['customerGrowth','Customer / volume growth (%)'],['debt','Debt (USD billions)'],['dilution','Share dilution (%)'],['manual','Qualitative condition']];
    const dialog=showDialog(s?'Edit sell condition':'Add a sell condition',`<form data-form="condition"><label>Condition<input name="title" required maxlength="140" value="${esc(s?.title)}" placeholder="e.g. Pricing power materially deteriorates"></label><label>Why it matters<textarea name="description" required rows="3" maxlength="1500">${esc(s?.description)}</textarea></label><label>Measure<select name="metric">${options.map(([id,label])=>`<option value="${id}" ${(s?.metric||'manual')===id?'selected':''}>${label}</option>`).join('')}</select></label><div class="lt-form-pair" data-numeric><label>Trigger when<select name="operator"><option value="below">Below</option><option value="above" ${s?.operator==='above'?'selected':''}>Above</option></select></label><label>Threshold<input type="number" step="any" name="threshold" value="${s?.threshold??''}"></label></div><div data-manual><label>Current observation<textarea name="currentState" rows="2" maxlength="1500">${esc(s?.metric==='manual'?s.currentState:'Not assessed — evidence required')}</textarea></label><label>Your assessment<select name="status">${['warning','not triggered','triggered'].map(v=>`<option ${s?.status===v?'selected':''}>${v}</option>`).join('')}</select></label></div><label>Evidence<select name="evidence"><option value="">No evidence yet</option>${c.evidence.map(e=>`<option value="${e.id}" ${s?.evidenceIds?.includes(e.id)?'selected':''}>${esc(e.sourceLabel)} · ${esc(e.title)}</option>`).join('')}</select></label><p class="lt-form-note">Qualitative conditions cover management, customer concentration, disruption, or an invalidated assumption. They require your judgment.</p><div class="lt-form-actions">${button('Cancel','close-dialog')}<button class="lt-btn lt-primary" type="submit">Save condition</button></div></form>`,trigger);
    const form=dialog.querySelector('form');
    const fields=()=>{const manual=form.metric.value==='manual';dialog.querySelector('[data-numeric]').hidden=manual;dialog.querySelector('[data-manual]').hidden=!manual;form.threshold.required=!manual;form.threshold.disabled=manual;};
    form.metric.addEventListener('change',fields);fields();
    form.addEventListener('submit',async e=>{e.preventDefault();const values=Object.fromEntries(new FormData(form));if(!values.title.trim()||!values.description.trim())return;
      let condition={id:s?.id||`condition-${crypto.randomUUID()}`,thesisId:c.thesis.id,title:values.title.trim(),description:values.description.trim(),metric:values.metric,operator:values.operator,threshold:values.metric==='manual'?null:Number(values.threshold),currentState:values.currentState,status:values.status,lastChecked:new Date().toISOString(),evidenceIds:values.evidence?[values.evidence]:[]};
      condition=evaluateCondition(condition,c);if(s)c.sellConditions=c.sellConditions.map(x=>x.id===s.id?condition:x);else c.sellConditions.push(condition);if(!await remember(c))return;dialog.close();state.message='Sell condition saved on this device.';render('[data-action="add-condition"]');
    });
  }
  body.addEventListener('click',async e=>{
    if(e.target.closest('.lt-allocation'))return;
    const target=e.target.closest('button,a');
    const row=e.target.closest('[data-holding]');
    if(!target&&row&&!e.target.closest('details')){navigate(row.dataset.holding);return;}
    if(!target)return;
    if(target.dataset.symbol){if(e.ctrlKey||e.metaKey||e.shiftKey||e.altKey)return;e.preventDefault();navigate(target.dataset.symbol,target.dataset.targetTab||'thesis');return;}
    if(target.dataset.filter){state.filter=target.dataset.filter;render(`[data-filter="${state.filter}"]`);return;}
    if(target.dataset.thesisTab){state.tab=target.dataset.thesisTab;route();render(`[data-thesis-tab="${state.tab}"]`);return;}
    const action=target.dataset.action;if(!action)return;e.preventDefault();
    const c=current();
    if(action==='close-dialog'){target.closest('dialog')?.close();return;}
    if(action==='personal'||action==='demo'){state.scope=action;save('pf.living.scope',action);state.symbol=null;state.view='health';state.filter='All';state.error='';state.message='';route();render();if(action==='demo'&&!samples.length)await fetchSamples();if(action==='personal'&&!libraryLoaded)await fetchLibrary();return;}
    if(['back','health'].includes(action)){state.symbol=null;state.view='health';state.error='';state.message='';route();render();if(state.scope==='personal'&&!libraryLoaded)await fetchLibrary();scrollHost().scrollTop=0;return;}
    if(action==='allocation'){state.symbol=null;state.scope='personal';state.view='allocation';route();render();scrollHost().scrollTop=0;return;}
    if(action==='refresh'){await refresh();return;}
    if(action==='retry'){if(samples.length||state.scope==='personal')await refresh();else await fetchSamples();return;}
    if(action==='dismiss'){state.error='';state.message='';render();return;}
    if(action==='clear'){state.filter='All';state.query='';render('[data-filter="All"]');return;}
    if(action==='review-queue'){state.filter='Needs Review';render('[data-filter="Needs Review"]');return;}
    if(action.startsWith('tab-')){state.tab=action.slice(4);route();render(`[data-thesis-tab="${state.tab}"]`);return;}
    if(!c)return;
    if(action==='edit-thesis'){editThesis(c,target);return;}
    if(action==='add-condition'||action==='edit-condition'){editCondition(c,target.dataset.id,target);return;}
    if(action==='review'){
      const dialog=showDialog('Review the living thesis',`<p>Revisit the weakest assumption, the opposing evidence, and your sell conditions before recording your review.</p><dl class="lt-review-summary"><div><dt>Thesis status</dt><dd>${esc(c.thesis.status)}</dd></div><div><dt>Evidence updated</dt><dd>${date(c.holding.lastUpdated)}${stale(c.holding.lastUpdated)?' · Stale':''}</dd></div><div><dt>Sell conditions</dt><dd>${c.sellConditions.filter(s=>s.status!=='not triggered').length} warning or triggered</dd></div></dl><p class="lt-form-note">Recording a review does not change the thesis status, confidence, or evidence dates.</p><div class="lt-form-actions">${button('Keep in review queue','review-pending')}${button('Mark as reviewed','review-done','check','lt-primary')}</div>`,target);return;
    }
    if(action==='review-done'||action==='review-pending'){c.reviewedAt=action==='review-done'?new Date().toISOString():null;c.reviewedVersion=c.thesis.updatedAt;c.reviewRequested=action==='review-pending';if(!await remember(c))return;target.closest('dialog')?.close();state.message=action==='review-done'?'Review recorded. Evidence dates and thesis status are unchanged.':'Holding returned to the review queue.';render('[data-action="review"]');return;}
    const q=c.questions.find(q=>q.id===target.dataset.id);if(!q)return;
    if(action==='resolve'){q.status=q.status==='resolved'?'open':'resolved';if(!await remember(c))return;state.message=q.status==='resolved'?'Question marked as resolved.':'Question reopened.';render(`[data-action="resolve"][data-id="${q.id}"]`);return;}
    if(action==='watch'){q.watchlisted=!q.watchlisted;if(!await remember(c))return;state.message=q.watchlisted?'Question added to your watchlist.':'Question removed from your watchlist.';render(`[data-action="watch"][data-id="${q.id}"]`);return;}
    if(action==='investigate'){q.status='investigating';if(!await remember(c))return;showDialog('Investigate the assumption',`<div class="lt-kicker">${esc(c.holding.symbol)} · RESEARCH QUESTION</div><h3>${esc(q.title)}</h3><p>${esc(q.uncertainty)}</p><h4>Evidence to revisit</h4>${evidenceRows(c,q.evidenceIds)}<p class="lt-form-note">Compare the original statement with at least two reporting periods. Look for evidence that could prove it wrong.</p><form data-form="investigation"><label>Investigation notes<textarea name="notes" rows="5" maxlength="5000" placeholder="What would settle this question?">${esc(q.notes)}</textarea></label><div class="lt-form-actions">${button('Close','close-dialog')}<button type="submit" class="lt-btn lt-primary">Save notes</button></div></form>`,target).querySelector('form').addEventListener('submit',async e=>{e.preventDefault();q.notes=new FormData(e.target).get('notes');if(!await remember(c))return;e.target.closest('dialog').close();state.message='Investigation notes saved on this device.';render();});}
  },{signal:life.signal});
  body.addEventListener('change',e=>{if(e.target.matches('.lt-sort select')){state.sort=e.target.value;render('.lt-sort select');}},{signal:life.signal});
  body.addEventListener('input',e=>{if(e.target.matches('.lt-search input')){const position=e.target.selectionStart;state.query=e.target.value;render('.lt-search input');try{body.querySelector('.lt-search input').setSelectionRange(position,position);}catch{}}},{signal:life.signal});
  body.addEventListener('keydown',e=>{
    if(!e.target.matches('[data-thesis-tab]')||!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;
    e.preventDefault();const idx=TABS.findIndex(([id])=>id===state.tab);state.tab=TABS[e.key==='Home'?0:e.key==='End'?TABS.length-1:(idx+(e.key==='ArrowRight'?1:-1)+TABS.length)%TABS.length][0];route({replace:true});render(`[data-thesis-tab="${state.tab}"]`);
  },{signal:life.signal});
  addEventListener('popstate',()=>{const p=new URLSearchParams(location.search);if(p.get('tab')!=='portfolio')return;state.symbol=p.get('symbol');state.tab=TABS.some(([id])=>id===p.get('thesis'))?p.get('thesis'):'thesis';state.scope=p.get('book')==='personal'?'personal':'demo';state.view=p.get('portfolioView')||'health';state.message='';state.error='';render();},{signal:life.signal});
  route({replace:true});
  if(state.scope==='demo')fetchSamples();else fetchLibrary();
}
