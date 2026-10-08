import { RiotAPI } from '@timmsy/riftjs';

let client;
export function getRiot(event) {
  if (!client) {
    const { riotApiKey } = useRuntimeConfig(event);
    if (!riotApiKey) throw new Error('Configure NUXT_RIOT_API_KEY on the server');
    client = new RiotAPI({ apiKey: riotApiKey, region: 'EUW1', loadEnv: false });
  }
  return client;
}
