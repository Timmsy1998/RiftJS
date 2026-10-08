const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const axios = require('axios');
const { RiotAPI, RiotAPIError, RIOT_ENDPOINTS, DataDragon } = require('../dist');
const originalAdapter = axios.defaults.adapter;
let requests;
let handler;
const response = (config, data = {}, headers = {}) => ({ config, data, headers, status: 200, statusText: 'OK' });
const fail = (config, status, headers = {}) => {
    throw new axios.AxiosError('SECRET in upstream error', 'ERR_BAD_RESPONSE', config, {}, { ...response(config, { status: { message: 'SECRET' } }, headers), status });
};
const client = options => new RiotAPI({ apiKey: 'SECRET', accessToken: 'OAUTH_SECRET', rateLimits: [], ...options });
beforeEach(() => {
    requests = [];
    handler = config => response(config);
    axios.defaults.adapter = async config => { requests.push(config); return handler(config); };
});
afterEach(() => { axios.defaults.adapter = originalAdapter; });
const codeBody = { teamSize: 5, mapType: 'SUMMONERS_RIFT', pickType: 'TOURNAMENT_DRAFT', spectatorType: 'ALL', allowedParticipants: ['puuid'] };

test('every published operation has a working named wrapper with correct HTTP method, route, encoded path and body', async () => {
    const api = client({ region: 'EUW1' });
    assert.equal(RIOT_ENDPOINTS.length, 53);
    assert.equal(new Set(RIOT_ENDPOINTS.map(e => e.id)).size, RIOT_ENDPOINTS.length);
    for (const endpoint of RIOT_ENDPOINTS) {
        const keys = [...endpoint.path.matchAll(/\{([^}]+)\}/g)].map(m => m[1]);
        const args = keys.map(k => ['championId','challengeId','tournamentId'].includes(k) ? 42 : 'a/b #?');
        let body;
        if (endpoint.method !== 'GET') {
            body = endpoint.id.endsWith('.registerProviderData') ? { region: 'EUW', url: 'https://example.com/callback' } : endpoint.id.endsWith('.registerTournament') ? { providerId: 42 } : codeBody;
            args.push(body);
            if (endpoint.id.endsWith('.createTournamentCode')) args.push(42, 2);
        }
        args.push({ query: { page: 2 } });
        await api[endpoint.name](...args);
        const request = requests.at(-1);
        assert.equal(request.method.toUpperCase(), endpoint.method, endpoint.id);
        assert.equal(request.url, endpoint.path.replace(/\{([^}]+)\}/g, (_, k) => encodeURIComponent(String(args[keys.indexOf(k)]))), endpoint.id);
        assert.equal(request.baseURL, endpoint.route === 'tournament' ? 'https://americas.api.riotgames.com' : endpoint.route === 'platform' ? 'https://euw1.api.riotgames.com' : 'https://europe.api.riotgames.com');
        assert.equal(request.headers.toJSON().Authorization, endpoint.rso ? 'Bearer OAUTH_SECRET' : undefined);
        assert.equal(request.headers.toJSON()['X-Riot-Token'], endpoint.rso ? undefined : 'SECRET');
        if (body) assert.deepEqual(JSON.parse(request.data), body);
        assert.equal(request.maxRedirects, 0);
        assert.equal(request.timeout, 10000);
    }
});

test('platform/regional/account/tournament routes remain separate, including SEA account routing', async () => {
    const api = client({ region: 'SG2' });
    await api.getAccountByRiotId('Name#Tag');
    await api.getAccountByPuuid('puuid');
    await api.getMatchById('SG2_123');
    await api.getSummonerByPuuid('puuid');
    await api.getMatch('NA1_123', { region: 'AMERICAS' });
    await api.registerTournamentStub({ providerId: 1 });
    assert.deepEqual(requests.map(r => r.baseURL), ['https://asia.api.riotgames.com','https://asia.api.riotgames.com','https://sea.api.riotgames.com','https://sg2.api.riotgames.com','https://americas.api.riotgames.com','https://americas.api.riotgames.com']);
    await assert.rejects(api.getPlatformStatus({ region: 'AMERICAS' }), /platform/);
    await assert.rejects(api.getMatch('id', { region: 'evil.example' }), /routing/);
});

