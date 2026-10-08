import ts from 'typescript';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const manifest = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
const catalog = JSON.parse(await readFile(resolve(root, 'src/endpoints/catalog.json'), 'utf8'));
const config = ts.readConfigFile(resolve(root, 'tsconfig.json'), ts.sys.readFile);
if (config.error) throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, '\n'));
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
const program = ts.createProgram(parsed.fileNames, parsed.options);
const checker = program.getTypeChecker();
const entry = program.getSourceFile(resolve(root, 'src/index.ts'));
const flags = ts.TypeFormatFlags.NoTruncation | ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope;
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const anchor = value => String(value).replace(/[^a-zA-Z0-9_-]/g, '-');
const description = symbol => escape(ts.displayPartsToString(symbol.getDocumentationComment(checker)));
const hidden = symbol => symbol.name.startsWith('#') || symbol.declarations?.some(declaration => declaration.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.PrivateKeyword || modifier.kind === ts.SyntaxKind.ProtectedKeyword));
const signature = value => checker.signatureToString(value, entry, flags);

function member(symbol, owner) {
    const type = checker.getTypeOfSymbolAtLocation(symbol, entry);
    const calls = type.getCallSignatures();
    const optional = symbol.flags & ts.SymbolFlags.Optional ? '?' : '';
    const declaration = calls.length ? calls.map(call => `${symbol.name}${optional}${signature(call)}`).join('\n') : `${symbol.name}${optional}: ${checker.typeToString(type, entry, flags)}`;
    const endpoint = owner === 'RiotAPI' || owner === 'CompleteEndpointMethods' ? catalog.find(item => item.name === symbol.name) : undefined;
    const metadata = endpoint ? `<p class="metadata">${escape(endpoint.method)} ${escape(endpoint.path)}<br>Route: ${escape(endpoint.route)} · Authentication: ${endpoint.rso ? 'RSO bearer token' : 'Riot API key'} · ID: ${escape(endpoint.id)}</p>` : '';
    return `<article class="member searchable" id="${anchor(`${owner}-${symbol.name}`)}"><h3><a href="#${anchor(`${owner}-${symbol.name}`)}">${escape(symbol.name)}</a></h3><pre><code>${escape(declaration)}</code></pre>${description(symbol) ? `<p>${description(symbol)}</p>` : ''}${metadata}</article>`;
}

const exports = checker.getExportsOfModule(checker.getSymbolAtLocation(entry)).map(symbol => symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol);
exports.sort((a, b) => {
    const priority = name => ['RiotAPI', 'DataDragon', 'RiotAPIError'].indexOf(name) + 1 || 99;
    return priority(a.name) - priority(b.name) || a.name.localeCompare(b.name);
});
const reference = exports.map(symbol => {
    const declarations = symbol.declarations ?? [];
    const isClass = declarations.some(ts.isClassDeclaration);
    const isInterface = declarations.some(ts.isInterfaceDeclaration);
    let content;
    if (isClass || isInterface) {
        const type = checker.getDeclaredTypeOfSymbol(symbol);
        const constructors = isClass ? checker.getTypeOfSymbolAtLocation(symbol, entry).getConstructSignatures().map(call => `<pre><code>new ${escape(symbol.name + signature(call))}</code></pre>`).join('') : '';
        const members = type.getProperties().filter(property => !hidden(property) && property.declarations?.some(declaration => !declaration.getSourceFile().isDeclarationFile));
        content = constructors + members.map(property => member(property, symbol.name)).join('');
    } else {
        const alias = declarations.find(ts.isTypeAliasDeclaration);
        const declaration = alias ? alias.getText().replace(/^export\s+/, '') : `${symbol.name}: ${checker.typeToString(checker.getTypeOfSymbolAtLocation(symbol, entry), entry, flags)}`;
        content = `<pre><code>${escape(declaration)}</code></pre>`;
    }
    return `<section class="api-section" id="${anchor(symbol.name)}"><h2>${escape(symbol.name)} <span>${isClass ? 'class' : isInterface ? 'interface' : 'export'}</span></h2>${description(symbol) ? `<p>${description(symbol)}</p>` : ''}${isClass || isInterface ? content : `<article class="searchable">${content}</article>`}</section>`;
}).join('');

