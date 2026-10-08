// Read-only drift check against Riot's own developer portal. Never creates resources.
import { readFile } from 'node:fs/promises';
const catalog = JSON.parse(await readFile(new URL('../src/endpoints/catalog.json', import.meta.url), 'utf8'));
async function get(url) {
    const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new Error(`Riot reference returned HTTP ${response.status}`);
    return response;
}
const listing = await (await get('https://developer.riotgames.com/apis')).text();
const families = new Set(['account-v1']);
for (const match of listing.matchAll(/api-name="([^"]+)"[^>]*>[\s\S]*?<span class="api_desc">([^<]+)<\/span>/g)) {
    if (match[2].startsWith('League of Legends')) families.add(match[1]);
}
if (families.size < 10) throw new Error('Reference format changed; cannot verify API families');
const live = (await Promise.all([...families].map(async family => {
    const { html } = await (await get(`https://developer.riotgames.com/api-details/${family}`)).json();
    const operations = [...html.matchAll(new RegExp(`href="#${family}/([A-Z]+)_([^" ]+)"[^>]*>(/[^<]+)</a>`, 'g'))];
    if (!operations.length) throw new Error(`No operations parsed for ${family}; inspect reference format`);
    return operations.map(([, method, name, path]) => ({ id: `${family}.${name}`, method, path }));
}))).flat();
const issues = [];
for (const operation of live) {
    const entry = catalog.find(e => e.id === operation.id);
    if (!entry) issues.push(`Missing: ${operation.id} ${operation.method} ${operation.path}`);
    else if (entry.method !== operation.method || entry.path !== operation.path) issues.push(`Changed: ${operation.id}`);
}
for (const entry of catalog) if (!live.some(e => e.id === entry.id)) issues.push(`Removed from reference: ${entry.id}`);
if (issues.length) { console.error(issues.join('\n')); process.exitCode = 1; }
else console.log(`Verified ${live.length} operations across ${families.size} API families against Riot's reference.`);
