import { z } from "zod";
import { versionService } from "@/services/version.service";
import { requireUserId } from "@/server/auth/session";
import { handleRouteError, jsonOk } from "@/server/security/http";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: Request, ctx: Ctx) {
  try {
    const userId = await requireUserId();
    const { id } = await ctx.params;
    const { searchParams } = new URL(request.url);
    const left = searchParams.get("left");
    const right = searchParams.get("right");
    if (!left || !right) {
      return Response.json(
        { ok: false, error: { message: "left and right required" } },
        { status: 400 },
      );
    }
    const diff = await versionService.compare(id, userId, left, right);
    return jsonOk(diff);
  } catch (error) {
    return handleRouteError(error);
  }
}
