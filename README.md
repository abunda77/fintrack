# FinTrack

FinTrack is a personal finance web application built with a modern **React 19** frontend, an **Express 3001** backend API, and **SQLite** for data storage. It targets users in Indonesia and the Netherlands, featuring a bilingual UI that intentionally blends Indonesian and Dutch language elements.

## Features
- Track income, expenses, and account balances
- Visualize spending trends and net worth over time
- Manage multiple accounts and categories
- Responsive design for desktop and mobile browsers
- Simple, secure authentication (future‑ready)

## Tech Stack
- **Frontend:** React 19 (TypeScript), Vite, Tailwind CSS
- **Backend:** Express 3001 (Node.js), TypeScript
- **Database:** SQLite (via `better-sqlite3`)
- **Development Environment:** Laragon on Windows 11

## Getting Started
### Prerequisites
- **Node.js** (>=18)
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

### Running in Development
```bash
# Start the backend API
npm run dev:api   # runs on http://localhost:3001

# Start the frontend dev server
npm run dev       # runs on http://localhost:5173
```
The app will be available at `http://localhost:5173` and will communicate with the API at `http://localhost:3001`.

### Building for Production
```bash
npm run build       # creates a static bundle in ./dist
npm run start       # serves the built app with the Express server
```

### Testing
```bash
# Run the test suite (Jest + React Testing Library)
npm test
```

## Project Structure
```
src/
  components/        # React UI components
  pages/             # Top‑level page components
  services/          # API client wrappers
  store/             # State management (if applicable)
server/
  routes/            # Express route handlers
  db/                # SQLite initialization and migrations
```

## Contributing
Contributions are welcome! Please open an issue or submit a pull request. Follow the existing coding style, run `npm test` before committing, and ensure your changes are documented where appropriate.

## License
MIT License – see the `LICENSE` file for details.

---
*Generated with [C‍laude Code](https://claude.com/c‍laude-code)*
By ERIE PUTRANTO - JOGJA
