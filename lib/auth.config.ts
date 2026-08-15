import type { NextAuthConfig } from 'next-auth';
import NextAuth from 'next-auth';

// Fail fast at runtime if no session secret is configured, rather than
// silently running with an auto-generated (rotating) ephemeral secret.
// Skip during `next build` — Next sets NODE_ENV=production while collecting
// page data, and secrets may only be injected at runtime on the host.
const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build';

if (
  process.env.NODE_ENV === 'production' &&
  !isBuildPhase &&
  !process.env.AUTH_SECRET &&
  !process.env.NEXTAUTH_SECRET
) {
  throw new Error('AUTH_SECRET (or NEXTAUTH_SECRET) must be set in production.');
}

export const authConfig = {
  session: {
    strategy: 'jwt',
  },
  // trustHost allows NextAuth v5 to accept requests from any host
  // (needed for VPS / custom-domain deployments where the Host header
  //  differs from NEXTAUTH_URL / AUTH_URL). Safe because we own the server.
  trustHost: true,
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: '/login',
  },
  providers: [], // Empty array, to be populated in lib/auth.ts
} satisfies NextAuthConfig;

export const { auth: edgeAuth } = NextAuth(authConfig);
