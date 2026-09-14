import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("token")?.value;

  // Define public routes (routes that don't require authentication)
  const isPublicRoute = pathname.startsWith("/auth");

  // Exclude static assets and internal routes from auth redirects.
  // Without this check, unauthenticated requests for public assets (e.g. /barabari_logo.png,
  // /background-image.jpeg, /welcome-bg.png) get 307 redirected to /auth/signup,
  // causing broken images on initial visit or after logout.
  const isInternalOrStatic =
    pathname.includes("_next") ||
    pathname.includes("api") ||
    pathname.includes("favicon.ico") ||
    pathname.includes(".") ||
    pathname.startsWith("/assets");

  if (isInternalOrStatic) {
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
     * Match all request paths except for:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - .*\\.[\\w]+$ (any file with an extension, e.g. .png, .jpeg, .svg, .json, .lottie)
     *
     * Why: Ensures the proxy only intercepts page route navigations and does not run
     * on static assets in the public/ directory, preventing 307 redirects for images.
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.[\\w]+$).*)",
  ],
};