# Agent instructions

## Commands

- Requires Node.js 22+ because the server uses experimental `node:sqlite`.
- `npm run dev` starts the API and Vite together; use `npm run dev:server` or `npm run dev:web` for one side.
- `npm run build` creates `dist/`; `npm run start` runs the production Express server and serves `dist/` when present.
- Verify changes with `npm run typecheck`, `npm test`, and `npm run build`. Run one test with `npx vitest run test/unit.test.ts -t "computeBalance"`.
- `.env` controls `PORT` and `UI_PORT`; defaults are API `3001` and Vite `5175`. Vite proxies `/api` to the API port.

## Structure

- This is one npm package: `src/` is the React/Vite frontend, `server/` is the Express API and SQLite persistence, and `shared/` contains schemas, fixed categories, and balance logic used by both.
- `server/index.ts` runs migrations and conditional seed data before creating the app. `server/app.ts` mounts `/api/accounts`, `/api/transactions`, `/api/dashboard`, and `/api/sync`.
- Frontend pages are thin; feature behavior is in `src/components/{accounts,dashboard,transactions,settings}`. API access and TanStack Query mutations live in `src/lib/api.ts` and `src/lib/queries.ts`.

## Domain constraints

- `shared/balance.ts` is the single source of truth for balance changes; keep it pure and use `computeBalance()` before transaction writes.
- Monetary values are integer Rupiah only. For multi-statement writes, use `withTransaction()` from `server/transaction.ts` so the transaction insert and account balance update commit atomically.
- `TABUNGAN`: `DEBIT` adds and `KREDIT` subtracts; reject a negative result with `INSUFFICIENT_BALANCE`. `HUTANG_MODAL`: `KREDIT` increases debt and `DEBIT` pays it down, clamped at zero.
- Transactions are soft-deleted with `deleted_at`; accounts are archived with `status`. Categories are the fixed validated list in `shared/categories.ts`.
- `PRD.md` is authoritative for business behavior and data rules. The UI intentionally uses Indonesian/Dutch labels and capitalized enum values; do not anglicize them.

## Persistence and testing

- The SQLite database is under `server/data/` and is ignored; a fresh database is migrated and seeded on first start. Do not treat the local database as source code.
- Google Sheets sync is webhook-based and fire-and-forget after local transaction creation; sync failure must not roll back the local save.
- Tests are currently unit tests in `test/unit.test.ts` covering pure balance, formatting, CSV safety, and schemas; route and database writes have no automated coverage, so inspect handlers when changing them.
- `README.md` contains stale commands and dependencies; trust `package.json`, the code, and `CLAUDE.md` instead.

See `CLAUDE.md` for the fuller verified architecture and business-rule notes.
