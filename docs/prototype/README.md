# The Spammy prototype

A clickable HTML prototype of the whole host flow and the ceremony player. Along with [`docs/user-flow.md`](../user-flow.md), it is the reference every contributor and coding agent builds against.

| File | What it is |
|---|---|
| `index.html` | The host flow: Start → Chat type → Host → Upload → Dates → Roast level → Awards → Who's who → The show → Share |
| `Show.dc.html` | The ceremony player (scenes, captions, seek bar, looks, end overlay) |
| `Host.dc.html` | The animated host avatar (Goldie, Velvet, Disco) |
| `spammy-data.js` | Fictional sample data: chat kinds, hosts, roast levels, the Brunch Club cast, months, shows, award pool, receipts |
| `support.js` | A small runtime that renders the `<x-dc>` templates with React |

## Run it

The page loads its components over HTTP, so opening it with `file://` will not work:

```sh
npx serve docs/prototype
# then open the printed URL (index.html)
```

The runtime loads React, ReactDOM and Babel from unpkg, so you need a network connection. Everything in it is fictional. No chat data leaves the page.

## Use it as a reference, not as code

- Copy layout, copy text, host lines, motion and step order from the prototype. Rebuild them as React components in `apps/web` and as HyperFrames scenes in `packages/ceremony`.
- Do not import `support.js` or the `.dc.html` files into the app.
- Where the prototype and [`docs/user-flow.md`](../user-flow.md) disagree, the user-flow document wins. Its "Product decisions that override the prototype" section lists every case.
