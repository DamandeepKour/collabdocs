import { z } from "zod";
import { DOCUMENT_CONFIG } from "@/config/app";
import { DOCUMENT_ROLES } from "@/constants";

/**
 * Base validators used across API routes.
 * Feature-specific schemas live under src/validators/* and features/*.
 */

export const cuidSchema = z.string().min(1).max(64);

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const documentRoleSchema = z.enum(DOCUMENT_ROLES);

export const documentTitleSchema = z
  .string()
  .trim()
  .min(1)
  .max(DOCUMENT_CONFIG.maxTitleLength);

export const syncPayloadSchema = z.object({
  clientId: z.string().min(1).max(128),
  documentId: cuidSchema,
  baseVersion: z.number().int().nonnegative(),
  operation: z.enum(["create", "update", "delete", "restore"]),
  payload: z.unknown(),
  contentHash: z.string().max(128).optional(),
});

export type SyncPayloadInput = z.infer<typeof syncPayloadSchema>;
