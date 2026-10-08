// Build real framework projects against the npm tarball; never contact Riot.
import { mkdtemp, cp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, execFileSync } from 'node:child_process';
import { createServer } from 'node:net';
import assert from 'node:assert/strict';

const root = fileURLToPath(new URL('../', import.meta.url));
const temporary = await mkdtemp(join(tmpdir(), 'riftjs-integrations-'));
const env = { ...process.env, RIOT_API_KEY: 'integration-test-key',
  NUXT_RIOT_API_KEY: 'integration-test-key', NEXT_TELEMETRY_DISABLED: '1',
  NUXT_TELEMETRY_DISABLED: '1', HOST: '127.0.0.1' };
function run(command, args, cwd) {
  return new Promise((done, fail) => {
    const child = spawn(command, args, { cwd, env, stdio: 'inherit' });
    const timeout = setTimeout(() => child.kill('SIGKILL'), 300_000);
    child.once('error', error => { clearTimeout(timeout); fail(error); });
    child.once('exit', code => { clearTimeout(timeout); code === 0 ? done() : fail(new Error(`${command} exited ${code}`)); });
  });
}
async function port() {
  const server = createServer();
  await new Promise(done => server.listen(0, '127.0.0.1', done));
  const value = server.address().port;
  await new Promise(done => server.close(done));
  return value;
}
try {
  // Lifecycle output can pollute npm pack --json (including the docs build log).
  // Build explicitly, then pack without scripts to keep the metadata parseable.
  await run('npm', ['run', 'build'], root);
  const packed = JSON.parse(execFileSync('npm', ['pack', '--json', '--ignore-scripts', '--pack-destination', temporary], { cwd: root, encoding: 'utf8' }));
  const tarball = resolve(temporary, packed[0].filename);
  for (const framework of ['next', 'nuxt']) {
    console.log(`Testing installed tarball with ${framework}`);
    const cwd = join(temporary, framework);
    await cp(join(root, 'examples', framework), cwd, { recursive: true,
      filter: path => !/(?:^|[/\\])(?:node_modules|\.next|\.nuxt|\.output|package-lock\.json|\.env(?:\..*)?)(?:$|[/\\])/.test(path) });
    const manifest = JSON.parse(await readFile(join(cwd, 'package.json'), 'utf8'));
    manifest.dependencies['@timmsy/riftjs'] = `file:${tarball}`;
    await writeFile(join(cwd, 'package.json'), JSON.stringify(manifest, null, 2));
    // Inject a test-only adapter in the temporary copy, before client construction.
    // Assert the real SDK builds the expected request, without sending a key online.
    const util = join(cwd, framework === 'next' ? 'lib/riot.js' : 'server/utils/riot.js');
    const source = await readFile(util, 'utf8');
    await writeFile(util, `import { createRequire } from 'node:module';
const axios = createRequire(import.meta.url)('axios');
axios.defaults.adapter = async config => {
  if (!config.url.endsWith('/lol/status/v4/platform-data') || config.headers['X-Riot-Token'] !== 'integration-test-key') throw new Error('Unexpected SDK request');
  return { data: { integration: '${framework}' }, status: 200, statusText: 'OK', headers: {}, config };
};
${source}`);
    await run('npm', ['install', '--no-audit', '--no-fund'], cwd);
    await run(process.execPath, ['--input-type=module', '-e', `import assert from 'node:assert/strict'; import {createRequire} from 'node:module'; import * as esm from '@timmsy/riftjs'; const cjs = createRequire(import.meta.url)('@timmsy/riftjs'); assert.equal(esm.RiotAPI, cjs.RiotAPI); assert.equal(esm.RIOT_ENDPOINTS.length, 53);`], cwd);
    // Log only sanitized errors in the temporary route to make smoke failures diagnosable.
    const route = join(cwd, framework === 'next' ? 'app/api/lol/status/route.js' : 'server/api/lol/status.get.js');
    await writeFile(route, (await readFile(route, 'utf8')).replace('} catch {', '} catch (error) { console.error(error.message);'));
    await run('npm', ['run', 'build'], cwd);
    const number = await port();
    const args = framework === 'next' ? ['node_modules/next/dist/bin/next', 'start', '-p', String(number), '-H', '127.0.0.1'] : ['.output/server/index.mjs'];
    // Fail closed if bundling stops the adapter from reaching the SDK.
    const guard = join(cwd, 'no-network.cjs');
    await writeFile(guard, "require('node:https').request = () => { throw new Error('External HTTPS is disabled in integration tests'); };\n");
    const server = spawn(process.execPath, ['--require', guard, ...args], { cwd, env: { ...env, PORT: String(number) }, stdio: 'inherit' });
    try {
      let response;
      for (let attempt = 0; attempt < 120; attempt++) {
        if (server.exitCode !== null) throw new Error(`${framework} server exited early`);
        try { response = await fetch(`http://127.0.0.1:${number}/api/lol/status`, { signal: AbortSignal.timeout(2000) }); break; } catch { await new Promise(done => setTimeout(done, 250)); }
      }
      assert.ok(response, `${framework} server did not start`);
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('cache-control'), 'no-store');
      assert.deepEqual(await response.json(), { integration: framework });
      console.log(`${framework}: production build and SDK-backed HTTP route passed`);
    } finally {
      const exited = new Promise(done => server.once('exit', done));
      if (server.exitCode === null) { server.kill('SIGTERM'); await exited; }
    }
  }
} finally {
  await rm(temporary, { recursive: true, force: true });
}
