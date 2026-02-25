# Maintainer Notes

These are personal notes for future maintenance. They are intentionally direct.

## Project intent

- Keep this package small and predictable.
- The goal is to provide a thin wrapper around Riot endpoints, not an abstraction framework.
- Prefer explicit methods over clever generic request builders.

## API stability

- Avoid breaking constructor behavior in `RiotAPI` and `DataDragon`.
- Keep method names stable unless there is a strong reason to change them.
- If a method signature changes, update:
  - `src/types.ts`
  - `README.md`
  - `src/test-endpoints.ts`

## TypeScript expectations

- Source of truth is always `src/`.
- `dist/` is build output, committed for npm consumers and transparency.
- Keep strict typing on, and do not weaken it just to silence compiler warnings.

## Error handling stance

- Error messages should stay readable in terminal logs.
- `RiotAPI` should keep returning normalized `Error` messages.
- Data Dragon wrappers should preserve the root error message.

## Rate limit and pacing

- Multi-request methods exist because Riot rate limits are easy to hit.
- Keep pacing defaults conservative unless usage data says otherwise.
- If defaults change, call it out clearly in changelog and README.

## Release checklist (quick)

1. Run `npm run build`
2. Run `npm test`
3. Verify `README.md` examples still match real method signatures
4. Verify `package.json` points to `dist/index.js` and `dist/index.d.ts`
5. Commit source and matching `dist` output together

## Notes to self

- Keep docs practical. Most users want a working snippet first.
- Do not overcomplicate return types until there is clear demand.
- If Riot deprecates an endpoint, mark it clearly and provide migration guidance.
