import { syncPushSchema, syncService } from "@/services/sync.service";
import { requireUserId } from "@/server/auth/session";
import {
  clientIp,
  handleRouteError,
  jsonOk,
  rateLimit,
  readJsonLimited,
} from "@/server/security/http";

export async function GET(request: Request) {
  try {
    const userId = await requireUserId();
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get("documentId");
    if (!documentId) {
      return Response.json(
        { ok: false, error: { message: "documentId required" } },
        { status: 400 },
      );
    }
    const since = searchParams.get("sinceVersion");
    const result = await syncService.pull(
      userId,
      documentId,
      since ? Number(since) : undefined,
    );
    return jsonOk(result);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const userId = await requireUserId();
    rateLimit(`sync:${userId}:${clientIp(request)}`, 180);
    const body = await readJsonLimited(request, syncPushSchema);
    const result = await syncService.push(userId, body);
    return jsonOk(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
