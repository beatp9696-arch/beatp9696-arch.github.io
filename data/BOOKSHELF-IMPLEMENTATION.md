# Bookshelf implementation — 2026-09-21

Implemented in the existing static Moatrices site. No framework, checkout,
membership or external analytics service was added.

## Pages and source files

- `books.html`: static collection, feature, dimensional covers, category/search enhancement and empty state.
- `books/poor-charlies-almanack.html`: editorial detail page, buying options, 7-minute summary, reading guide and references.
- `data/bookshelf.json`: shared book data and all editorial content; 1,397 Thai words, including 232 words of synthesis.
- `bookshelf_build.py`: reusable renderer, metadata/JSON-LD, data and local-link validation.
- `bookshelf.css`, `book-editorial.css`, `bookshelf.js`: scoped presentation, responsive behavior and progressive enhancement.
- `build.py`: generation, shared chrome, sitemap and RSS integration.
- `partials/site-header.html`, `partials/site-footer.html`, `index.html`, `home.css`: entrances to Bookshelf.
- `app.js`, `app.min.js`, `style.css`, `style.min.css`: navigation and correct relative paths from `/books/`.
- `reading-store.js`, `reading.js`: existing bookmark, progress, resume and notes support for book URLs.
- `articles/poor-charlies-almanack.html`: reciprocal link to the shorter book guide.
- `.github/workflows/build.yml`: Bookshelf tests and generated-file drift gate.
- `data/README-bookshelf.md`: adding a second book, editing data, editions, verified destinations and affiliate handling.

The many article/root/series HTML changes are regenerated header/footer links.
Their article bodies are preserved, apart from the reciprocal link noted above.

The detail page uses the Portfolio charcoal-and-mint palette, with mint main
headings, blue subheadings and neutral body text. Theme preference is shared with
the site. Generated CSS URLs include content hashes to refresh cached previews.

## Validation

- `python3 build.py`: PASS, including article/archive/app/index consistency.
- Repeated build SHA-256 comparison: PASS, no deterministic file drift. RSS timestamp excluded according to existing CI policy; sitemap included in comparison.
- All 10 existing `app/test/*.test.mjs` suites: PASS.
- Existing `smart-money-builder.test.py`: 11 tests PASS.
- New `bookshelf-build.test.py`: 2 tests PASS, including adding another record, draft/ready state, unverified purchases and affiliate disclosure.
- All 7 existing app browser suites: PASS (Reading, Research/Living Thesis, Portfolio, Money, Money multitab, Smart Money, stock detail).
- New `bookshelf-browser.test.py`: PASS across 320, 390, 768 and 1440 pixels in both themes for both pages (16 combinations).
- Search by Thai/English titles, author/editor and category; category filtering and empty reset: PASS.
- Cover loading, lazy images, image failure fallback, TOC, reading CTA and real local links/anchors: PASS.
- Bookmark persistence, reading progress/date, library entry and resume: PASS.
- Keyboard activation/focus, mobile menu paths, reduced motion and no-JavaScript browsing: PASS.
- Current purchase destinations and verification dates are recorded in `bookshelf.json` (Stripe Press, Bookshop and Amazon). Browser tests verify outgoing target/new-tab behavior with a local response interception, not retailer availability.
- `git diff --check` and JavaScript syntax: PASS.

### Existing failing test

`test/home-browser.test.py:59` expects three `.home-company` elements, but the current homepage has none. The same failure was reproduced against an archive of Git HEAD from before these changes under `/private/tmp/moatrices-before-bookshelf/`. This unrelated test was left intact. The maintained Reading-flow browser suite, which also exercises the actual current homepage, passes.

## Preview screenshots

Twelve screenshots (desktop/mobile × collection/detail/headings × light/dark) are saved in
`../../design-previews/bookshelf/`. They use the normal cover perspective; reduced
motion is tested separately. Main files:

- `bookshelf-desktop-dark.png`
- `bookshelf-mobile-light.png`
- `book-desktop-dark.png`
- `book-mobile-light.png`

## Owner information

Nothing blocks the first book. All current buying links are ordinary links with
no affiliate tags. The current Stripe Press cover is 843 × 1200 pixels.
The next book needs its title, edition, cover, editorial
content and checked buying destinations. Affiliate links are optional and require
the supplied disclosure when introduced.

