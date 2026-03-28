// src/middleware.ts
import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    // Redirect already-authenticated users away from the sign-in page to the app
    if (req.nextUrl.pathname === '/auth/sign-in' && req.nextauth.token) {
      return NextResponse.redirect(new URL('/collections', req.url));
    }
    // All other authenticated requests proceed normally
    return NextResponse.next();
  },
  {
    callbacks: {
      // Return true = allow; false = redirect to pages.signIn (configured in authOptions as /auth/sign-in)
      // next-auth automatically appends ?callbackUrl=<current-path> on unauthorized redirect
      authorized: ({ token }) => !!token,
    },
  },
);

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - api/          (API routes — each write handler guards itself via requireAuth())
     * - auth/         (/auth/sign-in page and /api/auth/* NextAuth callback endpoints)
     * - _next/static  (Next.js static file serving)
     * - _next/image   (Next.js image optimization)
     * - favicon.ico
     *
     * Excluding api/ from the matcher is intentional: middleware handles page-level UX
     * redirects only. API routes return 401 JSON from requireAuth() — not HTML redirects
     * (which would break fetch() callers). Separation per CONTEXT.md.
     */
    '/((?!api|auth|_next/static|_next/image|favicon\\.ico).*)',
  ],
};
