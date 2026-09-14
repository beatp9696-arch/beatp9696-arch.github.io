import {canonicalSymbol} from './company-catalog.js';
// Match securities, not issuer names or logo/sector aliases. Options and principal
// instruments must never be counted as ordinary share holdings.
export function sameSecurity(target, row) {
  if (target.cusip) {
    return row.cusip === target.cusip && row.unit === target.unit && row.option === target.option;
  }
  return Boolean(target.symbol) && canonicalSymbol(row.symbol) === canonicalSymbol(target.symbol) && row.unit === 'SH' && row.option === '';
}

export function stockOwnership(target, funds, disclosures = []) {
  const current = [], exited = [], historical = [];
  const symbols = new Set(target.symbol ? [canonicalSymbol(target.symbol)] : []);
  for (const fund of funds) {
    for (const row of [...fund.rows, ...fund.exits]) {
      if (!sameSecurity(target, row)) continue;
      if (row.symbol) symbols.add(canonicalSymbol(row.symbol));
      const entry = {fund, row};
      (fund.historical ? historical : row.status === 'exited' ? exited : current).push(entry);
    }
  }
  const byWeight = (a, b) => b.row.weight - a.row.weight || a.fund.name.localeCompare(b.fund.name);
  current.sort(byWeight); historical.sort(byWeight);
  // Undated estimates have neither a comparable previous period nor a filing delta.
  // Only an unambiguous symbol for ordinary shares can connect these to 13F data.
  const estimates = [];
  if ((!target.cusip || target.unit === 'SH' && target.option === '') && symbols.size === 1) {
    const [symbol] = symbols;
    for (const fund of disclosures) {
      const row = fund.estimatedHoldings?.rows.find(row => canonicalSymbol(row.symbol) === symbol);
      if (row) estimates.push({fund, row});
    }
  }
  return {
    current, exited, historical, estimates,
    portfolioCount: new Set(current.filter(({row}) => row.shares > 0).map(({fund}) => fund.id)).size
  };
}