test('legacy methods preserve rank metrics, paging filters, caps and encode match identifiers', async () => {
    handler = config => config.url.includes('/entries/') ? response(config, [{ queueType: 'RANKED_SOLO_5x5', wins: 3, losses: 1 }]) : config.url.endsWith('/ids') ? response(config, ['id1','id2'].slice(0, config.params.count)) : response(config, {});
    const api = client();
    assert.equal((await api.getRankByPuuid('p')).solo.winRate, 75);
    const matches = await api.getMatchesWithDetailsByPuuid('p', { queue: 420, start: 10 }, undefined, { maxMatches: 2, pageDelayMs: 0, detailDelayMs: 0 });
    assert.equal(matches.matches.length, 2);
    assert.equal(requests[1].params.start, 10);
    assert.equal(requests[1].params.queue, 420);
    await api.getMatchById('a/b?x=1');
    assert.equal(requests.at(-1).url, '/lol/match/v5/matches/a%2Fb%3Fx%3D1');
    await assert.rejects(api.getMatchlistByPuuid('p', { count: 101 }), /count/);
});

test('invalid tournament bodies and credential query parameters fail before network calls', async () => {
    const api = client();
    await assert.rejects(api.createTournamentCodes({ ...codeBody, teamSize: 6 }, 1), /teamSize/);
    await assert.rejects(api.createTournamentCodes(codeBody, 1, 1001), /count/);
    await assert.rejects(api.registerTournament({ providerId: 0 }), /providerId/);
    await assert.rejects(api.registerTournamentProvider({ region: 'EUW', url: 'https://user:pass@example.com' }), /Callback/);
    await assert.rejects(api.registerTournamentProvider({ region: 'BAD', url: 'https://example.com' }), /region/);
    await assert.rejects(api.getMatch('..'), /Path/);
    await assert.rejects(api.callEndpoint('unrecognized'), /Unknown/);
    await assert.rejects(api.getMatch('id', { query: { api_key: 'SECRET' } }), /Credentials/);
    await assert.rejects(api.getMatchlistByPuuid('p', { api_key: 'SECRET' }), /Credentials/);
    assert.equal(requests.length, 0);
});

test('errors and serialized clients contain no credentials or raw upstream payloads', async () => {
    handler = config => fail(config, 403);
    const api = client();
    await assert.rejects(api.getMatch('id'), error => {
        assert.ok(error instanceof RiotAPIError);
        assert.equal(error.status, 403);
        assert.ok(!JSON.stringify(error).includes('SECRET'));
        assert.ok(!error.stack.includes('SECRET'));
        assert.equal(error.config, undefined);
        return true;
    });
    assert.ok(!JSON.stringify(api).includes('SECRET'));
    assert.equal(api.apiKey, undefined);
    assert.equal(api.client, undefined);
    assert.equal(requests.length, 1);
});

test('RSO requires an access token and never sends an API key alongside it', async () => {
    const api = client({ accessToken: undefined });
    await assert.rejects(api.getAccountMe(), /accessToken/);
    await assert.rejects(api.getSummonerMe(), /accessToken/);
    await assert.rejects(api.getRsoMatch('id'), /accessToken/);
    assert.equal(requests.length, 0);
});

test('local rate limits reserve slots across simultaneous callers', async () => {
    const times = [];
    handler = config => { times.push(Date.now()); return response(config); };
    const api = client({ rateLimits: [{ limit: 1, intervalMs: 45 }] });
    await Promise.all([api.getPlatformStatus(), api.getChampionRotation(), api.getPlatformStatus()]);
    assert.ok(times[1] - times[0] >= 35);
    assert.ok(times[2] - times[1] >= 35);
});

