// Public company identity only. Positions and prices always come from pf.holdings.
export const COMPANY_CATALOG = {
  MELI: ['MercadoLibre', 'Commerce & fintech', 'MELI.png'],
  LLY: ['Eli Lilly', 'Pharmaceuticals', 'LLY.png'],
  GOOGL: ['Alphabet', 'Search & cloud', 'GOOGL.png'],
  SNPS: ['Synopsys', 'Electronic design automation', 'SNPS.png'],
  NVDA: ['NVIDIA', 'Accelerated computing', 'NVDA.png'],
  COST: ['Costco Wholesale', 'Membership retail', 'COST.png'],
  'BRK-B': ['Berkshire Hathaway', 'Insurance & diversified businesses', 'berkshire.svg'],
  MSFT: ['Microsoft', 'Enterprise software & cloud', 'MSFT.png'],
  TSM: ['TSMC', 'Semiconductor foundry', 'TSM.png'],
  SPGI: ['S&P Global', 'Ratings, indices & financial data', 'SPGI.png'],
  UNH: ['UnitedHealth Group', 'Health insurance & services', 'UNH.png'],
  AXP: ['American Express', 'Payments & consumer credit', 'AXP.png'],
  AAPL: ['Apple', 'Devices & services', 'AAPL.svg'],
  AMZN: ['Amazon', 'Commerce & cloud', 'AMZN.png'],
  NFLX: ['Netflix', 'Streaming entertainment', 'NFLX.png'],
  BAC: ['Bank of America', 'Banking & wealth management', 'BAC.png'],
  V: ['Visa', 'Payment network', 'V.png'],
};
export const canonicalSymbol = value => String(value || '').toUpperCase().replace(/^BRK[./]B$/, 'BRK-B');
export const companyIdentity = symbol => COMPANY_CATALOG[canonicalSymbol(symbol)];
export function companyLogoURL(symbol) {
  const file = companyIdentity(symbol)?.[2];
  return file ? new URL(`../../assets/brands/${file}`, import.meta.url).href : null;
}
