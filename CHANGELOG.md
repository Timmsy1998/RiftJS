# Changelog

## 4.0.0 — unreleased

- Add all 53 operations in the current Riot League of Legends/shared Account reference, including Tournament V5, Tournament Stub V5, RSO match access, replays, champion mastery, challenges, Clash, spectator, rotations, and status.
- Add a frozen endpoint catalog, restricted generic dispatcher, typed arguments and tournament bodies, explicit routing options, and cancellation.
- Protect credentials using JavaScript private fields, allowlisted HTTPS hosts, disabled redirects, finite timeouts, encoded paths, and sanitized errors.
- Add configurable local rate windows, Riot application/method header tracking, persistent 429 cooldowns, and bounded retries for safe GETs. Mutations never retry automatically.
- Correct SEA Account routing to Asia and validate tournament bodies and match pagination.
- Add offline tests, public-reference drift checks, CI, dependency update configuration, and published endpoint documentation.
- Update Axios and dotenv dependencies.

Breaking changes: Node.js 22+ is required; the public API key/raw client are no longer exposed; Riot errors omit raw upstream messages; all Riot requests now have default rate pacing, timeouts, and retries. `npm test` is offline; use `npm run test:endpoints` for live smoke checks. Existing convenience method signatures remain supported.
