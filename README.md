# FinTrack

FinTrack is a personal finance web application built with a modern **React 19** frontend, an **Express 4** backend API, and **SQLite** for data storage. It targets users in Indonesia and the Netherlands, featuring a bilingual UI that intentionally blends Indonesian and Dutch language elements. Access to the app is protected by a username/password stored in environment variables.

## Features
- Track income, expenses, and account balances
- Visualize spending trends and net worth over time
- Manage multiple accounts and categories
- Responsive design for desktop and mobile browsers
- Username/password authentication with a signed, HttpOnly session cookie

## Tech Stack
- **Frontend:** React 19 (TypeScript), Vite, Tailwind CSS
- **Backend:** Express 4 (Node.js), TypeScript
- **Database:** SQLite via Node's built-in `node:sqlite` (Node 22+)
- **Development Environment:** Laragon on Windows 11

## Getting Started
### Prerequisites
- **Node.js** (>=22, required for the experimental `node:sqlite` module)
- **npm** (or `yarn`)
- **Laragon** (optional, for easy local server management)

### Installation
```bash
# Clone the repository
git clone <repo-url>
cd keuangan-pribadi

# Install dependencies
npm install
```

### Environment Variables
Create a `.env` file in the project root (see `.env.example`).

| Variable | Required | Description |
| --- | --- | --- |
| `PORT` | No | API server port (default `3001`) |
| `UI_PORT` | No | Vite dev server port (default `5175`) |
| `AUTH_USERNAME` | **Yes** | Username for app access |
| `AUTH_PASSWORD` | **Yes** | Password for app access |
| `AUTH_SECRET` | No | HMAC key for the session cookie; derived from credentials if empty |
| `AUTH_SESSION_HOURS` | No | Session lifetime in hours (default `168` = 7 days) |

Example `.env`:

```dotenv
PORT=3001
UI_PORT=5175
AUTH_USERNAME=admin
AUTH_PASSWORD=change-me
AUTH_SECRET=generate-a-long-random-string
AUTH_SESSION_HOURS=168
```

The server refuses to start if `AUTH_USERNAME` or `AUTH_PASSWORD` is missing. Change the credentials before deploying.

### Running in Development
```bash
# Start API + Vite together (recommended)
npm run dev

# Or run one side only
npm run dev:server   # API only (http://localhost:3001)
npm run dev:web      # Vite UI only (http://localhost:5175)
```
The UI will be available at `http://localhost:5175` and proxies `/api` to the API server. Log in with the credentials from `.env`.

### Building for Production
```bash
npm run build       # creates a static bundle in ./dist
npm run start       # serves the built app with the Express server
```

### Testing
```bash
# Run the test suite (Vitest)
npm test

# Type-check the whole project
npm run typecheck
```

## Authentication

- Credentials live only in `.env` (`AUTH_USERNAME`, `AUTH_PASSWORD`) and are never committed.
- `POST /api/auth/login` verifies the credentials (constant-time comparison) and issues an HttpOnly, SameSite=Lax session cookie signed with HMAC-SHA256. The cookie is marked `Secure` when `NODE_ENV=production`.
- All `/api/*` routes except `/api/health` and `/api/auth/*` require a valid session; unauthenticated requests receive `401`.
- Login attempts are rate-limited to 10 per 15 minutes per IP.
- The UI shows a login page until authenticated and returns to it when the session expires or is logged out.

## Project Structure
```
src/
  app/               # Providers, router, auth context
  components/        # UI: accounts, dashboard, transactions, settings, layout, ui primitives
  pages/             # Route pages (dashboard, settings, login)
  lib/               # API client, TanStack Query hooks, formatting
server/
  app.ts             # Express app wiring + auth middleware
  auth.ts            # Session cookie signing & credential checks
  routes/            # accounts, transactions, dashboard, sync, auth
  sync/              # Google Sheets integration
  db.ts              # SQLite init, migrations, seed
shared/              # Zod schemas, categories, balance rules
```

## Contributing
Contributions are welcome! Please open an issue or submit a pull request. Follow the existing coding style, run `npm test` before committing, and ensure your changes are documented where appropriate.

## License
MIT License – see the `LICENSE` file for details.

---
*Generated with [C‍laude Code](https://claude.com/c‍laude-code)*
By ERIE PUTRANTO - JOGJA
