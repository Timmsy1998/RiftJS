import { RiotAPI } from '@timmsy/riftjs';
import type { RiotAPIOptions } from '@timmsy/riftjs';
const options: RiotAPIOptions = { apiKey: 'test', loadEnv: false };
const status: Promise<Record<string, unknown>> = new RiotAPI(options).getPlatformStatus();
void status;
