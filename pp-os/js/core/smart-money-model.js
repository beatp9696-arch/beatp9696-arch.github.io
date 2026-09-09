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

export function matchesFund(fund, query) {
  const needle = query.trim().toLocaleLowerCase();
  return !needle || [fund.name, fund.subtitle, ...(fund.aliases || []), ...(fund.current.holdings.flatMap(row => [row.symbol || '', row.issuer]))]
    .some(text => text.toLocaleLowerCase().includes(needle));
}

export function validateDataset(data) {
  if (data?.schemaVersion !== 1 || !Array.isArray(data.funds) || !data.funds.length) throw new Error('Invalid portfolio data');
  const ids = new Set();
  for (const fund of data.funds) {
    if (!fund.id || ids.has(fund.id) || typeof fund.name !== 'string') throw new Error('Invalid fund');
    ids.add(fund.id);
    for (const period of [fund.current, fund.previous]) {
      if (!period || !Array.isArray(period.holdings) || !/^\d{4}-\d{2}-\d{2}$/.test(period.reportDate) || !Number.isFinite(period.totalValue) || period.totalValue <= 0) throw new Error('Invalid filing');
      const rowIds = new Set();
      let total = 0;
      for (const row of period.holdings) {
        if (!row.id || rowIds.has(row.id) || !Number.isFinite(row.value) || row.value < 0 || !Number.isFinite(row.shares) || row.shares < 0 || typeof row.issuer !== 'string') throw new Error('Invalid position');
        rowIds.add(row.id); total += row.value;
      }
      if (Math.abs(total - period.totalValue) > 1) throw new Error('Filing total does not reconcile');
      for (const url of [period.source, period.tableSource]) {
        const parsed = new URL(url);
        if (parsed.protocol !== 'https:' || parsed.hostname !== 'www.sec.gov') throw new Error('Invalid filing source');
      }
    }
    if (fund.previous.reportDate >= fund.current.reportDate) throw new Error('Invalid comparison period');
  }
  return data;
}
