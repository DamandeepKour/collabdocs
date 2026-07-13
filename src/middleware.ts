import NextAuth from "next-auth";
import { authConfig } from "@/server/auth/auth.config";

/**
 * Edge middleware using Auth.js edge-compatible config only (no Prisma).
 */
export default NextAuth(authConfig).auth;

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
