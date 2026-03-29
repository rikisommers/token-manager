// src/middleware.ts
import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    // Redirect already-authenticated users away from the sign-in page to the app
    if (req.nextUrl.pathname === '/auth/sign-in' && req.nextauth.token) {
      return NextResponse.redirect(new URL('/collections', req.url));
    }
    // Guard /org/users, /org/settings, and /settings — Admin only
    if (
      req.nextUrl.pathname.startsWith('/org/users') ||
      req.nextUrl.pathname.startsWith('/org/settings') ||
      req.nextUrl.pathname.startsWith('/settings')
    ) {
      if (req.nextauth.token?.role !== 'Admin') {
        return NextResponse.redirect(new URL('/collections', req.url));
      }
    }
    // All other authenticated requests proceed normally
    return NextResponse.next();
  },
  {
    callbacks: {
      // Return true = allow; false = redirect to pages.signIn (configured in authOptions as /auth/sign-in)
      // next-auth automatically appends ?callbackUrl=<current-path> on unauthorized redirect
      // Allow unauthenticated access to /auth/* pages to prevent infinite redirect loop —
      // the middleware body above handles redirecting authenticated users away from sign-in
      authorized: ({ token, req }) => {
        if (req.nextUrl.pathname.startsWith('/auth/')) return true;
        return !!token;
      },
    },
  },
);

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - api/          (API routes — each write handler guards itself via requireAuth())
     * - _next/static  (Next.js static file serving)
     * - _next/image   (Next.js image optimization)
     * - favicon.ico
     *
     * /auth/* page routes (e.g. /auth/sign-in) are intentionally included so the
     * middleware body can redirect authenticated users away from the sign-in page.
     * /api/auth/* NextAuth callback endpoints are excluded via the api/ exclusion above.
     *
     * Excluding api/ from the matcher is intentional: middleware handles page-level UX
     * redirects only. API routes return 401 JSON from requireAuth() — not HTML redirects
     * (which would break fetch() callers). Separation per CONTEXT.md.
     */
    '/((?!api|_next/static|_next/image|favicon\\.ico).*)',
  ],
};
