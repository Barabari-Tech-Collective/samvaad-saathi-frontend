/** Keep section selection consistent when opening a drill or feedback directly. */
export function workspaceSection(path: string): string {
  if (
    [
      "/structure-your-answer",
      "/pronunciation-practice",
      "/control-your-pace",
      "/warm-up-chat",
      "/think-fast",
    ].some((route) => path === route || path.startsWith(`${route}/`))
  )
    return "/practice";
  if (path === "/interview-start" || path.startsWith("/interview-start/")) return "/practice";
  if (path === "/report-summary" || path.startsWith("/report-summary/")) return "/history";
  return path;
}
