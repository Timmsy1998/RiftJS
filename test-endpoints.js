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
        console.log('[PASS] getSummonerByPuuid:', summoner.name || '(no name)');

        const matchIds = await riot.getMatchlistByPuuid(account.puuid, { start: 0, count: 3 });
        console.log('[PASS] getMatchlistByPuuid:', matchIds.length, 'match ids');

        if (matchIds.length > 0) {
            const match = await riot.getMatchById(matchIds[0]);
            console.log('[PASS] getMatchById:', match.metadata.matchId);
        } else {
            console.log('[SKIP] getMatchById: no matches returned');
        }
    } else if (process.env.RIOT_API_KEY) {
        console.log('[SKIP] Riot endpoints: set TEST_RIOT_ID (and TEST_TAG_LINE if needed)');
    } else {
        console.log('[SKIP] Riot endpoints: set RIOT_API_KEY and TEST_RIOT_ID');
    }

    const champions = await dd.getChampions();
    console.log('[PASS] getChampions:', Object.keys(champions.data || {}).length, 'champions');

    const items = await dd.getItems();
    console.log('[PASS] getItems:', Object.keys(items.data || {}).length, 'items');
}

run().catch((error) => {
    console.error('[FAIL]', error.message);
    process.exitCode = 1;
});
