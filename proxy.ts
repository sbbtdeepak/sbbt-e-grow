import { NextResponse, type NextRequest } from "next/server";

import { createSupabaseProxyClient } from "@/lib/supabase/proxy";

/**
 * Next.js 16 Proxy (formerly Middleware).
 *
 * Responsibilities:
 *  - Refresh the Supabase auth session on every matched request.
 *  - Protect app routes under `/(app)` by redirecting unauthenticated
 *    users to `/login`.
 *  - Redirect authenticated users away from `/login` to `/dashboard`.
 *
 * Auth is NOT fully enforced here — this is an optimistic check.
 * Row Level Security is the source of truth for data access.
 */
export async function proxy(request: NextRequest) {
  const { supabase, response } = createSupabaseProxyClient(request);

  // Refresh the session (writes updated cookies to the response).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isLoginPage = pathname.startsWith("/login");
  const isProtectedRoute = pathname.startsWith("/dashboard");

  // Redirect logged-in users away from the login page.
  if (isLoginPage && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // Redirect unauthenticated users to login from protected routes.
  if (isProtectedRoute && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    // Run on all paths except Next internals and static assets.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};