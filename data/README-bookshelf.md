# Bookshelf

`bookshelf.json` holds catalog metadata; each book's `contentFile` points to its
full reading text under `data/books/`. These feed detail pages, Book/Article JSON-LD,
sitemap entries and RSS summaries. `bookshelf_build.py` renders static HTML during
`python3 build.py`; `bookshelf.js` only enhances filtering and image fallbacks.
Do not edit `books.html` or `books/*.html` directly.

To add a book, add one record in `bookshelf.json`, add its cover under `img/books/`,
and run `python3 build.py`. No copied HTML is required. `ready` generates a public
article; `draft` shows a non-linked “กำลังเรียบเรียง” catalog card. Set `featured`
on the book to feature. Category names must come from the top-level category list.
`titleThai` is a Moatrices descriptive title, not a claim about a published translation.

Optional per-book fields keep the renderer general instead of special-casing a title.
`labels` overrides page wording (`readCta`, `readingMeta`, `proseAria`, `editionLabel`) for a
book whose page is a summary rather than a rendering of the whole text. `proseNote` is the
small line above the first chapter. `editorRole` selects how the second name is credited:
`editor` (default, “Edited by” / “ผู้เรียบเรียง” / schema.org `editor`) or `commentary`
(“Commentary by” / “บทวิเคราะห์ประกอบ” / `contributor`). `coverCaption` replaces the cover's
screen-reader caption, which otherwise names the edition year. `fullArticle` is optional and
belongs only to a book that grew out of an existing article. A `sourceLinks` entry may be a
repository-relative path instead of an https URL; it is validated at build time and rendered
relative to `/books/`. A chapter may set `referencesLabel` when its links are further reading
rather than the original source.

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

`book-reader.js` opens a centered, maximum 720px reading column from the full-article
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

The full article is readable within Bookshelf; there is no second “full version”
CTA sending readers back to the older article. The original article links forward
to this edition. Its topics are reworked and checked against the publisher's
online book, retaining the book's own ideas and examples. Do not add invented
business applications, audience recommendations, personal commentary, or prompts
that send readers into the site's investment tools. This is an original Thai
explanation, not a full translation of the book.

`contentFile` contains ordered `chapters` with stable IDs, titles, subtitles,
content blocks and source references. Supported blocks are paragraphs, headings,
paraphrased notes, lists, numbered psychological tendencies and talk descriptions.
Chapter numbering, all contents menus and next links use the same ordered list.
The Almanack edition includes 25 psychological tendencies and all 11 talks,
approximately 4,969 words / 25 minutes at 200 words per minute using
`Intl.Segmenter('th', {granularity: 'word'})` for the count.
Existing `question`, `key-ideas`, `reading-order`, `synthesis`, and `questions`
anchors stay stable. The reader maps removed `one-line`, `suitable` and `related`
links to the corresponding current section; individual tendencies also support
direct links. Local source links are validated at build time.

The second book, The Intelligent Investor, is a Thai summary and analysis, not a rendering of
the book: eight chapters, about 3,779 Thai words / 19 minutes. It quotes only short attributed
passages from Warren Buffett's public shareholder letters and from the publisher's page, and
nothing from Graham's text or Jason Zweig's commentary. Bibliographic data follows the third
edition (Harper Business, 22 October 2024, ISBN 9780063356726), which the publisher calls the
75th Anniversary Edition. Its cover is `img/books/intelligent-investor-moatrices.svg`, drawn
for this site, because no cover image with clear rights was available; `coverAlt`,
`coverCaption` and `editionNote` all state that. The share image is
`og-intelligent-investor.jpg`, rendered from the same motif.

The third book, Security Analysis, is a Thai summary and analysis, not a rendering of the book:
nine chapters, about 4,435 Thai words / 23 minutes, plus the generated sources chapter.
Bibliographic data follows the sixth edition (McGraw Hill, published 24 August 2008, copyright
2009, eBook ISBN 9780071642934); the publisher's page states that edition is based on the 1940
text and adds about 200 pages of contemporary commentary from ten contributors. The page keeps
Graham and Dodd's own argument separate from that commentary and does not summarize it. Its only
direct quotation is one short attributed line from Warren Buffett's foreword as shown on the
publisher's page; everything attributed to Graham and Dodd is paraphrased, and no table, example
or chapter order is taken from the book. Chapters are an original nine-part arrangement, not the
book's own. Its cover is `img/books/security-analysis-moatrices.svg`, drawn for this site, because
the older `img/books/security-analysis.jpg` has no rights record; the share image
`og-security-analysis.jpg` is rendered from the same motif. The Bookshop and Amazon destinations
stay `url: null` until someone opens and checks them, since both block automated requests. The
Intelligent Investor's closing chapter and `articles/buffett-4-pillars.html` link forward to it.

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

The browser suite covers every ready book at 320/390/768/1440 px, light/dark; routes, search
result counts, category counts and per-book expectations (reading CTA, numbered lists, preview
filenames) all come from `bookshelf.json`, so a new book is covered without editing the test.
It checks search/categories, empty
state, local links, anchors, reader layout/settings/history, mobile dialogs,
bookmark/progress persistence, keyboard focus, reduced motion, failed covers,
blocked storage and no JavaScript. External navigation is checked
with an intercepted destination; real retailer verification is a separate source
check, so CI does not depend on retailer uptime. CI also checks generated Bookshelf
HTML for drift. As before, feed build timestamps and filesystem-derived sitemap
dates are excluded from the deterministic drift gate.
