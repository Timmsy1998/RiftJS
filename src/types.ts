import type { RiotTransport } from './transport';

export type RegionCode =
    | 'BR1'
    | 'EUN1'
    | 'EUW1'
    | 'JP1'
    | 'KR'
    | 'LA1'
    | 'LA2'
    | 'NA1'
    | 'OC1'
    | 'TR1'
    | 'RU'
    | 'PH2'
    | 'SG2'
    | 'TH2'
    | 'TW2'
    | 'VN2';

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
    getRankByPuuid(
        puuid: string,
        region?: RegionCode
    ): Promise<{ solo: RankEntryWithMetrics | null; flex: RankEntryWithMetrics | null; entries: RankEntry[] }>;
    getMatchlistByPuuid(puuid: string, options?: MatchlistOptions, region?: RegionCode): Promise<string[]>;
    getMatchById(matchId: string, region?: RegionCode): Promise<Record<string, unknown>>;
    getMatchTimelineById(matchId: string, region?: RegionCode): Promise<Record<string, unknown>>;
    getMatchlistByPuuidAll(
        puuid: string,
        options?: MatchlistOptions,
        region?: RegionCode,
        pacing?: MatchlistAllPacing
    ): Promise<string[]>;
    getMatchesWithDetailsByPuuid(
        puuid: string,
        options?: MatchlistOptions,
        region?: RegionCode,
        pacing?: MatchDetailsPacing
    ): Promise<{ matchIds: string[]; matches: Record<string, unknown>[] }>;
}

export interface RiotEndpointsFactoryArgs {
    client: Pick<RiotTransport, 'get'>;
    defaultRegion: RegionCode;
    regionMap: RegionMap;
    handleError: (error: unknown) => Error;
}

export interface DataDragonEndpointMethods {
    getChampions(): Promise<Record<string, unknown>>;
    getItems(): Promise<Record<string, unknown>>;
}

export type RegionalRoute = 'AMERICAS' | 'EUROPE' | 'ASIA' | 'SEA';
export type RoutingRegion = RegionCode | RegionalRoute;
export interface RateLimitWindow { limit: number; intervalMs: number }
export interface RiotAPIOptions {
    apiKey?: string;
    region?: RegionCode;
    /** OAuth bearer token obtained through your approved Riot Sign On integration. */
    accessToken?: string;
    timeoutMs?: number;
    maxRetries?: number;
    maxRateLimitWaitMs?: number;
    /** Local caps supplement limits learned from Riot response headers. */
    rateLimits?: RateLimitWindow[];
}
export interface EndpointOptions {
    region?: RoutingRegion;
    query?: Record<string, string | number | boolean | undefined>;
    signal?: AbortSignal;
}
export type TournamentRegion = 'BR' | 'EUNE' | 'EUW' | 'JP' | 'LAN' | 'LAS' | 'NA' | 'OCE' | 'PBE' | 'RU' | 'TR' | 'KR' | 'PH' | 'SG' | 'TH' | 'TW' | 'VN';
export interface TournamentProvider { region: TournamentRegion; url: string }
export interface TournamentRegistration { providerId: number; name?: string }
export interface TournamentCodeUpdate {
    allowedParticipants?: string[];
    mapType?: 'SUMMONERS_RIFT' | 'HOWLING_ABYSS';
    pickType?: 'BLIND_PICK' | 'DRAFT_MODE' | 'ALL_RANDOM' | 'TOURNAMENT_DRAFT';
    spectatorType?: 'NONE' | 'LOBBYONLY' | 'ALL';
}
export interface TournamentCodeParameters extends Omit<TournamentCodeUpdate, 'mapType'> {
    mapType: 'SUMMONERS_RIFT' | 'HOWLING_ABYSS' | 'LEAGUE_CLASSIC';
    pickType: NonNullable<TournamentCodeUpdate['pickType']>;
    spectatorType: NonNullable<TournamentCodeUpdate['spectatorType']>;
    teamSize: 1 | 2 | 3 | 4 | 5;
    metadata?: string;
    enoughPlayers?: boolean;
}
