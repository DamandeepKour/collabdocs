/**
 * Shared application constants and enumerations.
 */

export const DOCUMENT_ROLES = ["OWNER", "EDITOR", "VIEWER"] as const;
export type DocumentRole = (typeof DOCUMENT_ROLES)[number];

/** Capabilities granted per RBAC role. Viewer must never mutate. */
export const ROLE_PERMISSIONS = {
  OWNER: {
    read: true,
    write: true,
    sync: true,
    share: true,
    delete: true,
    restore: true,
    managePermissions: true,
  },
  EDITOR: {
    read: true,
    write: true,
    sync: true,
    share: false,
    delete: false,
    restore: true,
    managePermissions: false,
  },
  VIEWER: {
    read: true,
    write: false,
    sync: false,
    share: false,
    delete: false,
    restore: false,
    managePermissions: false,
  },
} as const satisfies Record<
  DocumentRole,
  {
    read: boolean;
    write: boolean;
    sync: boolean;
    share: boolean;
    delete: boolean;
    restore: boolean;
    managePermissions: boolean;
  }
>;

export const SYNC_STATUSES = [
  "idle",
  "pending",
  "syncing",
  "synced",
  "offline",
  "conflict",
  "error",
] as const;
export type SyncStatusUi = (typeof SYNC_STATUSES)[number];

export const AI_PROVIDERS = ["openai", "gemini", "groq"] as const;
export type AiProviderName = (typeof AI_PROVIDERS)[number];

export const AI_FEATURES = [
  "summarize",
  "rewrite",
  "grammar",
  "continue",
  "bullets",
  "meeting_notes",
  "title",
  "smart_tags",
  "chat",
] as const;
export type AiFeatureName = (typeof AI_FEATURES)[number];

export const STORAGE_KEYS = {
  theme: "collabdocs.theme",
  offlineQueue: "collabdocs.offline-queue",
  lastSyncAt: "collabdocs.last-sync-at",
} as const;
