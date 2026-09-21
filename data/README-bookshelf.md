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
The fixed navigation shows a small book cover with its title and author on the
right, replacing the site logo. Desktop keeps it above the scrollable contents;
mobile separates the book identity and controls into two rows, including in reader
mode. Chapter anchors account for the bar height so headings stay visible.
The large overview cover stays non-sticky on mobile; reduced motion removes its
3D rotation.

`book-reader.js` opens a centered, maximum 720px reading column from the summary
CTA or a chapter link. The original title moves into a compact header; the article
nodes, bookmarks and notes are shared with the overview. `?reader=1` keeps the
layout on reload; direct chapter links and saved-reading resumes also open it.
The information/purchase links return to the overview, including browser history.

Font sizes (18/20/22/24px) and line spacing (1.7/1.9/2.2) are stored under
`moatrices.book-reader.v1`, with 20px / 1.9 defaults. Invalid values and blocked
storage fall back safely. Changing settings preserves the visible text position.
The labelled desktop contents, mobile modal and static inline contents use the
same chapter list; each section ends with a next-chapter link. Without JavaScript,
inline contents and next links still work. CSS and reader scripts use content
hashes; the shared reading module is versioned through `data-reading-src`.

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
python3 app/test/reading-flow-browser.test.py
```

The browser suite covers 320/390/768/1440 px, light/dark, search/categories, empty
state, local links, anchors, reader layout/settings/history, mobile dialogs,
bookmark/progress persistence, keyboard focus, reduced motion, failed covers,
blocked storage and no JavaScript. External navigation is checked
with an intercepted destination; real retailer verification is a separate source
check, so CI does not depend on retailer uptime. CI also checks generated Bookshelf
HTML for drift. As before, feed build timestamps and filesystem-derived sitemap
dates are excluded from the deterministic drift gate.
