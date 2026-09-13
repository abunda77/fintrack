# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # API (tsx watch) + Vite concurrently
npm run dev:server   # API only, runs server/index.ts against .env
npm run dev:web      # Vite UI dev server only
npm run build        # vite build → dist/ (static bundle)
npm run start        # prod mode: Express serves dist/
npm test             # vitest run (test suite)
npm run typecheck    # tsc --noEmit
```

Single test: `npx vitest run test/unit.test.ts -t "computeBalance"` (the `-t` pattern filters by describe/it name). All tests currently live in `test/unit.test.ts`.

Ports come from `.env` — `PORT` (API) and `UI_PORT` (Vite). Defaults are `3001`/`5175`; the checked-in `.env` sets `3005`/`5175`. Vite proxies `/api` to the API port, so the UI and API share an origin in dev.

App access is protected by a single username/password pair from `.env`: `AUTH_USERNAME` and `AUTH_PASSWORD` (required — the server fails fast at startup if either is missing), plus optional `AUTH_SECRET` (HMAC key for the session cookie; derived from the credentials when unset) and `AUTH_SESSION_HOURS` (default 168 = 7 days). Change the defaults in `.env` before deploying.

## Architecture

One npm package, three layers that all import from each other via relative paths:

- **`src/`** — React 19 + Vite 6 + Tailwind 4 frontend
- **`server/`** — Express API on `node:sqlite` (not better-sqlite3, despite the README)
- **`shared/`** — the contract between them, imported by both: Zod schemas (`schemas.ts`), the fixed category list (`categories.ts`), and all balance math (`balance.ts`)

**`shared/balance.ts` is the single source of truth for balance rules.** `computeBalance()` is a pure function: the server calls it before every transaction write and the unit tests pin its behavior (PRD §7.1/7.2). Never compute balances or mutate state inside `shared/`.

**Server flow:** `server/index.ts` runs `assertAuthConfigured()`, then `migrate()` + `seedIfEmpty()` (seeds 12 accounts + a "Saldo Awal" transaction each, only when accounts is empty), then `createApp()` from `server/app.ts`, which wires `/api/auth` (public login/logout/session), applies `requireAuth` to the rest of `/api`, mounts the four data routers (`/api/accounts`, `/api/transactions`, `/api/dashboard`, `/api/sync`), serves `dist/` in prod, and ends with the error middleware. `/api/health` stays public.

**Auth (`server/auth.ts` + `server/routes/auth.ts`):** stateless HMAC-signed session cookie (`fintrack_session`, HttpOnly, SameSite=Lax, `Secure` when `NODE_ENV=production`); no server-side session store. Credentials are compared with `timingSafeEqual`; login is rate-limited in memory (10 attempts / 15 min per IP). On the client, `src/app/auth-context.tsx` holds the session, `src/lib/api.ts` fires a `fintrack:unauthorized` window event on any `401` (so an expired session drops back to the login page), and `src/pages/login-page.tsx` is shown by `src/app/router.tsx` until authenticated.

**DB conventions (node:sqlite):** synchronous `DatabaseSync`, WAL + FK on. All monetary values are integers (integer Rupiah — no decimals, ever). node:sqlite returns INTEGER columns as `number | bigint`, so row types are read with the established cast pattern: `SELECT ... AS camelCase` aliases (see `SELECT_COLS`) and `as unknown as TxRow[]`. Multi-statement writes (insert transaction + update account balance) must run inside `withTransaction()` (`BEGIN IMMEDIATE`/`COMMIT`/`ROLLBACK`) from `server/transaction.ts` — see the POST handlers in `server/routes/transactions.ts` and `accounts.ts`.

**Business rules (spec: `PRD.md`):**
- Account types `TABUNGAN` (savings) and `HUTANG_MODAL` (debt). For TABUNGAN: `DEBIT` adds, `KREDIT` subtracts, and a negative balance is rejected with 422 `INSUFFICIENT_BALANCE`. For HUTANG_MODAL: `KREDIT` adds a new loan, `DEBIT` pays it down (clamped at 0).
- Transactions are soft-deleted via `deleted_at` (the dashboard "clear history" action soft-deletes all); accounts use `status` `ACTIVE`/`ARCHIVED`. Deleting an account is only allowed if it has no transactions and is not the seeded default — otherwise archive it.
- Categories are a fixed list of 8 validated server-side (from `shared/categories.ts`).

**Google Sheets sync (`server/sync/sheets.ts`):** push/pull against a webhook endpoint; after creating a transaction the push is fire-and-forget — sync failure never rolls back the local save (PRD §6.6). State lives in `sync_settings` + `sync_logs`.

**Frontend data layer:** `src/lib/api.ts` is the fetch wrapper (throws `ClientError` with `code`/`fieldErrors` from the API error shape); `src/lib/queries.ts` exposes typed TanStack Query hooks — every mutation invalidates the `dashboard`, `accounts`, and `transactions` query keys. `src/lib/format.ts` owns IDR formatting (`Rp 1.500.000`, `id-ID` locale, digit-stripping input parsing). Pages in `src/pages/` are thin; behavior lives in `src/components/{accounts,dashboard,transactions,settings}` and shadcn/radix primitives in `src/components/ui/`. Routes use React Router v7 (`element`/`Outlet`/`Navigate`); `@` aliases to `./src`.

## Conventions & gotchas

- **The UI language is intentional.** All user-facing strings — Indonesian and Dutch pseudo-locale ("Pengaturan", "Nama Akun", "Saldo Awal", "Rekening/pos") — and the capitalized enum values are deliberate; don't anglicize or "fix" them.
- `PRD.md` is the authoritative spec with numbered sections (7.x business rules, 9 data model, 11.4 Rupiah format, 14 CSV export safety). Reference the section numbers when changing behavior.
- Requires Node 22+ — `node:sqlite` is experimental and prints an ExperimentalWarning at startup.
- `server/data/` (the SQLite file), `dist/`, and `.env` are gitignored. A fresh clone seeds its own database on first boot. Auth credentials live only in `.env` — `.env.example` documents the keys with empty values.
- Tests cover only the pure logic (balance rules, IDR format, CSV safety, schemas). The Express routes and DB writes have no coverage — live change semantics there by reading the route handlers.
- The README is stale in spots (better-sqlite3, Jest, port 3001) — trust the code and `.env` over it.