const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const SOLO_QUEUE = 'RANKED_SOLO_5x5';
const FLEX_QUEUE = 'RANKED_FLEX_SR';
const withRankMetrics = (entry) => {
    if (!entry) return null;
    const wins = Number(entry.wins) || 0;
    const losses = Number(entry.losses) || 0;
    const gamesPlayed = wins + losses;
    const winRate = gamesPlayed > 0 ? Number(((wins / gamesPlayed) * 100).toFixed(2)) : 0;
    return { ...entry, winRate };
};

module.exports = (client, defaultRegion, regionMap) => ({
    /**
     * Fetch account data by Riot ID.
     * @param {string} riotId - Riot ID (e.g., "Timmsy#BRUV" or "Timmsy", "BRUV").
     * @param {string} [tagLine] - Optional tagLine if not included in riotId.
     * @param {string} [region] - Region code used to resolve shard routing.
     * @returns {Promise<object>} Account payload including `puuid`.
     */
    async getAccountByRiotId(riotId, tagLine = null, region = defaultRegion) {
        let gameName, tag;
        if (riotId.includes('#')) {
            [gameName, tag] = riotId.split('#');
        } else {
            gameName = riotId;
            tag = tagLine || '';
        }
        if (!tag) throw new Error('TagLine is required for getAccountByRiotId');
        const shard = regionMap[region].shard;
        try {
            const response = await client.get(`/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tag)}`, {
                baseURL: `https://${shard}`,
            });
            return response.data;
        } catch (error) {
            throw this._handleError(error);
        }
    },

    /**
     * Fetch Summoner-V4 data for a player's PUUID.
     * @param {string} puuid - Encrypted PUUID.
     * @param {string} [region] - Region code used to resolve platform routing.
     * @returns {Promise<object>} Summoner payload.
     */
    async getSummonerByPuuid(puuid, region = defaultRegion) {
        const platform = regionMap[region].platform;
        try {
            const response = await client.get(`/lol/summoner/v4/summoners/by-puuid/${encodeURIComponent(puuid)}`, {
                baseURL: `https://${platform}`,
            });
            return response.data;
        } catch (error) {
            throw this._handleError(error);
        }
    },

    /**
     * Fetch all ranked entries for a player PUUID.
     * @param {string} puuid - Player PUUID.
     * @param {string} [region] - Region code used to resolve platform routing.
     * @returns {Promise<object[]>} Ranked entries from League-V4.
     */
    async getRankEntriesByPuuid(puuid, region = defaultRegion) {
        const platform = regionMap[region].platform;
        try {
            const response = await client.get(`/lol/league/v4/entries/by-puuid/${encodeURIComponent(puuid)}`, {
                baseURL: `https://${platform}`,
            });
            return response.data;
        } catch (error) {
            throw this._handleError(error);
        }
    },

    /**
     * Fetch ranked info split into Solo and Flex queues.
     * @param {string} puuid - Player PUUID.
     * @param {string} [region] - Region code used to resolve platform routing.
     * @returns {Promise<{solo: object|null, flex: object|null, entries: object[]}>} Queue-split rank payload.
     */
    async getRankByPuuid(puuid, region = defaultRegion) {
        const entries = await this.getRankEntriesByPuuid(puuid, region);
        const solo = withRankMetrics(entries.find((entry) => entry.queueType === SOLO_QUEUE) || null);
        const flex = withRankMetrics(entries.find((entry) => entry.queueType === FLEX_QUEUE) || null);
        return { solo, flex, entries };
    },

    /**
     * Fetch match IDs for a PUUID from Match-V5.
     * @param {string} puuid - Player PUUID.
     * @param {object} [options] - Query params such as `start` and `count`.
     * @param {string} [region] - Region code used to resolve shard routing.
     * @returns {Promise<string[]>} Array of match IDs.
     */
    async getMatchlistByPuuid(puuid, options = {}, region = defaultRegion) {
        const shard = regionMap[region].shard;
        try {
            const response = await client.get(`/lol/match/v5/matches/by-puuid/${encodeURIComponent(puuid)}/ids`, {
                baseURL: `https://${shard}`,
                params: options,
            });
            return response.data;
        } catch (error) {
            throw this._handleError(error);
        }
    },

    /**
     * Fetch full match details by match ID.
     * @param {string} matchId - Match ID (e.g., "EUW1_1234567890").
     * @param {string} [region] - Region code used to resolve shard routing.
     * @returns {Promise<object>} Match payload.
     */
    async getMatchById(matchId, region = defaultRegion) {
        const shard = regionMap[region].shard;
        try {
            const response = await client.get(`/lol/match/v5/matches/${matchId}`, {
                baseURL: `https://${shard}`,
            });
            return response.data;
        } catch (error) {
            throw this._handleError(error);
        }
    },

    /**
     * Fetch match timeline data by match ID.
     * @param {string} matchId - Match ID (e.g., "EUW1_1234567890").
     * @param {string} [region] - Region code used to resolve shard routing.
     * @returns {Promise<object>} Match timeline payload.
     */
    async getMatchTimelineById(matchId, region = defaultRegion) {
        const shard = regionMap[region].shard;
        try {
            const response = await client.get(`/lol/match/v5/matches/${matchId}/timeline`, {
                baseURL: `https://${shard}`,
            });
            return response.data;
        } catch (error) {
            throw this._handleError(error);
        }
    },

    /**
     * Fetch all match IDs for a PUUID using Riot's max page size (100).
     * @param {string} puuid - Player PUUID.
     * @param {object} [options] - Riot filters: startTime, endTime, queue, type, start.
     * @param {string} [region] - Region code used to resolve shard routing.
     * @param {object} [pacing] - Pacing controls.
     * @param {number} [pacing.delayMs=1250] - Delay between page requests.
     * @param {number|null} [pacing.maxMatches=null] - Optional cap on total IDs returned.
     * @returns {Promise<string[]>} All matched IDs.
     */
    async getMatchlistByPuuidAll(puuid, options = {}, region = defaultRegion, pacing = {}) {
        const baseStart = Number.isInteger(options.start) ? options.start : 0;
        const pageDelayMs = Number.isInteger(pacing.delayMs) ? pacing.delayMs : 1250;
        const maxMatches = Number.isInteger(pacing.maxMatches) && pacing.maxMatches >= 0 ? pacing.maxMatches : null;
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
            if (remaining <= 0) break;

            const page = await this.getMatchlistByPuuid(puuid, { ...filters, start, count: remaining }, region);
            allMatchIds.push(...page);

            if (page.length < remaining) break;
            start += page.length;
            if (pageDelayMs > 0) await sleep(pageDelayMs);
        }

        return allMatchIds;
    },

    /**
     * Fetch match IDs and full match payloads for each ID.
     * @param {string} puuid - Player PUUID.
     * @param {object} [options] - Riot filters: startTime, endTime, queue, type, start.
     * @param {string} [region] - Region code used to resolve shard routing.
     * @param {object} [pacing] - Pacing controls.
     * @param {number} [pacing.pageDelayMs=1250] - Delay between matchlist page requests.
     * @param {number} [pacing.detailDelayMs=1250] - Delay between match detail requests.
     * @param {number|null} [pacing.maxMatches=null] - Optional cap on total matches fetched.
     * @returns {Promise<{matchIds: string[], matches: object[]}>} IDs and full match payloads.
     */
    async getMatchesWithDetailsByPuuid(puuid, options = {}, region = defaultRegion, pacing = {}) {
        const pageDelayMs = Number.isInteger(pacing.pageDelayMs) ? pacing.pageDelayMs : 1250;
        const detailDelayMs = Number.isInteger(pacing.detailDelayMs) ? pacing.detailDelayMs : 1250;
        const maxMatches = Number.isInteger(pacing.maxMatches) && pacing.maxMatches >= 0 ? pacing.maxMatches : null;
        const matchIds = await this.getMatchlistByPuuidAll(
            puuid,
            options,
            region,
            { delayMs: pageDelayMs, maxMatches }
        );
        const matches = [];

        for (let i = 0; i < matchIds.length; i += 1) {
            matches.push(await this.getMatchById(matchIds[i], region));
            if (detailDelayMs > 0 && i < matchIds.length - 1) {
                await sleep(detailDelayMs);
            }
        }

        return { matchIds, matches };
    },
});
