import type { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/server/db/prisma";
import {
  hashContent,
  requireDocumentCapability,
} from "@/repositories/document.repository";
import { ApiError } from "@/server/security/http";

export const versionService = {
  async list(documentId: string, userId: string) {
    await requireDocumentCapability(documentId, userId, "read");
    const prisma = getPrisma();
    return prisma.documentVersion.findMany({
      where: { documentId },
      orderBy: { version: "desc" },
      select: {
        id: true,
        version: true,
        title: true,
        label: true,
        contentHash: true,
        createdAt: true,
        createdById: true,
      },
    });
  },

  async capture(
    documentId: string,
    userId: string,
    label?: string,
  ) {
    const { document } = await requireDocumentCapability(
      documentId,
      userId,
      "write",
    );
    const prisma = getPrisma();
    return prisma.documentVersion.create({
      data: {
        documentId,
        version: document.version,
        title: document.title,
        content: document.content as Prisma.InputJsonValue,
        contentHash: document.contentHash ?? hashContent(document.content),
        label: label ?? `Snapshot v${document.version}`,
        createdById: userId,
      },
    });
  },

  async get(documentId: string, versionId: string, userId: string) {
    await requireDocumentCapability(documentId, userId, "read");
    const prisma = getPrisma();
    const version = await prisma.documentVersion.findFirst({
      where: { id: versionId, documentId },
    });
    if (!version) throw new ApiError(404, "Version not found", "NOT_FOUND");
    return version;
  },

  /**
   * Safe restore: applies snapshot as a NEW version bump so collaborator
   * edits are not silently overwritten without conflict detection.
   */
  async restore(
    documentId: string,
    versionId: string,
    userId: string,
    baseVersion: number,
  ) {
    const { document } = await requireDocumentCapability(
      documentId,
      userId,
      "restore",
    );

    if (document.version !== baseVersion) {
      throw new ApiError(409, "Cannot restore — document changed", "CONFLICT", {
        serverVersion: document.version,
      });
    }

    const snapshot = await this.get(documentId, versionId, userId);
    const prisma = getPrisma();
    const contentHash = snapshot.contentHash ?? hashContent(snapshot.content);

    const updated = await prisma.$transaction(async (tx) => {
      const next = await tx.document.update({
        where: { id: documentId },
        data: {
          title: snapshot.title,
          content: snapshot.content as Prisma.InputJsonValue,
          contentHash,
          version: { increment: 1 },
        },
      });
      await tx.documentVersion.create({
        data: {
          documentId,
          version: next.version,
          title: next.title,
          content: snapshot.content as Prisma.InputJsonValue,
          contentHash,
          label: `Restored from v${snapshot.version}`,
          createdById: userId,
        },
      });
      await tx.auditLog.create({
        data: {
          action: "RESTORE",
          resource: "document",
          resourceId: documentId,
          userId,
          documentId,
          metadata: { fromVersionId: versionId, fromVersion: snapshot.version },
        },
      });
      return next;
    });

    return updated;
  },

  async compare(
    documentId: string,
    userId: string,
    leftId: string,
    rightId: string,
  ) {
    const left = await this.get(documentId, leftId, userId);
    const right = await this.get(documentId, rightId, userId);
    return {
      left: {
        id: left.id,
        version: left.version,
        title: left.title,
        content: left.content,
        contentHash: left.contentHash,
      },
      right: {
        id: right.id,
        version: right.version,
        title: right.title,
        content: right.content,
        contentHash: right.contentHash,
      },
      titleChanged: left.title !== right.title,
      contentChanged: left.contentHash !== right.contentHash,
    };
  },
};
