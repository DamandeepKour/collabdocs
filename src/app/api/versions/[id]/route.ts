import { z } from "zod";
import { versionService } from "@/services/version.service";
import { requireUserId } from "@/server/auth/session";
import {
  handleRouteError,
  jsonCreated,
  jsonOk,
  rateLimit,
  readJsonLimited,
} from "@/server/security/http";

type Ctx = { params: Promise<{ id: string }> };

const captureSchema = z.object({
  label: z.string().max(120).optional(),
});

const restoreSchema = z.object({
  versionId: z.string().min(1),
  baseVersion: z.number().int().nonnegative(),
});

export async function GET(_request: Request, ctx: Ctx) {
  try {
    const userId = await requireUserId();
    const { id } = await ctx.params;
    const versions = await versionService.list(id, userId);
    return jsonOk(versions);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request, ctx: Ctx) {
  try {
    const userId = await requireUserId();
    const { id } = await ctx.params;
    rateLimit(`versions:${userId}`, 40);
    const body = await readJsonLimited(request, captureSchema);
    const version = await versionService.capture(id, userId, body.label);
    return jsonCreated(version);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PUT(request: Request, ctx: Ctx) {
  try {
    const userId = await requireUserId();
    const { id } = await ctx.params;
    const body = await readJsonLimited(request, restoreSchema);
    const doc = await versionService.restore(
      id,
      body.versionId,
      userId,
      body.baseVersion,
    );
    return jsonOk(doc);
  } catch (error) {
    return handleRouteError(error);
  }
}
