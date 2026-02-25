require('dotenv').config();
const { RiotAPI, DataDragon } = require('./index');

async function run() {
    const riotId = process.env.TEST_RIOT_ID;
    const tagLine = process.env.TEST_TAG_LINE;
    const dd = new DataDragon();

    if (process.env.RIOT_API_KEY && riotId) {
        const riot = new RiotAPI();
        const account = await riot.getAccountByRiotId(riotId, tagLine);
        console.log('[PASS] getAccountByRiotId:', account.puuid);

        const summoner = await riot.getSummonerByPuuid(account.puuid);
        console.log('[PASS] getSummonerByPuuid:', {
            puuid: summoner.puuid,
            summonerLevel: summoner.summonerLevel,
        });

        const matchIds = await riot.getMatchlistByPuuid(account.puuid, { start: 0, count: 3 });
        console.log('[PASS] getMatchlistByPuuid:', matchIds.length, 'match ids');

        if (matchIds.length > 0) {
            const match = await riot.getMatchById(matchIds[0]);
            console.log('[PASS] getMatchById:', match.metadata.matchId);

            const timeline = await riot.getMatchTimelineById(matchIds[0]);
            console.log('[PASS] getMatchTimelineById:', timeline.metadata.matchId);

            const allMatchIds = await riot.getMatchlistByPuuidAll(
                account.puuid,
                { start: 0 },
                undefined,
                { maxMatches: 2, delayMs: 0 }
            );
            console.log('[PASS] getMatchlistByPuuidAll:', allMatchIds.length, 'match ids');

            const withDetails = await riot.getMatchesWithDetailsByPuuid(
                account.puuid,
                { start: 0 },
                undefined,
                { maxMatches: 2, pageDelayMs: 0, detailDelayMs: 0 }
            );
            console.log('[PASS] getMatchesWithDetailsByPuuid:', withDetails.matches.length, 'matches');
        } else {
            console.log('[SKIP] Match-by-id/timeline/all/details checks: no matches returned');
        }
    } else if (process.env.RIOT_API_KEY) {
        console.log('[SKIP] Riot endpoints: set TEST_RIOT_ID (and TEST_TAG_LINE if needed)');
    } else {
        console.log('[SKIP] Riot endpoints: set RIOT_API_KEY and TEST_RIOT_ID');
    }

    const champions = await dd.getChampions();
    console.log('[PASS] getChampions:', Object.keys(champions.data || {}).length, 'champions');
    console.log('[INFO] DataDragon version:', dd.version);

    const items = await dd.getItems();
    console.log('[PASS] getItems:', Object.keys(items.data || {}).length, 'items');
}

run().catch((error) => {
    console.error('[FAIL]', error.message);
    process.exitCode = 1;
});
