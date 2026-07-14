# Deployment guide (Vercel + Neon + GitHub Actions)

## 1. Prepare GitHub (you run Git)

```bash
# From project root — run these yourself
git init   # only if needed
git add .
git commit -m "feat: CollabDocs local-first assignment submission"
git branch -M main
git remote add origin https://github.com/<YOU>/collabdocs.git
git push -u origin main
```

## 2. Neon database

1. Create project at https://neon.tech  
2. Copy connection string → `DATABASE_URL`  
3. Locally or in CI: `npx prisma db push`

## 3. Vercel

1. Import the GitHub repo at https://vercel.com/new  
2. Framework: Next.js (auto)  
3. Build command uses `npm run build` (`prisma generate && next build`)  
4. Add env vars (Production + Preview):

- `DATABASE_URL`
- `AUTH_SECRET`
- `AUTH_URL` = `https://<project>.vercel.app`
- `AI_PROVIDER=groq`
- `GROQ_API_KEY`
- `AI_MODEL=llama-3.3-70b-versatile`
- `NEXT_PUBLIC_AUTHOR_NAME`
- `NEXT_PUBLIC_GITHUB_URL`
- `NEXT_PUBLIC_LINKEDIN_URL`
- `NEXT_PUBLIC_AUTHOR_EMAIL`

5. Deploy → copy Live URL into README.

## 4. CI

Pushing to `main` runs `.github/workflows/ci.yml` (typecheck, lint, tests, build).

## 5. Submission

Share:

1. GitHub repository URL  
2. Live Vercel URL  
3. Confirm footer shows your name, GitHub, LinkedIn  
