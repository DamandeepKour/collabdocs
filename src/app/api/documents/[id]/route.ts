import {
  documentService,
  updateDocumentSchema,
} from "@/services/document.service";
import { requireUserId } from "@/server/auth/session";
import {
  handleRouteError,
  jsonOk,
  rateLimit,
  readJsonLimited,
} from "@/server/security/http";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  try {
    const userId = await requireUserId();
    const { id } = await ctx.params;
    rateLimit(`docs:get:${userId}`);
    const result = await documentService.get(id, userId);
    return jsonOk({
      ...result.document,
      role: result.role,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: Request, ctx: Ctx) {
  try {
    const userId = await requireUserId();
    const { id } = await ctx.params;
    rateLimit(`docs:patch:${userId}`, 120);
    const body = await readJsonLimited(request, updateDocumentSchema);
    const doc = await documentService.update(id, userId, body);
    return jsonOk(doc);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(_request: Request, ctx: Ctx) {
  try {
    const userId = await requireUserId();
    const { id } = await ctx.params;
    rateLimit(`docs:delete:${userId}`, 30);
    await documentService.remove(id, userId);
    return jsonOk({ deleted: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
