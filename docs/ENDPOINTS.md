# Complete endpoint reference

53 operations from [Riot’s official reference](https://developer.riotgames.com/apis). The catalog and declarations are maintained together; `npm run check:coverage` checks for upstream path/method changes, additions, and removals.

All methods belong to `RiotAPI`. `options?: EndpointOptions` accepts `region`, `query`, and `signal`. See [README](../README.md) for credentials, rate limits, routing, tournament examples, and permissions. Objects use broad `Record<string, unknown>` response types; refer to Riot for DTO fields and accepted query filters.

Routes: platform = selected game platform; regional = its regional host; account = Americas/Europe/Asia (SEA maps to Asia); tournament = fixed Americas host. `rso` operations require a bearer access token; all others require an API key.

## account-v1

| Method signature | HTTP path | Route / auth | Return |
| --- | --- | --- | --- |
| `getAccountByPuuid(puuid: string, options?: EndpointOptions)` | `GET /riot/account/v1/accounts/by-puuid/{puuid}` | account / API key | `Record<string, unknown>` |
| `getEsportsAccountByPuuid(puuid: string, options?: EndpointOptions)` | `GET /riot/account/v1/accounts/by-puuid/{puuid}` | account / API key | `Record<string, unknown>` |
| `getAccountByRiotIdParts(gameName: string, tagLine: string, options?: EndpointOptions)` | `GET /riot/account/v1/accounts/by-riot-id/{gameName}/{tagLine}` | account / API key | `Record<string, unknown>` |
| `getEsportsAccountByRiotId(gameName: string, tagLine: string, options?: EndpointOptions)` | `GET /riot/account/v1/accounts/by-riot-id/{gameName}/{tagLine}` | account / API key | `Record<string, unknown>` |
| `getAccountMe(options?: EndpointOptions)` | `GET /riot/account/v1/accounts/me` | account / rso | `Record<string, unknown>` |
| `getEsportsAccountMe(options?: EndpointOptions)` | `GET /riot/account/v1/accounts/me` | account / rso | `Record<string, unknown>` |
| `getAccountActiveShard(game: string, puuid: string, options?: EndpointOptions)` | `GET /riot/account/v1/active-shards/by-game/{game}/by-puuid/{puuid}` | account / API key | `Record<string, unknown>` |
| `getAccountActiveRegion(game: string, puuid: string, options?: EndpointOptions)` | `GET /riot/account/v1/region/by-game/{game}/by-puuid/{puuid}` | account / API key | `Record<string, unknown>` |

## champion-mastery-v4

| Method signature | HTTP path | Route / auth | Return |
| --- | --- | --- | --- |
| `getChampionMasteriesByPuuid(encryptedPUUID: string, options?: EndpointOptions)` | `GET /lol/champion-mastery/v4/champion-masteries/by-puuid/{encryptedPUUID}` | platform / API key | `Record<string, unknown>[]` |
| `getChampionMasteryByPuuid(encryptedPUUID: string, championId: number, options?: EndpointOptions)` | `GET /lol/champion-mastery/v4/champion-masteries/by-puuid/{encryptedPUUID}/by-champion/{championId}` | platform / API key | `Record<string, unknown>` |
| `getTopChampionMasteriesByPuuid(encryptedPUUID: string, options?: EndpointOptions)` | `GET /lol/champion-mastery/v4/champion-masteries/by-puuid/{encryptedPUUID}/top` | platform / API key | `Record<string, unknown>[]` |
| `getChampionMasteryScoreByPuuid(encryptedPUUID: string, options?: EndpointOptions)` | `GET /lol/champion-mastery/v4/scores/by-puuid/{encryptedPUUID}` | platform / API key | `number` |

## champion-v3

| Method signature | HTTP path | Route / auth | Return |
| --- | --- | --- | --- |
| `getChampionRotation(options?: EndpointOptions)` | `GET /lol/platform/v3/champion-rotations` | platform / API key | `Record<string, unknown>` |

## clash-v1

| Method signature | HTTP path | Route / auth | Return |
| --- | --- | --- | --- |
| `getClashPlayersByPuuid(puuid: string, options?: EndpointOptions)` | `GET /lol/clash/v1/players/by-puuid/{puuid}` | platform / API key | `Record<string, unknown>[]` |
| `getClashTeam(teamId: string, options?: EndpointOptions)` | `GET /lol/clash/v1/teams/{teamId}` | platform / API key | `Record<string, unknown>` |
| `getClashTournaments(options?: EndpointOptions)` | `GET /lol/clash/v1/tournaments` | platform / API key | `Record<string, unknown>[]` |
| `getClashTournamentByTeam(teamId: string, options?: EndpointOptions)` | `GET /lol/clash/v1/tournaments/by-team/{teamId}` | platform / API key | `Record<string, unknown>` |
| `getClashTournament(tournamentId: number, options?: EndpointOptions)` | `GET /lol/clash/v1/tournaments/{tournamentId}` | platform / API key | `Record<string, unknown>` |

## league-exp-v4

| Method signature | HTTP path | Route / auth | Return |
| --- | --- | --- | --- |
| `getLeagueEntriesExpanded(queue: string, tier: string, division: string, options?: EndpointOptions)` | `GET /lol/league-exp/v4/entries/{queue}/{tier}/{division}` | platform / API key | `Record<string, unknown>[]` |

## league-v4

| Method signature | HTTP path | Route / auth | Return |
| --- | --- | --- | --- |
| `getChallengerLeague(queue: string, options?: EndpointOptions)` | `GET /lol/league/v4/challengerleagues/by-queue/{queue}` | platform / API key | `Record<string, unknown>` |
| `getLeagueEntriesByPuuid(encryptedPUUID: string, options?: EndpointOptions)` | `GET /lol/league/v4/entries/by-puuid/{encryptedPUUID}` | platform / API key | `Record<string, unknown>[]` |
| `getLeagueEntries(queue: string, tier: string, division: string, options?: EndpointOptions)` | `GET /lol/league/v4/entries/{queue}/{tier}/{division}` | platform / API key | `Record<string, unknown>[]` |
| `getGrandmasterLeague(queue: string, options?: EndpointOptions)` | `GET /lol/league/v4/grandmasterleagues/by-queue/{queue}` | platform / API key | `Record<string, unknown>` |
| `getMasterLeague(queue: string, options?: EndpointOptions)` | `GET /lol/league/v4/masterleagues/by-queue/{queue}` | platform / API key | `Record<string, unknown>` |

## lol-challenges-v1

| Method signature | HTTP path | Route / auth | Return |
| --- | --- | --- | --- |
| `getChallengeConfigs(options?: EndpointOptions)` | `GET /lol/challenges/v1/challenges/config` | platform / API key | `Record<string, unknown>[]` |
| `getChallengePercentiles(options?: EndpointOptions)` | `GET /lol/challenges/v1/challenges/percentiles` | platform / API key | `Record<string, unknown>` |
| `getChallengeConfig(challengeId: number, options?: EndpointOptions)` | `GET /lol/challenges/v1/challenges/{challengeId}/config` | platform / API key | `Record<string, unknown>` |
| `getChallengeLeaderboard(challengeId: number, level: string, options?: EndpointOptions)` | `GET /lol/challenges/v1/challenges/{challengeId}/leaderboards/by-level/{level}` | platform / API key | `Record<string, unknown>[]` |
| `getChallengePercentilesById(challengeId: number, options?: EndpointOptions)` | `GET /lol/challenges/v1/challenges/{challengeId}/percentiles` | platform / API key | `Record<string, unknown>` |
| `getChallengePlayerData(puuid: string, options?: EndpointOptions)` | `GET /lol/challenges/v1/player-data/{puuid}` | platform / API key | `Record<string, unknown>` |

## lol-rso-match-v1

| Method signature | HTTP path | Route / auth | Return |
| --- | --- | --- | --- |
| `getRsoMatchIds(options?: EndpointOptions)` | `GET /lol/rso-match/v1/matches/ids` | regional / rso | `string[]` |
| `getRsoMatch(matchId: string, options?: EndpointOptions)` | `GET /lol/rso-match/v1/matches/{matchId}` | regional / rso | `Record<string, unknown>` |
| `getRsoMatchTimeline(matchId: string, options?: EndpointOptions)` | `GET /lol/rso-match/v1/matches/{matchId}/timeline` | regional / rso | `Record<string, unknown>` |

## lol-status-v4

| Method signature | HTTP path | Route / auth | Return |
| --- | --- | --- | --- |
| `getPlatformStatus(options?: EndpointOptions)` | `GET /lol/status/v4/platform-data` | platform / API key | `Record<string, unknown>` |

## match-v5

| Method signature | HTTP path | Route / auth | Return |
| --- | --- | --- | --- |
| `getMatchIdsByPuuid(puuid: string, options?: EndpointOptions)` | `GET /lol/match/v5/matches/by-puuid/{puuid}/ids` | regional / API key | `string[]` |
| `getMatchReplaysByPuuid(puuid: string, options?: EndpointOptions)` | `GET /lol/match/v5/matches/by-puuid/{puuid}/replays` | regional / API key | `Record<string, unknown>` |
| `getMatch(matchId: string, options?: EndpointOptions)` | `GET /lol/match/v5/matches/{matchId}` | regional / API key | `Record<string, unknown>` |
| `getMatchTimeline(matchId: string, options?: EndpointOptions)` | `GET /lol/match/v5/matches/{matchId}/timeline` | regional / API key | `Record<string, unknown>` |

## spectator-v5

| Method signature | HTTP path | Route / auth | Return |
| --- | --- | --- | --- |
| `getCurrentGameByPuuid(encryptedPUUID: string, options?: EndpointOptions)` | `GET /lol/spectator/v5/active-games/by-summoner/{encryptedPUUID}` | platform / API key | `Record<string, unknown>` |

## summoner-v4

| Method signature | HTTP path | Route / auth | Return |
| --- | --- | --- | --- |
| `getSummoner(encryptedPUUID: string, options?: EndpointOptions)` | `GET /lol/summoner/v4/summoners/by-puuid/{encryptedPUUID}` | platform / API key | `Record<string, unknown>` |
| `getSummonerMe(options?: EndpointOptions)` | `GET /lol/summoner/v4/summoners/me` | platform / rso | `Record<string, unknown>` |

## tournament-stub-v5

| Method signature | HTTP path | Route / auth | Return |
| --- | --- | --- | --- |
| `createTournamentStubCodes(body: TournamentCodeParameters, tournamentId: number, count?: number, options?: EndpointOptions)` | `POST /lol/tournament-stub/v5/codes` | tournament / API key | `string[]` |
| `getTournamentStubCode(tournamentCode: string, options?: EndpointOptions)` | `GET /lol/tournament-stub/v5/codes/{tournamentCode}` | tournament / API key | `Record<string, unknown>` |
| `getTournamentStubLobbyEvents(tournamentCode: string, options?: EndpointOptions)` | `GET /lol/tournament-stub/v5/lobby-events/by-code/{tournamentCode}` | tournament / API key | `Record<string, unknown>` |
| `registerTournamentStubProvider(body: TournamentProvider, options?: EndpointOptions)` | `POST /lol/tournament-stub/v5/providers` | tournament / API key | `number` |
| `registerTournamentStub(body: TournamentRegistration, options?: EndpointOptions)` | `POST /lol/tournament-stub/v5/tournaments` | tournament / API key | `number` |

## tournament-v5

| Method signature | HTTP path | Route / auth | Return |
| --- | --- | --- | --- |
| `createTournamentCodes(body: TournamentCodeParameters, tournamentId: number, count?: number, options?: EndpointOptions)` | `POST /lol/tournament/v5/codes` | tournament / API key | `string[]` |
| `getTournamentCode(tournamentCode: string, options?: EndpointOptions)` | `GET /lol/tournament/v5/codes/{tournamentCode}` | tournament / API key | `Record<string, unknown>` |
| `updateTournamentCode(tournamentCode: string, body: TournamentCodeUpdate, options?: EndpointOptions)` | `PUT /lol/tournament/v5/codes/{tournamentCode}` | tournament / API key | `void` |
| `getTournamentGames(tournamentCode: string, options?: EndpointOptions)` | `GET /lol/tournament/v5/games/by-code/{tournamentCode}` | tournament / API key | `Record<string, unknown>[]` |
| `getTournamentLobbyEvents(tournamentCode: string, options?: EndpointOptions)` | `GET /lol/tournament/v5/lobby-events/by-code/{tournamentCode}` | tournament / API key | `Record<string, unknown>` |
| `registerTournamentProvider(body: TournamentProvider, options?: EndpointOptions)` | `POST /lol/tournament/v5/providers` | tournament / API key | `number` |
| `registerTournament(body: TournamentRegistration, options?: EndpointOptions)` | `POST /lol/tournament/v5/tournaments` | tournament / API key | `number` |

## Generic calls

`callEndpoint<T>(id, params?, options?)` takes a typed catalog ID (e.g. `tournament-v5.updateCode`), a record of named path parameters, and endpoint options plus an optional `body`. It cannot call arbitrary URLs. `RIOT_ENDPOINTS` exposes all IDs alongside named wrapper metadata. Generic response types do not perform runtime validation.
