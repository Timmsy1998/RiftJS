import { execFileSync } from 'node:child_process';
import { appendFileSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export function parseVersion(value) {
  if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(value)) {
    throw new Error(`Invalid stable version: ${value}`);
  }
  return value.split('.').map(Number);
}

export function compareVersions(left, right) {
  const a = parseVersion(left), b = parseVersion(right);
  for (let index = 0; index < 3; index++) {
    if (a[index] !== b[index]) return a[index] - b[index];
  }
  return 0;
}

export function nextVersion(previous, minimum, commits) {
  parseVersion(minimum);
  let bump = -1;
  for (const message of commits) {
    if (/^[\w-]+(?:\([^\n)]+\))?!:/.test(message) || /^BREAKING[ -]CHANGE:\s/m.test(message)) bump = Math.max(bump, 2);
    else if (/^feat(?:\([^\n)]+\))?:/.test(message)) bump = Math.max(bump, 1);
    else if (/^(?:fix|perf)(?:\([^\n)]+\))?:/.test(message) || /^chore\(deps(?:-dev)?\):/.test(message)) bump = Math.max(bump, 0);
  }
  if (bump < 0) return null;
  if (!previous) return minimum;
  const parts = parseVersion(previous);
  const index = 2 - bump;
  parts[index]++;
  for (let lower = index + 1; lower < 3; lower++) parts[lower] = 0;
  const calculated = parts.join('.');
  return compareVersions(calculated, minimum) < 0 ? minimum : calculated;
}

export function releasePlan(cwd = process.cwd()) {
  const git = (...args) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
  const tags = git('tag', '--merged', 'HEAD').split('\n')
    .filter(tag => /^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(tag))
    .sort((a, b) => compareVersions(a.slice(1), b.slice(1)));
  const latest = tags.at(-1);
  // A retry must publish the original tag, even after tag creation succeeded.
  if (latest && git('rev-list', '-n', '1', latest) === git('rev-parse', 'HEAD')) {
    return { tag: latest, create: false };
  }
  const commits = git('log', '--format=%B%x00', latest ? `${latest}..HEAD` : 'HEAD')
    .split('\0').map(message => message.trim());
  const minimum = JSON.parse(readFileSync(`${cwd}/package.json`, 'utf8')).version;
  const version = nextVersion(latest?.slice(1), minimum, commits);
  if (!version) return { tag: '', create: false };
  const tag = `v${version}`;
  // A tag on another branch must never be replaced.
  if (git('tag', '--list', tag)) throw new Error(`Release tag ${tag} already exists outside this history`);
  return { tag, create: true };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const plan = releasePlan();
  console.log(JSON.stringify(plan));
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `tag=${plan.tag}\ncreate=${plan.create}\n`);
  }
}
