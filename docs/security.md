# Security & real-world considerations

This document covers production risks called out in the assignment brief and how CollabDocs mitigates them.

## Authentication & authorization

- **Auth.js (NextAuth v5)** with JWT sessions (`AUTH_SECRET`).
- Credentials register/login; optional Google/GitHub via env.
- Edge-safe middleware (`auth.config.ts`) protects `/documents`, `/settings`, `/profile`, and mutating APIs.
- **RBAC roles:** `OWNER` | `EDITOR` | `VIEWER`.
- Viewers **cannot** write, sync, restore, or push realtime mutations (`ROLE_PERMISSIONS` + `assertCan` on every mutating path).

## Preventing OOM from malicious sync payloads

| Control | Implementation |
| --- | --- |
| Body size limit | `readJsonLimited` rejects over `MAX_PAYLOAD_BYTES` (default 1MB) via `Content-Length` and byte length of raw body |
| Malformed JSON | Parse failures → `400 MALFORMED_JSON` before business logic |
| Zod schemas | `syncPushSchema` / document validators reject unexpected shapes |
| Server Actions cap | `experimental.serverActions.bodySizeLimit = "1mb"` in `next.config.ts` |
| Rate limiting | In-memory sliding window per IP/user (`rateLimit`) on sync, AI, register |
| Document size | `DOCUMENT_CONFIG.maxContentBytes` / title length bounds |

**Contingency:** If a payload still allocates heavily, Node process isolation on Vercel (per-request) limits blast radius. For multi-instance rate limits, swap the Map for Redis.

## Tenant isolation (ORM scoping + RLS)

### Application layer (always on)

Every document query goes through `getDocumentAccess` / `requireDocumentCapability`:

- Soft-deleted docs are hidden.
- Access only if `ownerId === userId` **or** a `permissions` row exists.
- Mutations assert capabilities (`write`, `sync`, `delete`, `restore`, `managePermissions`).

### PostgreSQL Row Level Security (defense in depth)

Prisma does not enable RLS by itself. For Neon/Postgres hardening, apply `prisma/rls.sql` after migrations (see file). Policies ensure even a leaked DB URL used outside the app cannot read other tenants’ rows when connecting as the app role.

**Recommended production setup:**

1. App connects as a limited role (`collabdocs_app`), not a superuser.
2. Enable RLS on `documents`, `permissions`, `document_versions`, `sync_queue`, `ai_requests`, `audit_logs`.
3. Pass `app.current_user_id` via `SET LOCAL` in a Prisma middleware / transaction wrapper (documented in `rls.sql`).

Until RLS is enabled in your Neon project, **strict ORM scoping remains the primary isolation guarantee**.

## Other production concerns

| Challenge | Approach |
| --- | --- |
| Document growth over time | Snapshots are explicit; content is JSON with hash; consider compaction / tombstones for soft-deletes |
| Conflict storms | Coalesced offline queue (one pending op per doc); version-based 409 + user choice |
| Scalability | Stateless Next.js on Vercel; Neon Postgres; presence hub is single-process (swap for Redis/Ably for multi-region) |
| XSS | React escaping; CSP headers; no `dangerouslySetInnerHTML` in editor path |
| CSRF | Auth.js cookie model + same-site; mutating APIs require session |
| SQL injection | Prisma parameterized queries only |
| AI abuse | Rate limits + provider keys server-side only; prompt size clip |

## Incident response (short)

1. Rotate `AUTH_SECRET` / OAuth / `GROQ_API_KEY` if leaked.
2. Revoke sessions by bumping JWT secret.
3. Disable sync route via feature flag / Vercel rewrite if under attack.
4. Inspect `audit_logs` and `sync_queue` for anomalous clients.
