const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtempSync, writeFileSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');

const release = import('../scripts/release-version.mjs');

test('release versions follow conventional commits and preserve the v4 baseline', async () => {
  const { nextVersion, parseVersion } = await release;
  assert.equal(nextVersion('4.0.0', '4.0.0', ['fix: handle errors']), '4.0.1');
  assert.equal(nextVersion('4.0.9', '4.0.0', ['fix: a', 'feat(api): add method']), '4.1.0');
  assert.equal(nextVersion('4.9.9', '4.0.0', ['feat(api)!: remove method']), '5.0.0');
  assert.equal(nextVersion('4.9.9', '4.0.0', ['refactor: change API\n\nBREAKING CHANGE: old API removed']), '5.0.0');
  assert.equal(nextVersion('4.0.0', '4.0.0', ['chore(deps): bump axios']), '4.0.1');
  assert.equal(nextVersion('4.0.0', '4.0.0', ['chore(deps-dev): bump typescript']), '4.0.1');
  assert.equal(nextVersion('3.1.1', '4.0.0', ['feat: add integrations']), '4.0.0');
  assert.equal(nextVersion(null, '4.0.0', ['feat: initial release']), '4.0.0');
  assert.equal(nextVersion('4.0.0', '4.0.0', ['docs: examples\n\nfeat: example only', 'ci: fix workflow']), null);
  for (const version of ['4.0.0-beta.1', '04.0.0', '4.0', 'v4.0.0', '4.0.0\n']) assert.throws(() => parseVersion(version));
});

test('release planning reads tag history, ignores unrelated tags, and resumes the same tag', async () => {
  const { releasePlan } = await release;
  const cwd = mkdtempSync(join(tmpdir(), 'riftjs-release-'));
  const git = (...args) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  const commit = message => git('commit', '--allow-empty', '-m', message);
  try {
    git('init', '-b', 'main');
    git('config', 'user.name', 'Release test');
    git('config', 'user.email', 'release@example.com');
    writeFileSync(join(cwd, 'package.json'), JSON.stringify({ version: '4.0.0' }));
    git('add', 'package.json');
    commit('feat: initial');
    git('tag', 'v4.0.0');
    git('tag', 'v4.0.1-beta.1');
    commit('docs: maintenance');
    assert.deepEqual(releasePlan(cwd), { tag: '', create: false });
    commit('fix: regression');
    assert.deepEqual(releasePlan(cwd), { tag: 'v4.0.1', create: true });
    git('tag', 'v4.0.1');
    assert.deepEqual(releasePlan(cwd), { tag: 'v4.0.1', create: false });
    git('checkout', '-b', 'other', 'v4.0.0');
    commit('feat: other branch');
    git('tag', 'v4.1.0');
    git('checkout', 'main');
    commit('feat: main feature');
    assert.throws(() => releasePlan(cwd), /already exists outside this history/);
  } finally { rmSync(cwd, { recursive: true, force: true }); }
});

test('publishing retries skip the same commit and reject conflicts or registry failures', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'riftjs-publish-'));
  const script = join(__dirname, '../scripts/publish-package.mjs');
  try {
    // Exercise the actual publish command with fake registries, without uploading a package.
    writeFileSync(join(cwd, 'package.json'), JSON.stringify({ name: '@timmsy/riftjs', version: '4.0.0' }));
    writeFileSync(join(cwd, 'git'), '#!/bin/sh\necho tested-sha\n', { mode: 0o755 });
    writeFileSync(join(cwd, 'npm'), `#!/usr/bin/env node
const fs = require('node:fs');
const args = process.argv.slice(2);
if (['view', 'publish'].includes(args[0])) {
  const registry = process.env.RELEASE_REGISTRY;
  const scope = registry === 'https://registry.npmjs.org' ? '@timmsy' : '@timmsy1998';
  if (!args.includes('--registry=' + registry) || !args.includes('--' + scope + ':registry=' + registry)) process.exit(99);
}
if (args[0] === 'view') {
  if (process.env.SCENARIO === 'same') console.log(JSON.stringify({gitHead: 'tested-sha'}));
  else if (process.env.SCENARIO === 'conflict') console.log(JSON.stringify({gitHead: 'other-sha'}));
  else { console.log(JSON.stringify({error: {code: process.env.SCENARIO}})); process.exit(1); }
} else if (args[0] === 'publish') {
  if (process.env.PUBLISH_FAIL === 'true') { console.error('npm error E404 PUT: permission denied'); process.exit(1); }
  fs.writeFileSync('published', JSON.stringify(args));
}
else if (args[0] === 'pkg') { const p = JSON.parse(fs.readFileSync('package.json')); p.name = args[2].slice(5); fs.writeFileSync('package.json', JSON.stringify(p)); }
else if (args[0] === 'version') { const p = JSON.parse(fs.readFileSync('package.json')); p.version = args[1]; fs.writeFileSync('package.json', JSON.stringify(p)); }
`, { mode: 0o755 });
    const run = (scenario, registry = 'https://registry.npmjs.org', env = {}) => spawnSync(process.execPath, [script], {
      cwd, encoding: 'utf8', env: { ...process.env, PATH: `${cwd}:${process.env.PATH}`, SCENARIO: scenario,
        RELEASE_TAG: 'v4.0.1', RELEASE_REGISTRY: registry, ...env },
    });
    assert.equal(run('same').status, 0);
    assert.equal(require('node:fs').existsSync(join(cwd, 'published')), false);
    assert.match(run('conflict').stderr, /different or unknown commit/);
    for (const code of ['E401', 'E403', 'ENOTFOUND']) assert.notEqual(run(code).status, 0);
    assert.equal(require('node:fs').existsSync(join(cwd, 'published')), false);
    const denied = run('E404', 'https://registry.npmjs.org', { PUBLISH_FAIL: 'true' });
    assert.equal(denied.status, 1);
    assert.match(denied.stderr, /npm error E404 PUT/);
    assert.match(denied.stderr, /trusted publisher.*Timmsy1998\/RiftJS/);
    assert.match(denied.stderr, /NPM_TOKEN/);
    assert.equal(require('node:fs').existsSync(join(cwd, 'published')), false);
    // Tokenless publishing must reach npm publish so its OIDC negotiation can run.
    assert.equal(run('E404', 'https://registry.npmjs.org', { NODE_AUTH_TOKEN: '' }).status, 0);
    rmSync(join(cwd, 'published'));
    const githubDenied = run('E404', 'https://npm.pkg.github.com', { PUBLISH_FAIL: 'true' });
    assert.equal(githubDenied.status, 1);
    assert.match(githubDenied.stderr, /GITHUB_TOKEN packages: write/);
    assert.equal(run('E404', 'https://npm.pkg.github.com').status, 0);
    const manifest = JSON.parse(require('node:fs').readFileSync(join(cwd, 'package.json')));
    assert.equal(manifest.name, '@timmsy1998/riftjs');
    assert.equal(manifest.version, '4.0.1');
    assert.ok(require('node:fs').existsSync(join(cwd, 'published')));
  } finally { rmSync(cwd, { recursive: true, force: true }); }
});
