// Build classification metadata from an archived Nasdaq screener response.
// Usage: node tools/build-smart-money-sectors.mjs /path/to/nasdaq.json YYYY-MM-DD
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const [input,checkedAt]=process.argv.slice(2);
if(!input || !/^\d{4}-\d{2}-\d{2}$/.test(checkedAt||''))throw new Error('Supply Nasdaq JSON and checked date');
const stocks=JSON.parse(fs.readFileSync(input)).data.rows;
const catalog=JSON.parse(fs.readFileSync(path.join(root,'data/smart-money.json')));
const normalize=name=>name.toUpperCase()
  .replace(/\b(CLASS [A-Z0-9-]+|COMMON STOCK|ORDINARY SHARES|AMERICAN DEPOSITARY|AMERICAN DEPOSITORY|DEPOSITARY SHARES|DEPOSITORY SHARES|PREFERRED STOCK|WARRANTS|UNITS|RIGHTS)\b.*$/,'')
  .replace(/\b(HLDGS|HLDG)\b/g,'HOLDINGS').replace(/\b(INTL)\b/g,'INTERNATIONAL')
  .replace(/\b(CORPORATION|CORP|INCORPORATED|INC|LIMITED|LTD|PLC|COMPANY|CO|NEW|COM|DEL)\b/g,'')
  .replace(/[^A-Z0-9]/g,'');
const symbolIndex=new Map(), names=new Map();
for(const stock of stocks){
  const symbol=stock.symbol.replace(/\//g,'.');
  if(!stock.sector)continue;
  const entry={symbol,sector:stock.sector,industry:stock.industry,source:'https://www.nasdaq.com'+stock.url};
  symbolIndex.set(symbol,entry);
  const key=normalize(stock.name);
  if(!names.has(key))names.set(key,[]);
  names.get(key).push(entry);
}
const positions=catalog.funds.flatMap(f=>JSON.parse(fs.readFileSync(path.join(root,'data',f.detailFile))).current.holdings);
const issuerPrefixes=new Map();
for(const row of positions){
  const match=symbolIndex.get(row.symbol);
  if(match)issuerPrefixes.set(row.cusip.slice(0,6),match);
}
const byCusip={},bySymbol={};
for(const row of positions){
  const direct=symbolIndex.get(row.symbol);
  const named=names.get(normalize(row.issuer))||[];
  const sameSector=named.length && named.every(entry=>entry.sector===named[0].sector);
  const matched=direct || issuerPrefixes.get(row.cusip.slice(0,6)) || (sameSector ? named[0] : null);
  if(matched)byCusip[row.cusip]={...matched,match:direct?'symbol':issuerPrefixes.has(row.cusip.slice(0,6))?'issuer-cusip':'issuer-name'};
}
const requested=new Set([...positions.map(r=>r.symbol),...catalog.disclosures.flatMap(f=>[...f.disclosure.entries,...(f.estimatedHoldings?.rows||[])].map(r=>r.symbol))]);
for(const symbol of requested)if(symbolIndex.has(symbol))bySymbol[symbol]=symbolIndex.get(symbol);
const result={checkedAt,source:'https://api.nasdaq.com/api/screener/stocks?tableonly=true&limit=10000&download=true',method:'Nasdaq sectors; exact symbol, same CUSIP issuer prefix, or unambiguous normalized issuer name. No fuzzy matching. Funds are not looked through.',byCusip,bySymbol};
fs.writeFileSync(path.join(root,'data/smart-money-sectors.json'),JSON.stringify(result)+'\n');
for(const f of catalog.funds){
  const h=JSON.parse(fs.readFileSync(path.join(root,'data',f.detailFile))).current.holdings;
  const mapped=h.filter(r=>byCusip[r.cusip]).reduce((s,r)=>s+r.value,0)/f.current.totalValue;
  console.log(f.id,(mapped*100).toFixed(1)+'% issuer classification');
}
