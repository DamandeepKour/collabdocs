import { auth } from "@/server/auth";
import { ApiError } from "@/server/security/http";

export async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new ApiError(401, "Unauthorized", "UNAUTHORIZED");
  }
  return session;
}

export async function requireUserId(): Promise<string> {
  const session = await requireSession();
  return session.user.id;
}
