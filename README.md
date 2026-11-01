# The Spammy — Who ate 2026?

**Your group chat gets its own awards show.** Drop in a WhatsApp export, pick an AI host, and The Spammy finds the year's best moments, hands out awards backed by real quotes, and plays the ceremony live, with a tap-to-open envelope for every winner.

Built at the [DevDay Exchange Community Hackathon, London](https://luma.com/dde-ldn-hack) on Sunday 1 November 2026, between 11:00 and the 17:00 submission deadline.

| | |
|---|---|
| **Idea** | Turn a year of group-chat chaos into an animated award ceremony ("Wrapa": a Wrapped for your chat) |
| **For** | Friend groups, housemates, families and teams who share a WhatsApp group; one person hosts, everyone watches |
| **Stack** | TypeScript · pnpm workspace · Vite + React · Hono on Node · zod · OpenAI Responses API + Agents SDK · ElevenLabs · HyperFrames |
| **Demo video** | _link added before submission (≤ 90 s)_ |

## The core journey (hackathon scope)

1. **Upload**: drop a WhatsApp export (Android `.txt`, iPhone `.txt` or `.zip`) or use the built-in fictional sample, "Brunch Club".
2. **Set the tone**: pick the chat type, a host (Goldie, Velvet or Disco), the date range and a roast level.
3. **Awards**: OpenAI reads the pseudonymized chat and invents awards that fit this group, each with a "how judged" line, three nominees, stats and quoted receipts. Swap, remove or add awards; seal each winner (the AI picks, revealed live) or pick it yourself.
4. **Who's who**: fix names and add a photo per person for the red carpet.
5. **The show**: the host voice (ElevenLabs) narrates a live ceremony: curtains, nominees, "the envelope, please", confetti, finale.
6. **Share**: download the video and the winners poster.

Planned for after the hackathon, not in today's demo: AI music cues composed to the narration, face detection in group photos, 9:16 export, and director-agent "signature moments" per award. The [open issues](https://github.com/alvis/Spammy/issues) list what is built and what isn't.

## How it works

```
apps/web (React)  ──/api──▶  apps/server (Hono, 127.0.0.1 only, holds the API keys)
                                │
        ┌───────────────┬───────┴────────┬────────────────┬───────────────┐
   packages/parser  packages/analysis  packages/agents  packages/production  packages/ceremony
   WhatsApp export   stats +           OpenAI Agents SDK: ElevenLabs voice   HyperFrames
   → messages        pseudonymize      awards, script,    (+ music later)    composition +
                     before any        faces                                  local MP4 render
                     OpenAI call
                                │
                         packages/store: one JSON file per show in WRAPA_DATA_DIR
```

| Task | Model / service |
|---|---|
| Read the whole (pseudonymized) chat in one long-context pass | OpenAI `gpt-6-luna` |
| Award agents and the show script | OpenAI `gpt-6-astra` via `@openai/agents` |
| Find faces in uploaded photos | OpenAI `gpt-6.1-terra` |
| Host voice, music, word timing | ElevenLabs |
| Video | HyperFrames, rendered locally |

Model IDs are hard-coded in `packages/domain/src/models.ts`. They were checked against the OpenAI models page on 2026-11-01.

## Setup

Requirements: Node 22+, corepack, an OpenAI API key and an ElevenLabs API key. Rendering MP4s also needs Chrome and FFmpeg (`npx hyperframes doctor` checks them).

```sh
git clone https://github.com/alvis/Spammy.git && cd Spammy
corepack enable          # uses the pnpm version pinned in package.json
pnpm install
cp .env.example .env     # add OPENAI_API_KEY, ELEVENLABS_API_KEY and the three voice IDs
pnpm dev                 # web http://127.0.0.1:5173 · API http://127.0.0.1:8787
```

To try it without your own chat, choose **"or try the sample: Brunch Club"** on the upload step.

```sh
pnpm test        # vitest across all packages
pnpm typecheck   # tsc for every workspace project
pnpm build       # production build of the web app
```

## Privacy

- Everything runs on your laptop. The server binds to `127.0.0.1` and is the only place API keys are read.
- Names are swapped for codes before any chat text goes to OpenAI and are restored locally. Excluded people and messages are never sent.
- ElevenLabs receives only the approved host script.
- Chats, photos and renders are written to `WRAPA_DATA_DIR` (git-ignored). The repo contains only fictional sample data. Never commit a real export.

## How Codex helped

We planned the architecture and shared contracts first (`packages/domain`), then split the build into independent GitHub issues. Each issue carries a self-contained Codex prompt with scope, files, contract and the commands that prove it works, so several Codex tasks could run in parallel without editing the same files. `AGENTS.md` gives every Codex run the same conventions.

_Concrete example: added before submission (issue → Codex task → merged PR)._

## Credits

- **Design**: the team's own clickable prototype in [`docs/prototype/`](docs/prototype/README.md), the host journey in [`docs/user-flow.md`](docs/user-flow.md), and brand tokens in [`docs/design/README.md`](docs/design/README.md).
- **Feature work**: built with OpenAI Codex from the issues in this repository.
- **Libraries**: [HyperFrames](https://github.com/heygen-com/hyperframes) (Apache-2.0), [OpenAI Agents SDK](https://github.com/openai/openai-agents-js) (MIT), [openai-node](https://github.com/openai/openai-node) (Apache-2.0), [ElevenLabs JS SDK](https://github.com/elevenlabs/elevenlabs-js) (MIT), [Hono](https://hono.dev), [React](https://react.dev), [Vite](https://vite.dev), [zod](https://zod.dev).
- **Fonts**: Fredoka and Nunito (SIL Open Font License) via Google Fonts.
- **Sample data**: the "Brunch Club" chat and its people are fictional.
