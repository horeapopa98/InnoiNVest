# InnoINVest

Regional data source-of-truth for NW Romania. Built for the ADR Nord-Vest
"AI-Powered Regional Investment Intelligence" challenge.

ADR analysts type a commune, city, or county name -> see all KPIs grouped by
the brief categories -> explore intelligence pages, chat with an AI agent, and
build investment report decks.

## Stack

- `backend/` — Node.js / Express API with Sequelize over PostgreSQL. Exposes a
  REST API under `/api` and Swagger docs at `/api/docs`. Integrates Google
  Gemini for the chat/agent features and an MCP server.
- `frontend/` — Next.js 15 (App Router) app that consumes the backend API.
- `docs/` — design specs, plans, and the data-category catalog.

## Prerequisites

- Node.js 22 (`nvm use 22`)
- A running PostgreSQL instance
- A free Google Gemini API key (https://aistudio.google.com) for chat/agent features

## Setup

### 1. Backend (`backend/`)

```
cd backend
cp .env.example .env        # then fill in DATABASE_URL and GEMINI_API_KEY
npm install
npm run seed:population      # import population data
npm run seed:universities    # import university data
npm run dev                  # starts the API on http://localhost:3001
```

With `DB_SYNC=true` (the default in `.env.example`), tables are created from the
Sequelize models on startup. Use `npm run db:sync` to apply schema changes
(`alter`) explicitly.

API docs are served at <http://localhost:3001/api/docs>.

### 2. Frontend (`frontend/`)

```
cd frontend
cp .env.example .env.local 2>/dev/null || echo "NEXT_PUBLIC_API_BASE=http://localhost:3001" > .env.local
nvm use 22
npm install
npm run dev                  # starts the app on http://localhost:3000
```

Then open <http://localhost:3000>. Try typing **Florești** in the picker.

## Backend layout (`backend/src/`)

- `routes/` + `controllers/` — HTTP layer (`/api/resources`, `/reports`,
  `/cities`, `/properties`, `/chat`, `/agents`, `/investment-report`)
- `services/` — business logic (cities, reports, population, universities, chat)
- `models/` — Sequelize models (`Population`, `University`, `Report`, `User`)
- `repositories/connectors/` — external data connectors
- `seeders/` — population + university data seeders
- `agents/` + `mcp/` — AI agent runner and MCP server

## Frontend layout (`frontend/src/`)

- `app/` — Next.js App Router pages
- `components/` — UI components
- `lib/` — client utilities and mock data

## Scripts

Backend (`backend/`):

```
npm run dev                  # API with nodemon
npm start                    # API (node)
npm run mcp                  # MCP server
npm run db:sync              # apply model schema changes (alter)
npm run seed:population[:force]
npm run seed:universities[:force]
```

Frontend (`frontend/`):

```
npm run dev / build / start
npm run lint
npm test                     # vitest
```

## Design & Plans

- `docs/superpowers/specs/`
- `docs/superpowers/plans/`
- `docs/data-categories.md`
