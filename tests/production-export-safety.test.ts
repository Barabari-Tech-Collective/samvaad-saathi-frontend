import { describe, expect, it } from "vitest";
import { buildResumeAnalysisReport } from "@/lib/resume-report-export";
import type { AnalysisResult } from "@/features/ai-resume/types";
const payload =
  '<img src="https://example.invalid/pixel" onerror="alert(1)"><script>alert(1)</script>& नमस्ते';
const fixture: AnalysisResult = {
  atsScore: 81,
  analysisId: "test",
  summary: payload,
  scoreBreakdown: {},
  skillsAnalysis: { strongSkills: [payload], missingSkills: [payload] },
  projectEvaluation: [{ projectName: payload, rating: payload, feedback: payload }],
  finalRecommendations: [payload],
};
describe("downloaded résumé report", () => {
  it("treats every provider-controlled field as text, not active HTML", () => {
    const document = new DOMParser().parseFromString(
      buildResumeAnalysisReport(fixture),
      "text/html"
    );
    expect(document.querySelectorAll("script,img,iframe,object,embed,form")).toHaveLength(0);
    expect(document.body.textContent?.split(payload)).toHaveLength(8);
    expect(
      document.querySelector('meta[http-equiv="Content-Security-Policy"]')?.getAttribute("content")
    ).toContain("default-src 'none'");
    expect(document.body.textContent).toContain("81/100");
  });
  it.each([NaN, Infinity, -1, 101, undefined])(
    "does not turn invalid score %s into a meaningful result",
    (atsScore) => {
      const html = buildResumeAnalysisReport({ ...fixture, atsScore } as AnalysisResult);
      expect(html).toContain("ATS Match Score: Unavailable");
    }
  );
  it("preserves zero as a valid score and handles absent optional sections", () => {
    const html = buildResumeAnalysisReport({
      ...fixture,
      atsScore: 0,
      skillsAnalysis: {},
      projectEvaluation: undefined,
      finalRecommendations: undefined,
    });
    expect(html).toContain("0/100");
    expect(html).toContain("No projects evaluated");
  });
});
