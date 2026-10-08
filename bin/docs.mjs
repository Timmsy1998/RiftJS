#!/usr/bin/env node
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
    console.log('Usage: riftjs-docs [--port <0-65535>] [--no-open]\n\nServe the bundled offline API docs on localhost. Opens your browser by default.\nThe default port is automatically assigned. Press Ctrl+C to stop.');
    process.exit(0);
}
let port = 0;
let open = true;
for (let index = 0; index < args.length; index++) {
    if (args[index] === '--no-open') open = false;
    else if (args[index] === '--port' && /^\d+$/.test(args[index + 1] ?? '')) port = Number(args[++index]);
    else { console.error(`Unknown or incomplete argument: ${args[index]}. Use --help.`); process.exit(1); }
}
if (!Number.isInteger(port) || port < 0 || port > 65535) { console.error('Port must be between 0 and 65535.'); process.exit(1); }
let html;
try { html = await readFile(new URL('../dist/docs/index.html', import.meta.url)); }
catch { console.error('Bundled docs are missing. In a source checkout, run npm run build first.'); process.exit(1); }
const server = createServer((request, response) => {
    if (request.method !== 'GET' && request.method !== 'HEAD') { response.writeHead(405, { Allow: 'GET, HEAD' }); response.end(); return; }
    if (request.url !== '/' && request.url !== '/index.html') { response.writeHead(404); response.end('Not found'); return; }
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    response.end(request.method === 'HEAD' ? undefined : html);
});
server.on('error', error => { console.error(`Could not start docs server: ${error.message}`); process.exitCode = 1; });
server.listen(port, '127.0.0.1', () => {
    const url = `http://127.0.0.1:${server.address().port}/`;
    console.log(`RiftJS API docs: ${url}\nPress Ctrl+C to stop.`);
    if (!open) return;
    const command = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'rundll32.exe' : 'xdg-open';
    const browserArgs = process.platform === 'win32' ? ['url.dll,FileProtocolHandler', url] : [url];
    const browser = spawn(command, browserArgs, { stdio: 'ignore', detached: true });
    const fallback = () => console.log('Open the URL above in your browser.');
    browser.on('error', fallback);
    browser.on('exit', code => { if (code) fallback(); });
    browser.unref();
});
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close());
