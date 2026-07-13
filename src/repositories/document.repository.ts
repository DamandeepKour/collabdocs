import { createHash } from "node:crypto";
import type { DocumentRole as PrismaRole, Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/server/db/prisma";
import type { DocumentRole } from "@/constants";
import {
  assertCan,
  resolveEffectiveRole,
  type Capability,
} from "@/server/auth/rbac";
import { ApiError } from "@/server/security/http";

export function hashContent(content: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(content ?? {}))
    .digest("hex");
}

export async function getDocumentAccess(documentId: string, userId: string) {
  const prisma = getPrisma();
  const doc = await prisma.document.findFirst({
    where: { id: documentId, isDeleted: false },
    include: {
      permissions: { where: { userId }, take: 1 },
    },
  });

  if (!doc) {
    throw new ApiError(404, "Document not found", "NOT_FOUND");
  }

  const role = resolveEffectiveRole(
    doc.ownerId === userId,
    doc.permissions[0]?.role as DocumentRole | undefined,
  );

  if (!role) {
    throw new ApiError(403, "No access to document", "FORBIDDEN");
  }

  return { document: doc, role };
}

export async function requireDocumentCapability(
  documentId: string,
  userId: string,
  capability: Capability,
) {
  const access = await getDocumentAccess(documentId, userId);
  assertCan(access.role, capability);
  return access;
}

export const documentRepository = {
  async listForUser(userId: string) {
    const prisma = getPrisma();
    return prisma.document.findMany({
      where: {
        isDeleted: false,
        OR: [{ ownerId: userId }, { permissions: { some: { userId } } }],
      },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        version: true,
        contentHash: true,
        tags: true,
        ownerId: true,
        updatedAt: true,
        createdAt: true,
      },
    });
  },

  async create(userId: string, title: string, content: unknown = { type: "doc", content: [] }) {
    const prisma = getPrisma();
    const contentHash = hashContent(content);
    return prisma.$transaction(async (tx) => {
      const doc = await tx.document.create({
        data: {
          title,
          content: content as Prisma.InputJsonValue,
          contentHash,
          ownerId: userId,
          permissions: {
            create: { userId, role: "OWNER" },
          },
        },
      });
      await tx.documentVersion.create({
        data: {
          documentId: doc.id,
          version: doc.version,
          title: doc.title,
          content: content as Prisma.InputJsonValue,
          contentHash,
          label: "Initial",
          createdById: userId,
        },
      });
      await tx.auditLog.create({
        data: {
          action: "CREATE",
          resource: "document",
          resourceId: doc.id,
          userId,
          documentId: doc.id,
        },
      });
      return doc;
    });
  },

  async update(
    documentId: string,
    userId: string,
    data: { title?: string; content?: unknown; baseVersion: number },
  ) {
    const { document, role } = await requireDocumentCapability(
      documentId,
      userId,
      "write",
    );
    assertCan(role, "sync");

    if (document.version !== data.baseVersion) {
      throw new ApiError(409, "Version conflict", "CONFLICT", {
        serverVersion: document.version,
        serverHash: document.contentHash,
        title: document.title,
        content: document.content,
      });
    }

    const prisma = getPrisma();
    const nextContent = data.content ?? document.content;
    const nextTitle = data.title ?? document.title;
    const contentHash = hashContent(nextContent);

    return prisma.document.update({
      where: { id: documentId },
      data: {
        title: nextTitle,
        content: nextContent as Prisma.InputJsonValue,
        contentHash,
        version: { increment: 1 },
      },
    });
  },

  async softDelete(documentId: string, userId: string) {
    await requireDocumentCapability(documentId, userId, "delete");
    const prisma = getPrisma();
    return prisma.document.update({
      where: { id: documentId },
      data: { isDeleted: true },
    });
  },

  async getById(documentId: string, userId: string) {
    const { document, role } = await requireDocumentCapability(
      documentId,
      userId,
      "read",
    );
    return { document, role };
  },

  async setPermission(
    documentId: string,
    actorId: string,
    targetUserId: string,
    role: PrismaRole,
  ) {
    await requireDocumentCapability(documentId, actorId, "managePermissions");
    if (role === "OWNER") {
      throw new ApiError(400, "Cannot assign OWNER via invite", "INVALID_ROLE");
    }
    const prisma = getPrisma();
    return prisma.permission.upsert({
      where: {
        documentId_userId: { documentId, userId: targetUserId },
      },
      create: { documentId, userId: targetUserId, role },
      update: { role },
    });
  },
};
