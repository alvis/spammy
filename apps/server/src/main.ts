import { serve } from '@hono/node-server';

import { createShowStore } from '@spammy/store';

import { createApp } from './app';

const hostname = process.env.HOST ?? '127.0.0.1';
const port = Number(process.env.PORT ?? 8787);
const dataDir = process.env.SPAMMY_DATA_DIR ?? './data';

const app = createApp({ store: createShowStore({ dataDir }) });

serve({ fetch: app.fetch, hostname, port }, (info) => {
  console.log(`spammy server listening on http://${info.address}:${info.port}`);
});
