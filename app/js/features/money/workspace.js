import {load,save,flushStorage,onDataChange} from '../../core/storage.js';
import {CATS,localDate,todayMonth,validMonth,validDate,shiftMonth,category,balances,allocatedToGoals,makeEntry,validateAmount,validateSplit,fundGoal,monthlyBills,selectEntries,exportCSV,importCSV,entryFingerprint,amountText as money} from './model.js';
import {page,esc,button,miniButton,icon,TABS} from './views.js';

const defaults={entries:[],budgets:{},goals:[],split:{savings:20,invest:10},card:{locked:true,roundups:false},recurring:[]};
const read=()=>Object.fromEntries(Object.entries(defaults).map(([key,value])=>[key,structuredClone(load('money.'+key,value))]));
const field=(label,name,value='',extra='')=>`<label>${label}<input name="${name}" value="${esc(value)}" ${extra}></label>`;
const actions=(label='Save changes',remove='')=>`<div class="mn-form-actions">${remove?button(remove,'delete-dialog','','mn-danger'):''}<span></span>${button('Cancel','close-dialog','','mn-quiet')}<button type="submit" class="mn-btn mn-primary">${label}</button></div>`;
const amountInput=(value='',label='Amount (THB)')=>field(label,'amount',value,'type="number" inputmode="decimal" step="0.01" min="0.01" max="1000000000000" required');
const selectCats=(type,current='')=>[...new Set([...CATS[type].map(([c])=>c),...(current?[current]:[])])].map(cat=>`<option value="${esc(cat)}" ${cat===current?'selected':''}>${esc(cat)}</option>`).join('');