test('app and method headers pace calls, including aliases of the same endpoint', async () => {
    const times = [];
    handler = config => { times.push(Date.now()); return response(config, {}, { 'X-Method-Rate-Limit': '1:0.05', 'X-Method-Rate-Limit-Count': '1:0.05' }); };
    const api = client();
    await api.getMatchById('id');
    await api.getMatch('another-id');
    assert.ok(times[1] - times[0] >= 40);
    requests = []; times.length = 0;
    handler = config => { times.push(Date.now()); return response(config, {}, { 'X-App-Rate-Limit': '1:0.05', 'X-App-Rate-Limit-Count': '1:0.05' }); };
    const second = client();
    await second.getPlatformStatus(); await second.getChampionRotation();
    assert.ok(times[1] - times[0] >= 40);
});

test('429 Retry-After is honored and retry exhaustion exposes useful metadata', async () => {
    const times = [];
    handler = config => { times.push(Date.now()); if (times.length === 1) fail(config, 429, { 'retry-after': '0.05', 'x-rate-limit-type': 'application' }); return response(config); };
    await client().getMatch('id');
    assert.equal(times.length, 2);
    assert.ok(times[1] - times[0] >= 40);
    handler = config => fail(config, 429, { 'retry-after': '10', 'x-rate-limit-type': 'method' });
    await assert.rejects(client({ maxRetries: 0 }).getMatch('id'), error => error.status === 429 && error.retryAfterMs === 10000 && error.rateLimitType === 'method');
    await assert.rejects(client({ maxRateLimitWaitMs: 10 }).getMatch('id'), error => error.code === 'RATE_LIMIT_WAIT');
});

test('tournament mutations are never automatically retried; their 429 cooldown also applies to subsequent calls', async () => {
    const times = [];
    handler = config => { times.push(Date.now()); if (times.length === 1) fail(config, 429, { 'retry-after': '0.05' }); return response(config, 1); };
    const api = client();
    await assert.rejects(api.registerTournament({ providerId: 1 }), error => error.status === 429);
    assert.equal(requests.length, 1);
    await api.registerTournament({ providerId: 1 });
    assert.ok(times[1] - times[0] >= 40);
    handler = config => fail(config, 503);
    const before = requests.length;
    await assert.rejects(api.createTournamentCodes(codeBody, 1), error => error.status === 503);
    assert.equal(requests.length - before, 1);
});

test('safe GET retries are bounded and auth/timeout failures are not retried', async () => {
    handler = config => fail(config, 503);
    await assert.rejects(client({ maxRetries: 1 }).getPlatformStatus(), error => error.status === 503);
    assert.equal(requests.length, 2);
    requests = [];
    handler = config => { throw new axios.AxiosError('SECRET', 'ECONNABORTED', config); };
    await assert.rejects(client({ timeoutMs: 25 }).getPlatformStatus(), error => error.code === 'ECONNABORTED');
    assert.equal(requests.length, 1);
    assert.equal(requests[0].timeout, 25);
});

test('cancellation while queued does not let later calls bypass an active request', async () => {
    let finish;
    handler = config => new Promise(resolve => { finish = () => resolve(response(config)); });
    const api = client();
    const first = api.getPlatformStatus();
    await new Promise(resolve => setImmediate(resolve));
    const controller = new AbortController();
    const queued = api.getChampionRotation({ signal: controller.signal });
    controller.abort();
    await assert.rejects(queued, error => error.code === 'ERR_CANCELED');
    handler = config => response(config);
    const third = api.getPlatformStatus();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(requests.length, 1);
    finish(); await first; await third;
    assert.equal(requests.length, 2);
});

test('cancellation interrupts a rate-limit wait', async () => {
    const api = client({ rateLimits: [{ limit: 1, intervalMs: 10000 }] });
    await api.getPlatformStatus();
    const controller = new AbortController();
    const pending = api.getPlatformStatus({ signal: controller.signal });
    setTimeout(() => controller.abort(), 15);
    await assert.rejects(pending, error => error.code === 'ERR_CANCELED');
    assert.equal(requests.length, 1);
});

