# Architecture notes

## Principles

1. **Local-first** — IndexedDB is the source of truth. Opening, editing, and closing never block on the network.
2. **Optimistic UI** — Mutations apply locally first; sync reconciles in the background.
3. **RBAC** — `OWNER` / `EDITOR` / `VIEWER`. Viewers never write, sync, or upload mutations.
4. **Defense in depth** — Zod validation, payload limits, scoped Prisma queries, optional Postgres RLS, Auth.js, security headers.
5. **AI provider abstraction** — `AI_PROVIDER=groq|openai|gemini`.

## Layers

| Layer | Responsibility |
| --- | --- |
| `app/` | Routes, layouts, Route Handlers |
| `features/` | Domain UI + hooks |
| `services/` | Business rules |
| `repositories/` | Prisma / access checks |
| `server/` | Auth, DB, security |
| `validators/` | Zod contracts |

## Sync

- Coalesced offline queue (one pending op per document)
- Retry + exponential backoff
- `baseVersion` conflict detection (HTTP 409) without destroying local work
- Recovery after refresh from IndexedDB

## Realtime

- SSE presence hub (online users, typing, connection + reconnect)
- Viewers may observe presence but cannot push document state

## Versions

- Explicit snapshots + timeline
- Safe restore → new version bump (no silent overwrite of collaborators)

## AI

- Vercel AI SDK; default **Groq** free tier (`llama-3.3-70b-versatile`)

## Performance

- Dynamic imports for AI / versions / invite panels
- Debounced local save + coalesced sync (prevents typing lag / false conflicts)
- SSR for chrome; client editor island

## Security

See `docs/security.md` (OOM payload guards, RLS, tenant isolation).
