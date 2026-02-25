import 'dotenv/config';
import { DataDragon, RiotAPI } from './index';

async function run(): Promise<void> {
    const riotId = process.env.TEST_RIOT_ID;
    const tagLine = process.env.TEST_TAG_LINE;
    const dd = new DataDragon();

    if (process.env.RIOT_API_KEY && riotId) {
        const riot = new RiotAPI();
        const account = await riot.getAccountByRiotId(riotId, tagLine);
        console.log('[PASS] getAccountByRiotId:', account.puuid);

        const puuid = String(account.puuid || '');
        const summoner = await riot.getSummonerByPuuid(puuid);
        console.log('[PASS] getSummonerByPuuid:', {
            puuid: summoner.puuid,
            summonerLevel: summoner.summonerLevel,
        });

        const rank = await riot.getRankByPuuid(puuid);
        console.log('[PASS] getRankByPuuid:', {
            solo: rank.solo
                ? `${rank.solo.tier} ${rank.solo.rank} | ${rank.solo.leaguePoints} LP | ${rank.solo.wins}W-${rank.solo.losses}L | ${rank.solo.winRate}% WR`
                : null,
            flex: rank.flex
                ? `${rank.flex.tier} ${rank.flex.rank} | ${rank.flex.leaguePoints} LP | ${rank.flex.wins}W-${rank.flex.losses}L | ${rank.flex.winRate}% WR`
                : null,
        });

        const matchIds = await riot.getMatchlistByPuuid(puuid, { start: 0, count: 3 });
        console.log('[PASS] getMatchlistByPuuid:', matchIds.length, 'match ids');

        if (matchIds.length > 0) {
            const match = await riot.getMatchById(matchIds[0]);
            console.log('[PASS] getMatchById:', (match.metadata as { matchId?: string } | undefined)?.matchId);

            const timeline = await riot.getMatchTimelineById(matchIds[0]);
            console.log(
                '[PASS] getMatchTimelineById:',
                (timeline.metadata as { matchId?: string } | undefined)?.matchId
            );

            const allMatchIds = await riot.getMatchlistByPuuidAll(
                puuid,
                { start: 0 },
                undefined,
                { maxMatches: 2, delayMs: 0 }
            );
            console.log('[PASS] getMatchlistByPuuidAll:', allMatchIds.length, 'match ids');

            const withDetails = await riot.getMatchesWithDetailsByPuuid(
                puuid,
                { start: 0 },
                undefined,
                { maxMatches: 2, pageDelayMs: 0, detailDelayMs: 0 }
            );
            console.log('[PASS] getMatchesWithDetailsByPuuid:', withDetails.matches.length, 'matches');
        } else {
            // Maintainer note (Timmsy): no-match accounts are valid, so keep this as a skip rather than a failure.
            console.log('[SKIP] Match-by-id/timeline/all/details checks: no matches returned');
        }
    } else if (process.env.RIOT_API_KEY) {
        console.log('[SKIP] Riot endpoints: set TEST_RIOT_ID (and TEST_TAG_LINE if needed)');
    } else {
        console.log('[SKIP] Riot endpoints: set RIOT_API_KEY and TEST_RIOT_ID');
    }

    const champions = await dd.getChampions();
    console.log('[PASS] getChampions:', Object.keys((champions.data as Record<string, unknown>) || {}).length, 'champions');
    console.log('[INFO] DataDragon version:', dd.version);

    const items = await dd.getItems();
    console.log('[PASS] getItems:', Object.keys((items.data as Record<string, unknown>) || {}).length, 'items');
}

run().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[FAIL]', message);
    process.exitCode = 1;
});
