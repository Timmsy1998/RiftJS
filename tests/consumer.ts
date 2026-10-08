import { RiotAPI, RiotAPIError, DataDragon, RIOT_ENDPOINTS } from '../dist';
import type { TournamentCodeParameters, RiotEndpointId, EndpointOptions } from '../dist';

const riot = new RiotAPI({ apiKey: 'test-key', rateLimits: [{ limit: 10, intervalMs: 1000 }] });
const options: EndpointOptions = { region: 'AMERICAS', query: { count: 5 }, signal: new AbortController().signal };
const matches: Promise<string[]> = riot.getMatchIdsByPuuid('puuid', options);
const score: Promise<number> = riot.getChampionMasteryScoreByPuuid('puuid');
const provider: Promise<number> = riot.registerTournamentStubProvider({ region: 'EUW', url: 'https://example.com/callback' });
const body: TournamentCodeParameters = { teamSize: 5, mapType: 'SUMMONERS_RIFT', pickType: 'TOURNAMENT_DRAFT', spectatorType: 'ALL' };
const codes: Promise<string[]> = riot.createTournamentCodes(body, 1, undefined, options);
const updated: Promise<void> = riot.updateTournamentCode('code', { allowedParticipants: ['puuid'] });
const id: RiotEndpointId = 'match-v5.getMatch';
const typed = riot.callEndpoint<{ metadata: { matchId: string } }>(id, { matchId: 'NA1_123' });
typed.then(match => { const matchId: string = match.metadata.matchId; return matchId; });
new RiotAPI({ accessToken: 'test-token' }).getAccountMe();
riot.getAccountByRiotId('Name#Tag');
riot.getMatchesWithDetailsByPuuid('puuid', { count: 5 }, 'NA1', { maxMatches: 5 });
new DataDragon('16.1.1').getItems();
RIOT_ENDPOINTS.forEach(endpoint => { const name: string = endpoint.name; return name; });
const error = new RiotAPIError('Error');
const status: number | undefined = error.status;
void [matches, score, provider, codes, updated, status];

// @ts-expect-error Unsupported host/region cannot bypass the typed API.
riot.getMatch('id', { region: 'evil.example' });
// @ts-expect-error Invalid tournament team size.
riot.createTournamentCodes({ ...body, teamSize: 6 }, 1);
// @ts-expect-error Only catalog IDs are accepted.
riot.callEndpoint('unrecognized');
// @ts-expect-error Credentials are private.
riot.apiKey;
