/**
 * Application-wide configuration constants.
 * Feature-specific config lives under each feature module.
 */

export const APP_NAME = "CollabDocs";
export const APP_DESCRIPTION =
  "Enterprise local-first collaborative document editor";

export const APP_CONFIG = {
  name: APP_NAME,
  description: APP_DESCRIPTION,
  version: "0.1.0",
  /** Local IndexedDB database name for offline-first storage */
  localDbName: "collabdocs-local",
  localDbVersion: 1,
} as const;

export const SYNC_CONFIG = {
  /** Debounce window before enqueueing a sync (ms) */
  debounceMs: 750,
  /** Base delay for exponential backoff (ms) */
  backoffBaseMs: 1_000,
  /** Maximum backoff delay (ms) */
  backoffMaxMs: 60_000,
  /** Max retry attempts per queue item */
  maxAttempts: 5,
  /** Max payload size for sync operations (bytes) */
  maxPayloadBytes: 1_048_576,
  /** Batch size for partial sync */
  batchSize: 50,
} as const;

export const DOCUMENT_CONFIG = {
  defaultTitle: "Untitled",
  maxTitleLength: 256,
  maxContentBytes: 5_242_880, // 5 MB
} as const;

export const AI_CONFIG = {
  defaultProvider: "groq" as const,
  defaultModel: "llama-3.3-70b-versatile",
  maxPromptChars: 32_000,
  requestTimeoutMs: 60_000,
} as const;

export const SECURITY_CONFIG = {
  rateLimitWindowMs: 60_000,
  rateLimitMax: 100,
  csrfCookieName: "__Host-collabdocs.csrf",
} as const;
