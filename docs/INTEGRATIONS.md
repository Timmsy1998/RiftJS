# JavaScript and framework integrations

RiftJS supports JavaScript and TypeScript on Node.js 22+. Both `import` and `require` expose the same classes and endpoint catalog. Type declarations support NodeNext, CommonJS, and bundler resolution. No framework plugin or transpilation setting is required.

Use the SDK in your server runtime. Browser apps call your application's HTTP routes; the package deliberately blocks browser imports. Node.js is the supported runtime: Edge runtimes, Deno, and Bun are not validated. Frameworks may require a newer Node patch than RiftJS; the Nuxt example requires Node 22.22.3+, 24.15.0+, or 26+.

## Node.js, Express, Fastify, workers, and scripts

```sh
npm install @timmsy/riftjs
```

ES modules (`.mjs` or a project with `"type": "module"`):

```js
import { RiotAPI } from '@timmsy/riftjs';

const riot = new RiotAPI({ region: 'EUW1' });
console.log(await riot.getPlatformStatus({ signal: AbortSignal.timeout(15_000) }));
```

CommonJS (`.cjs` or a CommonJS project):

```js
const { RiotAPI } = require('@timmsy/riftjs');
const riot = new RiotAPI({ region: 'EUW1' });
riot.getPlatformStatus().then(console.log).catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
```

Set `RIOT_API_KEY` on the server. By default, constructing a client also loads `.env` quietly without overriding existing environment variables. Pass `loadEnv: false` when the framework or deployment manages configuration; environment fallbacks still work. Explicit `apiKey`, `accessToken`, and `region` options take precedence.

In Express or Fastify, create one client outside the request handler and call its async methods inside your route. Apply your application's authentication, input validation, and caller quotas before issuing requests. Return only the data your frontend needs. The SDK's rate limiter controls upstream requests, not access to your application.

## Next.js App Router

Keep the client in a server module. Install the guard with `npm install server-only`.

```js
// lib/riot.js
import 'server-only';
import { RiotAPI } from '@timmsy/riftjs';

let client;
export function getRiot() {
  if (!client) {
    const apiKey = process.env.RIOT_API_KEY;
    if (!apiKey) throw new Error('Configure RIOT_API_KEY on the server');
    client = new RiotAPI({ apiKey, region: 'EUW1', loadEnv: false });
  }
  return client;
}
```

Create a Node route handler:

```js
// app/api/lol/status/route.js
import { getRiot } from '../../../../lib/riot.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const data = await getRiot().getPlatformStatus({ signal: request.signal });
    return Response.json(data, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ error: 'League status unavailable' }, { status: 503 });
  }
}
```

Set `RIOT_API_KEY` in `.env.local` or your deployment's server environment. Never prefix the key with `NEXT_PUBLIC_`. Server Components and Server Actions can use `getRiot()` directly; Client Components fetch your route. For Pages Router, use the client inside `pages/api/` and return the result through `res.json`; keep the route on the Node runtime.

These conventions follow Next.js [server module guidance](https://nextjs.org/docs/app/getting-started/server-and-client-components) and [route handlers](https://nextjs.org/docs/app/api-reference/file-conventions/route).

## Nuxt / Nitro

Put the credential in private runtime config:

```js
// nuxt.config.js
export default defineNuxtConfig({
  runtimeConfig: { riotApiKey: '' },
  nitro: { preset: 'node-server' },
});
```

Set `NUXT_RIOT_API_KEY` in your deployment environment. Nuxt loads `.env` during development; set the environment variable explicitly when starting the built production server. Do not put the key in `runtimeConfig.public` or use `NUXT_PUBLIC_`.

```js
// server/utils/riot.js
import { RiotAPI } from '@timmsy/riftjs';

let client;
export function getRiot(event) {
  if (!client) {
    const { riotApiKey } = useRuntimeConfig(event);
    if (!riotApiKey) throw new Error('Configure NUXT_RIOT_API_KEY on the server');
    client = new RiotAPI({ apiKey: riotApiKey, region: 'EUW1', loadEnv: false });
  }
  return client;
}
```

```js
// server/api/lol/status.get.js
import { getRiot } from '../../utils/riot.js';

export default defineEventHandler(async event => {
  setHeader(event, 'Cache-Control', 'no-store');
  try {
    return await getRiot(event).getPlatformStatus({ signal: AbortSignal.timeout(15_000) });
  } catch {
    throw createError({ statusCode: 503, statusMessage: 'League status unavailable' });
  }
});
```

Vue components can use `useFetch('/api/lol/status')`. Keep SDK imports under `server/`; use a Node deployment preset. See Nuxt's [runtime config](https://nuxt.com/docs/4.x/guide/going-further/runtime-config) and [server directory](https://nuxt.com/docs/4.x/directory-structure/server).

## React, Vue, and other browser projects

A browser project can integrate through any Node backend using the routes above:

```js
const response = await fetch('/api/lol/status');
if (!response.ok) throw new Error('League status unavailable');
const status = await response.json();
```

Use your framework's normal loading/error handling. Do not import RiftJS into browser code or expose a credential through public environment prefixes such as `VITE_`. Static-only hosting needs a separate server or Node serverless function. Data Dragon also uses this package's server entry point; public static data can alternatively be fetched directly from Riot's CDN without a key.

## Rate limits and deployment

Reuse a client per credential and server process to retain its rate state. Lazy construction allows framework builds to complete without credentials; configure them when serving requests. Serverless instances, containers, and workers do not share the in-memory limiter. Coordinate shared keys externally when scaling, and configure `rateLimits` for your approved key. Use separate clients for each user's RSO token; never reuse a user's token across users.

All tournament methods work through these server integrations. Real tournament access and RSO still require Riot approval. Keep tournament mutations behind your application's authorization and validate callbacks at your server.

## Runnable examples and compatibility checks

The repository contains minimal [Next.js](https://github.com/timmsy1998/RiftJS/tree/main/examples/next) and [Nuxt](https://github.com/timmsy1998/RiftJS/tree/main/examples/nuxt) projects. From a clone:

```sh
npm ci
npm run build
cd examples/next            # or examples/nuxt
npm install
cp .env.example .env        # replace the placeholder with your server credential
npm run dev
```

The examples use `file:../..` to consume the local SDK. In your own project, install `@timmsy/riftjs` from npm instead. Next.js starts on port 3000; Nuxt also defaults to 3000. Open `/api/lol/status`.

`npm test` checks module identity, environment behavior, browser rejection, and strict TypeScript consumers. `npm run test:integrations` installs an actual packed tarball into temporary Next.js and Nuxt projects, runs production builds, starts both servers, and checks their SDK-backed HTTP routes. It downloads framework dependencies and requires a Node version supported by both examples. Upstream responses are mocked only in the temporary test copies; no Riot credentials or live API calls are needed.
