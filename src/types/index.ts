/**
 * Shared TypeScript types for the application.
 * Domain models mirror Prisma enums; keep in sync when schema changes.
 */

export type {
  DocumentRole,
  SyncStatusUi,
  AiProviderName,
  AiFeatureName,
} from "@/constants";

/** Local-first document representation (source of truth on the client). */
export interface LocalDocument {
  id: string;
  title: string;
  content: unknown;
  version: number;
  contentHash?: string | null;
  ownerId: string;
  updatedAt: string;
  createdAt: string;
  /** True when local changes have not been acknowledged by the server */
  isDirty: boolean;
  /** Last successful sync timestamp (ISO) */
  lastSyncedAt?: string | null;
}

/** Queued offline/sync operation */
export interface SyncOperation {
  id: string;
  clientId: string;
  documentId: string;
  type: "create" | "update" | "delete" | "restore";
  payload: unknown;
  baseVersion: number;
  createdAt: string;
  attempts: number;
}

export type ConnectionState =
  | "online"
  | "offline"
  | "reconnecting"
  | "connected";

export type ThemeMode = "light" | "dark" | "system";
