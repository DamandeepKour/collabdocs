import type { NextAuthConfig } from "next-auth";

/**
 * Edge-compatible Auth.js fragment (no Prisma / Node APIs).
 * Used by middleware. Full providers live in `src/server/auth/index.ts`.
 */
export const authConfig = {
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 14 },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const isLoggedIn = !!auth?.user;

      if (
        pathname.startsWith("/api/auth") ||
        pathname.startsWith("/_next") ||
        pathname.includes(".")
      ) {
        return true;
      }

      const isAuthPage = pathname === "/login" || pathname === "/register";
      const isProtected =
        pathname.startsWith("/documents") ||
        pathname.startsWith("/settings") ||
        pathname.startsWith("/profile") ||
        pathname.startsWith("/api/documents") ||
        pathname.startsWith("/api/sync") ||
        pathname.startsWith("/api/versions") ||
        pathname.startsWith("/api/permissions") ||
        pathname.startsWith("/api/ai") ||
        pathname.startsWith("/api/realtime");

      if (isProtected) return isLoggedIn;
      if (isAuthPage && isLoggedIn) return Response.redirect(new URL("/documents", request.nextUrl));
      if (pathname === "/" && isLoggedIn) {
        return Response.redirect(new URL("/documents", request.nextUrl));
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
  trustHost: true,
} satisfies NextAuthConfig;
