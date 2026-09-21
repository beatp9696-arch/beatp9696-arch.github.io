# Bookshelf

`bookshelf.json` is the source for the collection, detail pages, Book/Article JSON-LD,
sitemap entries and RSS summaries. `bookshelf_build.py` renders static HTML during
`python3 build.py`; `bookshelf.js` only enhances filtering and image fallbacks.
Do not edit `books.html` or `books/*.html` directly.

To add a book, add one record in `bookshelf.json`, add its cover under `img/books/`,
and run `python3 build.py`. No copied HTML is required. `ready` generates a public
summary; `draft` shows a non-linked “กำลังเรียบเรียง” catalog card. Set `featured`
on the book to feature. Category names must come from the top-level category list.
`titleThai` is a Moatrices descriptive title, not a claim about a published translation.

Use actual `coverWidth` / `coverHeight`, a six-digit hex `accent`, and a local
`shareImage` (or the cover will be used). The collection uses Georgia for English
headings; detail pages use the local Playfair Display fonts. Thai uses the site's
existing Sarabun and IBM Plex Sans Thai fonts. The same cover asset is reused in
the collection and detail layouts.

Keep book edition/year separate from the first publication year. The first book's
cover, bibliographic data and purchase options describe the Stripe Press abridged
edition (2023), as recorded in `bookshelf.json`. `sourceLinks` record the publisher,
retailer and cover sources. Purchase destinations were checked on 2026-09-21.
Do not infer eBook availability or show cached prices.

Detail pages load `book-editorial.css` for the Portfolio charcoal-and-mint palette,
navigation rail and sticky cover. They default to dark and share the site's
`theme` preference; the old `moatrices.book-theme` preference is no longer used.
Light mode uses the site's neutral background and green accent.
Main headings use mint (deep green in light mode); subheadings use blue, with
larger bold type and section spacing. Bookshelf CSS links include content hashes
so a rebuilt page loads the current palette and typography even after caching.
Mobile uses a top navigation bar and a non-sticky cover;
reduced motion removes the cover's 3D rotation.

Each purchase entry needs `store`, `format`, `url`, `verifiedAt`, and `affiliate`.
For an unverified destination, use `url: null`; the renderer shows text instead of
a link. No current link is affiliate. If affiliate links are added, set
`affiliateDisclosure` to:

> ลิงก์บางรายการอาจเป็น affiliate link ซึ่งช่วยสนับสนุนการทำเว็บไซต์ โดยไม่มีค่าใช้จ่ายเพิ่มสำหรับผู้อ่าน

Related links and reading-order anchors are checked against actual local files at
build time. Keep examples and editorial synthesis separate from Munger's concepts.
Current Thai prose is approximately 1,397 words (232 in editorial synthesis), using
`Intl.Segmenter('th', {granularity: 'word'})`, excluding navigation/bibliography.

Reading uses the existing `moatrices.reading.v1` store, including bookmarks,
progress, resume and notes. `/books/` and `/articles/` records stay independent.
No new analytics service is introduced: no shared analytics integration was found
in the existing site shell. RSS gets one item per ready book with a stable URL GUID.

Checks:

```sh
python3 build.py
node app/test/reading-store.test.mjs
python3 test/bookshelf-build.test.py
python3 test/bookshelf-browser.test.py --screenshots /tmp/bookshelf-previews
```

The browser suite covers 320/390/768/1440 px, light/dark, search/categories, empty
state, local links, anchors, bookmark/progress persistence, keyboard focus,
reduced motion, failed covers and no JavaScript. External navigation is checked
with an intercepted destination; real retailer verification is a separate source
check, so CI does not depend on retailer uptime. CI also checks generated Bookshelf
HTML for drift. As before, feed build timestamps and filesystem-derived sitemap
dates are excluded from the deterministic drift gate.