export function mountMoney(body) {
  body.classList.add('app-pane','app-money');
  const params=new URLSearchParams(location.search);
  const state={tab:TABS.some(([id])=>id===params.get('view'))?params.get('view'):'overview',month:validMonth(params.get('month'))&&params.get('month')<=todayMonth()?params.get('month'):todayMonth(),range:6,query:'',type:'all',cat:'all',review:'all',sort:'newest',allDates:false,shown:30,message:'',error:false};
  const life=new AbortController();
  let saving=false,activeDialog=null,renderQueued=false;
  const scrollHost=()=>body.closest('#shell-view')||body;
  function render(focus) {
    if (!body.isConnected || activeDialog?.open) return;
    const active=document.activeElement;
    const control=active?.dataset.control;
    const pos=active?.selectionStart;
    body.innerHTML=page(read(),state);
    const next=focus?body.querySelector(focus):control?body.querySelector(`[data-control="${control}"]`):null;
    next?.focus({preventScroll:true});
    if(control==='query' && Number.isInteger(pos)) next?.setSelectionRange(pos,pos);
  }
  function route(replace=false) {
    const url=new URL(location.href);
    url.searchParams.set('view',state.tab);url.searchParams.set('month',state.month);
    history[replace?'replaceState':'pushState']({money:true},'',url);
  }
  function go(tab) {
    state.tab=tab;state.message='';state.error=false;
    route();render(`.mn-tabs [data-action="${tab}"]`);scrollHost().scrollTop=0;
  }
  function notify(message,error=false) {state.message=message;state.error=error;render();}
  function dialog(title,content,trigger) {
    const previousDialog=activeDialog;
    activeDialog=null;
    previousDialog?.close();
    previousDialog?.remove();
    const el=document.createElement('dialog');el.className='mn-dialog';el.setAttribute('aria-labelledby','mn-dialog-title');
    el.innerHTML=`<div class="mn-dialog-head"><span class="mn-kicker">MOATRICES · MONEY</span>${miniButton('Close dialog','close-dialog','close')}</div><h2 id="mn-dialog-title">${title}</h2>${content}`;
    body.append(el);activeDialog=el;
    el.addEventListener('cancel',event=>{if(saving)event.preventDefault();});
    el.addEventListener('close',()=>{el.remove();if(activeDialog===el)activeDialog=null;if(trigger?.isConnected)trigger.focus({preventScroll:true});else body.querySelector('.mn-head-actions [data-action="add"]')?.focus({preventScroll:true});});
    el.showModal();return el;
  }
  function formError(el,message) {
    let error=el.querySelector('.mn-form-error');
    if(!error){error=document.createElement('p');error.className='mn-form-error';error.setAttribute('role','alert');el.querySelector('form').prepend(error);}
    error.textContent=message;
  }
  async function persist(updates) {
    saving=true;
    try {
      for(const [key,value] of Object.entries(updates))save('money.'+key,value);
      if(!await flushStorage())throw new Error('Your device could not confirm the save. Keep this page open and try again.');
    } finally {saving=false;}
  }
  function submit(el,handler) {
    el.querySelector('form').addEventListener('submit',async event=>{
      event.preventDefault();if(saving)return;
      const submitter=event.submitter;
      if(submitter)submitter.disabled=true;
      try {await handler(Object.fromEntries(new FormData(event.target)),event);}
      catch(error){formError(el,error.message);}
      finally{if(submitter?.isConnected)submitter.disabled=false;}
    });
  }
  function finish(el,message) {el.close();notify(message);}
  function confirmDelete(title,copy,remove,trigger) {
    const el=dialog(title,`<p>${copy}</p><form><div class="mn-form-actions"><span></span>${button('Keep it','close-dialog','','mn-quiet')}<button class="mn-btn mn-danger" type="submit">Delete</button></div></form>`,trigger);
    submit(el,async()=>{await remove();finish(el,'Deleted. Your totals have been updated.');});
  }
  function editEntry(id,trigger,preset={}) {
    const data=read(),previous=data.entries.find(e=>String(e.id)===String(id));
    const seed=previous||{id:crypto.randomUUID()};
    const type=previous?.type||preset.type||'out';
    const el=dialog(previous?'Edit transaction':preset.recurringId?'Record bill payment':'Add transaction',`<p>${previous?'Update the details in your personal ledger.':'A small entry. A clearer picture.'}</p><form data-form="entry"><label>Type<select name="type" aria-label="Type"><option value="out" ${type==='out'?'selected':''}>Expense</option><option value="in" ${type==='in'?'selected':''}>Income</option></select></label><div class="mn-form-pair">${amountInput(previous?.amount??preset.amount??'')}${field('Date','date',previous?.date||localDate(),'type="date" required max="'+localDate()+'"')}</div><label>Category<select name="cat" aria-label="Category">${selectCats(type,previous?category(previous):preset.cat)}</select></label><label>Note<textarea name="note" rows="3" maxlength="500" placeholder="What was this for?">${esc(previous?.note??preset.note??'')}</textarea></label><label class="mn-check"><input type="checkbox" name="reviewed" ${previous?.reviewed?'checked':''}>Mark as reviewed</label><p class="mn-form-note" data-allocation-note></p>${actions(previous?'Save changes':'Save transaction',previous?'Delete transaction':'')}</form>`,trigger);
    const form=el.querySelector('form');
    if(preset.recurringId){form.elements.type.disabled=true;}
    const updateNote=()=>{
      const split=previous?.type==='in'&&form.elements.type.value==='in'?(previous.split||{savings:0,invest:0}):data.split;
      el.querySelector('[data-allocation-note]').textContent=form.elements.type.value==='in'?`${100-split.savings-split.invest}% available cash · ${split.savings}% savings · ${split.invest}% set aside to invest. ${previous?.type==='in'?'This entry keeps its original allocation.':'Your current allocation applies to this income.'}`:previous?.roundup||!previous&&data.card.roundups?'Round ups assign the spare change to savings; they do not increase your spending.':'Expenses reduce available cash. Your savings and investing allocations stay earmarked.';
    };
    form.elements.type.addEventListener('change',()=>{form.elements.cat.innerHTML=selectCats(form.elements.type.value);updateNote();});updateNote();
    el.querySelector('[data-action="delete-dialog"]')?.addEventListener('click',()=>{el.close();confirmDelete('Delete this transaction?','The entry will be removed and your recorded balance and allocations recalculated.',async()=>{const latest=read();await persist({entries:latest.entries.filter(e=>e.id!==previous.id)});},trigger);});
    submit(el,async values=>{
      const latest=read();
      if(previous && !latest.entries.some(e=>e.id===previous.id))throw new Error('This transaction was removed elsewhere. Close this editor and check your ledger.');
      if(preset.recurringId && latest.entries.some(e=>e.recurringId===preset.recurringId && e.occurrence===preset.occurrence))throw new Error('A payment is already recorded for this bill and month.');
      const entry=makeEntry({...values,type:preset.recurringId?'out':values.type,reviewed:values.reviewed==='on'},{previous:seed,split:latest.split,roundups:latest.card.roundups});
      if(preset.recurringId){entry.recurringId=preset.recurringId;entry.occurrence=preset.occurrence;}
      const next=latest.entries.filter(e=>e.id!==entry.id);next.push(entry);
      await persist({entries:next});finish(el,'Transaction saved.');
    });
  }
  function editBudget(cat,trigger) {
    const data=read(),exists=Boolean(cat);
    const el=dialog(exists?esc(cat)+' budget':'Add a category budget',`<p>Choose a monthly spending limit. It applies to all months until you update it.</p><form>${exists?'':field('Category','cat','','required maxlength="80" list="mn-budget-categories"')}${exists?'':`<datalist id="mn-budget-categories">${CATS.out.map(([c])=>`<option value="${c}">`).join('')}</datalist>`}${amountInput(data.budgets[cat]||'','Monthly limit (THB)')}${actions('Save budget',data.budgets[cat]?'Remove limit':'')}</form>`,trigger);
    el.querySelector('[data-action="delete-dialog"]')?.addEventListener('click',async()=>{
      if(saving)return;
      try {const budgets=read().budgets;delete budgets[cat];await persist({budgets});finish(el,'Budget limit removed. Transactions are still in your ledger.');}catch(error){formError(el,error.message);}
    });
    submit(el,async values=>{const name=cat||values.cat.trim();if(!name||['__proto__','constructor','prototype'].includes(name))throw new Error('Choose a category name.');await persist({budgets:{...read().budgets,[name]:validateAmount(values.amount)}});finish(el,'Monthly budget saved.');});
  }
  function editGoal(id,trigger) {
    const old=read().goals.find(g=>String(g.id)===String(id));
    const goalId=old?.id||crypto.randomUUID();
    const el=dialog(old?'Edit savings goal':'Create a savings goal',`<p>Give your savings a purpose. You can assign funds after creating the goal.</p><form>${field('Goal name','name',old?.name||'','required maxlength="100" placeholder="e.g. Emergency fund"')}${amountInput(old?.target||'','Target (THB)')}${actions(old?'Save goal':'Create goal',old?'Delete goal':'')}</form>`,trigger);
    el.querySelector('[data-action="delete-dialog"]')?.addEventListener('click',()=>{el.close();confirmDelete('Delete this goal?',`${money(old.saved)} will become unassigned savings. Your total balance stays the same.`,async()=>{await persist({goals:read().goals.filter(g=>g.id!==old.id)});},trigger);});
    submit(el,async values=>{
      const name=values.name.trim();if(!name)throw new Error('Give your goal a name.');
      const goals=read().goals,current=goals.find(g=>g.id===goalId);
      if(old&&!current)throw new Error('This goal was removed elsewhere. Close this editor and check your goals.');
      const goal={...current,id:goalId,name,target:validateAmount(values.amount),saved:current?.saved||0,emoji:current?.emoji||'🎯'};
      await persist({goals:[...goals.filter(g=>g.id!==goalId),goal]});finish(el,'Savings goal saved.');
    });
  }
  function manageFunds(id,trigger) {
    const data=read(),goal=data.goals.find(g=>String(g.id)===String(id));if(!goal)return;
    const free=balances(data.entries).savings-allocatedToGoals(data.goals);
    const el=dialog('Funds for '+esc(goal.name),`<p>${money(goal.saved)} assigned to this goal. ${money(Math.max(0,free))} in unassigned savings.</p><form><label>Action<select name="direction" aria-label="Action"><option value="add">Assign savings to goal</option><option value="release">Release back to savings</option></select></label>${amountInput()}<p class="mn-form-note">This changes how savings are earmarked. It does not create income or an expense.</p>${actions('Update goal funds')}</form>`,trigger);
    submit(el,async values=>{const latest=read(),current=latest.goals.find(g=>g.id===goal.id);if(!current)throw new Error('This goal no longer exists.');const updated=fundGoal(current,values.amount,values.direction,balances(latest.entries).savings-allocatedToGoals(latest.goals));await persist({goals:latest.goals.map(g=>g.id===goal.id?updated:g)});finish(el,'Goal funds updated.');});
  }
  function settings(trigger) {
    const data=read();
    const el=dialog('Money settings',`<p>Decide how new income is earmarked. Existing income keeps the allocation recorded when it was added.</p><form><div class="mn-form-pair">${field('Savings (%)','savings',data.split.savings,'type="number" min="0" max="100" step="1" required')}${field('Set aside to invest (%)','invest',data.split.invest,'type="number" min="0" max="100" step="1" required')}</div><div class="mn-settings-cash">${icon('wallet')}<span>The remainder stays in available cash.</span></div><label class="mn-check"><input type="checkbox" name="roundups" ${data.card.roundups?'checked':''}>Round up new expenses to the next ฿10</label><p class="mn-form-note">The difference is earmarked from available cash into savings. No money is transferred between bank accounts.</p>${actions('Save settings')}</form><div class="mn-settings-backup">${button('Sync, backup & restore','app-settings','shield','mn-quiet')}<p>Backups include transactions, budgets, allocations, goals and your bill reminders.</p></div>`,trigger);
    submit(el,async values=>{const latest=read();await persist({split:validateSplit({savings:Number(values.savings),invest:Number(values.invest)}),card:{...latest.card,roundups:values.roundups==='on'}});finish(el,'Money settings saved. Existing income allocations are unchanged.');});
  }
  function editBill(id,trigger) {
    const old=read().recurring.find(b=>String(b.id)===String(id));
    const billId=old?.id||crypto.randomUUID();
    const el=dialog(old?'Edit subscription':'Add subscription',`<p>Add a reminder for a regular expense. Record each payment when it happens.</p><form>${field('Subscription name','name',old?.name||'','required maxlength="100" placeholder="e.g. Internet"')}${amountInput(old?.amount||'')}<div class="mn-form-pair">${field('Due day of month','day',old?.day||Number(localDate().slice(-2)),'type="number" min="1" max="31" step="1" required')}${field('Start date','startDate',old?.startDate||localDate(),'type="date" required')}</div><label>Category<select name="cat" aria-label="Category">${selectCats('out',old?.cat||'Home')}</select></label><p class="mn-form-note">For shorter months, a subscription due on the 29th–31st falls on the last day. Reminders stay on this device and are included in backups.</p>${actions('Save subscription',old?'Delete reminder':'')}</form>`,trigger);
    el.querySelector('[data-action="delete-dialog"]')?.addEventListener('click',()=>{el.close();confirmDelete('Delete this reminder?','Future reminders will be removed. Payments already recorded remain in your transactions.',async()=>{await persist({recurring:read().recurring.filter(b=>b.id!==old.id)});},trigger);});
    submit(el,async values=>{const name=values.name.trim(),day=Number(values.day);if(!name||!Number.isInteger(day)||day<1||day>31||!validDate(values.startDate))throw new Error('Enter a name, a due day from 1 to 31, and a valid start date.');const latest=read();await persist({recurring:[...latest.recurring.filter(b=>b.id!==billId),{...old,id:billId,name,amount:validateAmount(values.amount),day,startDate:values.startDate,cat:values.cat}]});finish(el,'Monthly bill reminder saved.');});
  }
  async function previewImport(file,trigger) {
    if(!file)return;
    try {
      if(file.size>5e6)throw new Error('Choose a CSV smaller than 5 MB.');
      const entries=importCSV(await file.text());
      const existing=new Set(read().entries.map(entryFingerprint));
      const duplicate=entries.filter(e=>existing.has(entryFingerprint(e))).length;
      const el=dialog('Review CSV import',`<p><b>${entries.length}</b> transactions in ${esc(file.name)}. ${duplicate?`${duplicate} match transactions already in your ledger.`:'Ready to add to your ledger.'}</p><div class="mn-import-preview">${entries.slice(0,5).map(e=>`<div><span>${esc(e.date)} · ${esc(category(e))}</span><b>${e.type==='in'?'+':'−'}${money(e.amount)}</b></div>`).join('')}${entries.length>5?`<p>And ${entries.length-5} more transactions.</p>`:''}</div><form><label class="mn-check"><input name="skip" type="checkbox" checked>Skip matches already in my ledger</label><p class="mn-form-note">Matches use date, type, amount, category and note. Income without allocation columns is kept entirely in cash. CSV imports do not change budgets or goals.</p>${actions('Import transactions')}</form>`,trigger);
      submit(el,async values=>{const latest=read(),known=new Set(latest.entries.map(entryFingerprint));const toAdd=entries.filter(e=>!latest.entries.some(old=>old.id===e.id)&&(!values.skip||!known.has(entryFingerprint(e))));await persist({entries:[...latest.entries,...toAdd]});finish(el,`${toAdd.length} transaction${toAdd.length===1?'':'s'} imported.`);});
    } catch(error){notify(error.message,true);}
  }
  function download() {
    const rows=selectEntries(read().entries,{...state,month:state.allDates?'':state.month});
    const url=URL.createObjectURL(new Blob([exportCSV(rows)],{type:'text/csv;charset=utf-8'}));
    const a=document.createElement('a');a.href=url;a.download=`moatrices-transactions-${state.allDates?'all':state.month}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    notify(`Exported ${rows.length} transaction${rows.length===1?'':'s'} matching your filters.`);
  }
  body.addEventListener('click',async event=>{
    const target=event.target.closest('[data-action]');if(!target || !body.contains(target))return;
    const action=target.dataset.action,id=target.dataset.id;event.preventDefault();
    if(saving)return;
    try {
      if(TABS.some(([tab])=>tab===action)){go(action);return;}
      if(action==='close-dialog'){target.closest('dialog')?.close();return;}
      if(action==='delete-dialog')return;
      if(action==='add'||action==='edit'){editEntry(id,target);return;}
      if(action==='budget'||action==='add-budget'){editBudget(target.dataset.cat,target);return;}
      if(action==='add-goal'||action==='edit-goal'){editGoal(id,target);return;}
      if(action==='fund'){manageFunds(id,target);return;}
      if(action==='settings'){settings(target);return;}
      if(action==='add-subscription'||action==='add-bill'||action==='edit-bill'){editBill(id,target);return;}
      if(action==='pay-bill') {
        const data=read(),bill=monthlyBills(data.recurring,target.dataset.month,data.entries).find(b=>String(b.id)===id);
        if(bill&&!bill.payment)editEntry(null,target,{type:'out',amount:bill.amount,cat:bill.cat,note:bill.name,recurringId:bill.id,occurrence:bill.month});return;
      }
      if(action==='app-settings'){activeDialog?.close();document.dispatchEvent(new CustomEvent('pp-settings'));return;}
      if(action==='import'){body.querySelector('[data-csv-input]').click();return;}
      if(action==='export'){download();return;}
      if(action==='toggle-review'){const data=read();await persist({entries:data.entries.map(e=>String(e.id)===id?{...e,reviewed:!e.reviewed}:e)});render(`[data-entry="${CSS.escape(id)}"] [data-action="toggle-review"]`);return;}
      if(action==='prev'||action==='next'){state.month=shiftMonth(state.month,action==='prev'?-1:1);if(state.month>todayMonth())state.month=todayMonth();state.shown=30;route();render();return;}
      if(action==='chart-month'){state.month=target.dataset.month;route();render();return;}
      if(action==='range'){state.range=Number(target.dataset.range);render(`[data-action="range"][data-range="${state.range}"]`);return;}
      if(action==='filter'){state.type=target.dataset.type;state.shown=30;render(`[data-type="${state.type}"]`);return;}
      if(action==='review-queue'){state.review='pending';state.allDates=false;go('transactions');return;}
      if(action==='clear'){Object.assign(state,{query:'',cat:'all',review:'all',type:'all',allDates:true,shown:30});render('[data-control="query"]');return;}
      if(action==='more'){state.shown+=30;render('[data-action="more"]');return;}
      if(action==='dismiss'){state.message='';state.error=false;render();}
    } catch(error){if(activeDialog?.open)formError(activeDialog,error.message);else notify(error.message,true);}
  },{signal:life.signal});
  body.addEventListener('input',event=>{if(event.target.dataset.control==='query'){state.query=event.target.value;state.shown=30;render();}},{signal:life.signal});
  body.addEventListener('change',event=>{
    if(event.target.matches('[data-csv-input]')){previewImport(event.target.files[0],body.querySelector('[data-action="import"]'));return;}
    const key=event.target.dataset.control;if(!key||key==='query')return;
    if(key==='month'){if(!validMonth(event.target.value)||event.target.value>todayMonth())return;state.month=event.target.value;route();}
    else state[key]=event.target.type==='checkbox'?event.target.checked:event.target.value;
    state.shown=30;render();
  },{signal:life.signal});
  body.addEventListener('keydown',event=>{
    if(!event.target.matches('.mn-tabs button')||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
    event.preventDefault();const index=TABS.findIndex(([id])=>id===state.tab);go(TABS[event.key==='Home'?0:event.key==='End'?TABS.length-1:(index+(event.key==='ArrowRight'?1:-1)+TABS.length)%TABS.length][0]);
  },{signal:life.signal});
  addEventListener('popstate',()=>{activeDialog?.close();const p=new URLSearchParams(location.search);state.tab=TABS.some(([id])=>id===p.get('view'))?p.get('view'):'overview';state.month=validMonth(p.get('month'))&&p.get('month')<=todayMonth()?p.get('month'):todayMonth();render();},{signal:life.signal});
  const unsubscribe=onDataChange(key=>{if(!key.startsWith('money.')||saving||renderQueued)return;renderQueued=true;queueMicrotask(()=>{renderQueued=false;render();});});
  const detector=new MutationObserver(()=>{if(!body.isConnected){life.abort();unsubscribe();detector.disconnect();}});
  detector.observe(body.parentNode,{childList:true});
  render();
}
