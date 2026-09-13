// Money uses the existing device ledger. Allocations are earmarks, not bank accounts.
// Amounts are accumulated in satang; income keeps the split recorded at entry time.
export const CATS = {
  out: [['Food','🍜'],['Transport','🚗'],['Home','🛒'],['Fun','🎮'],['Health','💊'],['Other','📦']],
  in: [['Salary','💼'],['Investments','📈'],['Other','💵']],
};
const LEGACY = {อาหาร:'Food',เดินทาง:'Transport',ของใช้:'Home',บันเทิง:'Fun',สุขภาพ:'Health',อื่นๆ:'Other',เงินเดือน:'Salary',ลงทุน:'Investments'};
export const category = e => LEGACY[e.cat] || e.cat || 'Other';
export const cents = n => Math.round((Number(n) + Number.EPSILON) * 100);
export const round = n => cents(n) / 100;
export const localDate = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
export const todayMonth = () => localDate().slice(0,7);
export const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value || '') && localDate(new Date(value+'T12:00:00')) === value;
export const validMonth = value => /^\d{4}-\d{2}$/.test(value || '') && validDate(value+'-01');
export function shiftMonth(month, offset) {
  const [year, m] = month.split('-').map(Number);
  return localDate(new Date(year,m-1+offset,1)).slice(0,7);
}
export const monthName = (month, short = false) => new Date(month+'-01T12:00:00').toLocaleDateString('en-US',{month:short?'short':'long',year:'numeric'});
export const dateName = date => validDate(date) ? new Date(date+'T12:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}) : 'No date';
export const amountText = (value, compact = false) => Number.isFinite(value) ? '฿'+new Intl.NumberFormat('en-US',compact?{notation:'compact',maximumFractionDigits:1}:{minimumFractionDigits:0,maximumFractionDigits:2}).format(value) : '—';
export function validateAmount(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0 || n > 1e12 || Math.abs(n*100-Math.round(n*100)) > .01) throw new Error('Enter an amount from ฿0.01 to ฿1 trillion, with at most two decimal places.');
  return round(n);
}
export function validateSplit(split) {
  const {savings, invest} = split;
  if (![savings,invest].every(n=>Number.isFinite(n) && n>=0 && n<=100) || savings+invest>100) throw new Error('Savings and investing must total 100% or less.');
  return {savings,invest};
}
export function roundup(amount) { return ((1000-cents(amount)%1000)%1000)/100; }
const posted = (e, asOf) => ['in','out'].includes(e.type) && Number.isFinite(e.amount) && validDate(e.date) && e.date<=asOf;
export function balances(entries, asOf = localDate()) {
  let cash=0,savings=0,invest=0;
  for (const e of entries.filter(e=>posted(e,asOf))) {
    const amount=cents(e.amount);
    if (e.type==='in') {
      const s=e.split?Math.round(amount*e.split.savings/100):0;
      const i=e.split?Math.round(amount*e.split.invest/100):0;
      savings+=s;invest+=i;cash+=amount-s-i;
    } else {const r=cents(e.roundup||0);cash-=amount+r;savings+=r;}
  }
  return {cash:cash/100,savings:savings/100,invest:invest/100,total:(cash+savings+invest)/100};
}
export function monthTotals(entries, month, asOf = localDate()) {
  const rows=entries.filter(e=>posted(e,asOf) && e.date.startsWith(month));
  const income=rows.filter(e=>e.type==='in').reduce((s,e)=>s+cents(e.amount),0)/100;
  const expense=rows.filter(e=>e.type==='out').reduce((s,e)=>s+cents(e.amount),0)/100;
  return {income,expense,net:round(income-expense),rate:income>0?(income-expense)/income*100:null,count:rows.length};
}
export function cashFlow(entries, month, count = 6, asOf = localDate()) {
  return Array.from({length:count},(_,i)=>{const m=shiftMonth(month,i-count+1);return {month:m,...monthTotals(entries,m,asOf)};});
}
export function budgetRows(entries, budgets, month, asOf = localDate()) {
  const spent=new Map();
  for (const e of entries.filter(e=>posted(e,asOf) && e.type==='out' && e.date.startsWith(month))) spent.set(category(e),(spent.get(category(e))||0)+cents(e.amount));
  const categories=[...new Set([...CATS.out.map(([c])=>c),...Object.keys(budgets),...spent.keys()])];
  return categories.map(cat=>{
    const used=(spent.get(cat)||0)/100,limit=Number(budgets[cat])||0;
    return {cat,spent:used,limit,left:round(limit-used),ratio:limit>0?used/limit:null,status:limit<=0?'unset':used>limit?'over':used>=limit*.8?'near':'within'};
  });
}
export function selectEntries(entries,{month='',type='all',query='',cat='all',review='all',sort='newest'}={}) {
  const q=query.trim().toLocaleLowerCase();
  return entries.filter(e=>(!month||e.date.startsWith(month)) && (type==='all'||e.type===type) && (cat==='all'||category(e)===cat) && (review==='all'||(review==='reviewed'?e.reviewed===true:e.reviewed!==true)) && (!q||[e.note,category(e),e.amount,e.date].join(' ').toLocaleLowerCase().includes(q)))
    .map((e,index)=>({e,index})).sort((a,b)=>sort==='largest'?b.e.amount-a.e.amount||b.index-a.index:sort==='oldest'?a.e.date.localeCompare(b.e.date)||a.index-b.index:b.e.date.localeCompare(a.e.date)||b.index-a.index).map(row=>row.e);
}
export function makeEntry(values, {previous,split={savings:20,invest:10},roundups=false,today=localDate()}={}) {
  const amount=validateAmount(values.amount),type=values.type;
  if (!['in','out'].includes(type)) throw new Error('Choose income or expense.');
  if (!validDate(values.date) || values.date>today) throw new Error('Choose a valid transaction date, today or earlier.');
  const cat=String(values.cat||'').trim(),note=String(values.note||'').trim();
  if (!cat || cat.length>80 || note.length>500) throw new Error('Choose a category and keep notes under 500 characters.');
  const e={...previous,id:previous?.id??crypto.randomUUID(),type,amount,date:values.date,cat,note,reviewed:values.reviewed??previous?.reviewed??false};
  delete e.split;delete e.roundup;
  if (type==='in') e.split=validateSplit(previous?.type==='in'?(previous.split||{savings:0,invest:0}):split);
  else if (previous?.type==='out' ? Object.hasOwn(previous,'roundup') : roundups) e.roundup=roundup(amount);
  return e;
}
export const allocatedToGoals = goals => goals.reduce((sum,g)=>sum+cents(g.saved||0),0)/100;
export function fundGoal(goal, amount, direction, available) {
  amount=validateAmount(amount);
  if (direction==='add' && cents(amount)>cents(Math.max(0,available))) throw new Error('This amount exceeds your unassigned savings.');
  if (direction==='release' && cents(amount)>cents(goal.saved)) throw new Error('This amount exceeds what is assigned to this goal.');
  return {...goal,saved:round(goal.saved+(direction==='add'?amount:-amount))};
}
export function billOccurrence(bill, month, entries) {
  if (!validMonth(month) || !validDate(bill.startDate) || month<bill.startDate.slice(0,7)) return null;
  const [y,m]=month.split('-').map(Number),day=Math.min(Number(bill.day),new Date(y,m,0).getDate());
  const dueDate=month+'-'+String(day).padStart(2,'0');
  if (dueDate<bill.startDate) return null;
  const payment=entries.find(e=>e.recurringId===bill.id && e.occurrence===month);
  return {...bill,dueDate,month,payment};
}
export const monthlyBills = (bills,month,entries) => bills.filter(b=>b.active!==false).map(b=>billOccurrence(b,month,entries)).filter(Boolean).sort((a,b)=>a.dueDate.localeCompare(b.dueDate));
export function subscriptionSummary(bills, month, entries) {
  const occurrences=monthlyBills(bills,month,entries);
  const active=bills.filter(b=>b.active!==false);
  const monthly=active.reduce((sum,b)=>sum+Number(b.amount||0),0);
  const paid=occurrences.filter(b=>b.payment).reduce((sum,b)=>sum+Number(b.amount||0),0);
  const unpaid=occurrences.filter(b=>!b.payment);
  return {active:active.length,monthly,annual:monthly*12,paid,unpaid,occurrences};
}

