import { loginDestination } from "@/lib/login-destination";
import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // The API owns its host-only session cookie. Client bootstrap hides protected
  // content until the API verifies identity; every API route still enforces access.
  if (process.env.NEXT_PUBLIC_AUTH_MODE === "server-session") return NextResponse.next();
  const token = request.cookies.get("token")?.value;
  if (pathname === "/auth/session-workspace") return NextResponse.next();

  // Define public routes (routes that don't require authentication)
  const isPublicRoute = pathname.startsWith("/auth");

  // Define static/internal routes to exclude from proxy redirects
  const isInternalRoute =
    pathname.includes("_next") || pathname.includes("api") || pathname.includes("favicon.ico");

  if (isInternalRoute) {
    return NextResponse.next();
  }

  // If the user is on a protected route (including root) and has no token, redirect to signup
  if (!token && !isPublicRoute) {
    const login = new URL("/auth/signup", request.url);
    login.searchParams.set("return_to", loginDestination(pathname + request.nextUrl.search));
    return NextResponse.redirect(login);
  }

  // If the user is on a public route but has a token, redirect to home
  const hasCallback = pathname === "/auth/signup" && (["handoff", "callback"].includes(request.nextUrl.searchParams.get("flow") || "") || (request.nextUrl.searchParams.has("token") && request.nextUrl.searchParams.has("refresh_token")));
  if (token && isPublicRoute && !hasCallback) {
    return NextResponse.redirect(new URL(loginDestination(request.nextUrl.searchParams.get("return_to")), request.url));
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
