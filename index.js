require('dotenv').config();
const axios = require('axios');
const riotEndpoints = require('./endpoints/riot');
const dataDragonEndpoints = require('./endpoints/datadragon');

// Maps region codes to the platform and routing shard hosts required by Riot APIs.
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

class RiotAPI {
    constructor() {
        this.apiKey = process.env.RIOT_API_KEY;
        if (!this.apiKey) throw new Error('RIOT_API_KEY is required in .env');
        this.region = (process.env.REGION || 'EUW1').toUpperCase();
        if (!regionMap[this.region]) throw new Error(`Invalid region: ${this.region}`);
        this.client = axios.create({
            headers: { 'X-Riot-Token': this.apiKey },
        });
        // Attach endpoint methods with a shared axios client and region configuration.
        Object.assign(this, riotEndpoints(this.client, this.region, regionMap));
    }

    // Normalize axios errors to stable Error messages for consumers.
    _handleError(error) {
        if (error.response) {
            const { status, data } = error.response;
            return new Error(`API error ${status}: ${data.status?.message || 'Unknown error'}`);
        } else if (error.request) {
            return new Error('No response received from the server');
        }
        return new Error(`Request error: ${error.message}`);
    }
}

class DataDragon {
    constructor(version = '14.19.1', locale = 'en_US') {
        this.version = version;
        this.locale = locale;
        this.baseURL = `https://ddragon.leagueoflegends.com/cdn/${this.version}/data/${this.locale}`;
        // Attach static-data endpoint methods for the configured version/locale.
        Object.assign(this, dataDragonEndpoints(this.baseURL));
    }
}

module.exports = { RiotAPI, DataDragon };
