import { requireUserId } from "@/server/auth/session";
import {
  createDocumentSchema,
  documentService,
} from "@/services/document.service";
import {
  handleRouteError,
  jsonCreated,
  jsonOk,
  rateLimit,
  readJsonLimited,
  clientIp,
} from "@/server/security/http";

export async function GET(request: Request) {
  try {
    const userId = await requireUserId();
    rateLimit(`docs:list:${userId}:${clientIp(request)}`);
    const docs = await documentService.list(userId);
    return jsonOk(docs);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const userId = await requireUserId();
    rateLimit(`docs:create:${userId}`, 30);
    const body = await readJsonLimited(request, createDocumentSchema);
    const doc = await documentService.create(userId, body);
    return jsonCreated(doc);
  } catch (error) {
    return handleRouteError(error);
  }
}
