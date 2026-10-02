import NextAuth, { CredentialsSignin } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
import { authConfig } from './auth.config';
import { getClientIp, rateLimit } from './security';
import { DEMO_ACCOUNT_EMAIL, isDemoLoginEnabled, requireBotVerification } from './captcha';
import { isAllowedEmailProvider } from './allowedEmail';
import { assertResidentialIp } from './ipReputation';
import { bearerSession } from './mobileBearerSession';

class EmailProviderError extends CredentialsSignin {
  code = "email_provider";
}

class NetworkBlockedError extends CredentialsSignin {
  code = "network_blocked";
}

const nextAuth = NextAuth({
  ...authConfig,
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'text' },
        password: { label: 'Password', type: 'password' },
        captchaToken: { label: 'Captcha', type: 'text' },
        loginTicket: { label: 'Login Ticket', type: 'text' },
      },
      async authorize(credentials, request) {
        // Reject non-string inputs to prevent NoSQL operator injection
        // (e.g. email: { $ne: null }) being passed into the query.
        if (
          typeof credentials?.email !== 'string' ||
          typeof credentials?.password !== 'string'
        ) {
          return null;
        }

        const email = credentials.email.toLowerCase().trim();
        const password = credentials.password;
        const captchaToken =
          typeof credentials.captchaToken === 'string'
            ? credentials.captchaToken
            : undefined;
        const loginTicket =
          typeof credentials.loginTicket === 'string'
            ? credentials.loginTicket
            : undefined;

        if (!isAllowedEmailProvider(email)) {
          throw new EmailProviderError();
        }

        const ip = getClientIp(request);
        const ipCheck = await assertResidentialIp({ ip, email });
        if (!ipCheck.ok) {
          throw new NetworkBlockedError();
        }

        // Shared demo account skips captcha/IP checks — only allow when the
        // deployment explicitly opted in (DEMO_MODE=true).
        const isDemo = email === DEMO_ACCOUNT_EMAIL && isDemoLoginEnabled();
        if (email === DEMO_ACCOUNT_EMAIL && !isDemo) {
          return null;
        }
        if (!isDemo && !rateLimit(`login:${email}`, 5, 60_000)) {
          return null;
        }

        const bot = await requireBotVerification({
          email,
          captchaToken,
          loginTicket,
          ip,
        });
        if (!bot.ok) {
          return null;
        }

        await dbConnect();

        const user = await User.findOne({ email }).select('+password');
        if (!user || !user.password) {
          return null;
        }

        const isPasswordCorrect = await bcrypt.compare(password, user.password);

        if (!isPasswordCorrect) {
          return null;
        }

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
        };
      },
    }),
  ],
});

export const { handlers, signIn, signOut } = nextAuth;

/**
 * Session resolution, extended with mobile bearer support.
 *
 * Auth.js reads the session COOKIE and nothing else, but the Android client has
 * no cookie — a native app is a cross-site origin and Auth.js defaults to
 * `SameSite=Lax`. `POST /api/auth/mobile/token` was minting access tokens that
 * NOTHING accepted, so the app could sign in and then be refused by every data
 * route. See lib/mobileBearerSession.ts.
 *
 * An `Authorization: Bearer` header is tried FIRST and the cookie second. Order
 * matters only for a request carrying both, which is not a case either client
 * produces; trying the bearer first keeps the failure mode obvious (an invalid
 * bearer falls through to the cookie rather than masking it).
 *
 * The cast preserves Auth.js's own overloaded signature — it supports call
 * forms (middleware, server components, API routes) this wrapper does not
 * implement, and narrowing the type would break call sites that never use a
 * bearer. The runtime call is always the zero-argument form: all 35 route
 * handlers in app/api use `await auth()`.
 */
export const auth = (async (...args: unknown[]) => {
  const bearer = await bearerSession();
  if (bearer) return bearer;

  return (nextAuth.auth as (...a: unknown[]) => Promise<unknown>)(...args);
}) as unknown as typeof nextAuth.auth;
