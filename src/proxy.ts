import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE } from '@/lib/auth/constants';

const PUBLIC_ROUTES = ['/login', '/register'];
const DEFAULT_REDIRECT = '/dashboard';

/**
 * Optimistic auth redirect only — NOT authorization.
 *
 * This checks that a session cookie is *present*, not that it is *valid*; the Firebase Admin SDK
 * requires the Node runtime and cannot verify a session here. Real authorization must happen in
 * server actions and protected pages. Per Next's docs, proxy "should not be used as a full session
 * management or authorization solution".
 */
/**
 * PWA assets and the offline fallback must resolve to their real content in every
 * auth state: the service worker precaches them while the user may be logged out,
 * and browsers refetch the manifest/SW while logged in. Routing them through the
 * auth branches below would redirect them (to /login or /dashboard), so they get
 * an early, unconditional pass-through.
 */
function isPwaPassthrough(pathname: string): boolean {
  return (
    pathname === '/offline' ||
    pathname === '/sw.js' ||
    pathname === '/manifest.webmanifest' ||
    pathname === '/apple-touch-icon.png' ||
    pathname.startsWith('/icon-')
  );
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPwaPassthrough(pathname)) {
    return NextResponse.next();
  }

  const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname.startsWith(route));
  const sessionCookie = request.cookies.get(SESSION_COOKIE)?.value;

  if (!isPublicRoute && !sessionCookie) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isPublicRoute && sessionCookie) {
    return NextResponse.redirect(new URL(DEFAULT_REDIRECT, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/).*)',
  ],
};
