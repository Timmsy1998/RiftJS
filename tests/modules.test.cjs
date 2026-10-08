const { test } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { mkdtempSync, writeFileSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');

test('ES module and CommonJS consumers share constructors, errors and endpoint coverage', async () => {
    const cjs = require('@timmsy/riftjs');
    const esm = await import('@timmsy/riftjs');
    assert.equal(esm.default, cjs);
    for (const key of ['RiotAPI', 'DataDragon', 'RiotAPIError', 'RIOT_ENDPOINTS']) assert.equal(esm[key], cjs[key]);
    const api = new esm.RiotAPI({ apiKey: 'test', loadEnv: false });
    for (const endpoint of esm.RIOT_ENDPOINTS) assert.equal(typeof api[endpoint.name], 'function');
    assert.ok(new esm.RiotAPIError('test') instanceof cjs.RiotAPIError);
});

test('framework configuration can disable dotenv without mutating the process environment', () => {
    const directory = mkdtempSync(join(tmpdir(), 'riftjs-env-'));
    try {
        writeFileSync(join(directory, '.env'), 'RIFTJS_ENV_PROBE=loaded\nRIOT_API_KEY=env-key\nREGION=NA1\n');
        const entry = resolve('dist/index.js');
        const env = { ...process.env };
        delete env.RIOT_API_KEY; delete env.REGION; delete env.RIFTJS_ENV_PROBE;
        const run = loadEnv => execFileSync(process.execPath, ['-e', `
            const { RiotAPI } = require(${JSON.stringify(entry)});
            const api = new RiotAPI({ apiKey: 'explicit', region: 'EUW1', loadEnv: ${loadEnv} });
            process.stdout.write(JSON.stringify({ probe: process.env.RIFTJS_ENV_PROBE, region: api.region }));
        `], { cwd: directory, env, encoding: 'utf8' });
        assert.deepEqual(JSON.parse(run(false)), { region: 'EUW1' });
        assert.deepEqual(JSON.parse(run(true)), { probe: 'loaded', region: 'EUW1' });
    } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('browser export condition rejects a direct SDK import', () => {
    assert.throws(() => execFileSync(process.execPath, ['--conditions=browser', '-e', "require('@timmsy/riftjs')"], { encoding: 'utf8', stdio: 'pipe' }), error => /ERR_PACKAGE_PATH_NOT_EXPORTED/.test(error.stderr));
});
