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
// A local scope mapping can override --registry, so set both explicitly.
const registryArgs = [`--registry=${registry}`, `--${name.split('/')[0]}:registry=${registry}`];
const npm = (...args) => execFileSync('npm', args, { stdio: 'inherit' });
// Tags are authoritative; keep both manifests in the published package in sync.
npm('pkg', 'set', `name=${name}`);
npm('version', version, '--no-git-tag-version', '--allow-same-version', '--ignore-scripts');
const result = spawnSync('npm', ['view', `${name}@${version}`, '--json', ...registryArgs], { encoding: 'utf8' });
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
  // Do not require npm whoami: OIDC authentication is negotiated by npm publish.
  const published = spawnSync('npm', ['publish', '--access', 'public', ...registryArgs], { stdio: 'inherit' });
  if (published.error) throw published.error;
  if (published.status !== 0) {
    if (registry === 'https://registry.npmjs.org') {
      console.error('npm publishing failed. An E404 on PUT can mean authorization was rejected, even when the package exists.');
      console.error('Configure the npm trusted publisher for Timmsy1998/RiftJS, workflow publish.yml, with npm publish allowed; or replace NPM_TOKEN with a valid granular token granting package read/write and bypassing 2FA.');
      console.error('See MAINTAINER_NOTES.md for setup. A public npm view succeeding does not verify publish permission.');
    } else {
      console.error('GitHub Packages publishing failed. Check GITHUB_TOKEN packages: write and package access for this repository.');
    }
    process.exit(published.status ?? 1);
  }
}
