# AXP business explainer and research verification

Analysis cutoff: **23 September 2026 (Bangkok)**. The user authorized publishing the business edition at the existing AXP URL on 23 September 2026.

## Current business explainer — 23 September 2026

The main Thai article now follows **12 business questions** and contains **no financial tables**. It explains customer needs, payment authorization versus settlement, customer groups, sources of revenue, operating costs, funding, credit, membership economics, competition, growth and business quality. The detailed English report, its 49 tables, 41 assumptions and model are retained. The release synchronizes its shared header/footer and Organization author metadata with the current site; the report's research content is unchanged. The former Thai financial manuscript is also available as `articles/research/axp-2026-09-23/financial-review-th.md`.

Three interactive explanations accompany the text:

- **Payment:** request, authorization, settlement to the merchant and member repayment; request/response and money use different colors and directional arrows.
- **Profit:** gross revenue, rewards/partners, operating expenses, funding/credit and profit after tax; the text distinguishes gross interest from already-net interest income to avoid subtracting funding costs twice. Shapes are conceptual rather than proportional to actual amounts.
- **Funding:** deposits/borrowing, merchant payment, member repayment and obligations to funding providers; capital and liquidity are explained separately without matching individual deposits to transactions.

Each explanation supports manual selection, automatic sequencing, pause/resume, keyboard arrows/Home/End, touch, offscreen/background suspension and reduced motion. All step descriptions remain available without JavaScript. The existing card scene and membership flywheel are retained.

The payment scene now uses original SVG illustrations of a membership card tapping a POS terminal, a storefront, and the Amex network, with blue request/response paths and gold payment paths. Two additional illustrated scenes show open-loop versus closed-loop roles and the relationship between members and merchants. Both have pause/resume controls, suspend motion outside the viewport or in a background tab, and respect reduced motion. They use separate desktop and mobile arrangements so the labels remain readable. `tools/axp_picture_scenes.py` contains their vector objects and layouts; no image assets or animation dependency are required.

Narrative subheadings use a green background and accent border, while section headings have a heavier title and accent rule. The highlights follow the light/dark reading theme and wrap normally on mobile.

Source: `articles/research/axp-2026-09-23/business-explained-th.md`. Render with `tools/render-axp-business.py` using the existing Python environment with Markdown and Beautiful Soup. Regenerate `scenes/deep-dive-axp.min.css` with the site's CSS minifier after CSS changes. Archive/home/search/RSS descriptions reflect the current business article.

`test/axp-browser.test.py` passed on Chromium after the illustration and heading update: both articles at 1440/390px; all three sequences, illustrated scenes and the card scene at **320, 390, 600, 850, 1050 and 1440px**; stable panel heights; no overlapping box-diagram labels; all illustrated labels inside their SVG bounds; keyboard/touch/reduced-motion/no-JavaScript; repeated automatic playback, pause/resume and offscreen suspension. **Zero browser errors or failed local requests.** HTML5, 114 local links/resources, preserved authored anchors and reproducible model also passed. A separate local-preview check verified touch pause/resume on both new networks and heading highlights in dark/light themes. Source and minified CSS match; JavaScript syntax and `git diff --check` pass. The technical report's SHA-256 remains `13c606cdd3f1b9948384e82061dfb483d9898e197ab47aec549150e2099c81a9`.

## Release integration

Prepared on top of published main `5228528`, preserving its current homepage, bookshelf and app updates. The AXP archive/search entries and homepage preview point to the existing `articles/deep-dive-axp.html` URL. The technical report is a linked companion. Legacy `#sec-1` through `#sec-9` fragments resolve to relevant sections, preserving source links used by Living Thesis and older shares. The RSS description is refreshed while retaining the original publication date.

The complete site build and validation, bookshelf build tests, and all `app/test/*.test.mjs` suites pass after integration. A second build leaves the CI-gated generated files unchanged. Shared bookshelf script hashes are regenerated because the article search registry changed. The AXP browser suite passed against the integrated release at all six widths, with 118 local links/resources checked, zero HTML5/browser errors, and no failed local requests. The card-layout assertion now reads both rectangles in one browser frame so focus scrolling cannot create a false displacement. The technical report's main element matches the authored preview exactly; the pre-release byte hash above records the full file before shared site chrome was synchronized.

The sections below record the earlier financial edition and card-animation verification.

## Earlier financial edition deliverables

- `articles/deep-dive-axp.html`: expanded Thai business study with 24 numbered sections, 32 scrollable tables and all 41 analyst assumptions. The opening explains the business directly; the Membership Flywheel accompanies the transaction/closed-loop explanation in section 3. Valuation remains in section 15 with its sources and reciprocal technical-report link.
- `articles/deep-dive-axp-2026-09-23.html`: complete supplied English report (24 sections), 41-entry assumption register and complete workbook appendix; 49 scrollable tables.
- `articles/research/axp-2026-09-23/`: report, workbook, historical CSV, model code, unrounded JSON results and the Thai editorial manuscript `business-study-th.md`. The original report's local absolute paths were made portable; its financial values and model are preserved.
- `scenes/deep-dive-axp.css`, `.min.css`, `.js`: responsive article layout, keyboard/touch details, pause control, offscreen/background pausing and reduced-motion handling. No added website dependency.
- `img/axp-research-cover.svg`, `og-deep-dive-axp.jpg`, `og-deep-dive-axp-2026-09-23.jpg`, `img/thumbs/deep-dive-axp.jpg`: original vector cover and rendered social/thumbnail assets without stale financial figures or card-design imitation.
- `articles.html`, `index.html`, `app.js`, `app.min.js`, `feed.xml`, `sitemap.xml`: archive, latest article, search/previous-next registry, RSS and discovery metadata.
- `build.py`: explicit `data-editorial-layout="manual"` opt-in preserves hand-authored TOC/diagram anchors and related links. Other article generation is unchanged.
- `test/axp-browser.test.py`: repeatable content, model, HTML, links, build-anchor and browser checks.

