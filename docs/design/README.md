# Design reference — The Spammy

Brand tokens and ceremony details distilled from the clickable prototype in [`docs/prototype/`](../prototype/README.md). The step-by-step host journey, including decisions that override the prototype, is in [`docs/user-flow.md`](../user-flow.md). Sample data lives in `apps/web/src/sample/brunch-club.ts` (fictional people, safe to commit).

## Brand

- Name: **The Spammy** (awards are "The Spammys"); tagline "Who ate this year?"
- Fonts: Fredoka (display, 600–700), Nunito (UI, 700–900). Both SIL OFL, from Google Fonts.
- Palette: canvas `#f7f3ec`, ink `#1c1915`, muted `#6e665b`, gold accent `#8a6420`, foil gradient `linear-gradient(100deg,#6f4f18 0%,#b8862f 22%,#f0d48a 40%,#c99a3e 58%,#7d5a1c 78%,#b8862f 100%)`, cards `#fffdf9` with `inset 0 0 0 1px rgba(28,25,21,.08)`, radius 22–34px, pill buttons (`#1c1915` bg, `#f7e3a8` text).
- Motion: `rise` (fade + 18px up), `pop` (scale .6 → 1.06 → 1), foil `shimmer`, slow spinning sun-ray background, marquee bulbs on the hero card.

## Host flow (10 steps, header shows dots + "Step · n of 10")

The AI host (persona avatar + speech bubble, text typed ~2 chars / 24 ms) speaks on every step except Hello (hero) and Show.

| # | Step | UI | Host line | Primary button |
|---|---|---|---|---|
| 1 | Start (`hello`) | Hero "Who ate this year?" in a marquee card; "Your previous shows" grid (16:9 thumbs, length badge) | "Welcome to The Spammy! I'm {host}. Give me a group chat and I'll throw it the awards show it deserves. Or rewatch an old one below." | Make a new show |
| 2 | Chat type (`kind`) | 8 cards: Friends, Couple, Family, Housemates, Work team, Trip crew, Sports club, Wedding party | "First, what kind of chat are we roasting? It changes which awards I hand out." | Next |
| 3 | Host (`host`) | 3 persona cards with sample line | "Who's hosting? Pick me. Or don't. I'll be fine. Probably." | {Host} it is |
| 4 | Upload (`chat`) | Dashed drop zone ".zip — Drop your WhatsApp export here — Open the group → tap its name → Export chat → Without media — or try the sample: Brunch Club"; then progress % + log lines (Unzipping…, Parsed N messages, Found N people, Mapping who talks when) | idle: "Drop in your WhatsApp export. I'll take a quick look before reading properly." · busy: "Having a quick look… oh. Oh no. Oh, {name}." · done: "Quick look done: {n} messages, {from} to {to}. Next, pick the dates." | Next (disabled until done) |
| 5 | Dates (`range`) | Month bar chart (message count per month), tap start + end; presets Whole year / Last 3 months / Summer / First half | "Which stretch should count? The whole year, or just that one chaotic summer?" | Next |
| 6 | Roast level (`spice`) | 3 cards with 1–3 flame dots: Gentle (Compliments with a wink), Playful roast (Teasing, never cruel), Savage (Nobody leaves unhurt) | "How hard should I go on them? {level} it is, unless you say otherwise." | Write the awards |
| 7 | Awards (`awards`) | "{n} awards · 3 shows", ⟳ Shuffle all, + Add an award; card per award: show name, title, ⟳ swap, ✕ remove, nominees with **Seal it** / **Pick the winner** (sealed winners stay hidden; see `docs/user-flow.md`), quote bubble "{stat} · See the conversation →" (opens the receipts drawer) | "I came up with {n} awards. Swap any you don't like, shuffle the lot, or tap a quote to read the whole conversation." | Lock them in |
| 8 | Who's who (`people`) | Card per person: round photo (tap → file picker, "+ Photo"/"Change"), "In the chat as "{raw}"", editable name, "Wins: …" | "Last thing. WhatsApp names are a mess. Fix them here and add photos for the red carpet." | Roll the show |
| 9 | The show (`show`) | Full-width ceremony player (below) | — | (player) |
| 10 | Share (`share`) | Winners poster card (title, date range, rows "award · avatar · name"); actions Download video (MP4), Download poster (PNG), Save to my shows (no share link) | "Send it to the group. Then mute the group." | Watch again · Back to start |

Receipts drawer (right side sheet): "{group} · {date}", award title, WhatsApp-style bubbles with avatar, coloured name, time; system pills ("6 days later"); the evidence message has a gold "Evidence" tag + ring. Footer: "Straight from your export, with the names you chose. Nothing here leaves this laptop."

## Personas (3 fixed ElevenLabs voices)

| id | Name | Vibe | Sample |
|---|---|---|---|
| goldie | Goldie | Classic charm | "Darling, you were robbed. Not really." |
| velvet | Velvet | Red-carpet diva | "I've read your messages. I need a lie down." |
| disco | Disco | Pure party hype | "EVERYONE'S A WINNER! Except Tomás." |

## Ceremony

16:9 stage, container-query units, host avatar + typed caption bubble bottom-left ("{host} · your AI host"). Scene sequence and default durations (seconds):

`open` 7 → for each show: `show` 4 → for each award: `intro` 4.5, `noms` 6.5, `env` 6.5 → `finale` 9

- **open**: red velvet curtains part (1.6s), "The Spammy presents", foil title, subtitle. Line: "Good evening, and welcome to The Spammy. I'm {host}, and I have read every single one of your messages. I'm so sorry."
- **show**: "Now presenting · Show n of N", show name (foil), sub; line = show intro.
- **intro**: pill "{show} · Award n of N", "The award for", title (pop); line = award intro.
- **noms**: "The nominees are…", 3 cards (avatar/photo or initial on tint, name, stat, quote bubble), staggered pop 0.3s.
- **env**: sealed envelope wiggles ("The envelope, please."); live player waits for a tap ("Tap to break the seal"); flap opens, card slides out "And the award goes to" → winner avatar in gold ring, foil name, stat; confetti 6.4s. Line = winner line.
- **finale**: "That's a wrap." + winners grid (3 columns). Line: "That's our show. Thank you for being this unwell in the group chat. See you next year."
- Player chrome: play/pause, time, seek bar with chapter ticks per award, look switcher (Ivory / Black tie / Champagne), Exit; end overlay "↺ Play again", "Share it →".

Looks:

| look | bg | ink | muted | card |
|---|---|---|---|---|
| ivory | `#f7f1e4` | `#1c1915` | `#6e665b` | `rgba(255,253,248,.85)` |
| blacktie | `#0f0d0a` | `#f6efe1` | `#b9ad96` | `rgba(255,248,230,.07)` |
| champagne | `#f8e3da` | `#2a1a17` | `#76574e` | `rgba(255,252,249,.72)` |
