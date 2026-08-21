import { NextRequest, NextResponse } from "next/server";

/**
 * Auth guard middleware for isolated panel apps.
 * - Unauthenticated users visiting any protected route are redirected to /login.
 * - Users already on /login are left alone.
 * - Next.js internals and static files are excluded via matcher config.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow /login and public assets through unconditionally
  if (pathname.startsWith("/login")) return NextResponse.next();

  // Check for an access token in localStorage is not possible in middleware
  // (server-side). Instead we check for the vertofi.access cookie that the
  // client sets via a lightweight cookie-sync script. If it's absent the user
  // hasn't logged in on this browser.
  const hasSession = req.cookies.has("vertofi.session");

  if (!hasSession) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/login";
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|ico|css|js|woff2?)$).*)"],
};
