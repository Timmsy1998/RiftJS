import type { AxiosInstance } from 'axios';
export type RegionCode = 'BR1' | 'EUN1' | 'EUW1' | 'JP1' | 'KR' | 'LA1' | 'LA2' | 'NA1' | 'OC1' | 'TR1' | 'RU' | 'PH2' | 'SG2' | 'TH2' | 'TW2' | 'VN2';
export interface RegionHosts {
    platform: string;
    shard: string;
}
export type RegionMap = Record<RegionCode, RegionHosts>;
export interface MatchlistOptions {
    startTime?: number;
    endTime?: number;
    queue?: number;
    type?: string;
    start?: number;
    count?: number;
}
export interface MatchlistAllPacing {
    delayMs?: number;
    maxMatches?: number | null;
}
export interface MatchDetailsPacing {
    pageDelayMs?: number;
    detailDelayMs?: number;
    maxMatches?: number | null;
}
export interface RankEntry extends Record<string, unknown> {
    queueType?: string;
    wins?: number;
    losses?: number;
}
export interface RankEntryWithMetrics extends RankEntry {
    winRate: number;
}
export interface RiotEndpointMethods {
    getAccountByRiotId(riotId: string, tagLine?: string | null, region?: RegionCode): Promise<Record<string, unknown>>;
    getSummonerByPuuid(puuid: string, region?: RegionCode): Promise<Record<string, unknown>>;
    getRankEntriesByPuuid(puuid: string, region?: RegionCode): Promise<RankEntry[]>;
    getRankByPuuid(puuid: string, region?: RegionCode): Promise<{
        solo: RankEntryWithMetrics | null;
        flex: RankEntryWithMetrics | null;
        entries: RankEntry[];
    }>;
    getMatchlistByPuuid(puuid: string, options?: MatchlistOptions, region?: RegionCode): Promise<string[]>;
    getMatchById(matchId: string, region?: RegionCode): Promise<Record<string, unknown>>;
    getMatchTimelineById(matchId: string, region?: RegionCode): Promise<Record<string, unknown>>;
    getMatchlistByPuuidAll(puuid: string, options?: MatchlistOptions, region?: RegionCode, pacing?: MatchlistAllPacing): Promise<string[]>;
    getMatchesWithDetailsByPuuid(puuid: string, options?: MatchlistOptions, region?: RegionCode, pacing?: MatchDetailsPacing): Promise<{
        matchIds: string[];
        matches: Record<string, unknown>[];
    }>;
}
export interface RiotEndpointsFactoryArgs {
    client: AxiosInstance;
    defaultRegion: RegionCode;
    regionMap: RegionMap;
    handleError: (error: unknown) => Error;
}
export interface DataDragonEndpointMethods {
    getChampions(): Promise<Record<string, unknown>>;
    getItems(): Promise<Record<string, unknown>>;
}
