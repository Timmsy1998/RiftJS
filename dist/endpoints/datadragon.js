"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = dataDragonEndpoints;
const axios_1 = __importDefault(require("axios"));
function dataDragonEndpoints(baseURLOrResolver) {
    const resolveBaseURL = async () => {
        if (typeof baseURLOrResolver === 'function') {
            return baseURLOrResolver();
        }
        return baseURLOrResolver;
    };
    return {
        async getChampions() {
            try {
                const baseURL = await resolveBaseURL();
                const response = await axios_1.default.get(`${baseURL}/champion.json`);
                return response.data;
            }
            catch (error) {
                const message = error instanceof Error ? error.message : 'Unknown DataDragon error';
                throw new Error(`DataDragon error: ${message}`);
            }
        },
        async getItems() {
            try {
                const baseURL = await resolveBaseURL();
                const response = await axios_1.default.get(`${baseURL}/item.json`);
                return response.data;
            }
            catch (error) {
                const message = error instanceof Error ? error.message : 'Unknown DataDragon error';
                throw new Error(`DataDragon error: ${message}`);
            }
        },
    };
}
