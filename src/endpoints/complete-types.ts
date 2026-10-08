import type { EndpointOptions, TournamentCodeParameters, TournamentCodeUpdate, TournamentProvider, TournamentRegistration } from '../types';

export interface CompleteEndpointMethods {
    getAccountByPuuid(puuid: string, options?: EndpointOptions): Promise<Record<string, unknown>>;
    getEsportsAccountByPuuid(puuid: string, options?: EndpointOptions): Promise<Record<string, unknown>>;
    getAccountByRiotIdParts(gameName: string, tagLine: string, options?: EndpointOptions): Promise<Record<string, unknown>>;
    getEsportsAccountByRiotId(gameName: string, tagLine: string, options?: EndpointOptions): Promise<Record<string, unknown>>;
    getAccountMe(options?: EndpointOptions): Promise<Record<string, unknown>>;
    getEsportsAccountMe(options?: EndpointOptions): Promise<Record<string, unknown>>;
    getAccountActiveShard(game: string, puuid: string, options?: EndpointOptions): Promise<Record<string, unknown>>;
    getAccountActiveRegion(game: string, puuid: string, options?: EndpointOptions): Promise<Record<string, unknown>>;
    getChampionMasteriesByPuuid(encryptedPUUID: string, options?: EndpointOptions): Promise<Record<string, unknown>[]>;
    getChampionMasteryByPuuid(encryptedPUUID: string, championId: number, options?: EndpointOptions): Promise<Record<string, unknown>>;
    getTopChampionMasteriesByPuuid(encryptedPUUID: string, options?: EndpointOptions): Promise<Record<string, unknown>[]>;
    getChampionMasteryScoreByPuuid(encryptedPUUID: string, options?: EndpointOptions): Promise<number>;
    getChampionRotation(options?: EndpointOptions): Promise<Record<string, unknown>>;
    getClashPlayersByPuuid(puuid: string, options?: EndpointOptions): Promise<Record<string, unknown>[]>;
    getClashTeam(teamId: string, options?: EndpointOptions): Promise<Record<string, unknown>>;
    getClashTournaments(options?: EndpointOptions): Promise<Record<string, unknown>[]>;
    getClashTournamentByTeam(teamId: string, options?: EndpointOptions): Promise<Record<string, unknown>>;
    getClashTournament(tournamentId: number, options?: EndpointOptions): Promise<Record<string, unknown>>;
    getLeagueEntriesExpanded(queue: string, tier: string, division: string, options?: EndpointOptions): Promise<Record<string, unknown>[]>;
    getChallengerLeague(queue: string, options?: EndpointOptions): Promise<Record<string, unknown>>;
    getLeagueEntriesByPuuid(encryptedPUUID: string, options?: EndpointOptions): Promise<Record<string, unknown>[]>;
    getLeagueEntries(queue: string, tier: string, division: string, options?: EndpointOptions): Promise<Record<string, unknown>[]>;
    getGrandmasterLeague(queue: string, options?: EndpointOptions): Promise<Record<string, unknown>>;
    getMasterLeague(queue: string, options?: EndpointOptions): Promise<Record<string, unknown>>;
    getChallengeConfigs(options?: EndpointOptions): Promise<Record<string, unknown>[]>;
    getChallengePercentiles(options?: EndpointOptions): Promise<Record<string, unknown>>;
    getChallengeConfig(challengeId: number, options?: EndpointOptions): Promise<Record<string, unknown>>;
    getChallengeLeaderboard(challengeId: number, level: string, options?: EndpointOptions): Promise<Record<string, unknown>[]>;
    getChallengePercentilesById(challengeId: number, options?: EndpointOptions): Promise<Record<string, unknown>>;
    getChallengePlayerData(puuid: string, options?: EndpointOptions): Promise<Record<string, unknown>>;
    getRsoMatchIds(options?: EndpointOptions): Promise<string[]>;
    getRsoMatch(matchId: string, options?: EndpointOptions): Promise<Record<string, unknown>>;
    getRsoMatchTimeline(matchId: string, options?: EndpointOptions): Promise<Record<string, unknown>>;
    getPlatformStatus(options?: EndpointOptions): Promise<Record<string, unknown>>;
    getMatchIdsByPuuid(puuid: string, options?: EndpointOptions): Promise<string[]>;
    getMatchReplaysByPuuid(puuid: string, options?: EndpointOptions): Promise<Record<string, unknown>>;
    getMatch(matchId: string, options?: EndpointOptions): Promise<Record<string, unknown>>;
    getMatchTimeline(matchId: string, options?: EndpointOptions): Promise<Record<string, unknown>>;
    getCurrentGameByPuuid(encryptedPUUID: string, options?: EndpointOptions): Promise<Record<string, unknown>>;
    getSummoner(encryptedPUUID: string, options?: EndpointOptions): Promise<Record<string, unknown>>;
    getSummonerMe(options?: EndpointOptions): Promise<Record<string, unknown>>;
    createTournamentStubCodes(body: TournamentCodeParameters, tournamentId: number, count?: number, options?: EndpointOptions): Promise<string[]>;
    getTournamentStubCode(tournamentCode: string, options?: EndpointOptions): Promise<Record<string, unknown>>;
    getTournamentStubLobbyEvents(tournamentCode: string, options?: EndpointOptions): Promise<Record<string, unknown>>;
    registerTournamentStubProvider(body: TournamentProvider, options?: EndpointOptions): Promise<number>;
    registerTournamentStub(body: TournamentRegistration, options?: EndpointOptions): Promise<number>;
    createTournamentCodes(body: TournamentCodeParameters, tournamentId: number, count?: number, options?: EndpointOptions): Promise<string[]>;
    getTournamentCode(tournamentCode: string, options?: EndpointOptions): Promise<Record<string, unknown>>;
    updateTournamentCode(tournamentCode: string, body: TournamentCodeUpdate, options?: EndpointOptions): Promise<void>;
    getTournamentGames(tournamentCode: string, options?: EndpointOptions): Promise<Record<string, unknown>[]>;
    getTournamentLobbyEvents(tournamentCode: string, options?: EndpointOptions): Promise<Record<string, unknown>>;
    registerTournamentProvider(body: TournamentProvider, options?: EndpointOptions): Promise<number>;
    registerTournament(body: TournamentRegistration, options?: EndpointOptions): Promise<number>;
}

