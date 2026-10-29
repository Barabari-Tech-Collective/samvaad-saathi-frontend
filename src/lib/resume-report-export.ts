import type { AnalysisResult } from "@/features/ai-resume/types";

// Provider output and uploaded résumé text are untrusted even in a downloaded file.
export function escapeReportText(value: unknown): string {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[char]!
  );
}

function formatReportScore(value: unknown): string {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100
    ? `${value}/100`
    : "Unavailable";
}

export function buildResumeAnalysisReport(analysisResult: AnalysisResult): string {
  return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>AI Resume Analysis Report</title>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; overflow-wrap: anywhere; color: #334155; max-width: 800px; margin: 40px auto; padding: clamp(12px, 4vw, 30px); background: #f8fafc; }
                    .container { background: white; padding: clamp(16px, 5vw, 40px); border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
                    h1 { color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; margin-top: 0; }
                    h2 { color: #1e293b; margin-top: 30px; font-size: 1.25rem; }
                    .score-box { background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 20px; border-radius: 12px; font-size: 1.5rem; font-weight: bold; color: #166534; text-align: center; margin: 25px 0; }
                    .summary { background-color: #f1f5f9; padding: 20px; border-left: 4px solid #64748b; font-style: italic; border-radius: 0 8px 8px 0; }
                    .card { border: 1px solid #e2e8f0; padding: 20px; border-radius: 12px; margin-top: 15px; }
                    .tag { display: inline-block; padding: 6px 12px; border-radius: 9999px; font-size: 0.85em; font-weight: 600; margin: 4px; }
                    .strong { background-color: #dcfce7; color: #166534; }
                    .missing { background-color: #fee2e2; color: #991b1b; }
                    .deprioritize { background-color: #ffedd5; color: #9a3412; }
                    .project-item { margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid #f1f5f9; }
                    .project-item:last-child { margin-bottom: 0; padding-bottom: 0; border-bottom: none; }
                    .rating-badge { font-size: 0.7em; padding: 4px 10px; background: #e0f2fe; color: #0369a1; border-radius: 12px; vertical-align: middle; margin-left: 10px; }
                    ul { padding-left: 20px; }
                    li { margin-bottom: 8px; color: #475569; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>AI Resume Analysis Report</h1>
                    
                    <div class="score-box">
                        ATS Match Score: ${formatReportScore(analysisResult.atsScore)}
                    </div>

                    <div class="summary">
                        ${escapeReportText(analysisResult.summary)}
                    </div>

                    <h2>Skills Analysis</h2>
                    <div class="card">
                        <p style="margin-top:0; font-weight:bold;">Strong Skills:</p>
                        <div>${(analysisResult.skillsAnalysis?.strongSkills || []).map((s: string) => `<span class="tag strong">${escapeReportText(s)}</span>`).join("") || "None identified"}</div>
                        
                        <p style="margin-top: 20px; font-weight:bold;">Missing / Suggested Skills:</p>
                        <div>${(analysisResult.skillsAnalysis?.missingSkills || []).map((s: string) => `<span class="tag missing">${escapeReportText(s)}</span>`).join("") || "None identified"}</div>
                    </div>

                    <h2>Project Evaluation</h2>
                    <div class="card">
                        ${
                          (analysisResult.projectEvaluation || [])
                            .map(
                              (p) => `
                            <div class="project-item">
                                <strong style="color: #0f172a;">${escapeReportText(p.projectName)}</strong>
                                <span class="rating-badge">Rating: ${escapeReportText(p.rating)}/5</span>
                                <p style="margin-top: 8px;">${escapeReportText(p.feedback)}</p>
                            </div>
                        `
                            )
                            .join("") ||
                          '<p style="margin:0; color:#64748b;">No projects evaluated</p>'
                        }
                    </div>

                    <h2>Final Recommendations</h2>
                    <div class="card">
                        <ul style="margin:0;">
                            ${(analysisResult.finalRecommendations || []).map((r: string) => `<li>${escapeReportText(r)}</li>`).join("") || "<li>No recommendations</li>"}
                        </ul>
                    </div>
                </div>
            </body>
            </html>
            `;
}
