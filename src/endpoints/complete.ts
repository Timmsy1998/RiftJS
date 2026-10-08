import catalog from './catalog.json';
import type { CompleteEndpointMethods } from './complete-types';
import type { EndpointOptions, RegionCode, RegionMap } from '../types';
import { RiotTransport } from '../transport';

export const RIOT_ENDPOINTS = Object.freeze(catalog.map(endpoint => Object.freeze({ ...endpoint })));
import type { RiotEndpointId } from './complete-types';
export type { RiotEndpointId } from './complete-types';
const segment = (value: unknown): string => {
    if ((typeof value !== 'string' && typeof value !== 'number') || String(value).trim() === '' || value === '.' || value === '..' || (typeof value === 'number' && (!Number.isSafeInteger(value) || value < 0))) {
        throw new Error('Path parameters must be nonempty strings or nonnegative integers');
    }
    return encodeURIComponent(String(value));
};
const integer = (value: unknown, name: string, min: number, max = Number.MAX_SAFE_INTEGER): void => {
    if (!Number.isSafeInteger(value) || Number(value) < min || Number(value) > max) throw new Error(`${name} must be an integer from ${min} to ${max}`);
};
const validateBody = (operation: string, body: unknown, query: EndpointOptions['query']): void => {
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Tournament body is required');
    const data = body as Record<string, unknown>;
    if (operation === 'registerProviderData') {
        if (!['BR','EUNE','EUW','JP','LAN','LAS','NA','OCE','PBE','RU','TR','KR','PH','SG','TH','TW','VN'].includes(String(data.region))) throw new Error('Invalid tournament region');
        const url = new URL(String(data.url));
        if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.port) throw new Error('Callback URL must use HTTP(S) and its default port');
    }
    if (operation === 'registerTournament') integer(data.providerId, 'providerId', 1);
    if (operation === 'createTournamentCode') {
        integer(query?.tournamentId, 'tournamentId', 1);
        if (query?.count !== undefined) integer(query.count, 'count', 1, 1000);
        integer(data.teamSize, 'teamSize', 1, 5);
    }
    if (operation === 'createTournamentCode' || operation === 'updateCode') {
        const required = operation === 'createTournamentCode';
        for (const [field, choices] of Object.entries({
            mapType: required ? ['SUMMONERS_RIFT','HOWLING_ABYSS','LEAGUE_CLASSIC'] : ['SUMMONERS_RIFT','HOWLING_ABYSS'],
            pickType: ['BLIND_PICK','DRAFT_MODE','ALL_RANDOM','TOURNAMENT_DRAFT'], spectatorType: ['NONE','LOBBYONLY','ALL'],
        })) if ((required || data[field] !== undefined) && !choices.includes(String(data[field]))) throw new Error(`Invalid ${field}`);
        if (data.allowedParticipants !== undefined && (!Array.isArray(data.allowedParticipants) || !data.allowedParticipants.every(p => typeof p === 'string' && p.length > 0))) throw new Error('allowedParticipants must be an array of PUUIDs');
        if (data.enoughPlayers !== undefined && typeof data.enoughPlayers !== 'boolean') throw new Error('enoughPlayers must be boolean');
    }
};

export function completeEndpoints(client: RiotTransport, defaultRegion: RegionCode, regionMap: RegionMap): CompleteEndpointMethods & {
    callEndpoint<T = Record<string, unknown>>(id: RiotEndpointId, params?: Record<string, string | number>, options?: EndpointOptions & { body?: unknown }): Promise<T>;
} {
    const callEndpoint = async <T>(id: RiotEndpointId, params: Record<string, string | number> = {}, options: EndpointOptions & { body?: unknown } = {}): Promise<T> => {
        const endpoint = RIOT_ENDPOINTS.find(e => e.id === id);
        if (!endpoint) throw new Error('Unknown Riot endpoint');
        const operation = id.split('.')[1];
        const path = endpoint.path.replace(/\{([^}]+)\}/g, (_, key: string) => segment(params[key]));
        const region = String(options.region ?? defaultRegion).toUpperCase();
        const platform = regionMap[region as RegionCode];
        let host: string;
        if (endpoint.route === 'tournament') host = 'americas.api.riotgames.com';
        else if (endpoint.route === 'platform') {
            if (!platform) throw new Error('A platform region is required');
            host = platform.platform;
        } else {
            if (!platform && !['AMERICAS','EUROPE','ASIA','SEA'].includes(region)) throw new Error('Invalid routing region');
            host = platform?.shard ?? `${region.toLowerCase()}.api.riotgames.com`;
            if (endpoint.route === 'account') host = host.replace('sea.', 'asia.');
        }
        const query = options.query;
        if (query && Object.keys(query).some(k => /api.?key|token|authorization/i.test(k))) throw new Error('Credentials are not allowed in query parameters');
        if (operation === 'getMatchIdsByPUUID' || operation === 'getMatchIds') {
            if (query?.count !== undefined) integer(query.count, 'count', 0, 100);
            if (query?.start !== undefined) integer(query.start, 'start', 0);
        }
        if (endpoint.method !== 'GET') validateBody(operation, options.body, query);
        const response = await client.request<T>({ method: endpoint.method, url: path, baseURL: `https://${host}`, params: query, data: options.body, signal: options.signal }, endpoint.rso, endpoint.id);
        return response.data;
    };
    const methods: Record<string, unknown> = { callEndpoint };
    for (const endpoint of RIOT_ENDPOINTS) {
        methods[endpoint.name] = (...args: unknown[]) => {
            const keys = [...endpoint.path.matchAll(/\{([^}]+)\}/g)].map(match => match[1]);
            const params = Object.fromEntries(keys.map((key, i) => [key, args[i]])) as Record<string, string | number>;
            let offset = keys.length;
            const body = endpoint.method === 'GET' ? undefined : args[offset++];
            let query: EndpointOptions['query'];
            if (endpoint.id.endsWith('.createTournamentCode')) query = { tournamentId: args[offset++] as number, count: args[offset++] as number | undefined };
            const options = (args[offset] ?? {}) as EndpointOptions;
            return callEndpoint(endpoint.id as RiotEndpointId, params, { ...options, body, query: { ...options.query, ...query } });
        };
    }
    return methods as unknown as ReturnType<typeof completeEndpoints>;
}
