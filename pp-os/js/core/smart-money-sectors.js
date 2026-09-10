export const SECTOR_LABELS = {
  Technology:'เทคโนโลยี', Finance:'การเงิน', 'Health Care':'สุขภาพ',
  'Consumer Discretionary':'สินค้าฟุ่มเฟือย / บริการผู้บริโภค',
  'Consumer Staples':'สินค้าอุปโภคบริโภค', Industrials:'อุตสาหกรรม',
  Energy:'พลังงาน', Utilities:'สาธารณูปโภค', 'Real Estate':'อสังหาริมทรัพย์',
  Telecommunications:'โทรคมนาคม', 'Basic Materials':'วัสดุพื้นฐาน',
  Miscellaneous:'เบ็ดเตล็ด', funds:'กองทุน / ETF', debt:'ตราสารหนี้', unknown:'ยังไม่จัดหมวด'
};
const funds=new Set(['SPY','IVV','VOO','QQQ','EEM','IEMG','EFA','IEFA']);
export function classifySecurity(row, metadata) {
  if(row.unit==='PRN')return {sector:'debt'};
  if(funds.has(row.symbol)||/\b(ETFS?|ETNS?|ISHARES|SPDR|PROSHARES|DIREXION|FUNDS?|FDS|PORTFOLIOS?)\b/i.test(row.issuer))return {sector:'funds'};
  return metadata?.byCusip?.[row.cusip] || metadata?.bySymbol?.[row.symbol] || {sector:'unknown'};
}
export function sectorAllocation(fund, metadata) {
  if(fund.estimatedHoldings?.sectors){
    const source=fund.estimatedHoldings.sectors;
    return {basis:'screenshot',sourceImage:source.sourceImage,rows:source.rows.map(row=>({...row,id:row.name}))};
  }
  const rows=fund.rows;
  if(!rows || !(fund.current.totalValue>0))return {basis:'unavailable',rows:[]};
  const groups=new Map();
  for(const row of rows){
    const sector=classifySecurity(row,metadata).sector;
    if(!groups.has(sector))groups.set(sector,{id:sector,label:SECTOR_LABELS[sector]||sector,value:0,count:0});
    const group=groups.get(sector);group.value+=row.value;group.count++;
  }
  return {basis:'filing',rows:[...groups.values()].filter(row=>row.value>0)
    .map(row=>({...row,weight:row.value/fund.current.totalValue*100})).sort((a,b)=>b.weight-a.weight)};
}
