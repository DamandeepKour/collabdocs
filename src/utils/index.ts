/**
 * Utility helpers (non-UI). UI class merging lives in `@/lib/utils`.
 */

export function assertNever(value: never, message = "Unexpected value"): never {
  throw new Error(`${message}: ${String(value)}`);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Exponential backoff with jitter for sync retries. */
export function computeBackoffMs(
  attempt: number,
  baseMs: number,
  maxMs: number,
): number {
  const exp = Math.min(maxMs, baseMs * 2 ** Math.max(0, attempt));
  const jitter = Math.random() * 0.25 * exp;
  return Math.round(exp + jitter);
}

export function isBrowser(): boolean {
  return typeof window !== "undefined";
}