export type RiotEndpointId =
    | 'account-v1.getByPuuid'
    | 'account-v1.getByPuuidEsports'
    | 'account-v1.getByRiotId'
    | 'account-v1.getByRiotIdEsports'
    | 'account-v1.getByAccessToken'
    | 'account-v1.getByAccessTokenEsports'
    | 'account-v1.getActiveShard'
    | 'account-v1.getActiveRegion'
    | 'champion-mastery-v4.getAllChampionMasteriesByPUUID'
    | 'champion-mastery-v4.getChampionMasteryByPUUID'
    | 'champion-mastery-v4.getTopChampionMasteriesByPUUID'
    | 'champion-mastery-v4.getChampionMasteryScoreByPUUID'
    | 'champion-v3.getChampionInfo'
    | 'clash-v1.getPlayersByPUUID'
    | 'clash-v1.getTeamById'
    | 'clash-v1.getTournaments'
    | 'clash-v1.getTournamentByTeam'
    | 'clash-v1.getTournamentById'
    | 'league-exp-v4.getLeagueEntries'
    | 'league-v4.getChallengerLeague'
    | 'league-v4.getLeagueEntriesByPUUID'
    | 'league-v4.getLeagueEntries'
    | 'league-v4.getGrandmasterLeague'
    | 'league-v4.getMasterLeague'
    | 'lol-challenges-v1.getAllChallengeConfigs'
    | 'lol-challenges-v1.getAllChallengePercentiles'
    | 'lol-challenges-v1.getChallengeConfigs'
    | 'lol-challenges-v1.getChallengeLeaderboards'
    | 'lol-challenges-v1.getChallengePercentiles'
    | 'lol-challenges-v1.getPlayerData'
    | 'lol-rso-match-v1.getMatchIds'
    | 'lol-rso-match-v1.getMatch'
    | 'lol-rso-match-v1.getTimeline'
    | 'lol-status-v4.getPlatformData'
    | 'match-v5.getMatchIdsByPUUID'
    | 'match-v5.getReplay'
    | 'match-v5.getMatch'
    | 'match-v5.getTimeline'
    | 'spectator-v5.getCurrentGameInfoByPuuid'
    | 'summoner-v4.getByPUUID'
    | 'summoner-v4.getByAccessToken'
    | 'tournament-stub-v5.createTournamentCode'
    | 'tournament-stub-v5.getTournamentCode'
    | 'tournament-stub-v5.getLobbyEventsByCode'
    | 'tournament-stub-v5.registerProviderData'
    | 'tournament-stub-v5.registerTournament'
    | 'tournament-v5.createTournamentCode'
    | 'tournament-v5.getTournamentCode'
    | 'tournament-v5.updateCode'
    | 'tournament-v5.getGames'
    | 'tournament-v5.getLobbyEventsByCode'
    | 'tournament-v5.registerProviderData'
    | 'tournament-v5.registerTournament';
