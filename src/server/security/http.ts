import { NextResponse } from "next/server";
import type { ZodType } from "zod";
import { SECURITY_CONFIG } from "@/config/app";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, { status: 200, ...init });
}

export function jsonCreated<T>(data: T) {
  return NextResponse.json({ ok: true, data }, { status: 201 });
}

export function jsonError(
  status: number,
  message: string,
  code?: string,
  details?: unknown,
) {
  return NextResponse.json(
    { ok: false, error: { message, code, details } },
    { status },
  );
}

export function handleRouteError(error: unknown) {
  if (error instanceof ApiError) {
    return jsonError(error.status, error.message, error.code, error.details);
  }
  console.error("[api]", error);
  return jsonError(500, "Internal server error", "INTERNAL");
}

/** Reject oversized JSON bodies before parsing. */
export async function readJsonLimited<T>(
  request: Request,
  schema: ZodType<T>,
  maxBytes = Number(process.env.MAX_PAYLOAD_BYTES ?? 1_048_576),
): Promise<T> {
  const contentLength = request.headers.get("content-length");
  if (contentLength && Number(contentLength) > maxBytes) {
    throw new ApiError(413, "Payload too large", "PAYLOAD_TOO_LARGE");
  }

  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > maxBytes) {
    throw new ApiError(413, "Payload too large", "PAYLOAD_TOO_LARGE");
  }

  let parsed: unknown;
  try {
    parsed = raw ? JSON.parse(raw) : {};
  } catch {
    throw new ApiError(400, "Malformed JSON payload", "MALFORMED_JSON");
  }

  const result = schema.safeParse(parsed);
  if (!result.success) {
    throw new ApiError(400, "Validation failed", "VALIDATION", result.error.flatten());
  }
  return result.data;
}

/** Simple in-memory sliding-window rate limiter (per-process). */
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(
  key: string,
  limit: number = SECURITY_CONFIG.rateLimitMax,
  windowMs: number = SECURITY_CONFIG.rateLimitWindowMs,
): void {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  if (bucket.count >= limit) {
    throw new ApiError(429, "Too many requests", "RATE_LIMITED");
  }
  bucket.count += 1;
}

export function clientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}
