import { z } from "zod";
import bcrypt from "bcryptjs";
import { getPrisma } from "@/server/db/prisma";
import { strongPasswordSchema } from "@/validators/password";
import {
  clientIp,
  handleRouteError,
  jsonCreated,
  rateLimit,
  readJsonLimited,
} from "@/server/security/http";

const registerSchema = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.string().email().max(255),
  password: strongPasswordSchema,
});

export async function POST(request: Request) {
  try {
    rateLimit(`register:${clientIp(request)}`, 10, 60_000);
    const body = await readJsonLimited(request, registerSchema);
    const prisma = getPrisma();
    const email = body.email.toLowerCase();

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return Response.json(
        {
          ok: false,
          error: { message: "Email already registered", code: "EXISTS" },
        },
        { status: 409 },
      );
    }

    const passwordHash = await bcrypt.hash(body.password, 12);
    const user = await prisma.user.create({
      data: {
        email,
        name: body.name,
        passwordHash,
      },
      select: { id: true, email: true, name: true },
    });

    await prisma.auditLog.create({
      data: {
        action: "CREATE",
        resource: "user",
        resourceId: user.id,
        userId: user.id,
      },
    });

    return jsonCreated(user);
  } catch (error) {
    return handleRouteError(error);
  }
}
