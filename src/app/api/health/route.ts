import { NextResponse } from "next/server";
import { checkDatabaseConnection } from "@/server/db/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/health — publicly checks whether this deployment can reach Postgres.
 * Open on Vercel after deploy to verify DATABASE_URL.
 */
export async function GET() {
  const db = await checkDatabaseConnection();

  return NextResponse.json(
    {
      ok: db.ok,
      service: "collabdocs",
      time: new Date().toISOString(),
      database: {
        connected: db.ok,
        host: db.hostname,
        name: db.database,
        latencyMs: db.latencyMs,
        message: db.message,
        error: db.error ?? null,
      },
    },
    { status: db.ok ? 200 : 503 },
  );
}
