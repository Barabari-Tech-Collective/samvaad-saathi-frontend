import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("token")?.value;

  // Define public routes (routes that don't require authentication)
  const isPublicRoute = pathname.startsWith("/auth");

  // Define static/internal routes to exclude from middleware
  const isInternalRoute =
    pathname.includes("_next") ||
    pathname.includes("api") ||
    pathname.includes("favicon.ico") ||
    pathname.endsWith(".json") ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".jpg") ||
    pathname.endsWith(".svg");

  if (isInternalRoute) {
    return NextResponse.next();
  }

  // If the user is on a protected route (including root) and has no token, redirect to signup
  if (!token && !isPublicRoute) {
    return NextResponse.redirect(new URL("/auth/signup", request.url));
  }

  // If the user is on a public route but has a token, redirect to home
  if (token && isPublicRoute) {
    return NextResponse.redirect(new URL("/home", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - manifest.json (manifest file)
     * - *.png, *.jpg, *.svg (images)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|manifest.json|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)",
  ],
};
