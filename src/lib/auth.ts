import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import type { NextRequest } from "next/server";

// Type augmentation must use module declaration — see src/lib/auth-types.ts

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma) as ReturnType<typeof PrismaAdapter>,
  session: { strategy: "jwt" },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    Resend({
      from: "Resume Roaster <noreply@resumeroaster.com>",
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.isAdmin = (user as { isAdmin?: boolean }).isAdmin ?? false;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId as string;
        (session.user as { isAdmin?: boolean }).isAdmin =
          token.isAdmin as boolean;
      }
      return session;
    },
    async signIn({ user }) {
      // Retroactively link existing roasts by email (normalized to lowercase)
      const normalizedEmail = user.email?.toLowerCase();
      if (normalizedEmail && user.id) {
        await prisma.roast.updateMany({
          where: { email: normalizedEmail, userId: null },
          data: { userId: user.id },
        });
      }
      return true;
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
});

/**
 * Check if a request is authorized as admin.
 * Returns true if:
 * 1. Session exists and user.isAdmin is true, OR
 * 2. ADMIN_TOKEN matches the Bearer/query token
 */
export async function isAdminAuthorized(req: NextRequest): Promise<boolean> {
  // Check session-based admin (may fail if AUTH_SECRET not configured)
  try {
    const session = await auth();
    if (session?.user && (session.user as { isAdmin?: boolean }).isAdmin) {
      return true;
    }
  } catch {
    // Auth not configured — fall through to token check
  }

  // Fallback: ADMIN_TOKEN (for scripts/API access)
  const token = process.env.ADMIN_TOKEN;
  if (!token) return false;

  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7) === token;
  }

  const queryToken = req.nextUrl.searchParams.get("token");
  return queryToken === token;
}
