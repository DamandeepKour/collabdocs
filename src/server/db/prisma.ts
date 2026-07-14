/**
 * Prisma client singleton (Prisma ORM 7 + @prisma/adapter-pg).
 * Server-only — never import from Client Components.
 *
 * Important for Vercel + Render Postgres:
 * - Use Render's EXTERNAL URL (host must end with `.render.com`)
 * - Internal hosts like `dpg-xxxxx-a` only work inside Render's network
 * - Always enable TLS (`sslmode=require`) for cloud Postgres
 */

import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pgPool: Pool | undefined;
  dbMeta: { hostname: string; database: string } | undefined;
};

export type DbHealth = {
  ok: boolean;
  hostname: string | null;
  database: string | null;
  latencyMs: number | null;
  message: string;
  error?: string;
};

function isLocalHost(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

/**
 * Strip accidental wrapping quotes that often get pasted into Vercel/Render UI.
 */
function sanitizeDatabaseUrl(raw: string): string {
  let url = raw.trim();
  if (
    (url.startsWith('"') && url.endsWith('"')) ||
    (url.startsWith("'") && url.endsWith("'"))
  ) {
    url = url.slice(1, -1).trim();
  }
  return url;
}

function ensureSslMode(connectionString: string, hostname: string): string {
  if (isLocalHost(hostname)) return connectionString;
  if (/[?&]sslmode=/.test(connectionString)) return connectionString;
  return (
    connectionString +
    (connectionString.includes("?") ? "&" : "?") +
    "sslmode=require"
  );
}

function parseDatabaseUrl(raw: string) {
  const cleaned = sanitizeDatabaseUrl(raw);
  let parsed: URL;
  try {
    parsed = new URL(cleaned.replace(/^postgresql:/i, "http:"));
  } catch {
    throw new Error(
      "DATABASE_URL is malformed. Expected postgresql://USER:PASSWORD@HOST/DB?sslmode=require",
    );
  }

  const hostname = parsed.hostname;
  if (!hostname) {
    throw new Error(
      "DATABASE_URL is missing a hostname. On Vercel, paste Render's External Database URL (must include .oregon-postgres.render.com).",
    );
  }

  // Render Internal URLs look like `dpg-xxxxx-a` with NO domain — they fail from Vercel
  if (!isLocalHost(hostname) && !hostname.includes(".")) {
    throw new Error(
      `DATABASE_URL host "${hostname}" looks like a Render Internal hostname. ` +
        `Vercel cannot reach it. In Render → Database → Connect, copy the External Database URL ` +
        `(host must end with .render.com), set it as DATABASE_URL on Vercel, then Redeploy.`,
    );
  }

  const connectionString = ensureSslMode(cleaned, hostname);
  const database = parsed.pathname.replace(/^\//, "").split("?")[0] || null;

  return {
    connectionString,
    hostname,
    database,
    isLocal: isLocalHost(hostname),
  };
}

function ensurePool(): {
  pool: Pool;
  hostname: string;
  database: string | null;
} {
  if (globalForPrisma.pgPool && globalForPrisma.dbMeta) {
    return {
      pool: globalForPrisma.pgPool,
      hostname: globalForPrisma.dbMeta.hostname,
      database: globalForPrisma.dbMeta.database,
    };
  }

  const raw = process.env.DATABASE_URL;
  if (!raw) {
    throw new Error(
      "DATABASE_URL is not set on this host. Add it in Vercel → Settings → Environment Variables (Production), then Redeploy.",
    );
  }

  const { connectionString, hostname, database, isLocal } =
    parseDatabaseUrl(raw);

  console.info(
    `[prisma] 🔌 trying database host=${hostname} db=/${database ?? ""}`,
  );

  const pool = new Pool({
    connectionString,
    ssl: isLocal ? undefined : { rejectUnauthorized: false },
    max: 5,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
  });

  globalForPrisma.pgPool = pool;
  globalForPrisma.dbMeta = { hostname, database: database ?? "" };

  return { pool, hostname, database };
}

function createPrismaClient(): PrismaClient {
  const { pool, hostname, database } = ensurePool();

  const adapter = new PrismaPg(pool);

  console.info(
    `[prisma] client ready (not verified yet) host=${hostname} db=/${database ?? ""}`,
  );

  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });
}

export function getPrisma(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }
  return globalForPrisma.prisma;
}

/**
 * Runs `SELECT 1` and logs a clear success/failure line.
 * Use from `/api/health` or anywhere you want a connection check.
 */
export async function checkDatabaseConnection(): Promise<DbHealth> {
  const started = Date.now();

  try {
    const { pool, hostname, database } = ensurePool();
    const result = await pool.query(
      "select 1 as ok, current_database() as db, inet_server_addr()::text as addr",
    );
    const latencyMs = Date.now() - started;
    const row = result.rows[0] as {
      ok: number;
      db: string;
      addr: string | null;
    };

    const health: DbHealth = {
      ok: true,
      hostname,
      database: database ?? row.db,
      latencyMs,
      message: `CONNECTED to ${hostname}/${database ?? row.db} in ${latencyMs}ms`,
    };

    console.info(`[prisma] ✅ DATABASE CONNECTED host=${hostname} db=/${health.database} latencyMs=${latencyMs} serverAddr=${row.addr ?? "n/a"}`);
    return health;
  } catch (error) {
    const latencyMs = Date.now() - started;
    const errMsg = error instanceof Error ? error.message : String(error);
    let hostname: string | null = globalForPrisma.dbMeta?.hostname ?? null;
    let database: string | null = globalForPrisma.dbMeta?.database ?? null;

    try {
      if (process.env.DATABASE_URL) {
        const parsed = parseDatabaseUrl(process.env.DATABASE_URL);
        hostname = parsed.hostname;
        database = parsed.database;
      }
    } catch {
      /* keep nulls */
    }

    console.error(
      `[prisma] ❌ DATABASE CONNECTION FAILED host=${hostname ?? "unknown"} db=/${database ?? "unknown"} latencyMs=${latencyMs} error=${errMsg}`,
    );

    return {
      ok: false,
      hostname,
      database,
      latencyMs,
      message: `NOT CONNECTED to ${hostname ?? "unknown"}`,
      error: errMsg,
    };
  }
}

/** Convenience alias — prefer getPrisma() in new code when build-time safety matters. */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getPrisma();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});

export type { PrismaClient };
