import type { NextAuthConfig } from 'next-auth';
import NextAuth from 'next-auth';

// Fail fast in production if no session secret is configured, rather than
// silently running with an auto-generated (rotating) ephemeral secret.
if (
  process.env.NODE_ENV === 'production' &&
  !process.env.AUTH_SECRET &&
  !process.env.NEXTAUTH_SECRET
) {
  throw new Error('AUTH_SECRET (or NEXTAUTH_SECRET) must be set in production.');
}

export const authConfig = {
  session: {
    strategy: 'jwt',
  },
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
