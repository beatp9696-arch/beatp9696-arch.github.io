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
  ASML: ['ASML Holding', 'EUV / lithography', null],
  MU: ['Micron Technology', 'Memory', 'MU.png'],
  MRVL: ['Marvell Technology', 'Custom chip', null],
  COHR: ['Coherent', 'Optical', 'COHR.png'],
  AVGO: ['Broadcom', 'AI chip', 'AVGO.png'],
  LMT: ['Lockheed Martin', 'Defense', 'LMT.png'],
};
// Shared business group metadata; a holding's explicit sector takes precedence.
export const COMPANY_SECTORS = Object.fromEntries(Object.entries({
  semi: ['SNPS','TSM','NVDA','ASML','MU','MRVL','COHR','AVGO'],
  software: ['MSFT','GOOGL','NFLX'], health: ['LLY','UNH'],
  finance: ['AXP','SPGI','BAC','BRK-B','V'], consumer: ['AAPL','COST','MELI','AMZN'],
  space: ['LMT'],
}).flatMap(([sector,symbols]) => symbols.map(symbol => [symbol,sector])));
export const companySector = symbol => COMPANY_SECTORS[canonicalSymbol(symbol)] || 'other';
export const canonicalSymbol = value => String(value || '').toUpperCase().replace(/^BRK[./]B$/, 'BRK-B');
export const companyIdentity = symbol => COMPANY_CATALOG[canonicalSymbol(symbol)];
export function companyLogoURL(symbol) {
  const file = companyIdentity(symbol)?.[2];
  return file ? new URL(`../../assets/brands/${file}`, import.meta.url).href : null;
}
