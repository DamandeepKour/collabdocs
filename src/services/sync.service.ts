import { createHash } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/server/db/prisma";
import { requireDocumentCapability } from "@/repositories/document.repository";
import { hashContent } from "@/repositories/document.repository";
import { ApiError } from "@/server/security/http";
import { SYNC_CONFIG } from "@/config/app";
import { computeBackoffMs } from "@/utils";
import { z } from "zod";

export const syncPushSchema = z.object({
  clientId: z.string().min(1).max(128),
  documentId: z.string().min(1),
  baseVersion: z.number().int().nonnegative(),
  operation: z.enum(["create", "update", "delete", "restore"]),
  title: z.string().min(1).max(256).optional(),
  content: z.unknown().optional(),
  contentHash: z.string().max(128).optional(),
});

export type SyncPushInput = z.infer<typeof syncPushSchema>;

export const syncService = {
  async push(userId: string, input: SyncPushInput) {
    // Viewers must never sync
    const { document, role } = await requireDocumentCapability(
      input.documentId,
      userId,
      "sync",
    );

    const prisma = getPrisma();

    if (input.operation === "update" || input.operation === "create") {
      if (document.version !== input.baseVersion) {
        await prisma.syncQueueItem.create({
          data: {
            clientId: input.clientId,
            documentId: input.documentId,
            userId,
            operation: input.operation,
            payload: input as unknown as Prisma.InputJsonValue,
            status: "CONFLICT",
            baseVersion: input.baseVersion,
            lastError: "baseVersion mismatch",
          },
        });
        throw new ApiError(409, "Conflict detected", "CONFLICT", {
          serverVersion: document.version,
          serverTitle: document.title,
          serverContent: document.content,
          serverHash: document.contentHash,
          role,
        });
      }

      const nextContent = input.content ?? document.content;
      const nextTitle = input.title ?? document.title;
      const contentHash = input.contentHash ?? hashContent(nextContent);

      const updated = await prisma.document.update({
        where: { id: input.documentId },
        data: {
          title: nextTitle,
          content: nextContent as Prisma.InputJsonValue,
          contentHash,
          version: { increment: 1 },
        },
      });

      await prisma.syncQueueItem.create({
        data: {
          clientId: input.clientId,
          documentId: input.documentId,
          userId,
          operation: input.operation,
          payload: input as unknown as Prisma.InputJsonValue,
          status: "COMPLETED",
          baseVersion: input.baseVersion,
        },
      });

      await prisma.auditLog.create({
        data: {
          action: "SYNC",
          resource: "document",
          resourceId: document.id,
          userId,
          documentId: document.id,
          metadata: { clientId: input.clientId, toVersion: updated.version },
        },
      });

      return {
        status: "synced" as const,
        version: updated.version,
        contentHash: updated.contentHash,
        updatedAt: updated.updatedAt.toISOString(),
      };
    }

    if (input.operation === "delete") {
      await requireDocumentCapability(input.documentId, userId, "delete");
      await prisma.document.update({
        where: { id: input.documentId },
        data: { isDeleted: true, version: { increment: 1 } },
      });
      return { status: "synced" as const, deleted: true };
    }

    throw new ApiError(400, "Unsupported operation", "INVALID_OP");
  },

  async pull(userId: string, documentId: string, sinceVersion?: number) {
    const { document, role } = await requireDocumentCapability(
      documentId,
      userId,
      "read",
    );
    if (sinceVersion != null && document.version <= sinceVersion) {
      return { status: "up_to_date" as const, version: document.version, role };
    }
    return {
      status: "update" as const,
      role,
      document: {
        id: document.id,
        title: document.title,
        content: document.content,
        version: document.version,
        contentHash: document.contentHash,
        tags: document.tags,
        updatedAt: document.updatedAt.toISOString(),
      },
    };
  },

  async enqueueRetry(
    userId: string,
    documentId: string,
    clientId: string,
    attempts: number,
    error: string,
  ) {
    const prisma = getPrisma();
    const delay = computeBackoffMs(
      attempts,
      SYNC_CONFIG.backoffBaseMs,
      SYNC_CONFIG.backoffMaxMs,
    );
    return prisma.syncQueueItem.create({
      data: {
        clientId,
        documentId,
        userId,
        operation: "update",
        payload: {},
        status: "FAILED",
        attempts,
        lastError: error,
        nextRetryAt: new Date(Date.now() + delay),
      },
    });
  },
};

export function fingerprint(payload: unknown): string {
  return createHash("sha1").update(JSON.stringify(payload)).digest("hex");
}
