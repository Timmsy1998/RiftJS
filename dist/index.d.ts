import 'dotenv/config';
import type { DataDragonEndpointMethods, RegionCode, RiotEndpointMethods } from './types';
export declare class RiotAPI implements RiotEndpointMethods {
    readonly apiKey: string;
    readonly region: RegionCode;
    private readonly client;
    getAccountByRiotId: RiotEndpointMethods['getAccountByRiotId'];
    getSummonerByPuuid: RiotEndpointMethods['getSummonerByPuuid'];
    getRankEntriesByPuuid: RiotEndpointMethods['getRankEntriesByPuuid'];
    getRankByPuuid: RiotEndpointMethods['getRankByPuuid'];
    getMatchlistByPuuid: RiotEndpointMethods['getMatchlistByPuuid'];
    getMatchById: RiotEndpointMethods['getMatchById'];
    getMatchTimelineById: RiotEndpointMethods['getMatchTimelineById'];
    getMatchlistByPuuidAll: RiotEndpointMethods['getMatchlistByPuuidAll'];
    getMatchesWithDetailsByPuuid: RiotEndpointMethods['getMatchesWithDetailsByPuuid'];
    constructor();
    private _handleError;
}
export declare class DataDragon implements DataDragonEndpointMethods {
    version: string | null;
    locale: string;
    private baseURL;
    private baseURLPromise;
    getChampions: DataDragonEndpointMethods['getChampions'];
    getItems: DataDragonEndpointMethods['getItems'];
    constructor(version?: string | null, locale?: string);
    private resolveBaseURL;
}
