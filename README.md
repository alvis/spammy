# The Spammy — Who ate 2026?

**Your group chat gets its own end-of-year awards show.**

We're all the main characters in our own lives. And to someone, we're superstars.

So shouldn't we get an award at the end of the year, too?

The friend who made everyone laugh the most. The one who always did the work of getting everyone together. The person who still replied at 3 a.m.

They might not have a trophy, but they've earned one. And the evidence is all there in the group chat.

That's why we built **The Spammy**: an end-of-year awards ceremony just for your group chat.

Upload your WhatsApp conversations, and AI finds the moments that made your year, suggesting awards and nominees backed by real messages. Choose your host and confirm the winners, then watch your own ceremony, from the nominee introductions to opening the envelopes.

Share the stage with your friends. Who's taking home which award? You'll have to open the envelope to find out.

Built at the [DevDay Exchange Community Hackathon, London](https://luma.com/dde-ldn-hack) on Sunday 1 November 2026, between 11:00 and the 17:00 submission deadline.

| | |
|---|---|
| **Idea** | Turn a year of group-chat chaos into an animated award ceremony ("Spammy": a Wrapped for your chat) |
| **For** | Friend groups, housemates, families and teams who share a WhatsApp group; one person hosts, everyone watches |
| **Stack** | TypeScript · pnpm workspace · Vite + React · Hono on Node · zod · OpenAI Responses API + Agents SDK · ElevenLabs · HyperFrames |
| **Demo video** | _link added before submission (≤ 90 s)_ |

## The core journey (hackathon scope)

1. **Upload**: drop a WhatsApp export (Android `.txt`, iPhone `.txt` or `.zip`) or use the built-in fictional sample, "Brunch Club".
2. **Set the tone**: pick the chat type, a host (Goldie, Velvet or Disco), the date range and a roast level.
3. **Awards**: OpenAI reads the pseudonymized chat and invents awards that fit this group, each with a "how judged" line, three nominees, stats and quoted receipts. Swap, remove or add awards; seal each winner (the AI picks, revealed live) or pick it yourself.
4. **Who's who**: fix names, add photos, assign faces from a group photo, and choose a supplied costume per person. Costume choices work locally without an API call and appear throughout the ceremony. Optionally describe a fictional character for an OpenAI-generated portrait using a selected costume reference.
5. **The show**: the host voice (ElevenLabs) narrates a live ceremony: curtains, nominees, "the envelope, please", confetti, finale.
6. **Share**: download the video and the winners poster.

The ceremony uses measured narration timings and music cues composed to whole-bar windows. The fictional Brunch Club sample plays without provider keys. Uploaded-chat analysis, narration, music, face location and character generation require the configured provider credentials. The [open issues](https://github.com/alvis/Spammy/issues) track delivery and review.

## How it works

```
apps/web (React)  ──/api──▶  apps/server (Hono, 127.0.0.1 only, holds the API keys)
                                │
        ┌───────────────┬───────┴────────┬────────────────┬───────────────┐
   packages/parser  packages/analysis  packages/agents  packages/production  packages/ceremony
   WhatsApp export   stats +           OpenAI Agents SDK: ElevenLabs voice   HyperFrames
   → messages        pseudonymize      awards, script,    + timed music     composition +
                     before any        faces                                  local MP4 render
                     OpenAI call
                                │
                         packages/store: one JSON file per show in SPAMMY_DATA_DIR
```

| Task | Model / service |
|---|---|
| Read the whole (pseudonymized) chat in one long-context pass | OpenAI `gpt-6-luna` |
| Award agents and the show script | OpenAI `gpt-6-astra` via `@openai/agents` |
| Find faces in uploaded photos | OpenAI `gpt-6.1-terra` |
| Generate fictional character portraits | OpenAI `gpt-image-2.5-flare`, configurable with `OPENAI_IMAGE_MODEL` |
| Host voice, music, word timing | ElevenLabs |
| Video | HyperFrames, rendered locally |

Task model IDs are defined in `packages/domain/src/models.ts`; the image model is configured server-side. Confirm model access for your OpenAI project before using live generation. Offline tests mock the provider APIs.

## Setup

Requirements: Node 22+ and corepack. OpenAI and ElevenLabs keys enable the live AI journey; the sample needs neither. Voiced production needs FFmpeg's `ffprobe` to measure narration. MP4 and poster export also need Chrome and FFmpeg (`pnpm --filter @spammy/ceremony exec hyperframes doctor` checks rendering prerequisites).

```sh
git clone https://github.com/alvis/Spammy.git && cd Spammy
corepack enable          # uses the pnpm version pinned in package.json
pnpm install
cp .env.example .env     # add OPENAI_API_KEY, ELEVENLABS_API_KEY and the three voice IDs
pnpm dev                 # web http://127.0.0.1:5173 · API http://127.0.0.1:8787
```

To try it without your own chat, choose **"or try the sample: Brunch Club"** on the upload step.

When upgrading an existing installation, rename its custom data-directory environment variable to `SPAMMY_DATA_DIR` and keep its existing value; the default remains `./data`. Browser saves now use `spammy.saved-shows` and `spammy.script.<show-id>`. To retain earlier browser saves, copy their existing local-storage values to these keys in browser developer tools before restarting the journey. Existing files and storage entries are not deleted.

```sh
pnpm test        # vitest across all packages
pnpm typecheck   # tsc for every workspace project
pnpm build       # production build of the web app
```

## Privacy

- Everything runs on your laptop. The server binds to `127.0.0.1` and is the only place API keys are read.
- Names are swapped for codes before any chat text goes to OpenAI and are restored locally. Excluded people and messages are never sent.
- Face location sends the selected photo to OpenAI; the host assigns identities locally. Character generation sends your description and the selected reference PNG from `costumes/`, without attaching chat messages. Its cache and provenance include the reference image hash.
- ElevenLabs receives the approved narration and music prompts; generated hook audio is sent for word timing.
- Chats, photos and renders are written to `SPAMMY_DATA_DIR` (git-ignored). The repo contains only fictional sample data. Never commit a real export.

## How Codex helped

We planned the architecture and shared contracts first (`packages/domain`), then split the build into independent GitHub issues. Each issue carries a self-contained Codex prompt with scope, files, contract and the commands that prove it works, so several Codex tasks could run in parallel without editing the same files. `AGENTS.md` gives every Codex run the same conventions.

_Concrete example: added before submission (issue → Codex task → merged PR)._

## Credits

- **Design**: the team's own clickable prototype in [`docs/prototype/`](docs/prototype/README.md), the host journey in [`docs/user-flow.md`](docs/user-flow.md), and brand tokens in [`docs/design/README.md`](docs/design/README.md).
- **Feature work**: built with OpenAI Codex from the issues in this repository.
- **Libraries**: [HyperFrames](https://github.com/heygen-com/hyperframes) (Apache-2.0), [OpenAI Agents SDK](https://github.com/openai/openai-agents-js) (MIT), [openai-node](https://github.com/openai/openai-node) (Apache-2.0), [ElevenLabs JS SDK](https://github.com/elevenlabs/elevenlabs-js) (MIT), [Hono](https://hono.dev), [React](https://react.dev), [Vite](https://vite.dev), [zod](https://zod.dev).
- **Fonts**: Fredoka and Nunito (SIL Open Font License) via Google Fonts.
- **Sample data**: the "Brunch Club" chat and its people are fictional.
- **Costumes**: the supplied artwork from [PR #13](https://github.com/alvis/spammy/pull/13), retained unchanged and shared by browser previews and local exports.
