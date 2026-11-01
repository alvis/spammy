# User flow

This is the host journey every screen, route and agent in this repository must follow. It is written from the clickable prototype in [`docs/prototype/`](prototype/README.md) (run it with `npx serve docs/prototype`). It also maps each step to the server route and issue that implement it.

Rules for contributors and coding agents:

1. Build the steps in this order, with these names and this copy. `apps/web/src/flow.ts` already holds the step ids.
2. When this document and the prototype differ, this document wins. Every difference is listed under [Product decisions that override the prototype](#product-decisions-that-override-the-prototype).
3. Keep the prototype's look and motion. Brand tokens are in [`docs/design/README.md`](design/README.md).
4. Do not add, drop or reorder steps without changing this document in the same pull request.

## The journey at a glance

```
Start → Chat type → Host → Upload → Dates → Roast level → Awards → Who's who → The show → Share
hello    kind       host    chat     range   spice         awards   people      show       share
```

The header shows the brand, one dot per step (dots for finished steps are clickable), `"{Step} · n of 10"`, and a `localhost` badge. From Chat type to Share, the chosen host speaks in a bubble above each step's content. The text is typed about 2 characters every 24 ms and the host's mouth moves while it types. Start uses a hero card instead of the bubble, and The show has no bubble. Every step after Start has a **← Back** button bottom-left and a primary pill button bottom-right.

## Steps

### 1. Start (`hello`)

- **Shows**: a large host avatar, then the marquee hero card "Who ate this year?" with a foil shimmer and blinking bulbs.
- **Previous shows**: a grid of saved ceremonies (16:9 thumbnail in the show's look, play badge, length, "{title} · {year}", "{kind} · {n} awards · {made}"). Clicking a thumbnail replays that show in the player (autoplay). Exiting returns here.
- **Host line**: "Welcome to The Spammy! I'm {host}. Give me a group chat and I'll throw it the awards show it deserves. Or rewatch an old one below."
- **Primary**: **Make a new show** → Chat type. This calls `POST /api/shows`.
- **Data**: `GET /api/shows` lists saved shows (#2).

### 2. Chat type (`kind`)

- **Shows**: 8 selectable cards with a label and a one-line joke: Friends, Couple, Family, Housemates, Work team, Trip crew, Sports club, Wedding party. One card is selected at a time (gold ring and a ✓). The default is Friends.
- **Host line**: "First, what kind of chat are we roasting? It changes which awards I hand out."
- **Primary**: **Next**.
- **Data**: `settings.groupKind`. The award agents (#7) use it to steer their ideas, but awards are not limited to a fixed list.

### 3. Host (`host`)

- **Shows**: 3 persona cards, each with an animated avatar, name, vibe and sample line:
  - Goldie: classic charm.
  - Velvet: red-carpet diva.
  - Disco: pure party hype.

  The selected host's avatar talks while its line types.
- **Host line**: "Who's hosting? Pick me. Or don't. I'll be fine. Probably."
- **Primary**: **{Host} it is**.
- **Data**: `settings.persona`. Each persona maps to one fixed ElevenLabs voice (`ELEVENLABS_VOICE_GOLDIE`, `_VELVET`, `_DISCO`).

### 4. Upload (`chat`)

- **Idle**: a dashed drop zone with a floating `.zip` file icon, the text "Drop your WhatsApp export here", the hint "Open the group → tap its name → Export chat → Without media", and a pill **or try the sample: Brunch Club**.
- **Busy**: a file card (name, size, status), a big percentage, a shimmering progress bar, and log lines that tick in:
  - "Unzipping {file}"
  - "Parsed {n} messages, {from} to {to}"
  - "Found {n} people"
  - "Mapping who talks when"
- **Host lines**:
  - idle: "Drop in your WhatsApp export. I'll take a quick look before reading properly."
  - busy: "Having a quick look… oh. Oh no. Oh, {most active person}."
  - done: "Quick look done: {n} messages, {from month} to {to month}. Next, pick the dates."
- **Primary**: **Next**. It is dimmed and inert until the quick look is done.
- **Data**: `POST /api/shows/:id/chat` parses Android `.txt`, iPhone `.txt` and iPhone `.zip` (#1, #2). The log lines report real parse results, not scripted text. The sample loads the fictional Brunch Club from `apps/web/src/sample/brunch-club.ts`.

### 5. Dates (`range`)

- **Shows**: the selected range as a heading ("Jan – Oct 2026") with its message count, and a bar chart of messages per month. Tap one month to start the range and another to end it.
- **Presets**: Whole year, Last 3 months, Summer, First half. The default is the whole span of the chat.
- **Host line**: "Which stretch should count? The whole year, or just that one chaotic summer?"
- **Primary**: **Next**.
- **Data**: `settings.range`. The month counts come from the parsed chat (#1).

### 6. Roast level (`spice`)

- **Shows**: 3 cards with 1–3 flame dots, a label, a description and a sample line:
  - Gentle: "Compliments with a wink".
  - Playful roast: "Teasing, never cruel". This is the default.
  - Savage: "Nobody leaves unhurt".
- **Host line**: "How hard should I go on them? {level} it is, unless you say otherwise."
- **Primary**: **Write the awards**. This runs analysis, then award suggestion.
- **Data**: `settings.roastLevel`. The primary button calls `POST /api/shows/:id/analysis` (pseudonymize, stats, one long-context read; #6) and then `POST /api/shows/:id/awards` (#7).

### 7. Awards (`awards`)

- **Header row**: "{n} awards · 3 shows", **⟳ Shuffle all**, and **+ Add an award**.
- **Award cards**: one card per award, grouped in order into three shows: The Golden Globes, The Yayademuy Awards, The Chat Gala. Each card shows:
  - the show name;
  - the award title;
  - **⟳** to swap the award for another suggestion;
  - **✕** to remove it;
  - the nominee line (see [overrides](#product-decisions-that-override-the-prototype));
  - an evidence quote bubble with the stat, ending "· See the conversation →".
- **Limits**: 3 to 12 awards. Removing stops at 3 and adding stops at 12. The agent suggests 9 by default.
- **Receipts drawer**: tapping a quote bubble opens a right-side sheet. Escape or the backdrop closes it. It contains:
  - a header "{group} · {date}" and the award title;
  - WhatsApp-style bubbles with avatar, coloured name and time;
  - system pills such as "6 days later";
  - a gold **Evidence** tag and ring on the quoted message;
  - the footer "Straight from your export, with the names you chose. Nothing here leaves this laptop."
- **Host line**: "I came up with {n} awards. Swap any you don't like, shuffle the lot, or tap a quote to read the whole conversation."
- **Primary**: **Lock them in**.
- **Data**: awards are invented freely by the agent from the chat content and judged with verified receipts (#7). The host's choices go to `PUT /api/shows/:id/awards/:awardId` (#2). Quotes mask every name except the speaker's (`Receipt.maskedText`).

### 8. Who's who (`people`)

- **Shows**: one card per person, containing:
  - a round photo (tap it to choose an image; the badge reads "+ Photo", or "Change" once a photo is set);
  - "In the chat as "{raw export name}"";
  - an editable display name;
  - a costume preview and chooser using the supplied local `costumes/` artwork;
  - "Wins: {award titles}" or "Nominated, no wins this time".
- **Names**: renamed people update everywhere straight away, including award cards, receipts, the ceremony and the poster.
- **Costumes**: select a costume per person from a shared catalog with stable IDs. Save the validated ID with the cast member and restore it on Back, reload and saved-show replay; older shows use a deterministic default. Preview the costume even without a photo, and preserve the face crop and artwork proportions when a photo is present. Reuse the same avatar composition for nominee cards, winner reveals, the finale, poster and MP4 exports. Costume selection is independent of the host persona and ceremony look, and requires no image generation or paid API call (#15).
- **Host line**: "Last thing. WhatsApp names are a mess. Fix them here and add photos for the red carpet."
- **Primary**: **Roll the show**. This starts production, then opens the player.
- **Data**: `POST /api/shows/:id/photos` (#2). Portraits and group photos are both accepted (see overrides). Costume integration (#15) must persist the selection through the `POST /api/shows/:id/cast` update owned by #2 and the validated cast contract. **Roll the show** calls `POST /api/shows/:id/production`, which writes the script and records the narration (#8).

### 9. The show (`show`)

The ceremony player sits full width on a warm backdrop. It is a 16:9 stage that scales with container-query units. A host avatar and a typed caption bubble ("{host} · your AI host") sit bottom-left.

**Scenes** (default seconds; the real timings lock to the measured narration from #8):

| Scene | Length | What happens | Host line |
|---|---|---|---|
| `open` | 7 | Red velvet curtains part (1.6 s). Then "The Spammy presents", the show title in foil, and the subtitle (date range or kind · year) | "Good evening, and welcome to The Spammy. I'm {host}, and I have read every single one of your messages. I'm so sorry." |
| `show` | 4 per show | "Now presenting · Show n of N", the show name in foil, and its strapline | The show intro |
| `intro` | 4.5 per award | Pill "{show} · Award n of N", "The award for", and the title popping in | The award intro |
| `noms` | 6.5 per award | "The nominees are…" and 3 nominee cards (photo or initial on a tint, name, stat, quote) popping in 0.3 s apart | — |
| `env` | 6.5 per award | A sealed envelope wiggles ("The envelope, please."). It opens, a card slides out ("And the award goes to"), the winner appears in a gold ring with their name in foil and the stat, and confetti falls | The winner line |
| `finale` | 9 | "That's a wrap." and a 3-column grid of the winners | "That's our show. Thank you for being this unwell in the group chat. See you next year." |

**Player chrome**:

- A poster overlay with a big play button before the show starts.
- Play/pause and the elapsed time.
- A seek bar with a chapter tick per award.
- A look switcher: Ivory, Black tie, Champagne.
- An **Exit** control. During a new show it returns to Who's who; during a replay it returns to Start.

**End overlay**: **↺ Play again** and **Share it →**, which goes to Share.

**Data**: the live player reads the produced show from `GET /api/shows/:id` (#5).

### 10. Share (`share`)

- **Shows**: a winners poster card:
  - "The Spammy" and the date range;
  - the show title in foil;
  - one row per award: title, avatar, winner name.
- **Actions** (see overrides):
  - **Download video (MP4)** renders and saves, with the toast "Rendering… saved to Downloads".
  - **Save to my shows** adds the show to the Start grid, with the toast "Saved. It's on the start screen."
  - A poster PNG download.
- **Host line**: "Send it to the group. Then mute the group."
- **Primary**: **Watch again** (replays with autoplay). **Secondary**: **Back to start**.
- **Data**: `POST /api/shows/:id/exports` renders the MP4 in 16:9 and 9:16, plus the poster PNG, with HyperFrames (#9).

## Product decisions that override the prototype

The prototype is a quick sketch. These confirmed decisions take precedence over it.

| Where | Prototype | Build this instead | Why |
|---|---|---|---|
| Awards, step 7 | Every card shows "{winner} wins over {a} and {b}" | **Seal or pick** for each award. Each card lists its nominees and offers two choices: **Seal it** (the agent judges the winner and keeps it hidden until the envelope opens) or **Pick the winner** (the host chooses a nominee). Sealed cards never reveal the winner during setup. Who's who shows "Wins: …" only for host-picked awards and says "{n} sealed" for the rest. | The host wants to be surprised by the envelopes too, but can also settle disputes |
| The show, `env` scene | The envelope opens by itself after 1.6 s | **Tap to open** in the live player. The scene holds on the wiggling envelope with "Tap to break the seal" until the host taps it or presses Space. MP4 exports play straight through with the prototype timing. | The host performs the reveal live in the room |
| Who's who, step 8 | Photos and names, with no costume chooser | Add a per-person costume preview and chooser within this step, using the supplied `costumes/` artwork. Persist a stable costume ID and reuse the same avatar composition in the ceremony and exports. Older shows use a default, and missing photos still have a useful preview (#15). | Costumes from #13 should appear consistently throughout the journey without adding a step |
| Who's who, step 8 | One portrait per person | Each person accepts a portrait or a **group photo**. For a group photo, `gpt-6.1-terra` finds the faces and the host taps the face that belongs to this person. The crop is stored as a `FaceBox`. This is post-hackathon (#10); until then, use the portrait only. | Most people have group photos, not headshots |
| Share, step 10 | Includes **Copy share link** | No share link. The app is local-only and nothing is uploaded. Offer **Download video (MP4)** (16:9 and 9:16), **Download poster (PNG)** and **Save to my shows**. | Privacy promise: nothing leaves the laptop |
| Upload, step 4 | Scripted progress and log lines | Progress and log lines come from the real parse. The sample button loads the fictional Brunch Club. | Honest feedback |
| Awards, step 7 | Picks from a fixed pool of 23 awards | Awards are invented freely by the agent from the chat (`gpt-6-astra`). ⟳ asks for a fresh suggestion, and **Shuffle all** asks for a new set. | Awards should come from what actually happened |
| The show, step 9 | Captions only | The narrator voices every line (ElevenLabs), reads the selected quotes with other names masked, and plays music under it. Captions are burned into exports. | Confirmed production plan |

## Issue map

| Step | Issue |
|---|---|
| Start, Chat type, Host, Upload, Dates, Roast level | #3 (web), #1 (parser), #2 (server) |
| Awards, Who's who, Share | #4 (web), #2 (server) |
| Analysis behind "Write the awards" | #6 |
| Award suggestion, judging, receipts | #7 |
| Script and narration behind "Roll the show" | #8 |
| Live ceremony player | #5 |
| MP4 and poster export | #9 (stretch) |
| Costume selection, persistence and avatars across the journey | #15 |
| Group-photo face picking | #10 (post-hackathon) |
| Music cues | #11 (post-hackathon) |