// Exported text cells are neutralized for spreadsheet formulas. This prefix is
// removed by our importer only for the exact escaping convention used here.
const csvSafe = value => /^[=+\-@\t\r]/.test(String(value)) ? "'"+value : String(value);
const csvCell = value => '"'+csvSafe(value).replaceAll('"','""')+'"';
export function exportCSV(entries) {
  return '\uFEFF'+[['Date','Type','Amount','Category','Note','Reviewed','Savings %','Invest %','Round up'],...entries.map(e=>[e.date,e.type,e.amount,category(e),e.note||'',e.reviewed===true?'yes':'no',e.split?.savings??'',e.split?.invest??'',e.roundup??''])].map(r=>r.map(csvCell).join(',')).join('\r\n');
}
export function parseCSV(text) {
  if (text.length>5e6) throw new Error('Choose a CSV smaller than 5 MB.');
  text=text.replace(/^\uFEFF/,'');
  const rows=[];let row=[],cell='',quoted=false;
  for (let i=0;i<text.length;i++) {
    const c=text[i];
    if (c==='"') {if (quoted && text[i+1]==='"') {cell+='"';i++;} else quoted=!quoted;}
    else if (c===',' && !quoted) {row.push(cell);cell='';}
    else if ((c==='\n'||c==='\r') && !quoted) {if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(v=>v.trim()))rows.push(row);row=[];cell='';}
    else cell+=c;
  }
  if (quoted) throw new Error('The CSV contains an unclosed quotation mark.');
  row.push(cell);if(row.some(v=>v.trim()))rows.push(row);
  return rows;
}
export function importCSV(text, today=localDate()) {
  const [header,...rows]=parseCSV(text);
  if (!header || !rows.length) throw new Error('The CSV has no transactions.');
  if (rows.length>10000) throw new Error('Import up to 10,000 transactions at a time.');
  const names=header.map(h=>h.trim().toLowerCase());
  for(const key of ['date','type','amount','category']) if(!names.includes(key)) throw new Error('Required columns: Date, Type, Amount, Category. Optional: Note, Reviewed, Savings %, Invest %, Round up.');
  return rows.map((row,index)=>{
    const get=key=>String(row[names.indexOf(key)]??'').replace(/^'(?=[=+\-@\t\r])/,'');
    try {
      const type=get('type').toLowerCase();
      const e=makeEntry({date:get('date'),type:type==='income'?'in':type==='expense'?'out':type,amount:get('amount'),cat:get('category'),note:get('note'),reviewed:get('reviewed').toLowerCase()==='yes'},{split:{savings:0,invest:0},today});
      if (e.type==='in') e.split=validateSplit({savings:Number(get('savings %')||0),invest:Number(get('invest %')||0)});
      if (e.type==='out' && get('round up')!=='') {
        const n=Number(get('round up'));
        if (!Number.isFinite(n)||n<0||n>=10||cents(n)!==n*100 && Math.abs(cents(n)-n*100)>.0001) throw new Error('Round up must be between ฿0 and ฿9.99.');
        e.roundup=round(n);
      }
      return e;
    } catch(error) {throw new Error(`Row ${index+2}: ${error.message}`);}
  });
}
export const entryFingerprint = e => JSON.stringify([e.date,e.type,cents(e.amount),category(e),e.note||'']);
