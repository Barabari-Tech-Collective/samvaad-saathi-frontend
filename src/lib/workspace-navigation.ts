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
    return "/coaching";
  // `/interview-start` can prepare either a Mock Interview or a formal assessment.
  // The route pathname alone cannot safely choose a parent, so leave it unselected.
  if (path === "/interview-start" || path.startsWith("/interview-start/")) return path;
  if (path === "/report-summary" || path.startsWith("/report-summary/")) return "/history";
  return path;
}
