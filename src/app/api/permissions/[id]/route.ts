import { z } from "zod";
import { getPrisma } from "@/server/db/prisma";
import { documentRepository } from "@/repositories/document.repository";
import { requireUserId } from "@/server/auth/session";
import {
  handleRouteError,
  jsonOk,
  rateLimit,
  readJsonLimited,
} from "@/server/security/http";
import { ApiError } from "@/server/security/http";

type Ctx = { params: Promise<{ id: string }> };

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["EDITOR", "VIEWER"]),
});

export async function GET(_request: Request, ctx: Ctx) {
  try {
    const userId = await requireUserId();
    const { id } = await ctx.params;
    await documentRepository.getById(id, userId);
    const prisma = getPrisma();
    const permissions = await prisma.permission.findMany({
      where: { documentId: id },
      include: { user: { select: { id: true, email: true, name: true } } },
    });
    return jsonOk(permissions);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request, ctx: Ctx) {
  try {
    const userId = await requireUserId();
    const { id } = await ctx.params;
    rateLimit(`perm:${userId}`, 40);
    const body = await readJsonLimited(request, inviteSchema);
    const prisma = getPrisma();
    const target = await prisma.user.findUnique({
      where: { email: body.email.toLowerCase() },
    });
    if (!target) throw new ApiError(404, "User not found", "USER_NOT_FOUND");
    const permission = await documentRepository.setPermission(
      id,
      userId,
      target.id,
      body.role,
    );
    return jsonOk(permission);
  } catch (error) {
    return handleRouteError(error);
  }
}
