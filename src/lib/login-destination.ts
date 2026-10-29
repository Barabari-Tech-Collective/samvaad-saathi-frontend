/** Treat all URL-derived navigation targets as untrusted, including callback params. */
export function loginDestination(value: string | null | undefined): string {
  if (!value || value.length > 2048 || !value.startsWith("/")) return "/home";
  try {
    const decoded = decodeURIComponent(value);
    if (decoded.startsWith("//") || /[\\\x00-\x20\x7f]/.test(decoded) || /%[0-9a-f]{2}/i.test(decoded)) return "/home";
    const url = new URL(decoded, "https://product.invalid");
    if (url.origin !== "https://product.invalid" || /^\/(?:auth|api|login|logout)(?:\/|$)/i.test(url.pathname)) return "/home";
    return value === "/" ? "/home" : value;
  } catch { return "/home"; }
}
