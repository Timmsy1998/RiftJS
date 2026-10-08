import axios from 'axios';
import { config as loadEnv } from 'dotenv';
import dataDragonEndpoints from './endpoints/datadragon';
import riotEndpoints from './endpoints/riot';
import { completeEndpoints } from './endpoints/complete';
import type { CompleteEndpointMethods } from './endpoints/complete-types';
import { RiotAPIError, RiotTransport } from './transport';
import type { RiotAPIOptions } from './types';
export * from './types';
export type { CompleteEndpointMethods } from './endpoints/complete-types';
export { RIOT_ENDPOINTS } from './endpoints/complete';
export type { RiotEndpointId } from './endpoints/complete';
export { RiotAPIError } from './transport';
import type { DataDragonEndpointMethods, RegionCode, RegionMap, RiotEndpointMethods } from './types';

const regionMap: RegionMap = {
    BR1: { platform: 'br1.api.riotgames.com', shard: 'americas.api.riotgames.com' },
    EUN1: { platform: 'eun1.api.riotgames.com', shard: 'europe.api.riotgames.com' },
    EUW1: { platform: 'euw1.api.riotgames.com', shard: 'europe.api.riotgames.com' },
    JP1: { platform: 'jp1.api.riotgames.com', shard: 'asia.api.riotgames.com' },
    KR: { platform: 'kr.api.riotgames.com', shard: 'asia.api.riotgames.com' },
    LA1: { platform: 'la1.api.riotgames.com', shard: 'americas.api.riotgames.com' },
    LA2: { platform: 'la2.api.riotgames.com', shard: 'americas.api.riotgames.com' },
    NA1: { platform: 'na1.api.riotgames.com', shard: 'americas.api.riotgames.com' },
    OC1: { platform: 'oc1.api.riotgames.com', shard: 'sea.api.riotgames.com' },
    TR1: { platform: 'tr1.api.riotgames.com', shard: 'europe.api.riotgames.com' },
    RU: { platform: 'ru.api.riotgames.com', shard: 'europe.api.riotgames.com' },
    PH2: { platform: 'ph2.api.riotgames.com', shard: 'sea.api.riotgames.com' },
    SG2: { platform: 'sg2.api.riotgames.com', shard: 'sea.api.riotgames.com' },
    TH2: { platform: 'th2.api.riotgames.com', shard: 'sea.api.riotgames.com' },
    TW2: { platform: 'tw2.api.riotgames.com', shard: 'sea.api.riotgames.com' },
    VN2: { platform: 'vn2.api.riotgames.com', shard: 'sea.api.riotgames.com' },
};

const parseRegion = (region: string): RegionCode => {
    // Maintainer note (Timmsy): fail fast on bad region input so routing bugs are obvious immediately.
    const upper = region.toUpperCase() as RegionCode;
    if (!regionMap[upper]) throw new Error(`Invalid region: ${region}`);
    return upper;
};

export class RiotAPI implements RiotEndpointMethods {
    public readonly region: RegionCode;
    #client: RiotTransport;
    public callEndpoint!: ReturnType<typeof completeEndpoints>['callEndpoint'];

    public getAccountByRiotId!: RiotEndpointMethods['getAccountByRiotId'];
    public getSummonerByPuuid!: RiotEndpointMethods['getSummonerByPuuid'];
    public getRankEntriesByPuuid!: RiotEndpointMethods['getRankEntriesByPuuid'];
    public getRankByPuuid!: RiotEndpointMethods['getRankByPuuid'];
    public getMatchlistByPuuid!: RiotEndpointMethods['getMatchlistByPuuid'];
    public getMatchById!: RiotEndpointMethods['getMatchById'];
    public getMatchTimelineById!: RiotEndpointMethods['getMatchTimelineById'];
    public getMatchlistByPuuidAll!: RiotEndpointMethods['getMatchlistByPuuidAll'];
    public getMatchesWithDetailsByPuuid!: RiotEndpointMethods['getMatchesWithDetailsByPuuid'];

    constructor(options: RiotAPIOptions = {}) {
        loadEnv({ quiet: true });
        const apiKey = options.apiKey ?? process.env.RIOT_API_KEY ?? '';
        if (!apiKey.trim() && !options.accessToken?.trim()) throw new Error('RIOT_API_KEY, apiKey or accessToken is required');
        this.region = parseRegion(options.region ?? process.env.REGION ?? 'EUW1');
        this.#client = new RiotTransport(apiKey, options);
        Object.assign(this, completeEndpoints(this.#client, this.region, regionMap));

        // Maintainer note (Timmsy): keep endpoint methods attached here so the class API stays flat for consumers.
        Object.assign(
            this,
            riotEndpoints({
                client: this.#client,
                defaultRegion: this.region,
                regionMap,
                handleError: this._handleError,
            })
        );
    }

    private _handleError = (error: unknown): Error => {
        if (error instanceof RiotAPIError) return error;
        return new RiotAPIError('Request failed');
    };
}

export interface RiotAPI extends CompleteEndpointMethods {}

export class DataDragon implements DataDragonEndpointMethods {
    public version: string | null;
    public locale: string;
    private baseURL: string | null;
    private baseURLPromise: Promise<string> | null;

    public getChampions!: DataDragonEndpointMethods['getChampions'];
    public getItems!: DataDragonEndpointMethods['getItems'];

    constructor(version: string | null = null, locale = 'en_US') {
        if (version !== null && !/^\d+\.\d+\.\d+$/.test(version)) throw new Error('Invalid Data Dragon version');
        if (!/^[a-z]{2}_[A-Z]{2}$/.test(locale)) throw new Error('Invalid Data Dragon locale');
        this.version = version;
        this.locale = locale;
        this.baseURL = null;
        this.baseURLPromise = null;

        Object.assign(this, dataDragonEndpoints(() => this.resolveBaseURL()));
    }

    private async resolveBaseURL(): Promise<string> {
        if (this.version !== null && !/^\d+\.\d+\.\d+$/.test(this.version)) throw new Error('Invalid Data Dragon version');
        if (!/^[a-z]{2}_[A-Z]{2}$/.test(this.locale)) throw new Error('Invalid Data Dragon locale');
        if (this.baseURL) return this.baseURL;
        if (this.baseURLPromise) return this.baseURLPromise;

        // Maintainer note (Timmsy): share one in-flight resolver to avoid duplicate version requests under concurrency.
        this.baseURLPromise = (async () => {
            if (!this.version) {
                const response = await axios.get<string[]>('https://ddragon.leagueoflegends.com/api/versions.json', { timeout: 10000, maxRedirects: 0 });
                const latestVersion = Array.isArray(response.data) ? response.data[0] : null;
                if (typeof latestVersion !== 'string' || !/^\d+\.\d+\.\d+$/.test(latestVersion)) {
                    throw new Error('Could not resolve latest Data Dragon version');
                }
                this.version = latestVersion;
            }

            this.baseURL = `https://ddragon.leagueoflegends.com/cdn/${this.version}/data/${this.locale}`;
            return this.baseURL;
        })();

        try {
            return await this.baseURLPromise;
        } finally {
            this.baseURLPromise = null;
        }
    }
}
