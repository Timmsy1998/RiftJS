# Maintainer notes

The package wraps Riot's public League of Legends and shared Account APIs. Keep named methods stable, endpoint routing explicit, and credentials confined to the private transport. Do not add arbitrary URL or raw Axios configuration escape hatches that bypass host, redirect, authentication, or error protections.

## Source and endpoint updates

`src/` is the source of truth. `dist/` is ignored build output; `prepack` generates it for npm. Commit source, tests, docs, and the lockfile using cohesive conventional tags such as `feat:`, `fix:`, `test:`, and `docs:`. Never commit credentials or `.env` files.

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
2. `npm run check:coverage` against Riot's current reference.
3. `npm audit` and review dependency update PRs. Investigate advisories; do not run force upgrades blindly.
4. `npm pack --dry-run` and inspect package contents for declarations, catalog, docs, and absence of secrets. Smoke-test an installed tarball.
5. If credentials are available, run `npm run test:endpoints` for read-only smoke validation. Record which restricted APIs remain unverified.
6. Review breaking changes and semver, commit cohesive changes, and follow the repository's release process. Publishing is a separate authorized action.

GitHub Actions and Dependabot only maintain this project after these files are pushed and workflows are enabled. Schedule failures require a maintainer to investigate and make reviewed updates.
