# Architecture notes

## Principles

1. **Local-first** — IndexedDB (and related local stores) are the source of truth for document content. Opening, editing, and closing a document must never block on the network.
2. **Optimistic UI** — Mutations apply locally first; sync reconciles in the background.
3. **RBAC** — Roles: `OWNER`, `EDITOR`, `VIEWER`. Viewers must never write, sync, or upload mutations.
4. **Defense in depth** — Zod validation, payload limits, scoped Prisma queries, Auth.js sessions, security headers.
5. **Provider abstraction** — AI and other integrations switch via environment variables.

## Layers

| Layer | Responsibility |
| --- | --- |
| `app/` | Routes, layouts, Route Handlers |
| `features/` | Domain UI + hooks co-located by capability |
| `services/` | Use-cases / business rules |
| `repositories/` | Persistence adapters (Prisma, IndexedDB) |
| `server/` | Auth, DB client, security helpers |
| `validators/` | Shared Zod contracts |

## Sync (Phases 4–5)

- Offline queue with retry + exponential backoff
- Version vectors / base-version conflict detection
- Partial sync + background reconciliation
- Recovery after refresh from durable local storage

## Realtime (Phase 6)

- WebSocket / Socket.IO presence, cursors, typing
- Connection state + automatic reconnection

## Versions (Phase 7)

- Snapshots with safe restore that does not clobber collaborator edits

## AI (Phase 8)

- Single `AI_PROVIDER` env (`openai` \| `gemini` \| `groq`)
- Feature adapters: summarize, rewrite, grammar, continue, bullets, meeting notes, title, tags, chat
