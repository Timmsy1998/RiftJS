import axios, { AxiosHeaders } from 'axios';
import type { AxiosRequestConfig, AxiosResponse, RawAxiosHeaders } from 'axios';
import catalog from './endpoints/catalog.json';
import type { RateLimitWindow, RiotAPIOptions } from './types';

/** Deliberately excludes Axios config, headers, request and response bodies. */
export class RiotAPIError extends Error {
    readonly status?: number;
    readonly code?: string;
    readonly retryAfterMs?: number;
    readonly rateLimitType?: string;
    constructor(message: string, details: { status?: number; code?: string; retryAfterMs?: number; rateLimitType?: string } = {}) {
        super(message);
        this.name = 'RiotAPIError';
        Object.assign(this, details);
    }
}

interface Bucket { limit: number; durationMs: number; count: number; reset: number }
interface HostState { tail: Promise<void>; buckets: Map<string, Bucket[]>; blocked: Map<string, number> }
const positive = (value: number, name: string): number => {
    if (!Number.isFinite(value) || value <= 0) throw new Error(`${name} must be positive and finite`);
    return value;
};
const wait = (ms: number, signal?: AbortSignal): Promise<void> => new Promise((resolve, reject) => {
    if (signal?.aborted) { reject(new RiotAPIError('Request canceled', { code: 'ERR_CANCELED' })); return; }
    const abort = () => { clearTimeout(timer); signal?.removeEventListener('abort', abort); reject(new RiotAPIError('Request canceled', { code: 'ERR_CANCELED' })); };
    const timer = setTimeout(() => { signal?.removeEventListener('abort', abort); resolve(); }, Math.min(ms, 2 ** 31 - 1));
    signal?.addEventListener('abort', abort, { once: true });
});
const pairs = (value: unknown): Array<[number, number]> => String(value ?? '').split(',').flatMap(pair => {
    const [a, b] = pair.split(':').map(Number);
    return Number.isFinite(a) && a >= 0 && Number.isFinite(b) && b > 0 ? [[a, b] as [number, number]] : [];
});

