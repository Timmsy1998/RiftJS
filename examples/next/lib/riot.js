import 'server-only';
import { RiotAPI } from '@timmsy/riftjs';

let client;
export function getRiot() {
  if (!client) {
    const apiKey = process.env.RIOT_API_KEY;
    if (!apiKey) throw new Error('Configure RIOT_API_KEY on the server');
    client = new RiotAPI({ apiKey, region: 'EUW1', loadEnv: false });
  }
  return client;
}
