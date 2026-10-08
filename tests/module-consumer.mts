import RiftJS, { RiotAPI, RiotAPIError, RIOT_ENDPOINTS } from '@timmsy/riftjs';
import type { RiotAPIOptions, EndpointOptions, TournamentCodeParameters } from '@timmsy/riftjs';
const config: RiotAPIOptions = { apiKey: 'test', loadEnv: false, region: 'EUW1' };
const riot = new RiotAPI(config);
const options: EndpointOptions = { region: 'EUROPE', signal: AbortSignal.timeout(1000) };
const ids: Promise<string[]> = riot.getMatchIdsByPuuid('puuid', options);
const body: TournamentCodeParameters = { teamSize: 5, mapType: 'SUMMONERS_RIFT', pickType: 'TOURNAMENT_DRAFT', spectatorType: 'ALL' };
const codes: Promise<string[]> = riot.createTournamentCodes(body, 1);
const defaultClient: RiotAPI = new RiftJS.RiotAPI(config);
void [defaultClient, ids, codes, new RiotAPIError('error'), RIOT_ENDPOINTS];
// @ts-expect-error Unsupported routing region remains rejected through the ESM entrypoint.
riot.getPlatformStatus({ region: 'invalid' });
