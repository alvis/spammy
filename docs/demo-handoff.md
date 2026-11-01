# Brunch Club musical demo handoff

The PR contains the demo playback wiring and an ElevenLabs generation script. Media generation is unfinished: no music file or completed portrait assets are committed. The new demo references the asset paths below, so finish these before presenting this version. Generation was stopped at the user's request to hand the work over locally.

Copy this prompt into your local coding session:

> Continue the Brunch Club musical demo in alvis/spammy PR #18, branch `wip/ceremony-journey`. Fetch the branch and preserve existing work. Read AGENTS.md and the latest origin/main instructions; follow our coding standards and $pr skill. Use fast parallel Astra agents where useful. Prioritize a working happy path, without expanding edge-case tests.
>
> Production already integrates ElevenLabs narration/music and OpenAI character images. Finish the bundled **Meet the Brunch Club** demo so it plays a fun musical and displays fictional faces on the original costume artwork. Keep PR #14's flow, PR #13's costumes, and the latest PR #19 stage choreography, sealed reveals, pause/seek and reduced-motion behavior.
>
> Configure ELEVENLABS_API_KEY and OPENAI_API_KEY in the local ignored .env; never commit or print keys. Generate the original 80-second theatrical disco-swing track with sparse Brunch Club/Spammy sung hooks using the included official ElevenLabs SDK script. Save its measured duration and provenance; update SAMPLE_MUSIC_DURATION_SECONDS in apps/web/src/sample/media.ts from the provisional 60 to the actual duration. Inspect the loop transition.
>
> Use the OpenAI image generation API to create six distinct, friendly fictional adult headshots. Use consistent polished, expressive 3D illustration, a frontal centered face, complete hair, tight head-only square crop and warm cream background. Save PNGs for Dani, Marco, Priya, Tomas, Jules and Bea in apps/web/public/demo/faces/{dani,marco,priya,tomas,jules,bea}.png. Compose these faces with the existing costume images; do not regenerate the costumes or use real people's photos.
>
> Existing wiring is in apps/web/src/sample/media.ts and sample/show.ts, with App.tsx and steps/ceremony.tsx covering new playback and saved replay. Verify the real browser happy path: Meet the Brunch Club → awards → people → Roll the show; six faces load, music is audible, pause/seek/replay work, and envelopes stay sealed until opened. Verify the generated assets are bundled in the production build. Keep provenance accurate: do not claim provider generation without actual output.
>
> Commit and push the completed demo to the same PR. Preserve its closing links for issues #1–11, #15 and #20–26; #12 remains the separate submission checklist. Leave the PR draft unless the user directs otherwise.

From the repository root, after installing dependencies and configuring `.env`:

```sh
node_modules/.bin/tsx apps/server/src/scripts/generate-demo-music.ts --dry-run
node_modules/.bin/tsx --env-file-if-exists=.env apps/server/src/scripts/generate-demo-music.ts apps/web/public/demo
```

Expected music outputs: `apps/web/public/demo/brunch-club-musical.mp3` and `brunch-club-musical.json`. The generator requires `ffprobe`. The JSON records the model, request, measured duration and SHA-256. No ElevenLabs request was executed. Portrait generation was cancelled before complete assets were saved.
