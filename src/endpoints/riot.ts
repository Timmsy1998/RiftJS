import type {
    MatchDetailsPacing,
    MatchlistAllPacing,
    MatchlistOptions,
    RankEntry,
    RankEntryWithMetrics,
    RegionCode,
    RiotEndpointMethods,
    RiotEndpointsFactoryArgs,
} from '../types';

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));
const SOLO_QUEUE = 'RANKED_SOLO_5x5';
const FLEX_QUEUE = 'RANKED_FLEX_SR';

const withRankMetrics = (entry: RankEntry | null): RankEntryWithMetrics | null => {
    if (!entry) return null;
    const wins = Number(entry.wins) || 0;
    const losses = Number(entry.losses) || 0;
    const gamesPlayed = wins + losses;
    const winRate = gamesPlayed > 0 ? Number(((wins / gamesPlayed) * 100).toFixed(2)) : 0;
    return { ...entry, winRate };
};

const coerceRegion = (region: string, regionMap: RiotEndpointsFactoryArgs['regionMap']): RegionCode => {
    const upper = region.toUpperCase() as RegionCode;
    if (!regionMap[upper]) throw new Error(`Invalid region: ${region}`);
    return upper;
};

export default function riotEndpoints({
    client,
    defaultRegion,
    regionMap,
    handleError,
}: RiotEndpointsFactoryArgs): RiotEndpointMethods {
    const getAccountByRiotId: RiotEndpointMethods['getAccountByRiotId'] = async (
        riotId,
        tagLine = null,
        region = defaultRegion
    ) => {
        const resolvedRegion = coerceRegion(region, regionMap);
        let gameName: string;
        let tag: string;
        if (riotId.includes('#')) {
            [gameName, tag] = riotId.split('#');
        } else {
            gameName = riotId;
            tag = tagLine || '';
        }
        if (!tag) throw new Error('TagLine is required for getAccountByRiotId');
        const shard = regionMap[resolvedRegion].shard;

        try {
            const response = await client.get<Record<string, unknown>>(
                `/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tag)}`,
                { baseURL: `https://${shard}` }
            );
            return response.data;
        } catch (error) {
            throw handleError(error);
        }
    };

    const getSummonerByPuuid: RiotEndpointMethods['getSummonerByPuuid'] = async (
        puuid,
        region = defaultRegion
    ) => {
        const resolvedRegion = coerceRegion(region, regionMap);
        const platform = regionMap[resolvedRegion].platform;

        try {
            const response = await client.get<Record<string, unknown>>(
                `/lol/summoner/v4/summoners/by-puuid/${encodeURIComponent(puuid)}`,
                { baseURL: `https://${platform}` }
            );
            return response.data;
        } catch (error) {
            throw handleError(error);
        }
    };

    const getRankEntriesByPuuid: RiotEndpointMethods['getRankEntriesByPuuid'] = async (
        puuid,
        region = defaultRegion
    ) => {
        const resolvedRegion = coerceRegion(region, regionMap);
        const platform = regionMap[resolvedRegion].platform;

        try {
            const response = await client.get<RankEntry[]>(`/lol/league/v4/entries/by-puuid/${encodeURIComponent(puuid)}`, {
                baseURL: `https://${platform}`,
            });
            return response.data;
        } catch (error) {
            throw handleError(error);
        }
    };

    const getRankByPuuid: RiotEndpointMethods['getRankByPuuid'] = async (puuid, region = defaultRegion) => {
        const entries = await getRankEntriesByPuuid(puuid, region);
        const solo = withRankMetrics(entries.find((entry) => entry.queueType === SOLO_QUEUE) || null);
        const flex = withRankMetrics(entries.find((entry) => entry.queueType === FLEX_QUEUE) || null);
        return { solo, flex, entries };
    };

    const getMatchlistByPuuid: RiotEndpointMethods['getMatchlistByPuuid'] = async (
        puuid,
        options: MatchlistOptions = {},
        region = defaultRegion
    ) => {
        const resolvedRegion = coerceRegion(region, regionMap);
        const shard = regionMap[resolvedRegion].shard;

        try {
            const response = await client.get<string[]>(`/lol/match/v5/matches/by-puuid/${encodeURIComponent(puuid)}/ids`, {
                baseURL: `https://${shard}`,
                params: options,
            });
            return response.data;
        } catch (error) {
            throw handleError(error);
        }
    };

    const getMatchById: RiotEndpointMethods['getMatchById'] = async (matchId, region = defaultRegion) => {
        const resolvedRegion = coerceRegion(region, regionMap);
        const shard = regionMap[resolvedRegion].shard;

        try {
            const response = await client.get<Record<string, unknown>>(`/lol/match/v5/matches/${matchId}`, {
                baseURL: `https://${shard}`,
            });
            return response.data;
        } catch (error) {
            throw handleError(error);
        }
    };

    const getMatchTimelineById: RiotEndpointMethods['getMatchTimelineById'] = async (matchId, region = defaultRegion) => {
        const resolvedRegion = coerceRegion(region, regionMap);
        const shard = regionMap[resolvedRegion].shard;

        try {
            const response = await client.get<Record<string, unknown>>(`/lol/match/v5/matches/${matchId}/timeline`, {
                baseURL: `https://${shard}`,
            });
            return response.data;
        } catch (error) {
            throw handleError(error);
        }
    };

    const getMatchlistByPuuidAll: RiotEndpointMethods['getMatchlistByPuuidAll'] = async (
        puuid,
        options: MatchlistOptions = {},
        region = defaultRegion,
        pacing: MatchlistAllPacing = {}
    ) => {
        const baseStart = Number.isInteger(options.start) ? (options.start as number) : 0;
        const pageDelayMs = Number.isInteger(pacing.delayMs) ? (pacing.delayMs as number) : 1250;
        const maxMatches =
            Number.isInteger(pacing.maxMatches) && Number(pacing.maxMatches) >= 0 ? Number(pacing.maxMatches) : null;
        const filters: MatchlistOptions = {
            startTime: options.startTime,
            endTime: options.endTime,
            queue: options.queue,
            type: options.type,
        };

        let start = baseStart;
        const allMatchIds: string[] = [];

        while (true) {
            const remaining = maxMatches === null ? 100 : Math.min(100, maxMatches - allMatchIds.length);
            if (remaining <= 0) break;

            const page = await getMatchlistByPuuid(puuid, { ...filters, start, count: remaining }, region);
            allMatchIds.push(...page);

            if (page.length < remaining) break;
            start += page.length;
            if (pageDelayMs > 0) await sleep(pageDelayMs);
        }

        return allMatchIds;
    };

    const getMatchesWithDetailsByPuuid: RiotEndpointMethods['getMatchesWithDetailsByPuuid'] = async (
        puuid,
        options: MatchlistOptions = {},
        region = defaultRegion,
        pacing: MatchDetailsPacing = {}
    ) => {
        const pageDelayMs = Number.isInteger(pacing.pageDelayMs) ? (pacing.pageDelayMs as number) : 1250;
        const detailDelayMs = Number.isInteger(pacing.detailDelayMs) ? (pacing.detailDelayMs as number) : 1250;
        const maxMatches =
            Number.isInteger(pacing.maxMatches) && Number(pacing.maxMatches) >= 0 ? Number(pacing.maxMatches) : null;
        const matchIds = await getMatchlistByPuuidAll(puuid, options, region, { delayMs: pageDelayMs, maxMatches });
        const matches: Record<string, unknown>[] = [];

        for (let i = 0; i < matchIds.length; i += 1) {
            matches.push(await getMatchById(matchIds[i], region));
            if (detailDelayMs > 0 && i < matchIds.length - 1) {
                await sleep(detailDelayMs);
            }
        }

        return { matchIds, matches };
    };

    return {
        getAccountByRiotId,
        getSummonerByPuuid,
        getRankEntriesByPuuid,
        getRankByPuuid,
        getMatchlistByPuuid,
        getMatchById,
        getMatchTimelineById,
        getMatchlistByPuuidAll,
        getMatchesWithDetailsByPuuid,
    };
}
