# Smart Money presentation

The current page is `/smart-money.html`; assets and reports live under `/app/`.
It shares the Moatrices theme with Home and Portfolio: charcoal surfaces, mint
navigation and actions, consistent brand header, and responsive content width.
The catalog keeps all 16 profiles, including dated historical reports and clearly
labelled estimates. Search remains visible in the overview; the header search
button returns to that overview from a detail page.

## Chart bases

- **13F reports:** show the largest five positions plus Other, divided by the
  total value in that report. The catalog uses its validated `chart`; full reports
  use `donutRows`. Legend and holding weights both display two decimals. Other
  represents reported securities outside the largest five, not cash or assets
  outside the filing's scope.
- **Estimated holdings:** keep the explicitly labelled top-five group as 100%.
  Legend sublabels also give the source's estimated portfolio weight. No missing
  securities, USD totals, dates, or historical changes are inferred.
- **Sector allocation:** horizontal bars use the supplied sector percentages
  directly. Estimates retain their source basis; unmatched securities and funds
  retain their existing labels and coverage explanations.

Portraits, security logos, disclosure documents, exact security matching, source
dates and private-data boundaries are unchanged. Colors distinguish chart
segments; mint and muted red identify increases and decreases in share counts,
not investment returns. Total reported values use neutral text.

## Company connections

Known securities expose links to their dated Research snapshot when that
snapshot exists and to the private Portfolio thesis. The Smart Money stock
route can open from those links and keeps filing values separate from private
holdings. Money allocations and recorded portfolio transfers are shown in the
Portfolio allocation view without being added to the holdings total.

## Validation

```sh
python3 -m pip install -r app/test/requirements-browser.txt
python3 -m playwright install chromium
node app/test/smart-money.test.mjs
node app/test/smart-money-stock.test.mjs
python3 app/test/smart-money-browser.test.py
python3 app/test/smart-money-stock-browser.test.py
```

Browser tests use disposable profiles and a local server, exercise all profiles,
assert chart/holding percentages, and check narrow screens, search, pagination,
source views, private storage, keyboard/back restoration, partial downloads and
retry. They run in CI. The retired PP OS service worker is not used: downloaded
reports are reused within the current page runtime, with no guarantee of offline
availability after a reload.
