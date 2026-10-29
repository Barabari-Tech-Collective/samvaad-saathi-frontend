import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "host",
  "content-length",
  "accept-encoding",
  "referer",
  "origin",
  "sec-fetch-site",
  "sec-fetch-mode",
  "sec-fetch-dest",
  "sec-fetch-user",
]);

function jsonError(status: number, detail: string) {
  return NextResponse.json(
    { detail },
    {
      status,
      headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" },
    }
  );
}

function trustedOrigins() {
  try {
    const app = new URL(process.env.NEXT_PUBLIC_APP_URL || "");
    const home = new URL(process.env.NEXT_PUBLIC_CENTRAL_HOME_ORIGIN || "");
    if (
      app.protocol !== "https:" ||
      home.protocol !== "https:" ||
      app.username ||
      app.password ||
      home.username ||
      home.password
    )
      return null;
    return { app: app.origin, home: home.origin };
  } catch {
    return null;
  }
}

async function proxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const origins = trustedOrigins();
  if (!origins) return jsonError(503, "Secure API proxy is not configured.");

  const requestUrl = new URL(request.url);
  // The local HTTPS launcher and common TLS terminators pass the browser-facing
  // scheme/host in these headers while the internal Next request URL may be HTTP.
  const forwardedHost = (
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    ""
  )
    .split(",")[0]
    .trim();
  const forwardedProto = (
    request.headers.get("x-forwarded-proto") || requestUrl.protocol.replace(":", "")
  )
    .split(",")[0]
    .trim()
    .replace(/:$/, "");
  if (`${forwardedProto}://${forwardedHost}` !== origins.app)
    return jsonError(403, "Request origin is not allowed.");

  const { path } = await context.params;
  if (
    !Array.isArray(path) ||
    path.length === 0 ||
    path.some((part) => !part || part === "." || part === ".." || /[%\\\s]/.test(part))
  ) {
    return jsonError(404, "API route not found.");
  }
  const pathName = path.join("/");
  const isSsoCallback = pathName === "auth/sso/callback";
  const origin = request.headers.get("origin");
  if (origin && origin !== origins.app && !(isSsoCallback && origin === origins.home)) {
    return jsonError(403, "Request origin is not allowed.");
  }
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite === "cross-site" || (fetchSite === "same-site" && !isSsoCallback)) {
    return jsonError(403, "Cross-site API requests are not allowed.");
  }

  const upstreamValue = process.env.SAMVAAD_API_UPSTREAM_URL;
  let upstreamBase: URL;
  try {
    upstreamBase = new URL(upstreamValue || "");
    if (
      upstreamBase.protocol !== "https:" ||
      upstreamBase.username ||
      upstreamBase.password ||
      upstreamBase.search ||
      upstreamBase.hash
    ) {
      return jsonError(503, "Secure API proxy is not configured.");
    }
  } catch {
    return jsonError(503, "Secure API proxy is not configured.");
  }

  const basePath = upstreamBase.pathname.replace(/\/$/, "");
  const target = new URL(
    `${basePath}/${path.map(encodeURIComponent).join("/")}${requestUrl.search}`,
    upstreamBase.origin
  );
  if (target.origin !== upstreamBase.origin || !target.pathname.startsWith(`${basePath}/`)) {
    return jsonError(400, "Invalid API destination.");
  }

  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (!HOP_BY_HOP.has(key.toLowerCase())) headers.set(key, value);
  });
  // The backend validates this origin for cookie sessions. Set it only after
  // validating the browser-facing origin above; never accept a caller-supplied one.
  headers.set("Origin", origins.app);
  headers.set("Sec-Fetch-Site", "same-origin");

  try {
    const method = request.method.toUpperCase();
    const hasBody = !["GET", "HEAD"].includes(method);
    const upstream = await fetch(target, {
      method,
      headers,
      ...(hasBody && request.body ? { body: request.body, duplex: "half" as const } : {}),
      cache: "no-store",
      redirect: "manual",
      signal: request.signal,
    });
    const responseHeaders = new Headers();
    for (const name of [
      "cache-control",
      "content-disposition",
      "content-type",
      "etag",
      "last-modified",
      "location",
      "referrer-policy",
      "retry-after",
      "vary",
      "x-content-type-options",
      "x-request-id",
    ]) {
      const value = upstream.headers.get(name);
      if (value) responseHeaders.set(name, value);
    }
    const cookies = upstream.headers.getSetCookie?.() ?? [];
    for (const cookie of cookies) responseHeaders.append("set-cookie", cookie);
    if (!responseHeaders.has("cache-control")) responseHeaders.set("Cache-Control", "no-store");
    if (!responseHeaders.has("referrer-policy"))
      responseHeaders.set("Referrer-Policy", "no-referrer");
    return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
  } catch {
    return jsonError(502, "The Samvaad service could not be reached. Please retry.");
  }
}

export const GET = proxy;
export const HEAD = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const OPTIONS = proxy;
