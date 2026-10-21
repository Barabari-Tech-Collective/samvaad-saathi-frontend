// Read-only synthetic responses for local accessibility testing, never application source.
export function acceptanceData(path: string): unknown | undefined {
  if (!/^\/(api\/|samvaad\/|course-management\/|courses\/catalogue)/.test(path)) return undefined;
  if (path.endsWith("interviews-with-summary"))
    return {
      items: [
        {
          interviewId: 12,
          track: "Communication",
          difficulty: "easy",
          status: "completed",
          createdAt: "2026-10-20T10:00:00Z",
          summaryReportAvailable: true,
        },
      ],
    };
  if (path.includes("human-interviews"))
    return { items: [], total: 0, notice: "Your host will schedule a human interview." };
  if (path.includes("consent")) return [];
  if (path.includes("guides")) return { dismissed: false, completed: false, step: 0 };
  return undefined;
}
