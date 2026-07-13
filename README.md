# CollabDocs

Enterprise-grade **local-first collaborative document editor** built with Next.js 16, React, TypeScript, PostgreSQL (Prisma 7), Auth.js, TipTap, IndexedDB, and the AI SDK.

Local storage is always the source of truth. The network is for sync, collaboration, and AI — never for blocking the editor UI.

## Status

**Phases 1–10 complete.** Phase 11 (deployment / CI workflows) is optional.

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router) |
| UI | Tailwind CSS 4, shadcn/ui (Radix), Lucide |
| Editor | TipTap |
| Forms | React Hook Form + Zod |
| Database | PostgreSQL + Prisma ORM 7 |
| Auth | Auth.js (NextAuth v5) + RBAC |
| Offline | IndexedDB (`idb`) |
| Realtime | SSE presence hub |
| AI | AI SDK (`openai` / `gemini` / `groq` via `AI_PROVIDER`) |
| Tests | Vitest, Testing Library, Playwright |

## Getting started

```bash
npm install
cp .env.example .env
# Set DATABASE_URL (Neon/local Postgres) and AUTH_SECRET (openssl rand -base64 32)

npm run db:generate
npm run db:push          # or: npm run db:migrate
npm run dev
```

Open the printed localhost URL. Register → create a document → edit offline → reconnect to sync.

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` / `start` | Production |
| `npm run test` | Unit + integration (Vitest) |
| `npm run test:e2e` | Playwright |
| `npm run db:generate` | Prisma Client |
| `npm run db:push` | Push schema (prototyping) |
| `npm run db:migrate` | Migrate |
| `npm run typecheck` | `tsc --noEmit` |

## RBAC

| Role | Read | Write | Sync | Share |
| --- | --- | --- | --- | --- |
| Owner | ✓ | ✓ | ✓ | ✓ |
| Editor | ✓ | ✓ | ✓ | ✗ |
| Viewer | ✓ | ✗ | ✗ | ✗ |

Viewers **must never** edit, sync, or upload mutations — enforced in `ROLE_PERMISSIONS` + server `assertCan`.

## Environment

See `.env.example`. Critical:

- `DATABASE_URL`
- `AUTH_SECRET` / `AUTH_URL`
- `AI_PROVIDER` + provider API key(s)

## Git

Handle Git yourself. Suggested commit:

```
feat: implement CollabDocs phases 2–10 (auth, offline, sync, AI)
```

## License

Private — all rights reserved.
