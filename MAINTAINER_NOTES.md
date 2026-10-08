# Maintainer notes

The package wraps Riot's public League of Legends and shared Account APIs. Keep named methods stable, endpoint routing explicit, and credentials confined to the private transport. Do not add arbitrary URL or raw Axios configuration escape hatches that bypass host, redirect, authentication, or error protections.

## Source and endpoint updates

`src/` is the source of truth. `dist/` is ignored build output; `prepack` generates it for npm. Commit source, tests, docs, and the lockfile using cohesive conventional tags such as `feat:`, `fix:`, `test:`, and `docs:`. Never commit credentials or `.env` files.

The build also generates `dist/docs/index.html` from the TypeScript public exports, endpoint catalog, README, and Markdown guides. It is a standalone offline viewer shipped with the package. `npm run docs` builds and opens it; `npm run docs:build` only regenerates the HTML. The `riftjs-docs` executable serves only that HTML on the loopback interface and supports `--no-open` and `--port`. No compiler or documentation dependencies are needed to view an installed package's docs. Keep method descriptions in source JSDoc and usage explanations in the Markdown guides.

Run `npm run check:coverage` to compare the local catalog with Riot's official reference. The weekly workflow detects missing, changed, and removed operations and fails if Riot's reference format changes; it does not automatically modify code. For each change:

1. Review the official operation's path, HTTP method, routing, query/body schema, authentication, and return value.
2. Update `src/endpoints/catalog.json`, `complete-types.ts`, and validation in `complete.ts` as needed. Update `types.ts` and legacy aliases when affected.
3. Update `docs/ENDPOINTS.md`, README examples, and CHANGELOG. Do not silently retain an endpoint that Riot has removed.
4. Extend offline tests for changed behavior, especially authentication, method buckets, mutations, and routing. Do not create tournaments in CI or bulk-probe live APIs.

Object responses currently use broad records. Avoid promising exhaustive DTO validation or universal key access. Real tournament and RSO access require Riot approval.

## Transport invariants

Reuse one client per key/process; the limiter is not distributed. Per-host serialization protects rate reservations. Local caps complement application/method headers, and 429 cooldowns persist even after failed calls. Mutations must never retry automatically. Keep timeouts, cancellation, retry bounds, and sanitized errors intact. No credentials in query strings, error payloads, serialized clients, or redirects.

## Release checklist

1. `npm ci` and `npm test` (includes strict consumer type checks).
2. `npm run test:integrations` on a current Node 22 or 24 patch to validate installed ESM/CommonJS exports and Next.js/Nuxt production routes; then `npm run check:coverage` against Riot's current reference.
3. `npm audit` and review dependency update PRs. Investigate advisories; do not run force upgrades blindly.
4. `npm pack --dry-run` and inspect package contents for declarations, catalog, docs, and absence of secrets. Smoke-test an installed tarball.
5. If credentials are available, run `npm run test:endpoints` for read-only smoke validation. Record which restricted APIs remain unverified.
6. Review breaking changes and semver and commit cohesive changes. Merging release-worthy commits to `main` enables the automatic release process below.

## Automatic releases

After the complete CI workflow succeeds for a push to `main`, `Publish package` derives the next stable version from commits since the highest reachable stable `vX.Y.Z` tag:

- `fix:`, `perf:`, and `chore(deps):` / `chore(deps-dev):` produce a patch release.
- `feat:` produces a minor release.
- A `!` after the type/scope or a `BREAKING CHANGE:` / `BREAKING-CHANGE:` footer produces a major release.
- Docs, tests, CI, and other maintenance commits alone do not release. The largest bump wins when changes are combined.

The source `package.json` version is the minimum release version, currently `4.0.0`, so the pending v4 work is released as `v4.0.0` rather than v3.2. Tags are authoritative after that: the publish job automatically sets the package and lockfile versions from the tag in its checkout. No manual version edits or tag pushes are needed for normal releases. The repository manifest may retain its minimum version between releases.

The workflow tags the exact tested commit, skips CI runs superseded by a newer `main`, and publishes independently to npm (`@timmsy/riftjs`) and GitHub Packages (`@timmsy1998/riftjs`). It runs the publish jobs directly because tags created with `GITHUB_TOKEN` do not trigger another workflow. Release runs are serialized. Rerun a failed publish job to retry the same tag; a registry already containing that version from the same commit is skipped. Authentication or network failures and versions belonging to another commit fail explicitly.

For npm, configure a trusted publisher in the settings for `@timmsy/riftjs` on npmjs.com. Select GitHub Actions and enter user **Timmsy1998**, repository **RiftJS**, workflow filename **publish.yml**, and leave environment blank. Allow direct **npm publish** (stage-only permission is insufficient). These fields are case sensitive. Complete the first publish within two days of adding the publisher. The workflow grants `id-token: write` and installs npm 11 for OIDC support; npm automatically tries OIDC before token authentication. See [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/).

As a fallback, configure the `NPM_TOKEN` repository secret with a valid granular npm token granting **read and write (publish)** for `@timmsy/riftjs` and **bypass 2FA** for unattended publishing. Check its expiry and the package's publishing policy. A public `npm view` succeeding does not validate write access; an `E404` on publish can indicate rejected authorization. If GitHub Packages succeeds while npm fails, check the npm trusted publisher or token settings. These account settings cannot be repaired by changing the package version.

GitHub Packages uses the workflow's `GITHUB_TOKEN`. Repository Actions settings must allow the release job to write tags. Stable tags pushed manually still run the publish checks, and their versions are copied into the published manifests. A rerun of an old release checks out its original tag, including the old publish script, so repository fixes take effect on the next release after merging them.

GitHub Actions and Dependabot only maintain this project after these files are pushed and workflows are enabled. Schedule failures require a maintainer to investigate and make reviewed updates.
