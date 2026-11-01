# AGENTS.md

Guidance for coding agents (OpenAI Codex) working in this repository.

## What this is

Wrapa turns a WhatsApp group export into an animated award ceremony ("Who ate 2026?"). One host runs it locally: upload chat → pick host persona, look, and roast level → AI suggests awards → host seals or picks each winner → AI writes the script → ElevenLabs voices and scores it → HyperFrames renders the ceremony locally → host plays it live and exports MP4 and a poster PNG.

Hackathon scope: one complete core journey. Anything else is post-hackathon.

## Layout

```
apps/web          Vite + React SPA (host flow: hello → kind → host → chat → range → spice → awards → people → show → share)
apps/server       Hono on Node (tsx), bound to 127.0.0.1; owns all API keys
packages/domain   zod contracts + inferred types, NotImplementedError, OPENAI_MODELS
packages/parser   WhatsApp export parsing (Android .txt, iPhone .txt, iPhone .zip)
packages/analysis pseudonymization, stats, long-context highlight pass
packages/agents   OpenAI Agents SDK: award suggestion/judging, storyboard script, face location
packages/production ElevenLabs narration, measured timing lock, music composed to timing
packages/store    one JSON file per show under WRAPA_DATA_DIR
packages/ceremony HyperFrames composition, local render (16:9, 9:16), poster PNG
fixtures/         synthetic exports only — never commit real chats
docs/prototype    clickable HTML prototype of the host flow and ceremony (reference only)
docs/user-flow.md the host journey, step by step, with overrides to the prototype
```

Dependency direction (no cycles, no upward imports):

- `domain` imports nothing internal.
- `parser`, `analysis`, `store`, `production`, `ceremony` import only `domain`.
- `agents` imports `domain` and `analysis` (types).
- `apps/server` composes all packages. `apps/web` imports only `domain` (contracts) and talks to the server over `/api`.

## Follow the prototype flow

Every screen, route and agent must follow the host journey in [`docs/user-flow.md`](docs/user-flow.md) and the clickable prototype in [`docs/prototype/`](docs/prototype/README.md). Open `docs/prototype/index.html` in a browser to click through it. It is generated from `docs/prototype/src/` by `node docs/prototype/bundle.mjs`, so never edit it by hand.

- Keep the prototype's step order, step names, host lines, button labels and motion. The step ids in `apps/web/src/flow.ts` are fixed.
- When the prototype and `docs/user-flow.md` disagree, `docs/user-flow.md` wins. Its "Product decisions that override the prototype" section is binding.
- Rebuild the prototype in React and HyperFrames. Never import `docs/prototype/` files into the app.
- Use the supplied `costumes/` artwork through a shared typed catalog with stable, readable costume IDs and local asset paths. Make the assets available to the production web build and renderer; do not regenerate them for the demo. Costume integration is tracked in [#15](https://github.com/alvis/spammy/issues/15).
- Add each person's costume preview and chooser within **Who's who**, keeping the ten-step journey. Persist the validated costume ID with the cast member and provide a deterministic default for older shows and a useful preview without a photo. Cast costumes are separate from the host persona and ceremony look.
- Reuse the same face crop and costume composition in setup, nominee cards, winner reveals, the finale, the poster and MP4 exports. Navigation, reload and saved-show replay must preserve the choice.
- To change the flow, update `docs/user-flow.md` in the same pull request and say why.

## Commands

```sh
corepack enable          # uses the pnpm version pinned in package.json
pnpm install
pnpm dev                 # server :8787 + web :5173 (web proxies /api)
pnpm test                # vitest across packages and server
pnpm typecheck           # tsc per workspace project
pnpm build               # web production build
```

Run `pnpm test && pnpm typecheck` before finishing any task.

## Conventions

- TypeScript strict, ESM, no build step for packages: each package exports `./src/index.ts` directly.
- Contracts live in `packages/domain` as zod schemas; types come from `z.infer`. Validate every boundary input (HTTP bodies, files on disk, model output) with the schema before use.
- Kebab-case file names (React components may be PascalCase). Named exports only; `index.ts` re-exports and holds no logic.
- Tests sit beside source as `*.spec.ts`. Mock OpenAI and ElevenLabs in tests; never call paid APIs from tests.
- Lowercase JSDoc on exported APIs.

## Mentions

The only AI products, models, or providers this project names are OpenAI (including Codex) and ElevenLabs. Do not mention any other AI assistant, model, coding agent, or vendor anywhere: code, comments, docs, commit messages, branch names, issues, or pull requests. Open-source libraries in `package.json` may be credited by name and link.

## Stubs

Unimplemented features throw `new NotImplementedError('<package>.<function>')`; the server maps it to HTTP 501 `{ error: 'not_implemented', feature }`. To implement one:

1. Find the stub by its feature name and the matching `it.todo` entries in the sibling `*.spec.ts`.
2. Turn the relevant `it.todo` entries into real tests, then implement until they pass.
3. Keep the exported signature; if a contract must change, change the zod schema in `domain` first and fix every caller.

## Privacy and keys

- API keys are read from `.env` by the server only (see `.env.example`); never import them into `apps/web`.
- Pseudonymize chats (`analysis.pseudonymizeChat`) before any OpenAI call. Receipts quote messages with other names masked.
- Uploaded chats, photos, and renders go under `WRAPA_DATA_DIR` (git-ignored).

## Models

Hard-coded per task in `packages/domain/src/models.ts`: bulk read `gpt-6-luna`; award agents and script `gpt-6-astra`; face location `gpt-6.1-terra`. Verify availability against `/v1/models` before relying on them.
