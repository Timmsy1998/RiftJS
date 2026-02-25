import axios from 'axios';
import type { DataDragonEndpointMethods } from '../types';

type BaseURLResolver = string | (() => string | Promise<string>);

export default function dataDragonEndpoints(baseURLOrResolver: BaseURLResolver): DataDragonEndpointMethods {
    const resolveBaseURL = async (): Promise<string> => {
        // Maintainer note (Timmsy): allow either a fixed URL or lazy resolver so callers can choose version strategy.
        if (typeof baseURLOrResolver === 'function') {
            return baseURLOrResolver();
        }
        return baseURLOrResolver;
    };

    return {
        async getChampions() {
            try {
                const baseURL = await resolveBaseURL();
                const response = await axios.get<Record<string, unknown>>(`${baseURL}/champion.json`);
                return response.data;
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Unknown DataDragon error';
                throw new Error(`DataDragon error: ${message}`);
            }
        },

        async getItems() {
            try {
                const baseURL = await resolveBaseURL();
                const response = await axios.get<Record<string, unknown>>(`${baseURL}/item.json`);
                return response.data;
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Unknown DataDragon error';
                throw new Error(`DataDragon error: ${message}`);
            }
        },
    };
}
