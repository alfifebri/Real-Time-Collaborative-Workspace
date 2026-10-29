# Real-Time Collaborative Workspace

[![Next.js](https://img.shields.io/badge/Next.js-15.5-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Upstash Redis](https://img.shields.io/badge/Upstash-Redis-00E9A3?style=for-the-badge&logo=redis&logoColor=white)](https://upstash.com/)
[![Yjs](https://img.shields.io/badge/Yjs-CRDT-1F2937?style=for-the-badge&logo=yjs&logoColor=white)](https://yjs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)

A production-grade, real-time collaborative workspace for teams that need to write, plan, and organize knowledge together. Built with Next.js, Yjs CRDTs, WebSockets, Upstash Redis, and PostgreSQL, it delivers conflict-free editing, live presence, and a Notion/Figma-style collaborative experience.

---

## Table of Contents

- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Architecture & System Design](#architecture--system-design)
- [Project Structure](#project-structure)
- [Environment Variables](#environment-variables)
- [Getting Started](#getting-started)
- [Available Scripts](#available-scripts)
- [Deployment](#deployment)
- [License & Credits](#license--credits)

---

## Key Features

### Live Presence & Cursor Tracking
Multi-user colored cursors, selection highlights, and avatar stacks powered by Yjs Awareness. See exactly who is viewing or editing a document in real time.

### Rich-Text Collaborative Editing
A TipTap-based editor backed by Yjs CRDTs, providing conflict-free resolution, offline tolerance, and deterministic merging across concurrent edits. Supports headings, tables, task lists, code blocks, callouts, highlights, links, and slash commands.

### Workspace & Page Management
Hierarchical pages with nested documents, favorites, recently edited views, drag-free ordering, icons, and a command palette for fast navigation across workspaces.

### Theme System
First-class Light, Dark, and System themes with persistent preferences, instant switching, and a dark-first default for comfortable long editing sessions.

### Version History, Precise Comments & Granular Permissions
Manual and automatic document snapshots with one-click restore, inline anchored comment threads with replies and resolution state, plus role-based access control (`OWNER`, `ADMIN`, `EDITOR`, `COMMENTER`, `VIEWER`) at both workspace and document level.

### Dual-Mode Architecture
Seamless horizontal real-time synchronization through Upstash Redis Pub/Sub and Streams, with graceful single-node fallback when Redis is unavailable. Documents are durably persisted to PostgreSQL regardless of the real-time transport state.

---

## Tech Stack

| Layer | Technologies |
| --- | --- |
| **Frontend** | Next.js 15 (App Router), React 19, Tailwind CSS 3.4, Lucide Icons, Framer Motion, TipTap |
| **Backend & Real-time** | Next.js API Routes, Node.js WebSocket (`ws`), Yjs CRDT, `y-protocols`, Upstash Redis |
| **Database & ORM** | PostgreSQL (Supabase), Prisma ORM |
| **Auth & Security** | JWT sessions (`jose`), bcrypt password hashing, signed and document-scoped realtime tokens |
| **Tooling** | TypeScript, ESLint, Vitest, `tsx`, Prisma CLI, Docker Compose |

---

## Architecture & System Design

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Browser (Next.js Client)                    │
│   TipTap Editor + Yjs Doc + Awareness (cursors, selections, users)  │
└───────────────┬─────────────────────────────────────┬───────────────┘
                │ HTTPS (REST / Server Actions)       │ WSS (Yjs sync + awareness)
                ▼                                     ▼
┌───────────────────────────────┐       ┌───────────────────────────────┐
│      Next.js App Router       │       │     WebSocket Gateway (ws)    │
│  API Routes + Prisma Client   │       │  Yjs rooms, auth, heartbeat   │
└───────────────┬───────────────┘       └───────────────┬───────────────┘
                │                                       │
                │                                       │ Pub/Sub + Streams
                │                                       ▼
                │                           ┌───────────────────────────┐
                │                           │      Upstash Redis        │
                │                           │  fan-out across nodes     │
                │                           └───────────────┬───────────┘
                │                                           │
                ▼                                           │
┌───────────────────────────────────────────────────────────▼─────────┐
│                     PostgreSQL (Supabase) + Prisma                  │
│     Users, Workspaces, Documents, Permissions, Comments, Versions    │
│            Yjs binary state snapshot (`ydocState`)                  │
└─────────────────────────────────────────────────────────────────────┘
```

### Real-Time Data Flow

1. **Client connects** — The editor requests a short-lived, document-scoped realtime token from the Next.js backend.
2. **WebSocket handshake** — The gateway validates the token, verifies document permissions, and joins the client to a Yjs room for that document.
3. **Local edits** — TipTap produces Yjs updates. Updates are broadcast to all peers in the room and appended to a Redis Stream for replay and cross-node fan-out.
4. **Cross-node synchronization** — Each gateway instance subscribes to the document's Redis Pub/Sub channel, applying remote updates to its local Yjs room.
5. **Presence** — Awareness updates (cursor position, selection, user metadata) flow through the same channel without being persisted as document content.
6. **Durability** — The gateway periodically (every 8 seconds) and on disconnect encodes the full Yjs state and writes it to PostgreSQL via Prisma. If Redis is unavailable, the gateway operates in single-node mode and continues persisting directly to PostgreSQL.

---

## Project Structure

```
FS-02/
├── prisma/
│   ├── migrations/          # Versioned database migrations
│   ├── schema.prisma        # Data model (users, workspaces, documents, ...)
│   └── seed.ts              # Demo data seeding
├── server/
│   ├── ws.ts                # WebSocket gateway, Yjs rooms, auth, persistence
│   └── redis-bridge.ts      # Redis Pub/Sub + Streams bridge with fallback
├── src/
│   ├── app/                 # Next.js App Router pages and API routes
│   ├── components/          # Auth, editor, theme, UI, workspace components
│   ├── hooks/               # Reusable React hooks
│   ├── lib/                 # Auth, permissions, Prisma, realtime tokens, utils
│   └── middleware.ts        # Route protection
├── tests/                   # Vitest suites (CRDT, tokens, roles)
├── docker-compose.yml       # Local PostgreSQL and Redis services
├── .env.example             # Environment variable template
└── package.json
```

---

## Environment Variables

Create a `.env` file in the project root based on `.env.example`.

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL runtime connection string. For Supabase, use the transaction pooler (port `6543`) with `pgbouncer=true`. |
| `DIRECT_URL` | Yes | Direct PostgreSQL connection used by Prisma migrations and introspection (port `5432`). |
| `AUTH_SECRET` | Yes | Secret used to sign authentication and realtime tokens. Use at least 32 random characters. |
| `WS_PORT` | Yes | Port the standalone WebSocket gateway listens on. Defaults to `1234`. |
| `NEXT_PUBLIC_WS_URL` | Yes | Public WebSocket gateway URL used by the browser. Use `wss://` in production. |
| `REDIS_URL` | Recommended | Redis connection string for Pub/Sub and Streams. Omit or leave unreachable to run in single-node mode. |
| `NEXT_PUBLIC_APP_URL` | Yes | Public URL of the Next.js application, used for absolute links and CORS-sensitive flows. |

### `.env.example`

```dotenv
# ---------------------------------------------------------------------------
# PostgreSQL (Supabase, Neon, RDS, or any standard Postgres)
# ---------------------------------------------------------------------------
# Runtime connection. For Supabase use the Transaction pooler (port 6543).
DATABASE_URL="postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"

# Direct connection used by Prisma migrations and introspection (port 5432).
DIRECT_URL="postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres"

# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------
# Generate with: openssl rand -base64 48
AUTH_SECRET="replace-with-a-long-random-string-at-least-32-chars"

# ---------------------------------------------------------------------------
# Redis (Upstash or any standard Redis server)
# ---------------------------------------------------------------------------
# Upstash:  rediss://default:<password>@<endpoint>.upstash.io:6379
# Standard: redis://localhost:6379
REDIS_URL="rediss://default:<password>@<endpoint>.upstash.io:6379"

# ---------------------------------------------------------------------------
# Realtime gateway
# ---------------------------------------------------------------------------
WS_PORT=1234
# Use wss:// and your public gateway host when deployed.
NEXT_PUBLIC_WS_URL="ws://localhost:1234"

# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

> **Tip:** Generate a strong secret with `openssl rand -base64 48` or `node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"`.

---

## Getting Started

### Prerequisites

- **Node.js** 20 or newer
- **npm** 10 or newer
- **PostgreSQL** 15+ (Supabase or local via Docker)
- **Redis** 7+ (optional; Upstash or local via Docker)

### 1. Clone the repository

```bash
git clone https://github.com/alfifebri/Real-Time-Collaborative-Workspace.git
cd FS-02
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Then fill in your PostgreSQL, Redis, and auth values.

### 4. Prepare the database

```bash
npx prisma generate
npx prisma db push
```

Alternatively, apply the included migrations:

```bash
npx prisma migrate deploy
```

Optional demo data:

```bash
npm run db:seed
```

### 5. Start the application

```bash
npm run dev
```

This starts both processes concurrently:

- **Next.js frontend** at `http://localhost:3000`
- **WebSocket gateway** at `ws://localhost:1234` with a health check at `http://localhost:1234/health`

To run them separately:

```bash
npm run dev:web
npm run dev:ws
```

### Optional: Local infrastructure with Docker

```bash
docker compose up -d
```

This provisions PostgreSQL on port `5433` and Redis on port `6379`.

---

## Available Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start Next.js and the WebSocket gateway together. |
| `npm run dev:web` | Start only the Next.js development server. |
| `npm run dev:ws` | Start only the WebSocket gateway in watch mode. |
| `npm run build` | Generate the Prisma client and build the Next.js app. |
| `npm start` | Run the production Next.js server and WebSocket gateway. |
| `npm run lint` | Run ESLint. |
| `npm run typecheck` | Run the TypeScript compiler without emitting files. |
| `npm test` | Run the Vitest test suite. |
| `npm run db:generate` | Generate the Prisma client. |
| `npm run db:push` | Push the Prisma schema to the database. |
| `npm run db:migrate` | Create and apply a development migration. |
| `npm run db:deploy` | Apply pending migrations in production. |
| `npm run db:seed` | Seed demo data. |
| `npm run db:studio` | Open Prisma Studio. |

---

## Deployment

The application is intentionally split into two deployable services: the **Next.js frontend/API** and the **standalone WebSocket gateway**.

### Frontend on Vercel

1. Import the repository into Vercel.
2. Set the framework preset to **Next.js** (build command `npm run build`).
3. Add the following environment variables in **Project Settings → Environment Variables**:
   - `DATABASE_URL`
   - `DIRECT_URL`
   - `AUTH_SECRET`
   - `REDIS_URL`
   - `NEXT_PUBLIC_APP_URL` (your production Vercel URL)
   - `NEXT_PUBLIC_WS_URL` (your deployed gateway URL, using `wss://`)
4. Deploy. Run `npx prisma migrate deploy` against the production database as part of your release process.

> `NEXT_PUBLIC_*` variables are inlined at build time, so redeploy after changing them.


### Production Checklist

- [ ] `AUTH_SECRET` is identical across the frontend and gateway.
- [ ] `NEXT_PUBLIC_WS_URL` uses `wss://` and points to the public gateway.
- [ ] `DATABASE_URL` uses the pooled connection; `DIRECT_URL` is available for migrations.
- [ ] `REDIS_URL` uses `rediss://` for Upstash TLS.
- [ ] Database migrations have been applied with `npx prisma migrate deploy`.
- [ ] The gateway `/health` endpoint returns `200 OK`.
- [ ] CORS and allowed origins are restricted to trusted domains.

---

## License & Credits

This project was developed as a **Capstone Project for the Nexvia Technology Internship Program — Cohort FS-02**.

- **Project:** Real-Time Collaborative Workspace (CoWork Studio)
- **Program:** Nexvia Technology Internship — FS-02
- **Purpose:** Educational, portfolio, and reference implementation

Built with gratitude on top of the open-source ecosystem: [Next.js](https://nextjs.org/), [Yjs](https://yjs.dev/), [TipTap](https://tiptap.dev/), [Prisma](https://www.prisma.io/), [Supabase](https://supabase.com/), [Upstash](https://upstash.com/), and [Tailwind CSS](https://tailwindcss.com/).

Unless otherwise stated, the source code in this repository is provided for learning and evaluation purposes. Please contact the project maintainers before commercial redistribution.

---

<p align="center">
  <sub>Real-Time Collaborative Workspace — Nexvia Technology Internship Project (FS-02)</sub>
</p>