## Changed-file inventory at handoff

```text
 M .github/workflows/build.yml
 M about.html
 M ai-iceberg.html
 M app.js
 M app.min.js
 M app/test/reading-store.test.mjs
 M articles.html
 M articles/blind-business.html
 M articles/books-mind-habit-time.html
 M articles/buffett-4-pillars.html
 M articles/buffett-deals-01-sees-candies.html
 M articles/buffett-deals-02-washington-post.html
 M articles/buffett-deals-03-geico.html
 M articles/buffett-deals-04-nebraska-furniture-mart.html
 M articles/buffett-deals-05-coca-cola.html
 M articles/buffett-talks-01-superinvestors.html
 M articles/buffett-talks-02-florida-mba-1998.html
 M articles/buffett-talks-03-stock-market-1999.html
 M articles/buffett-talks-04-notre-dame-1991.html
 M articles/buffett-talks-05-punch-card.html
 M articles/case-study-01-dominos.html
 M articles/case-study-02-amd.html
 M articles/deep-dive-aapl.html
 M articles/deep-dive-ai-bubble.html
 M articles/deep-dive-ai-oil-shock.html
 M articles/deep-dive-asml.html
 M articles/deep-dive-avgo.html
 M articles/deep-dive-axp.html
 M articles/deep-dive-bac.html
 M articles/deep-dive-cohr.html
 M articles/deep-dive-cost.html
 M articles/deep-dive-dlo.html
 M articles/deep-dive-googl.html
 M articles/deep-dive-lly.html
 M articles/deep-dive-lmt.html
 M articles/deep-dive-meli.html
 M articles/deep-dive-mrvl.html
 M articles/deep-dive-msft.html
 M articles/deep-dive-mu.html
 M articles/deep-dive-nflx.html
 M articles/deep-dive-nvda.html
 M articles/deep-dive-snps.html
 M articles/deep-dive-spacex.html
 M articles/deep-dive-spgi.html
 M articles/deep-dive-tsm.html
 M articles/deep-dive-unh.html
 M articles/financials-00-mindset.html
 M articles/financials-01-income-statement.html
 M articles/financials-02-cash-flow-statement.html
 M articles/financials-03-balance-sheet.html
 M articles/fix-life-in-1-day.html
 M articles/interstellar-investing.html
 M articles/land-power-shell.html
 M articles/moat-break-01-kodak.html
 M articles/moat-break-02-nokia.html
 M articles/moat-break-03-intel.html
 M articles/moat-break-04-ge.html
 M articles/moat-break-05-boeing.html
 M articles/munger-talks-01-worldly-wisdom.html
 M articles/munger-talks-02-practical-thought.html
 M articles/munger-talks-03-misjudgment-1995.html
 M articles/munger-talks-04-guaranteed-misery.html
 M articles/munger-talks-05-usc-law-2007.html
 M articles/poor-charlies-almanack.html
 M articles/powers-01-scale-economies.html
 M articles/powers-02-network-economies.html
 M articles/powers-03-counter-positioning.html
 M articles/powers-04-switching-costs.html
 M articles/powers-05-branding.html
 M articles/powers-06-cornered-resource.html
 M articles/powers-07-process-power.html
 M articles/situational-awareness.html
 M articles/tesla-robotaxi.html
 M build.py
 M compound-interest.html
 M econ-lessons.html
 M feed.xml
 M follow-the-money-nvda.html
 M home.css
 M index.html
 M moat-break-game-kodak.html
 M partials/site-footer.html
 M partials/site-header.html
 M reading-store.js
 M reading.html
 M reading.js
 M reverse-dcf.html
 M series-buffett-deals.html
 M series-buffett-talks.html
 M series-cases.html
 M series-financials.html
 M series-moat-break.html
 M series-munger-talks.html
 M series-powers.html
 M sitemap.xml
 M stocks.html
 M style.css
 M style.min.css
 M tools.html
?? books.html
?? books/
?? book-editorial.css
?? bookshelf.css
?? bookshelf.js
?? bookshelf_build.py
?? data/
?? img/books/poor-charlies-almanack-stripe.jpg
?? test/bookshelf-browser.test.py
?? test/bookshelf-build.test.py
```
