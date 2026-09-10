// A 13F snapshot is a disclosure, not a live account or a performance series.
export function summarizeFund(fund) {
  const previous = new Map(fund.previous.holdings.map(row => [row.id, row]));
  const currentIds = new Set(fund.current.holdings.map(row => row.id));
  const rows = fund.current.holdings.map(row => {
    const old = previous.get(row.id);
    const delta = old ? row.shares - old.shares : null;
    return {
      ...row,
      weight: fund.current.totalValue > 0 ? row.value / fund.current.totalValue * 100 : 0,
      previousShares: old?.shares ?? null,
      delta,
      changePercent: old?.shares > 0 ? delta / old.shares * 100 : null,
      status: !old ? 'new' : delta > 0 ? 'added' : delta < 0 ? 'reduced' : 'unchanged'
    };
  }).sort((a, b) => b.value - a.value);
  const exits = fund.previous.holdings.filter(row => !currentIds.has(row.id)).map(row => ({
    ...row, value: 0, weight: 0, previousValue: row.value, previousShares: row.shares,
    shares: 0, delta: -row.shares, changePercent: -100, status: 'exited'
  }));
  return {
    ...fund, rows, exits,
    changes: rows.filter(row => row.status !== 'unchanged'),
    topFiveWeight: rows.slice(0, 5).reduce((sum, row) => sum + row.weight, 0)
  };
}

export function donutRows(rows, totalValue, limit = 5) {
  if (!(totalValue > 0)) return [];
  const visible = rows.slice(0, limit).map(row => ({...row, fraction: row.value / totalValue}));
  const remainder = rows.slice(limit).reduce((sum, row) => sum + row.value, 0);
  if (remainder > 0) visible.push({id: 'other', symbol: 'Other', issuer: 'Other disclosed holdings', value: remainder, fraction: remainder / totalValue});
  return visible;
}

// A focused chart of the largest disclosed positions; portfolio weights stay intact.
export function topHoldingRows(rows, limit = 5) {
  const visible = rows.filter(row => row.id !== 'other' && row.value > 0)
    .sort((a, b) => b.value - a.value).slice(0, limit);
  const total = visible.reduce((sum, row) => sum + row.value, 0);
  return visible.map(row => ({...row, fraction: row.value / total}));
}

export function matchesFund(fund, query) {
  const needle = query.trim().toLocaleLowerCase();
  return !needle || [fund.name, fund.subtitle, fund.searchText || '', ...(fund.aliases || []), ...((fund.current?.holdings || fund.disclosure?.entries || []).flatMap(row => [row.symbol || '', row.issuer])), ...(fund.estimatedHoldings?.rows || []).flatMap(row => [row.symbol, row.issuer])]
    .some(text => text.toLocaleLowerCase().includes(needle));
}

const validDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && new Date(value+'T12:00:00Z').toISOString().slice(0,10) === value;
const positive = value => Number.isSafeInteger(value) && value > 0;
const nonnegative = value => Number.isFinite(value) && value >= 0 && value <= Number.MAX_SAFE_INTEGER;
function sourceURL(value, hosts = ['www.sec.gov']) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || !hosts.includes(url.hostname) || url.username || url.password) throw new Error('Invalid filing source');
}
function validateMeta(fund) {
  if (!/^[a-z][a-z0-9-]*$/.test(fund.id) || !['name','subtitle','monogram','brandCaption','note'].every(key => typeof fund[key] === 'string') || !['investor','company','institution','public-figure'].includes(fund.category) || !Array.isArray(fund.aliases) || !fund.aliases.every(x => typeof x === 'string')) throw new Error('Invalid fund');
  if (fund.profileSource) sourceURL(fund.profileSource,['www.sec.gov','www.bridgewater.com','www.ark-invest.com','sorosfundmgmt.com']);
}
function validatePeriodMeta(period) {
  if (!period || !validDate(period.reportDate) || !validDate(period.filedDate) || period.filedDate < period.reportDate || !positive(period.totalValue)) throw new Error('Invalid filing');
  sourceURL(period.source);sourceURL(period.tableSource);
  if (!Array.isArray(period.sources) || !period.sources.length) throw new Error('Missing filing sources');
  for (const ref of period.sources) {sourceURL(ref.source);sourceURL(ref.tableSource);if(typeof ref.label !== 'string')throw new Error('Invalid source label');}
}

export function validateFund(fund) {
    validateMeta(fund);
    if (fund.kind !== '13f') throw new Error('Invalid filing kind');
    for (const period of [fund.current, fund.previous]) {
      validatePeriodMeta(period);
      if (!Array.isArray(period.holdings) || !period.holdings.length) throw new Error('Invalid holdings');
      const rowIds = new Set();
      let total = 0;
      for (const row of period.holdings) {
        if (!row.id || rowIds.has(row.id) || !nonnegative(row.value) || !nonnegative(row.shares) || typeof row.issuer !== 'string' || !['SH','PRN'].includes(row.unit) || !['','Put','Call'].includes(row.option)) throw new Error('Invalid position');
        rowIds.add(row.id); total += row.value;
      }
      if (Math.abs(total - period.totalValue) > 1) throw new Error('Filing total does not reconcile');
    }
    if (fund.previous.reportDate >= fund.current.reportDate) throw new Error('Invalid comparison period');
  return fund;
}