test('constructor and Data Dragon input validation rejects invalid configuration', () => {
    for (const options of [{ timeoutMs: 0 }, { maxRetries: -1 }, { maxRetries: 0.5 }, { rateLimits: [{ limit: 0, intervalMs: 1 }] }]) assert.throws(() => client(options));
    assert.throws(() => new DataDragon('../bad'));
    assert.throws(() => new DataDragon(null, '../../bad'));
});

test('token-only clients authenticate RSO and reject API-key operations', async () => {
    const api = new RiotAPI({ apiKey: '', accessToken: 'OAUTH_SECRET', rateLimits: [] });
    await api.getAccountMe();
    assert.equal(requests[0].headers.get('Authorization'), 'Bearer OAUTH_SECRET');
    assert.equal(requests[0].headers.toJSON()['X-Riot-Token'], undefined);
    await assert.rejects(api.getPlatformStatus(), /apiKey is required/);
    assert.equal(requests.length, 1);
});

test('mutable Data Dragon inputs and malformed version responses cannot change request routing', async () => {
    const dd = new DataDragon('16.1.1');
    dd.locale = '../../evil';
    await assert.rejects(dd.getChampions(), /locale/);
    assert.equal(requests.length, 0);
    handler = config => response(config, ['../evil']);
    await assert.rejects(new DataDragon().getItems(), /resolve latest/);
    assert.equal(requests.length, 1);
    assert.equal(requests[0].maxRedirects, 0);
});

test('transport rejects non-Riot targets before attaching credentials', async () => {
    const { RiotTransport } = require('../dist/transport');
    const transport = new RiotTransport('SECRET', { rateLimits: [] });
    for (const url of ['http://euw1.api.riotgames.com/x', 'https://euw1.api.riotgames.com.evil.example/x', 'https://evil.example/x', 'https://user:pass@euw1.api.riotgames.com/x', 'https://euw1.api.riotgames.com:444/x']) {
        await assert.rejects(transport.request({ method: 'GET', url }), /Invalid Riot API host/);
    }
    assert.equal(requests.length, 0);
});

test('method cooldown does not throttle other methods or other routing hosts', async () => {
    handler = config => fail(config, 429, { 'retry-after': '10', 'x-rate-limit-type': 'method' });
    const api = client({ maxRetries: 0, maxRateLimitWaitMs: 10 });
    await assert.rejects(api.getMatchById('id'), error => error.status === 429);
    handler = config => response(config);
    await api.getMatchTimeline('id');
    await api.getMatch('id', { region: 'AMERICAS' });
    await assert.rejects(api.getMatch('another-id'), error => error.code === 'RATE_LIMIT_WAIT');
    assert.equal(requests.length, 3);
});

test('inherited Axios authentication headers cannot mix credentials', async () => {
    const common = axios.defaults.headers.common;
    const previousAuthorization = common.Authorization;
    const previousKey = common['X-Riot-Token'];
    try {
        common.Authorization = 'Bearer inherited-secret';
        common['X-Riot-Token'] = 'inherited-key';
        const api = client();
        await api.getAccountMe();
        await api.getPlatformStatus();
        assert.equal(requests[0].headers.toJSON()['X-Riot-Token'], undefined);
        assert.equal(requests[0].headers.toJSON().Authorization, 'Bearer OAUTH_SECRET');
        assert.equal(requests[1].headers.toJSON().Authorization, undefined);
        assert.equal(requests[1].headers.toJSON()['X-Riot-Token'], 'SECRET');
    } finally {
        if (previousAuthorization === undefined) delete common.Authorization;
        else common.Authorization = previousAuthorization;
        if (previousKey === undefined) delete common['X-Riot-Token'];
        else common['X-Riot-Token'] = previousKey;
    }
});
