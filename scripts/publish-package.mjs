import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { parseVersion } from './release-version.mjs';

const tag = process.env.RELEASE_TAG;
if (!tag?.startsWith('v')) throw new Error('RELEASE_TAG must be a stable v-prefixed version');
const version = tag.slice(1);
parseVersion(version);
const registry = process.env.RELEASE_REGISTRY;
const names = {
  'https://registry.npmjs.org': '@timmsy/riftjs',
  'https://npm.pkg.github.com': '@timmsy1998/riftjs',
};
const name = names[registry];
if (!name) throw new Error('Unsupported release registry');
const npm = (...args) => execFileSync('npm', args, { stdio: 'inherit' });
// Tags are authoritative; keep both manifests in the published package in sync.
npm('pkg', 'set', `name=${name}`);
npm('version', version, '--no-git-tag-version', '--allow-same-version', '--ignore-scripts');
const result = spawnSync('npm', ['view', `${name}@${version}`, '--json', `--registry=${registry}`], { encoding: 'utf8' });
if (result.error) throw result.error;
if (result.status === 0) {
  const published = JSON.parse(result.stdout);
  const sha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  if (published.gitHead !== sha) throw new Error(`${name}@${version} already exists with a different or unknown commit`);
  console.log(`${name}@${version} is already published from this commit; skipping`);
} else {
  // Authentication/network errors must not be mistaken for an unpublished version.
  let error;
  try { error = JSON.parse(result.stdout).error; } catch { /* Report the command failure below. */ }
  if (error?.code !== 'E404') {
    process.stderr.write(result.stderr);
    throw new Error(`Could not check ${name}@${version} in ${registry}`);
  }
  const manifest = JSON.parse(readFileSync('package.json', 'utf8'));
  if (manifest.version !== version || manifest.name !== name) throw new Error('Release manifest mismatch');
  npm('publish', '--access', 'public', `--registry=${registry}`);
}
