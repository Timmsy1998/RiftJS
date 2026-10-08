# RiftJS

A server-side Node.js wrapper for every operation currently listed in Riot's League of Legends API reference: 53 operations across 14 API families, including Tournament V5, Tournament Stub V5, Riot Sign On (RSO), and the shared Account V1 API. Includes Data Dragon champion and item data, ES module and CommonJS entry points, and TypeScript declarations. Requires Node.js 22 or newer.

Coverage is checked against the [official reference](https://developer.riotgames.com/apis). See the [complete endpoint reference](docs/ENDPOINTS.md) for method signatures, routing, and authentication. Endpoint availability depends on your Riot application permissions; a wrapper cannot grant access to restricted APIs.

For Node.js, Next.js, Nuxt, and browser apps with a Node backend, see the [integration guide](docs/INTEGRATIONS.md) and runnable framework examples.

## Install and start

```bash
npm install @timmsy/riftjs
```

Keep credentials on your server. Set `RIOT_API_KEY` and optionally `REGION` in your environment or `.env` (default region: `EUW1`), or pass them to the constructor. Never bundle a Riot key or access token into a browser application or commit `.env` files.

```js
const { RiotAPI, DataDragon } = require('@timmsy/riftjs');

async function main() {
  const riot = new RiotAPI({ region: 'EUW1' });
  const account = await riot.getAccountByRiotId('PlayerName#EUW');
  const puuid = String(account.puuid);
  const summoner = await riot.getSummonerByPuuid(puuid);
  const ids = await riot.getMatchIdsByPuuid(puuid, { query: { count: 5 } });
  const match = ids.length ? await riot.getMatch(ids[0]) : null;
  console.log(summoner.summonerLevel, match);
  const champions = await new DataDragon().getChampions();
  console.log(Object.keys(champions.data || {}).length);
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
```

ES module JavaScript and TypeScript use the same API: `import { RiotAPI, DataDragon, RiotAPIError } from '@timmsy/riftjs'`.

## Browse the built-in API docs

After installing the package, open its bundled documentation:

```bash
npx --no-install riftjs-docs
```

This starts a local server and opens your browser. The docs work offline, require no API key, and include searchable signatures for every endpoint, constructor, convenience method, and public type, alongside the endpoint and framework guides. Press Ctrl+C to stop the server.

Use `npx --no-install riftjs-docs --no-open --port 8080` to choose a port and open the printed URL yourself. You can also open `node_modules/@timmsy/riftjs/dist/docs/index.html` directly without a server. In a source checkout, run `npm run docs`; `npm run docs:build` regenerates the HTML alone.

## Configuration and rate limits

```ts
const riot = new RiotAPI({
  apiKey: process.env.RIOT_API_KEY,
  region: 'NA1',
  timeoutMs: 10_000,
  maxRetries: 2,
  maxRateLimitWaitMs: 180_000,
  rateLimits: [
    { limit: 20, intervalMs: 1_000 },
    { limit: 100, intervalMs: 120_000 },
  ],
});
```

Those are the transport defaults. Set `loadEnv: false` when your framework manages environment loading; explicit configuration and environment fallbacks still work. Local caps supplement Riot's application and method limit/count headers. `rateLimits: []` disables only local caps; Riot's response limits and 429 cooldowns still apply. Choose caps appropriate for your approved key. Requests serialize per host, reserve slots before sending, and honor `Retry-After` (seconds or HTTP date), including when retries are exhausted. Service or unknown throttles conservatively pause the host.

Only GET requests retry, on 429 or 500/502/503/504, up to `maxRetries` (0–10). Other failures, including authentication and timeouts, fail immediately. Tournament POST/PUT requests never retry automatically, avoiding duplicate providers, tournaments, or codes. `timeoutMs` bounds each HTTP attempt; `maxRateLimitWaitMs` bounds the allowed rate/retry waiting period after acquiring the host queue, not total time spent queued. Use an `AbortSignal` for an overall deadline.

Reuse one `RiotAPI` instance per credential and process. Limit state is in memory and is not shared between instances or processes. Multiple workers sharing a key need an external coordinator; Riot's headers and retries do not replace a distributed limiter. Local caps apply per host to both API-key and bearer requests on that instance.

```ts
await riot.getMatch('NA1_1234567890', {
  region: 'AMERICAS', signal: AbortSignal.timeout(30_000),
});
```

Credentials live in JavaScript private fields and are sent only in authentication headers to allowlisted HTTPS Riot hosts. Redirects are disabled, requests have finite timeouts and size caps, path parameters are encoded, and credentials in query parameters are rejected. Errors omit raw Axios config, request/response objects, and upstream messages that could expose credentials.

## Routes and endpoint options

New endpoint methods accept path arguments followed by `EndpointOptions`:

```ts
await riot.getLeagueEntries('RANKED_SOLO_5x5', 'DIAMOND', 'I', {
  region: 'EUW1', query: { page: 2 },
});
await riot.getTopChampionMasteriesByPuuid(puuid, { query: { count: 3 } });
```

`EndpointOptions` contains `region`, `query`, and `signal`. Query values are strings, numbers, booleans, or undefined. Consult Riot's reference for accepted filters. Match-ID pagination validates `start >= 0` and `count` from 0 to 100.

Platform routes: `BR1`, `EUN1`, `EUW1`, `JP1`, `KR`, `LA1`, `LA2`, `NA1`, `OC1`, `TR1`, `RU`, `PH2`, `SG2`, `TH2`, `TW2`, `VN2`. Regional operations also accept `AMERICAS`, `EUROPE`, `ASIA`, and `SEA`. Account V1 uses Americas, Europe, or Asia; SEA platform selections route account calls to Asia. Tournament APIs always use Americas, with the game server selected by the provider body's tournament region.

`RIOT_ENDPOINTS` is a frozen catalog of IDs, names, paths, methods, routes, and RSO flags. The restricted generic dispatcher supports every catalog operation without accepting arbitrary URLs:

```ts
interface MyMatch { metadata: { matchId: string } }
const match = await riot.callEndpoint<MyMatch>('match-v5.getMatch', {
  matchId: 'NA1_1234567890',
}, { region: 'AMERICAS' });
```

Named methods have typed arguments and tournament bodies. JSON object responses use `Record<string, unknown>` rather than exhaustive Riot DTO schemas; arrays and scalar return values are typed separately. Generic response types are caller assertions, not runtime payload validation.

## Tournaments

Use stub endpoints to develop the integration. Real Tournament V5 requires Riot to approve your tournament application; stub codes cannot launch actual games. See [Riot's tournament documentation](https://developer.riotgames.com/docs/lol#tournament-api).

```ts
const providerId = await riot.registerTournamentStubProvider({
  region: 'EUW', url: 'https://your-app.example/riot/callback',
});
const tournamentId = await riot.registerTournamentStub({
  providerId, name: 'Development Cup',
});
const codes = await riot.createTournamentStubCodes({
  teamSize: 5, mapType: 'SUMMONERS_RIFT',
  pickType: 'TOURNAMENT_DRAFT', spectatorType: 'ALL',
  metadata: 'your-internal-match-id',
}, tournamentId, 1);
const lobby = await riot.getTournamentStubLobbyEvents(codes[0]);
```

For production use `registerTournamentProvider`, `registerTournament`, `createTournamentCodes`, `getTournamentCode`, `updateTournamentCode`, `getTournamentGames`, and `getTournamentLobbyEvents`. Code creation takes `(body, tournamentId, count?, options?)`; pass `undefined` for count if supplying only options. Count is 1–1000, team size 1–5. `allowedParticipants` uses encrypted PUUIDs. Provider callbacks must use HTTP(S) on the default port, without URL credentials. This package registers callback URLs; your application must implement and secure its callback receiver.

## Riot Sign On

RSO endpoints use an OAuth access token from your approved integration. Token acquisition, refresh, and user consent belong to your application. See [Riot's RSO documentation](https://developer.riotgames.com/docs/lol#rso-integration).

```ts
const signedIn = new RiotAPI({ accessToken: userAccessToken, region: 'EUW1' });
const account = await signedIn.getAccountMe();
const summoner = await signedIn.getSummonerMe();
const matches = await signedIn.getRsoMatchIds({ query: { count: 5 } });
```

RSO requests send only the bearer token. Ordinary endpoints require `apiKey`; a token-only client fails before sending ordinary calls. Create a new instance when replacing an access token.

## Existing convenience methods

The v3 convenience signatures remain available alongside the complete endpoint methods:

| Method | Arguments | Result |
| --- | --- | --- |
| `getAccountByRiotId` | `riotId, tagLine?, region?` | Account; accepts `Name#Tag` or separate name/tag |
| `getSummonerByPuuid` | `puuid, region?` | Summoner |
| `getRankEntriesByPuuid` | `puuid, region?` | Rank entries |
| `getRankByPuuid` | `puuid, region?` | `{ solo, flex, entries }`; win rate percentage on solo/flex |
| `getMatchlistByPuuid` | `puuid, filters?, region?` | Match IDs |
| `getMatchById` | `matchId, region?` | Match |
| `getMatchTimelineById` | `matchId, region?` | Timeline |
| `getMatchlistByPuuidAll` | `puuid, filters?, region?, pacing?` | Paged match IDs |
| `getMatchesWithDetailsByPuuid` | `puuid, filters?, region?, pacing?` | `{ matchIds, matches }` |

Filters: `startTime`, `endTime` (epoch seconds), `queue`, `type`, `start`, `count`. Bulk ID pacing: `{ delayMs?, maxMatches? }`. Detail pacing: `{ pageDelayMs?, detailDelayMs?, maxMatches? }`. Delays default to 1250 ms, with the transport limiter also active. Use `maxMatches` to bound bulk work. Use new endpoint methods when you need `AbortSignal` or an explicit regional route.

## Data Dragon and errors

`new DataDragon(version?, locale?)` defaults to the latest version and `en_US`. Pin a version such as `16.1.1` when reproducibility matters. `getChampions()` and `getItems()` return their complete static JSON payloads. Version and locale inputs are validated; fetches use 10-second timeouts and disable redirects.

```ts
try {
  await riot.getMatch('NA1_1234567890');
} catch (error) {
  if (error instanceof RiotAPIError) {
    console.error(error.message, error.status, error.code, error.retryAfterMs);
  } else {
    throw error;
  }
}
```

`RiotAPIError` optionally provides `status`, `code`, `retryAfterMs`, and `rateLimitType`. Cancellation uses `ERR_CANCELED`; an excessive rate wait uses `RATE_LIMIT_WAIT`. Input validation can throw ordinary `Error`. Data Dragon failures retain a readable message.

## Maintenance and v4 migration

```bash
npm ci
npm test                 # Offline transport, coverage, routing, and security tests
npm run test:integrations # Packed-package Next.js/Nuxt production builds and HTTP routes
npm run check:coverage   # Read-only check against Riot's current public reference
npm run test:endpoints   # Optional live read-only smoke checks; needs network
npm audit
npm pack --dry-run
```

Live Riot smoke checks require `RIOT_API_KEY` and `TEST_RIOT_ID`; `TEST_TAG_LINE` is optional. Data Dragon live checks run without a key. Tests never create tournaments. CI runs offline checks, framework integration builds, and packaging; a separate weekly workflow reports reference drift. Dependabot proposes dependency updates. These checks detect change; maintainers must review API changes and permissions before releasing. See [maintainer notes](MAINTAINER_NOTES.md).

v4 removes the public `apiKey` and raw client properties, uses sanitized `RiotAPIError`, adds default pacing and bounded retries to all Riot requests, requires Node.js 22+, and makes `npm test` offline. Existing convenience method signatures remain unchanged. Build output is generated for npm, not tracked in Git. See [CHANGELOG](CHANGELOG.md).

MIT License. See [LICENSE](LICENSE). RiftJS is an independent wrapper, not an official Riot Games SDK.
