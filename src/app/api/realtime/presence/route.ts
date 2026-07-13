import { z } from "zod";
import { auth } from "@/server/auth";
import { requireDocumentCapability } from "@/repositories/document.repository";
import { presenceHub } from "@/features/realtime/presence-hub";
import {
  handleRouteError,
  jsonOk,
  readJsonLimited,
} from "@/server/security/http";
import { ApiError } from "@/server/security/http";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new ApiError(401, "Unauthorized");

    const documentId = new URL(request.url).searchParams.get("documentId");
    if (!documentId) throw new ApiError(400, "documentId required");

    await requireDocumentCapability(documentId, session.user.id, "read");
    presenceHub.join(documentId, {
      userId: session.user.id,
      name: session.user.name ?? session.user.email ?? "User",
    });

    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        const send = () => {
          const users = presenceHub.list(documentId);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ users })}\n\n`),
          );
        };
        send();
        const interval = setInterval(send, 2000);
        const heartbeat = setInterval(() => {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        }, 15000);

        request.signal.addEventListener("abort", () => {
          clearInterval(interval);
          clearInterval(heartbeat);
          presenceHub.leave(documentId, session.user!.id);
          try {
            controller.close();
          } catch {
            /* closed */
          }
        });
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

const postSchema = z.object({
  documentId: z.string().min(1),
  cursor: z
    .object({ from: z.number(), to: z.number() })
    .nullable()
    .optional(),
  typing: z.boolean().optional(),
});

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new ApiError(401, "Unauthorized");
    const body = await readJsonLimited(request, postSchema);
    await requireDocumentCapability(body.documentId, session.user.id, "read");
    presenceHub.join(body.documentId, {
      userId: session.user.id,
      name: session.user.name ?? session.user.email ?? "User",
    });
    presenceHub.update(body.documentId, session.user.id, {
      cursor: body.cursor ?? null,
      typing: body.typing ?? false,
    });
    return jsonOk({ users: presenceHub.list(body.documentId) });
  } catch (error) {
    return handleRouteError(error);
  }
}

const deleteSchema = z.object({ documentId: z.string().min(1) });

export async function DELETE(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new ApiError(401, "Unauthorized");
    const body = await readJsonLimited(request, deleteSchema);
    presenceHub.leave(body.documentId, session.user.id);
    return jsonOk({ left: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
