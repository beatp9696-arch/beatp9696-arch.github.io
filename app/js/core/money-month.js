import { monthTotals, budgetRows, round } from '../features/money/model.js';

// Use the ledger's satang arithmetic, category aliases and posting dates.
export function monthSummary(entries, budgets, today, month = today.slice(0, 7)) {
  const rows = (Array.isArray(entries) ? entries : []).filter(row => row && row.amount > 0);
  const totals = monthTotals(rows, month, today);
  const caps = budgetRows(rows, budgets || {}, month, today).filter(row => row.limit > 0);
  const budget = round(caps.reduce((sum, row) => sum + row.limit, 0));
  const budgetedSpending = round(caps.reduce((sum, row) => sum + row.spent, 0));
  return { income: totals.income, spending: totals.expense, net: totals.net, budget, budgetedSpending,
    remaining: caps.length ? round(budget - budgetedSpending) : null,
    unbudgeted: round(totals.expense - budgetedSpending),
    over: caps.filter(row => row.status === 'over').map(row => ({ category: row.cat, cap: row.limit, spent: row.spent })),
    entries: totals.count,
  };
}
