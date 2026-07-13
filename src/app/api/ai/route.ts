import { z } from "zod";
import { AI_FEATURES } from "@/constants";
import { aiService } from "@/services/ai.service";
import { requireUserId } from "@/server/auth/session";
import {
  clientIp,
  handleRouteError,
  jsonOk,
  rateLimit,
  readJsonLimited,
} from "@/server/security/http";

const aiSchema = z.object({
  feature: z.enum(AI_FEATURES),
  text: z.string().min(1).max(100_000),
  documentId: z.string().optional(),
  instruction: z.string().max(4000).optional(),
});

export async function POST(request: Request) {
  try {
    const userId = await requireUserId();
    rateLimit(`ai:${userId}:${clientIp(request)}`, 30);
    const body = await readJsonLimited(request, aiSchema);
    const result = await aiService.run({
      userId,
      feature: body.feature,
      text: body.text,
      documentId: body.documentId,
      instruction: body.instruction,
    });
    return jsonOk(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