## Results

- HTML5 parser: **zero errors** on both AXP pages; one H1 per page, no duplicate IDs, valid JSON-LD.
- Local href/src targets and fragment IDs: **137 checks passed** across the two pages. Citation labels are checked against their document URLs to prevent adjacent Markdown references from consuming each other. Browser local requests: **zero failures**. RSS and sitemap parse as XML.
- Chromium: both pages at **1440px** and **390px** have no document overflow; desktop TOC is sticky and mobile TOC is static.
- Tables: visible, horizontally scrollable on mobile, keyboard-focusable regions; captions and scoped headers retained.
- Flywheel: hover, keyboard Tab/Enter, visible focus, touch selection, pause/resume, offscreen pause and `prefers-reduced-motion: reduce` passed. Reduced motion stops both orbit and center pulse. Static content remains readable without JavaScript.
- Valuation: displayed **154 / 296 / 456** matches rounded JSON values; **305.07** reference marker has a separate label row; five-year Base IRR rounds to **9.4%**. Re-running the supplied model in a temporary directory reproduces the complete JSON exactly.
- Main Thai study: **no Q1 2026**, Centurion, or unsupported Agent Purchase Protection claim remains. Delta uses the dated FY2025 portfolio definitions, not revenue share; capital uses the filed Q2 CET1 measure; guidance uses the Q2 release. All 24 TOC targets resolve; the business-model link works at both viewport widths.
- JavaScript syntax and `git diff --check`: passed. Site `build.validate`: passed.
- The initial implementation's HTML/CSS/JS generation pipeline passed in an isolated temporary copy. After expanding the Thai study, `build.validate`, the build's preservation of authored TOC/related anchors, JS/CSS minification and browser checks were rerun. Unrelated bulk thumbnail regeneration was skipped; the AXP cover/thumbnail had been generated and visually inspected separately.

Run the browser suite with a Python environment containing `playwright`, `beautifulsoup4` and `html5lib`, plus Chromium:

```sh
python test/axp-browser.test.py
```

The completed run used `/private/tmp/axp-editorial-venv/bin/python`. Screenshots and `results.json` are in `axp-verification/` under Python's system temporary directory. On this machine that is `/var/folders/nf/0xs61_rn1xxcpg1gc0jx21xc0000gn/T/axp-verification/`.

## External source access

All **40 source-register URLs** were checked with HTTP GET: **17 returned 200**, **23 returned 403** to the command-line client; none returned 404. The web retrieval tool successfully opened **19** of those 23, including the Q2 10-Q, earnings release, September credit filing and price corroboration. Four large SEC 10-K HTML documents could not be completely fetched by that reader (size/internal errors), so universal direct-access success is **not** claimed. The FY2025 official annual-report PDF was accessible and supplies the 10-K alternate. Accessible official PDF alternatives for the Q2 10-Q and earnings release were also linked. These checks establish access at test time, not permanent availability or an audit of every statement in the supplied report.

Price data remains explicitly **secondary market data**, dated to the 22 September 2026 regular-session close. The report's unauthenticated transcript caveat remains intact. Current fair value, modeled five-year returns, management guidance and analyst assumptions remain distinct.

## Publication dates

The existing main article retains its genuine `datePublished` of **27 June 2026** and uses **23 September 2026** for `dateModified`, its visible revision date and analysis cutoff. The new technical report uses **23 September 2026** for both publication and modification. The RSS item retains its original publication date, with the full-study title/description and an Atom update timestamp.

## Card animation follow-up — 23 September 2026

- Resized and repositioned the three-card scene so each card stays inside its stage, including the 600px breakpoint where the back card was cropped. Added the `#membership-cards` preview anchor.
- Separated temporary hover from explicit pause. Hover holds the current story and leaving resumes cycling; selecting a card pauses until Play is pressed. Focusing the motion button no longer changes the state before its click, and pointer focus no longer moves a card before selection.
- Kept float/sheen timing attached to each card rather than its changing slot. Reserved the tallest story's height to keep the scene and selectors stable across selections.
- Regenerated the article's minified CSS. Extended and reran `test/axp-browser.test.py`: all three card states fit at **320, 390, 600, 850, 1050 and 1440px**; first-click pause/resume, repeated cycling, hover return, offscreen pause, keyboard, touch, reduced motion and no-JavaScript content checks passed.
- Both AXP articles still pass HTML5, link/resource, authored-anchor, model and existing flywheel checks. Browser errors and failed local requests: **zero**. No commit, push or deployment performed.
