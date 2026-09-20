import { dateLabel, needsReview } from './app/js/core/research-model.js';

// Use the same public snapshots as the Research workspace.
const review = document.querySelector('[data-pulse-review]');
const evidence = document.querySelector('[data-pulse-evidence]');
const latest = document.querySelector('[data-pulse-latest]');

if (review && evidence && latest) {
  try {
    const response = await fetch('./app/data/research.json');
    if (!response.ok) throw new Error('Research unavailable');
    const { companies } = await response.json();
    if (!Array.isArray(companies) || !companies.length) throw new Error('Empty catalog');
    review.textContent = companies.filter(company => needsReview(company)).length;
    evidence.textContent = companies.reduce((sum, company) => sum + Object.values(company.powers || {})
      .filter(power => ['evidenced', 'partial'].includes(power.status)).length, 0);
    const snapshot = companies.reduce((date, company) => company.snapshotDate > date ? company.snapshotDate : date, '');
    latest.textContent = snapshot ? dateLabel(snapshot) : '—';
  } catch {
    document.querySelector('.home-pulse-note').textContent = 'ดูข้อมูลล่าสุดใน Research workspace';
  }
}
