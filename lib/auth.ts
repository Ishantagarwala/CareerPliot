import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
import { authConfig } from './auth.config';
import { rateLimit } from './security';
import { requireBotVerification } from './captcha';

export const { handlers, auth, signIn, signOut } = NextAuth({
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
      async authorize(credentials) {
        // Reject non-string inputs to prevent NoSQL operator injection
        // (e.g. email: { $ne: null }) being passed into the query.
        if (
          typeof credentials?.email !== 'string' ||
          typeof credentials?.password !== 'string'
        ) {
          return null;
        }

        const email = credentials.email.toLowerCase();
        const password = credentials.password;
        const captchaToken =
          typeof credentials.captchaToken === 'string'
            ? credentials.captchaToken
            : undefined;
        const loginTicket =
          typeof credentials.loginTicket === 'string'
            ? credentials.loginTicket
            : undefined;

        // Best-effort brute-force throttling, keyed per account.
        if (!rateLimit(`login:${email}`, 5, 60_000)) {
          return null;
        }

        const bot = await requireBotVerification({
          email,
          captchaToken,
          loginTicket,
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
