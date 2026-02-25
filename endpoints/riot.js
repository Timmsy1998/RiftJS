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
});