// Render the Markdown subset used by the bundled guides. Escape all input first;
// raw HTML and executable links are never passed through to the viewer.
function inline(value) {
    return escape(value).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, label, url) => {
        const local = { 'docs/ENDPOINTS.md': '#guide-endpoints', 'ENDPOINTS.md': '#guide-endpoints', 'docs/INTEGRATIONS.md': '#guide-integrations', 'INTEGRATIONS.md': '#guide-integrations' };
        const href = local[url] ?? (/^https:\/\//.test(url) ? url : null);
        return href ? `<a href="${href}"${href.startsWith('https:') ? ' rel="noreferrer"' : ''}>${label}</a>` : label;
    }).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
}
function markdown(source) {
    const lines = source.split(/\r?\n/);
    const output = [];
    for (let index = 0; index < lines.length; index++) {
        const line = lines[index];
        if (line.startsWith('```')) {
            const code = [];
            while (++index < lines.length && !lines[index].startsWith('```')) code.push(lines[index]);
            output.push(`<pre><code>${escape(code.join('\n'))}</code></pre>`);
        } else if (/^#{1,6} /.test(line)) {
            const [, hashes, title] = line.match(/^(#{1,6}) (.*)$/);
            const level = Math.min(hashes.length + 1, 6);
            output.push(`<h${level}>${inline(title)}</h${level}>`);
        } else if (line.startsWith('|') && /^\|[\s:|-]+\|\s*$/.test(lines[index + 1] ?? '')) {
            const cells = row => row.trim().replace(/^\||\|$/g, '').split('|');
            const headers = cells(line);
            index++;
            const rows = [];
            while (lines[index + 1]?.startsWith('|')) rows.push(cells(lines[++index]));
            output.push(`<div class="table-scroll"><table><thead><tr>${headers.map(cell => `<th>${inline(cell.trim())}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${row.map(cell => `<td>${inline(cell.trim())}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);
        } else if (/^[-*] /.test(line)) {
            const items = [line.slice(2)];
            while (/^[-*] /.test(lines[index + 1] ?? '')) items.push(lines[++index].slice(2));
            output.push(`<ul>${items.map(item => `<li>${inline(item)}</li>`).join('')}</ul>`);
        } else if (line.trim()) {
            output.push(`<p>${inline(line)}</p>`);
        }
    }
    return output.join('\n');
}
const guides = await Promise.all([['readme', 'README.md', 'Getting started'], ['endpoints', 'docs/ENDPOINTS.md', 'Endpoint guide'], ['integrations', 'docs/INTEGRATIONS.md', 'Framework integrations']].map(async ([id, path, title]) => `<section id="guide-${id}" class="guide"><h2>${title}</h2>${markdown(await readFile(resolve(root, path), 'utf8'))}</section>`));
const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>RiftJS API documentation</title>
<style>
:root{color-scheme:light dark;--bg:#f5f7fa;--panel:#fff;--text:#172338;--muted:#52647a;--line:#d6dfe9;--link:#0758a8}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:16px/1.6 system-ui,sans-serif}a{color:var(--link)}aside{position:fixed;inset:0 auto 0 0;width:260px;overflow:auto;background:var(--panel);padding:24px;border-right:1px solid var(--line)}aside a{display:block;margin:8px 0;text-decoration:none}main{max-width:1200px;margin-left:260px;padding:36px}h1,h2,h3{line-height:1.3}h2 span,.metadata,.version{color:var(--muted);font-size:14px}section,article{scroll-margin-top:20px}.member{padding:8px 0 20px;border-bottom:1px solid var(--line)}.member h3 a{text-decoration:none}pre{padding:16px;background:var(--panel);border:1px solid var(--line);border-radius:8px;overflow:auto;white-space:pre-wrap;overflow-wrap:anywhere;font:14px/1.6 ui-monospace,monospace}code{font-family:ui-monospace,monospace}input{width:100%;padding:12px;border:1px solid var(--line);border-radius:6px;font:inherit;background:var(--panel);color:var(--text)}.api-section,.guide{margin:40px 0}.table-scroll{overflow:auto}table{border-collapse:collapse;font-size:14px}td,th{text-align:left;vertical-align:top;padding:10px;border:1px solid var(--line)}[hidden]{display:none!important}@media(prefers-color-scheme:dark){:root{--bg:#101925;--panel:#192536;--text:#e2eaf4;--muted:#a7b8cd;--line:#35475d;--link:#87bcff}}@media(max-width:760px){aside{position:static;width:auto;max-height:260px;border-right:0;border-bottom:1px solid var(--line)}main{margin:0;padding:20px}}
</style></head><body><aside><strong>RiftJS</strong><div class="version">v${escape(manifest.version)} · Offline API docs</div><a href="#overview">Overview</a><a href="#guide-readme">Getting started</a><a href="#guide-endpoints">Endpoint guide</a><a href="#guide-integrations">Framework integrations</a><hr>${exports.map(symbol => `<a href="#${anchor(symbol.name)}">${escape(symbol.name)}</a>`).join('')}</aside><main><header id="overview"><h1>RiftJS API documentation</h1><p>Browse all ${catalog.length} Riot operations, convenience methods, Data Dragon, options, and public types. Signatures are generated from the package source. Object responses use broad types; they are not validated at runtime.</p><p>The SDK runs on your Node.js server. Keep Riot keys and RSO tokens in server code. This viewer works offline and does not make API requests.</p><label for="search">Search API names, signatures, paths, or endpoint IDs</label><input id="search" type="search" placeholder="Try getMatch, tournament, or EndpointOptions"><p id="results" role="status" aria-live="polite"></p></header>${reference}${guides.join('')}</main>
<script>
const search = document.getElementById('search');
const sections = [...document.querySelectorAll('.api-section')];
const status = document.getElementById('results');
search.addEventListener('input', () => {
    const query = search.value.trim().toLowerCase();
    let matches = 0;
    for (const section of sections) {
        const titleMatches = section.querySelector('h2').textContent.toLowerCase().includes(query);
        const members = [...section.querySelectorAll('.searchable')];
        for (const member of members) {
            member.hidden = Boolean(query) && !titleMatches && !member.textContent.toLowerCase().includes(query);
            if (!member.hidden) matches++;
        }
        section.hidden = Boolean(query) && !titleMatches && members.every(member => member.hidden);
    }
    document.querySelectorAll('.guide').forEach(guide => { guide.hidden = Boolean(query); });
    status.textContent = query ? matches + ' matching API entries. Clear search to show guides.' : '';
});
</script></body></html>`;
await mkdir(resolve(root, 'dist/docs'), { recursive: true });
await writeFile(resolve(root, 'dist/docs/index.html'), html);
console.log(`Built offline API docs for ${exports.length} exports and ${catalog.length} endpoints.`);
