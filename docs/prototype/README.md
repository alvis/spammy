# The Spammy prototype

A clickable HTML prototype of the whole host flow and the ceremony player. Along with [`docs/user-flow.md`](../user-flow.md), it is the reference every contributor and coding agent builds against.

## Run it

Open `docs/prototype/index.html` in a browser. A double-click works, and so does any static server (for example `npx serve docs/prototype`).

The page needs a network connection: it loads React, ReactDOM and Babel from unpkg and the fonts from Google Fonts. Everything in it is fictional, and no chat data leaves the page.

## Files

| File | What it is |
|---|---|
| `index.html` | **Generated.** A single self-contained page: the runtime, both components and the sample data are inlined |
| `src/The Spammy.dc.html` | The host flow: Start → Chat type → Host → Upload → Dates → Roast level → Awards → Who's who → The show → Share |
| `src/Show.dc.html` | The ceremony player (scenes, audience, captions, seek bar, looks, end overlay) |
| `src/Host.dc.html` | The animated host avatar (Goldie, Velvet, Disco) |
| `src/spammy-data.js` | Fictional sample data: chat kinds, hosts, roast levels, the Brunch Club cast, months, shows, award pool, receipts |
| `src/support.js` | A small runtime that renders the `<x-dc>` templates with React |
| `bundle.mjs` | Builds `index.html` from `src/` |

The files in `src/` are copied byte for byte from the design prototype. Never edit `index.html` by hand. To refresh the prototype, replace the files in `src/` and rebuild:

```sh
node docs/prototype/bundle.mjs           # rewrite index.html
node docs/prototype/bundle.mjs --check   # fail if index.html is stale
```

The bundle step changes only how files are loaded; no content changes. The source pages fetch `./Host.dc.html` and `./Show.dc.html` and `import('./spammy-data.js')` at run time. Browsers block those requests for pages opened from disk, which used to leave the page blank. The bundle registers the components with the runtime's resource map and imports the data from an inline `data:` URL.

## Use it as a reference, not as code

- Copy layout, copy text, host lines, motion and step order from the prototype. Rebuild them as React components in `apps/web` and as HyperFrames scenes in `packages/ceremony`.
- Do not import anything from `docs/prototype/` into the app.
- Where the prototype and [`docs/user-flow.md`](../user-flow.md) disagree, the user-flow document wins. Its "Product decisions that override the prototype" section lists every case.