export function validateDataset(data) {
  if (data?.schemaVersion !== 2 || !validDate(data.checkedAt) || !Array.isArray(data.funds) || !data.funds.length || !Array.isArray(data.disclosures)) throw new Error('Invalid portfolio data');
  const ids = new Set();
  for (const fund of [...data.funds, ...data.disclosures]) {
    validateMeta(fund);
    if (ids.has(fund.id)) throw new Error('Duplicate profile');
    ids.add(fund.id);
  }
  for (const fund of data.funds) {
    if (fund.kind !== '13f' || !new RegExp(`^smart-money/${fund.id}-[a-f0-9]{12}\\.json$`).test(fund.detailFile)) throw new Error('Invalid detail file');
    validatePeriodMeta(fund.current);validatePeriodMeta(fund.previous);
    if (fund.previous.reportDate >= fund.current.reportDate || !positive(fund.positionCount) || typeof fund.searchText !== 'string') throw new Error('Invalid catalog summary');
    if (!Array.isArray(fund.chart) || !fund.chart.length || fund.chart.length > 6 || !Array.isArray(fund.changes) || fund.changes.length > 2) throw new Error('Invalid allocation');
    let total=0;
    for (const row of fund.chart) {
      if (!nonnegative(row.value) || !nonnegative(row.fraction) || Math.abs(row.fraction-row.value/fund.current.totalValue)>1e-10) throw new Error('Invalid allocation');
      total+=row.value;
    }
    if (Math.abs(total-fund.current.totalValue)>1) throw new Error('Catalog allocation does not reconcile');
  }
  for (const profile of data.disclosures) {
    const estimate = profile.estimatedHoldings;
    if (estimate) {
      if (estimate.sourceType !== 'user-screenshot' || !(estimate.asOf === null || validDate(estimate.asOf)) || !['sourceLabel','coverage','note'].every(key => typeof estimate[key] === 'string') || !Array.isArray(estimate.rows) || !estimate.rows.length || !Array.isArray(estimate.sources) || !estimate.sources.length) throw new Error('Invalid estimated holdings');
      if (!estimate.sources.every(source => typeof source.label === 'string' && /^assets\/references\/[a-z0-9-]+\.png$/.test(source.image))) throw new Error('Invalid estimate source');
      const symbols = new Set();
      let weight = 0;
      for (const row of estimate.rows) {
        if (!/^[A-Z][A-Z0-9.-]*$/.test(row.symbol) || symbols.has(row.symbol) || typeof row.issuer !== 'string' || !Number.isFinite(row.weight) || !(row.weight >= 0 && row.weight <= 100) || !nonnegative(row.shares) || row.shares === 0) throw new Error('Invalid estimate row');
        symbols.add(row.symbol); weight += row.weight;
      }
      if (!(weight > 0 && weight <= 100.01)) throw new Error('Invalid estimate total');
      if(estimate.sectors){
        const sectors=estimate.sectors;
        if(!estimate.sources.some(source=>source.image===sectors.sourceImage) || !Array.isArray(sectors.rows) || !sectors.rows.length || sectors.rows.some(row=>typeof row.name!=='string'||typeof row.label!=='string'||!Number.isFinite(row.weight)||row.weight<0) || Math.abs(sectors.rows.reduce((sum,row)=>sum+row.weight,0)-100)>.05)throw new Error('Invalid estimate sectors');
      }
    }
    const report=profile.disclosure;
    if (profile.kind !== 'disclosure' || profile.current || profile.previous || profile.chart || !report || !['assets','transactions'].includes(report.type) || !validDate(report.filedDate) || !Array.isArray(report.entries) || !report.entries.length) throw new Error('Invalid disclosure');
    sourceURL(report.source,report.type === 'assets' ? ['disclosures-clerk.house.gov'] : ['www.whitehouse.gov','extapps2.oge.gov']);
    for(const field of ['title','periodLabel','dateLabel','sourceLabel','coverage'])if(typeof report[field] !== 'string')throw new Error('Invalid disclosure text');
    const rowIds=new Set();
    for (const row of report.entries) {
      if (!row.id || rowIds.has(row.id) || typeof row.issuer !== 'string' || !positive(row.valueMin) || !(row.valueMax === null || positive(row.valueMax) && row.valueMax >= row.valueMin) || !positive(row.page)) throw new Error('Invalid disclosure range');
      if (report.type === 'transactions' && (!['purchase','sale','exchange'].includes(row.action) || !validDate(row.date) || row.date > report.filedDate)) throw new Error('Invalid transaction');
      if (report.type === 'assets' && !['SP','JT','SELF'].includes(row.owner)) throw new Error('Invalid asset owner');
      rowIds.add(row.id);
    }
  }
  return data;
}
