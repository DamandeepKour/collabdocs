# Deployment guide (Vercel app + Render Postgres)

## Why local works but Vercel fails (`Can't reach database server at base`)

Your app on **Vercel** and database on **Render** are different networks.

| URL type | Looks like | Works from |
| --- | --- | --- |
| **External** (correct for Vercel) | `…@dpg-xxxx-a.oregon-postgres.render.com/db` | Local + Vercel |
| **Internal** (wrong for Vercel) | `…@dpg-xxxx-a/db` (no `.render.com`) | **Only** Render services |

If Vercel has the Internal URL (or a truncated/bad value), Prisma fails — sometimes with a nonsense host like `base`.

## Fix on Vercel (do this exactly)

1. Open [Render Dashboard](https://dashboard.render.com) → your Postgres → **Connect**.
2. Copy **External Database URL** (not Internal).
3. Append SSL if missing: `?sslmode=require`
4. Open [Vercel](https://vercel.com) → your project → **Settings → Environment Variables**.
5. Set `DATABASE_URL` for **Production** (and Preview):
   - Paste the External URL only
   - **Do not** wrap it in quotes (`"..."`)
   - Host must contain `.oregon-postgres.render.com` (or `.render.com`)
6. Also set:
   - `AUTH_SECRET` — `openssl rand -base64 32`
   - `AUTH_URL` — `https://your-app.vercel.app` (no trailing slash issues)
   - `AI_PROVIDER=groq`
   - `GROQ_API_KEY`
   - `NEXT_PUBLIC_AUTHOR_NAME`, `NEXT_PUBLIC_GITHUB_URL`, `NEXT_PUBLIC_LINKEDIN_URL`
7. **Redeploy** (Deployments → … → Redeploy). Env changes do nothing until redeploy.
8. Open **Runtime Logs** and look for:
   ```text
   [prisma] connecting host=dpg-….oregon-postgres.render.com db=/collabdocs_hh3x
   ```
   If you see an Internal-looking host or a bad host, fix `DATABASE_URL` again.

## Example shape (password redacted)

```text
postgresql://collabdocs_hh3x_user:****@dpg-XXXX-a.oregon-postgres.render.com/collabdocs_hh3x?sslmode=require
```

## If the Next.js app is also on Render

Then you *can* use the Internal URL. For **Vercel**, always use External.

## After env is fixed

```bash
# Optional from laptop against External URL
npx prisma db push
```

Then hit Register on the Vercel URL again.
