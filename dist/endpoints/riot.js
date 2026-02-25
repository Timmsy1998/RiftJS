"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = riotEndpoints;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const SOLO_QUEUE = 'RANKED_SOLO_5x5';
const FLEX_QUEUE = 'RANKED_FLEX_SR';
const withRankMetrics = (entry) => {
    if (!entry)
        return null;
    const wins = Number(entry.wins) || 0;
    const losses = Number(entry.losses) || 0;
    const gamesPlayed = wins + losses;
    const winRate = gamesPlayed > 0 ? Number(((wins / gamesPlayed) * 100).toFixed(2)) : 0;
    return { ...entry, winRate };
};
const coerceRegion = (region, regionMap) => {
    const upper = region.toUpperCase();
    if (!regionMap[upper])
        throw new Error(`Invalid region: ${region}`);
    return upper;
};
function riotEndpoints({ client, defaultRegion, regionMap, handleError, }) {
    const getAccountByRiotId = async (riotId, tagLine = null, region = defaultRegion) => {
        const resolvedRegion = coerceRegion(region, regionMap);
        let gameName;
        let tag;
        if (riotId.includes('#')) {
            [gameName, tag] = riotId.split('#');
        }
        else {
            gameName = riotId;
            tag = tagLine || '';
        }
        if (!tag)
            throw new Error('TagLine is required for getAccountByRiotId');
        const shard = regionMap[resolvedRegion].shard;
        try {
            const response = await client.get(`/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tag)}`, { baseURL: `https://${shard}` });
            return response.data;
        }
        catch (error) {
            throw handleError(error);
        }
    };
    const getSummonerByPuuid = async (puuid, region = defaultRegion) => {
        const resolvedRegion = coerceRegion(region, regionMap);
        const platform = regionMap[resolvedRegion].platform;
        try {
            const response = await client.get(`/lol/summoner/v4/summoners/by-puuid/${encodeURIComponent(puuid)}`, { baseURL: `https://${platform}` });
            return response.data;
        }
        catch (error) {
            throw handleError(error);
        }
    };
    const getRankEntriesByPuuid = async (puuid, region = defaultRegion) => {
        const resolvedRegion = coerceRegion(region, regionMap);
        const platform = regionMap[resolvedRegion].platform;
        try {
            const response = await client.get(`/lol/league/v4/entries/by-puuid/${encodeURIComponent(puuid)}`, {
                baseURL: `https://${platform}`,
            });
            return response.data;
        }
        catch (error) {
            throw handleError(error);
        }
    };
    const getRankByPuuid = async (puuid, region = defaultRegion) => {
        const entries = await getRankEntriesByPuuid(puuid, region);
        const solo = withRankMetrics(entries.find((entry) => entry.queueType === SOLO_QUEUE) || null);
        const flex = withRankMetrics(entries.find((entry) => entry.queueType === FLEX_QUEUE) || null);
        return { solo, flex, entries };
    };
    const getMatchlistByPuuid = async (puuid, options = {}, region = defaultRegion) => {
        const resolvedRegion = coerceRegion(region, regionMap);
        const shard = regionMap[resolvedRegion].shard;
        try {
            const response = await client.get(`/lol/match/v5/matches/by-puuid/${encodeURIComponent(puuid)}/ids`, {
                baseURL: `https://${shard}`,
                params: options,
            });
            return response.data;
        }
        catch (error) {
            throw handleError(error);
        }
    };
    const getMatchById = async (matchId, region = defaultRegion) => {
        const resolvedRegion = coerceRegion(region, regionMap);
        const shard = regionMap[resolvedRegion].shard;
        try {
            const response = await client.get(`/lol/match/v5/matches/${matchId}`, {
                baseURL: `https://${shard}`,
            });
            return response.data;
        }
        catch (error) {
            throw handleError(error);
        }
    };
    const getMatchTimelineById = async (matchId, region = defaultRegion) => {
        const resolvedRegion = coerceRegion(region, regionMap);
        const shard = regionMap[resolvedRegion].shard;
        try {
            const response = await client.get(`/lol/match/v5/matches/${matchId}/timeline`, {
                baseURL: `https://${shard}`,
            });
            return response.data;
        }
        catch (error) {
            throw handleError(error);
        }
    };
    const getMatchlistByPuuidAll = async (puuid, options = {}, region = defaultRegion, pacing = {}) => {
        const baseStart = Number.isInteger(options.start) ? options.start : 0;
        const pageDelayMs = Number.isInteger(pacing.delayMs) ? pacing.delayMs : 1250;
        const maxMatches = Number.isInteger(pacing.maxMatches) && Number(pacing.maxMatches) >= 0 ? Number(pacing.maxMatches) : null;
        const filters = {
            startTime: options.startTime,
            endTime: options.endTime,
            queue: options.queue,
            type: options.type,
        };
        let start = baseStart;
        const allMatchIds = [];
        while (true) {
            const remaining = maxMatches === null ? 100 : Math.min(100, maxMatches - allMatchIds.length);
            if (remaining <= 0)
                break;
            const page = await getMatchlistByPuuid(puuid, { ...filters, start, count: remaining }, region);
            allMatchIds.push(...page);
            if (page.length < remaining)
                break;
            start += page.length;
            if (pageDelayMs > 0)
                await sleep(pageDelayMs);
        }
        return allMatchIds;
    };
    const getMatchesWithDetailsByPuuid = async (puuid, options = {}, region = defaultRegion, pacing = {}) => {
        const pageDelayMs = Number.isInteger(pacing.pageDelayMs) ? pacing.pageDelayMs : 1250;
        const detailDelayMs = Number.isInteger(pacing.detailDelayMs) ? pacing.detailDelayMs : 1250;
        const maxMatches = Number.isInteger(pacing.maxMatches) && Number(pacing.maxMatches) >= 0 ? Number(pacing.maxMatches) : null;
        const matchIds = await getMatchlistByPuuidAll(puuid, options, region, { delayMs: pageDelayMs, maxMatches });
        const matches = [];
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
