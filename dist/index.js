"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataDragon = exports.RiotAPI = void 0;
require("dotenv/config");
const axios_1 = __importDefault(require("axios"));
const datadragon_1 = __importDefault(require("./endpoints/datadragon"));
const riot_1 = __importDefault(require("./endpoints/riot"));
const regionMap = {
    BR1: { platform: 'br1.api.riotgames.com', shard: 'americas.api.riotgames.com' },
    EUN1: { platform: 'eun1.api.riotgames.com', shard: 'europe.api.riotgames.com' },
    EUW1: { platform: 'euw1.api.riotgames.com', shard: 'europe.api.riotgames.com' },
    JP1: { platform: 'jp1.api.riotgames.com', shard: 'asia.api.riotgames.com' },
    KR: { platform: 'kr.api.riotgames.com', shard: 'asia.api.riotgames.com' },
    LA1: { platform: 'la1.api.riotgames.com', shard: 'americas.api.riotgames.com' },
    LA2: { platform: 'la2.api.riotgames.com', shard: 'americas.api.riotgames.com' },
    NA1: { platform: 'na1.api.riotgames.com', shard: 'americas.api.riotgames.com' },
    OC1: { platform: 'oc1.api.riotgames.com', shard: 'sea.api.riotgames.com' },
    TR1: { platform: 'tr1.api.riotgames.com', shard: 'europe.api.riotgames.com' },
    RU: { platform: 'ru.api.riotgames.com', shard: 'europe.api.riotgames.com' },
    PH2: { platform: 'ph2.api.riotgames.com', shard: 'sea.api.riotgames.com' },
    SG2: { platform: 'sg2.api.riotgames.com', shard: 'sea.api.riotgames.com' },
    TH2: { platform: 'th2.api.riotgames.com', shard: 'sea.api.riotgames.com' },
    TW2: { platform: 'tw2.api.riotgames.com', shard: 'sea.api.riotgames.com' },
    VN2: { platform: 'vn2.api.riotgames.com', shard: 'sea.api.riotgames.com' },
};
const parseRegion = (region) => {
    const upper = region.toUpperCase();
    if (!regionMap[upper])
        throw new Error(`Invalid region: ${region}`);
    return upper;
};
class RiotAPI {
    constructor() {
        this._handleError = (error) => {
            if (axios_1.default.isAxiosError(error)) {
                if (error.response) {
                    const status = error.response.status;
                    const data = error.response.data;
                    return new Error(`API error ${status}: ${data?.status?.message || 'Unknown error'}`);
                }
                if (error.request) {
                    return new Error('No response received from the server');
                }
                return new Error(`Request error: ${error.message}`);
            }
            if (error instanceof Error) {
                return new Error(`Request error: ${error.message}`);
            }
            return new Error('Request error: Unknown error');
        };
        this.apiKey = process.env.RIOT_API_KEY || '';
        if (!this.apiKey)
            throw new Error('RIOT_API_KEY is required in .env');
        this.region = parseRegion(process.env.REGION || 'EUW1');
        this.client = axios_1.default.create({
            headers: { 'X-Riot-Token': this.apiKey },
        });
        Object.assign(this, (0, riot_1.default)({
            client: this.client,
            defaultRegion: this.region,
            regionMap,
            handleError: this._handleError,
        }));
    }
}
exports.RiotAPI = RiotAPI;
class DataDragon {
    constructor(version = null, locale = 'en_US') {
        this.version = version;
        this.locale = locale;
        this.baseURL = null;
        this.baseURLPromise = null;
        Object.assign(this, (0, datadragon_1.default)(() => this.resolveBaseURL()));
    }
    async resolveBaseURL() {
        if (this.baseURL)
            return this.baseURL;
        if (this.baseURLPromise)
            return this.baseURLPromise;
        this.baseURLPromise = (async () => {
            if (!this.version) {
                const response = await axios_1.default.get('https://ddragon.leagueoflegends.com/api/versions.json');
                const latestVersion = Array.isArray(response.data) ? response.data[0] : null;
                if (!latestVersion) {
                    throw new Error('Could not resolve latest Data Dragon version');
                }
                this.version = latestVersion;
            }
            this.baseURL = `https://ddragon.leagueoflegends.com/cdn/${this.version}/data/${this.locale}`;
            return this.baseURL;
        })();
        try {
            return await this.baseURLPromise;
        }
        finally {
            this.baseURLPromise = null;
        }
    }
}
exports.DataDragon = DataDragon;
