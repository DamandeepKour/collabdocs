import { z } from "zod";
import { documentTitleSchema } from "@/validators/common";
import { documentRepository } from "@/repositories/document.repository";
import { DOCUMENT_CONFIG } from "@/config/app";

export const createDocumentSchema = z.object({
  title: documentTitleSchema.default(DOCUMENT_CONFIG.defaultTitle),
  content: z.unknown().optional(),
});

export const updateDocumentSchema = z.object({
  title: documentTitleSchema.optional(),
  content: z.unknown().optional(),
  baseVersion: z.number().int().nonnegative(),
});

export const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["EDITOR", "VIEWER"]),
});

export const documentService = {
  list: (userId: string) => documentRepository.listForUser(userId),
  create: (userId: string, input: z.infer<typeof createDocumentSchema>) =>
    documentRepository.create(userId, input.title, input.content),
  get: (documentId: string, userId: string) =>
    documentRepository.getById(documentId, userId),
  update: (
    documentId: string,
    userId: string,
    input: z.infer<typeof updateDocumentSchema>,
  ) => documentRepository.update(documentId, userId, input),
  remove: (documentId: string, userId: string) =>
    documentRepository.softDelete(documentId, userId),
};
