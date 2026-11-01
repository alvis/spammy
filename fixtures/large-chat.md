# Large chat reproduction

Generate a deterministic fictional Android WhatsApp export with 22,131 messages across 81 months:

```sh
node fixtures/generate-large-chat.mjs /tmp/spammy-large-chat.txt
```

An optional third argument selects a message count up to 500,000. The generated file contains only invented people and conversations; keep generated exports outside the repository.

Start the app, make a new show, choose a host and upload the file. On Dates, select months across different years, then continue to Roast level and submit. The chart should remain legible at desktop and mobile widths. Submission should show its current phase, elapsed time, and a working cancel action. A delayed or failed provider should retain the chat and date choices for retry.

Use browser request interception for successful, delayed and failed provider responses during reproduction. Tests must not call paid APIs. The parser and local upload/settings routes can run normally.
