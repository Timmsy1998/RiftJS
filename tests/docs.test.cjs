const { test } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync, spawn } = require('node:child_process');
const { readFileSync, mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { once } = require('node:events');
const vm = require('node:vm');

const html = readFileSync('dist/docs/index.html', 'utf8');

test('offline reference covers catalog methods, constructors, exported options and guides', () => {
    const { RIOT_ENDPOINTS } = require('../dist/index.js');
    for (const endpoint of RIOT_ENDPOINTS) {
        assert.ok(html.includes(`id="RiotAPI-${endpoint.name}"`), endpoint.name);
        assert.ok(html.includes(endpoint.id), endpoint.id);
        assert.ok(html.includes(endpoint.path), endpoint.path);
    }
    for (const text of ['new RiotAPI(options?', 'new DataDragon(version?', 'new RiotAPIError(message:', 'id="RiotAPI-callEndpoint"', 'id="RiotAPI-getRankByPuuid"', 'id="RiotAPI-getMatchesWithDetailsByPuuid"', 'id="RiotAPIOptions"', 'id="EndpointOptions"', 'id="TournamentCodeParameters"', 'id="guide-integrations"']) assert.ok(html.includes(text), text);
    for (const text of ['id="RiotAPI-#client"', 'id="RiotAPI-_handleError"', 'id="DataDragon-baseURL"', 'id="DataDragon-resolveBaseURL"']) assert.ok(!html.includes(text), text);
    assert.ok(!/<(?:script|link)[^>]+(?:src|href)=/.test(html), 'viewer has no external assets');
});

test('search filters signatures and restores guides when cleared', () => {
    const makeMember = textContent => ({ textContent, hidden: false });
    const match = makeMember('getMatch(matchId: string)');
    const rotation = makeMember('getChampionRotation()');
    const section = { hidden: false, querySelector: () => ({ textContent: 'RiotAPI class' }), querySelectorAll: () => [match, rotation] };
    const guide = { hidden: false };
    const search = { value: '', addEventListener: (event, listener) => { search.listener = listener; } };
    const status = { textContent: '' };
    const document = { getElementById: id => id === 'search' ? search : status, querySelectorAll: selector => selector === '.api-section' ? [section] : [guide] };
    vm.runInNewContext(html.match(/<script>([\s\S]*?)<\/script>/)[1], { document });
    search.value = 'GETMATCH'; search.listener();
    assert.equal(match.hidden, false); assert.equal(rotation.hidden, true); assert.equal(guide.hidden, true);
    assert.match(status.textContent, /^1 matching/);
    search.value = 'no-such-method'; search.listener(); assert.equal(section.hidden, true);
    search.value = ''; search.listener();
    assert.equal(section.hidden, false); assert.equal(rotation.hidden, false); assert.equal(guide.hidden, false);
});

test('packed docs command runs without SDK dependencies and serves only the offline viewer', { timeout: 30000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'riftjs-docs-'));
    let child;
    try {
        const packed = JSON.parse(execFileSync('npm', ['pack', '--json', '--ignore-scripts', '--pack-destination', directory], { encoding: 'utf8' }))[0];
        execFileSync('tar', ['-xzf', join(directory, packed.filename), '-C', directory]);
        const packageRoot = join(directory, 'package');
        const manifest = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8'));
        assert.equal(manifest.bin['riftjs-docs'], 'bin/docs.mjs');
        const command = join(packageRoot, 'bin/docs.mjs');
        assert.match(execFileSync(process.execPath, [command, '--help'], { cwd: directory, encoding: 'utf8' }), /--no-open/);
        assert.throws(() => execFileSync(process.execPath, [command, '--port', '65536'], { stdio: 'pipe' }), error => /Port must/.test(error.stderr));
        child = spawn(process.execPath, [command, '--no-open', '--port', '0'], { cwd: directory, stdio: ['ignore', 'pipe', 'pipe'] });
        const url = await new Promise((resolve, reject) => {
            let output = '';
            const timer = setTimeout(() => reject(new Error('Docs server did not start')), 10000);
            child.stdout.on('data', data => { output += data; const match = output.match(/http:\/\/127\.0\.0\.1:\d+\//); if (match) { clearTimeout(timer); resolve(match[0]); } });
            child.once('error', error => { clearTimeout(timer); reject(error); });
            child.once('exit', code => { clearTimeout(timer); reject(new Error(`Docs server exited: ${code}`)); });
        });
        const response = await fetch(url);
        assert.equal(response.status, 200);
        assert.match(response.headers.get('content-type'), /text\/html/);
        assert.equal(await response.text(), html);
        assert.equal((await fetch(`${url}index.html`)).status, 200);
        assert.equal((await fetch(`${url}package.json`)).status, 404);
        assert.equal((await fetch(url, { method: 'POST' })).status, 405);
        assert.equal(await (await fetch(url, { method: 'HEAD' })).text(), '');
    } finally {
        if (child && child.exitCode === null && child.signalCode === null) { const exited = once(child, 'exit'); child.kill('SIGTERM'); await exited; }
        rmSync(directory, { recursive: true, force: true });
    }
});
