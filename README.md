# CollabDocs

Local-first collaborative document editor — **Next.js 16 · TypeScript · PostgreSQL · Auth.js · Tailwind/shadcn · Groq (AI SDK)**.

Built to satisfy the assignment brief: offline-first editing, background sync, version history, RBAC, validation, AI add-ons, security, tests, and Vercel/CI deployment.

## Live demo & repo

| | |
| --- | --- |
| **Live** | _Deploy to Vercel, then paste URL here_ |
| **GitHub** | [github.com/DamandeepKour](https://github.com/DamandeepKour/) |
| **Author** | [Damandeep Kour](https://www.linkedin.com/in/damandeep-kour-104264251/) — see app footer |

Update footer links via:

```bash
NEXT_PUBLIC_AUTHOR_NAME="Damandeep Kour"
NEXT_PUBLIC_GITHUB_URL="https://github.com/DamandeepKour/"
NEXT_PUBLIC_LINKEDIN_URL="https://www.linkedin.com/in/damandeep-kour-104264251/"
NEXT_PUBLIC_AUTHOR_EMAIL="daman1901319@gmail.com"
```

## Assignment checklist

| Requirement | Status |
| --- | --- |
| Next.js 16 + TypeScript | ✅ |
| PostgreSQL + Prisma | ✅ |
| Local-first (IndexedDB source of truth) | ✅ |
| Background sync queue + conflict handling | ✅ |
| Version history / safe restore | ✅ |
| Zod sync payload validation + size limits | ✅ |
| Auth.js + Owner/Editor/Viewer RBAC | ✅ Viewers cannot sync |
| Tailwind + shadcn/Radix UI + a11y | ✅ |
| AI add-ons (Groq / OpenAI / Gemini via env) | ✅ |
| Security headers, rate limits, OOM guards, RLS docs | ✅ `docs/security.md` |
| Tests (unit / integration / e2e smoke) | ✅ |
| CI (GitHub Actions) | ✅ `.github/workflows/ci.yml` |
| Deploy (Vercel) | ✅ `vercel.json` + workflow notes |
| Footer: name, GitHub, LinkedIn | ✅ |

## Quick start

```bash
npm install
cp .env.example .env
# Set DATABASE_URL, AUTH_SECRET, GROQ_API_KEY, AI_PROVIDER=groq

npm run db:generate
npm run db:push
npm run dev
```

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Turbopack dev server |
| `npm run build` / `start` | Production |
| `npm run test` | Vitest |
| `npm run test:e2e` | Playwright |
| `npm run db:generate` / `db:push` | Prisma |
| `npm run typecheck` / `lint` | Quality gates |

## Architecture (short)

1. **IndexedDB** is the client source of truth — open/edit/close never block on the network.
2. **Sync engine** coalesces a queue, uses exponential backoff, and detects version conflicts without destroying offline work.
3. **Versions** capture snapshots; restore creates a **new** version bump so collaborators are not silently overwritten.
4. **RBAC** enforced in constants + server `assertCan` on every mutating API.
5. **AI** via Vercel AI SDK; switch with `AI_PROVIDER=groq|openai|gemini`.

See `docs/architecture.md` and `docs/security.md`.

## Deploy to Vercel + Neon

1. Create a [Neon](https://neon.tech) Postgres database; copy `DATABASE_URL`.
2. Push this repo to GitHub (you handle Git).
3. Import the repo in [Vercel](https://vercel.com).
4. Set environment variables (Production + Preview):

| Variable | Notes |
| --- | --- |
| `DATABASE_URL` | Neon connection string (`sslmode=require`) |
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `AUTH_URL` | `https://your-app.vercel.app` |
| `AI_PROVIDER` | `groq` |
| `GROQ_API_KEY` | Free Groq key |
| `AI_MODEL` | `llama-3.3-70b-versatile` |
| `NEXT_PUBLIC_AUTHOR_NAME` | Your name |
| `NEXT_PUBLIC_GITHUB_URL` | Profile URL |
| `NEXT_PUBLIC_LINKEDIN_URL` | Profile URL |

5. Build command: `prisma generate && next build` (or add to `package.json` — already via `postinstall` below if configured).
6. After first deploy, run schema sync once:

```bash
DATABASE_URL="postgresql://..." npx prisma db push
```

7. Optional hardening: apply `prisma/rls.sql` on Neon.

## CI/CD

- **CI:** `.github/workflows/ci.yml` — install, `prisma generate`, typecheck, lint, vitest, build on push/PR.
- **CD:** Vercel Git integration auto-deploys `main`. `.github/workflows/deploy.yml` documents required secrets.

## Suggested Git commit (you run Git)

```
feat: assignment-ready CollabDocs (local-first, sync, AI, CI, footer)
```

## License

Private — assignment submission.
