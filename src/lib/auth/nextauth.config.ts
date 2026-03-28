// Required env vars:
//   NEXTAUTH_SECRET — JWT signing secret (generate: openssl rand -base64 32)
//   NEXTAUTH_URL    — App base URL (e.g. http://localhost:3000)
//   SUPER_ADMIN_EMAIL — Email address that always receives Admin role in JWT

import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/db/models/User';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email:    { label: 'Email',    type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        await dbConnect();
        const user = await User.findOne({ email: credentials.email.toLowerCase() });
        if (!user || user.status === 'disabled') return null;
        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) return null;
        return { id: user._id.toString(), email: user.email, role: user.role };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days in seconds
  },
  callbacks: {
    async jwt({ token, user }) {
      // user is only present on initial sign-in (not on token refresh)
      if (user) {
        token.id   = (user as any).id;
        token.role = (user as any).role;
      }
      // SUPER_ADMIN_EMAIL enforcement — check token.email (always present), not user.email
      // Does not modify the DB record — JWT override only (per AUTH-06)
      if (token.email === process.env.SUPER_ADMIN_EMAIL) {
        token.role = 'Admin';
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id   = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/sign-in',
  },
  secret: process.env.NEXTAUTH_SECRET,
};