/** One transport per key/process. Requests serialize per host so reservations cannot race. */
export class RiotTransport {
    #client = axios.create({ timeout: 10000, maxRedirects: 0, maxContentLength: 32 * 1024 * 1024, maxBodyLength: 1024 * 1024 });
    #hosts = new Map<string, HostState>();
    #key: string;
    #token?: string;
    #timeout: number;
    #retries: number;
    #maxWait: number;
    #limits: RateLimitWindow[];
    constructor(key: string, options: RiotAPIOptions) {
        this.#key = key.trim();
        this.#token = options.accessToken?.trim();
        this.#timeout = positive(options.timeoutMs ?? 10000, 'timeoutMs');
        this.#maxWait = positive(options.maxRateLimitWaitMs ?? 180000, 'maxRateLimitWaitMs');
        this.#retries = options.maxRetries ?? 2;
        if (!Number.isInteger(this.#retries) || this.#retries < 0 || this.#retries > 10) throw new Error('maxRetries must be an integer from 0 to 10');
        this.#limits = (options.rateLimits ?? [{ limit: 20, intervalMs: 1000 }, { limit: 100, intervalMs: 120000 }]).map(limit => ({ ...limit }));
        for (const limit of this.#limits) {
            positive(limit.intervalMs, 'rate limit intervalMs');
            if (!Number.isSafeInteger(limit.limit) || limit.limit < 1) throw new Error('rate limit must be a positive integer');
        }
    }
    get<T>(url: string, config: AxiosRequestConfig = {}): Promise<AxiosResponse<T>> {
        return this.request<T>({ ...config, url, method: 'GET' });
    }
    async request<T>(config: AxiosRequestConfig, rso = false, endpoint?: string): Promise<AxiosResponse<T>> {
        const target = new URL(config.url!, config.baseURL);
        if (target.protocol !== 'https:' || !/^(br1|eun1|euw1|jp1|kr|la1|la2|na1|oc1|tr1|ru|ph2|sg2|th2|tw2|vn2|americas|europe|asia|sea)\.api\.riotgames\.com$/.test(target.hostname) || target.port || target.username || target.password) {
            throw new RiotAPIError('Invalid Riot API host');
        }
        if (rso && !this.#token) throw new RiotAPIError('accessToken is required for RSO endpoints');
        if (!rso && !this.#key) throw new RiotAPIError('apiKey is required for this endpoint');
        if ([...target.searchParams.keys(), ...Object.keys(config.params ?? {})].some(k => /api.?key|token|authorization/i.test(k))) throw new RiotAPIError('Credentials are not allowed in query parameters');
        const host = target.host;
        const descriptor = catalog.find(e => e.id === endpoint) ?? catalog.find(e => e.method === config.method?.toUpperCase() && new RegExp('^' + e.path.replace(/\{[^}]+\}/g, '[^/]+') + '$').test(target.pathname));
        const method = `${config.method?.toUpperCase()}:${descriptor?.path ?? target.pathname}`;
        let state = this.#hosts.get(host);
        if (!state) {
            state = { tail: Promise.resolve(), blocked: new Map(), buckets: new Map([['local', this.#limits.map(l => ({ limit: l.limit, durationMs: l.intervalMs, count: 0, reset: 0 }))]]) };
            this.#hosts.set(host, state);
        }
        const previous = state.tail;
        let release!: () => void;
        const gate = new Promise<void>(resolve => { release = resolve; });
        state.tail = previous.then(() => gate);
        const signal = config.signal as AbortSignal | undefined;
        try {
            // A canceled queued call leaves its place in the queue without blocking callers behind it.
            await new Promise<void>((resolve, reject) => {
                const abort = () => { signal?.removeEventListener('abort', abort); reject(new RiotAPIError('Request canceled', { code: 'ERR_CANCELED' })); };
                if (signal?.aborted) { abort(); return; }
                signal?.addEventListener('abort', abort, { once: true });
                previous.then(() => { signal?.removeEventListener('abort', abort); resolve(); });
            });
            const deadline = Date.now() + this.#maxWait;
            for (let attempt = 0; ; attempt++) {
                for (;;) {
                    if (signal?.aborted) throw new RiotAPIError('Request canceled', { code: 'ERR_CANCELED' });
                    const now = Date.now();
                    let delay = Math.max(0, (state.blocked.get('app') ?? 0) - now, (state.blocked.get(method) ?? 0) - now);
                    for (const scope of ['local', 'app', method]) {
                        for (const bucket of state.buckets.get(scope) ?? []) {
                            if (now >= bucket.reset) { bucket.count = 0; bucket.reset = now + bucket.durationMs; }
                            if (bucket.count >= bucket.limit) delay = Math.max(delay, bucket.reset - now);
                        }
                    }
                    if (!delay) break;
                    if (now + delay > deadline) throw new RiotAPIError('Rate limit wait exceeds maxRateLimitWaitMs', { code: 'RATE_LIMIT_WAIT', retryAfterMs: delay });
                    await wait(delay, signal);
                }
                for (const scope of ['local', 'app', method]) for (const bucket of state.buckets.get(scope) ?? []) bucket.count++;
                try {
                    const response = await this.#client.request<T>({
                        ...config, timeout: this.#timeout, maxRedirects: 0,
                        headers: {
                            Authorization: rso ? `Bearer ${this.#token}` : null,
                            'X-Riot-Token': rso ? null : this.#key,
                        },
                    });
                    this.observe(state, method, response);
                    return response;
                } catch (error) {
                    if (!axios.isAxiosError(error)) throw new RiotAPIError('Request failed');
                    const response = error.response;
                    if (response) this.observe(state, method, response);
                    const status = response?.status;
                    const headers = AxiosHeaders.from(response?.headers as RawAxiosHeaders);
                    const rawRetry = headers.get('retry-after');
                    const seconds = rawRetry == null ? NaN : Number(rawRetry);
                    const retryAfterMs = Number.isFinite(seconds) && seconds >= 0 ? seconds * 1000 : Math.max(0, Date.parse(String(rawRetry)) - Date.now()) || 1000;
                    const rateLimitType = String(headers.get('x-rate-limit-type') ?? 'service');
                    if (status === 429) {
                        // Unknown/service throttles block the host conservatively, including after retries exhaust.
                        const scope = rateLimitType === 'method' ? method : 'app';
                        state.blocked.set(scope, Date.now() + retryAfterMs);
                    }
                    const retryable = config.method?.toUpperCase() === 'GET' && (status === 429 || (status !== undefined && [500, 502, 503, 504].includes(status)));
                    if (retryable && attempt < this.#retries) {
                        if (status !== 429) {
                            const delay = 250 * 2 ** attempt;
                            if (Date.now() + delay > deadline) throw new RiotAPIError('Retry wait exceeds maxRateLimitWaitMs', { code: 'RATE_LIMIT_WAIT' });
                            await wait(delay, signal);
                        }
                        continue;
                    }
                    throw new RiotAPIError(status ? `API error ${status}` : error.code === 'ERR_CANCELED' ? 'Request canceled' : 'No response received from the server', {
                        status, code: error.code, ...(status === 429 ? { retryAfterMs, rateLimitType } : {}),
                    });
                }
            }
        } finally { release(); }
    }
    private observe(state: HostState, method: string, response: AxiosResponse): void {
        const headers = AxiosHeaders.from(response.headers as RawAxiosHeaders);
        for (const [scope, prefix] of [['app', 'x-app-rate-limit'], [method, 'x-method-rate-limit']]) {
            const limits = pairs(headers.get(prefix));
            if (!limits.length) continue;
            const counts = new Map(pairs(headers.get(`${prefix}-count`)).map(([count, seconds]) => [seconds, count]));
            const old = state.buckets.get(scope) ?? [];
            state.buckets.set(scope, limits.map(([limit, seconds]) => {
                const previous = old.find(b => b.durationMs === seconds * 1000 && b.reset > Date.now());
                return { limit, durationMs: seconds * 1000, count: Math.max(previous?.count ?? 1, counts.get(seconds) ?? 1), reset: previous?.reset ?? Date.now() + seconds * 1000 };
            }));
        }
    }
}
