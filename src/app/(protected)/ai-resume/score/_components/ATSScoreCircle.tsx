import { SparklesIcon } from "@heroicons/react/24/solid";
import { ArrowTrendingUpIcon } from "@heroicons/react/24/outline";
import { useAIResumeContext } from "../../_components/resume-provider";

export function ATSScoreCircle() {
  const { analysisResult } = useAIResumeContext();
  const score = analysisResult?.atsScore ?? 0;
  const summary = analysisResult?.summary;

  // Determine status text based on score
  const getStatusText = (score: number) => {
    if (score >= 80) return "Excellent match";
    if (score >= 60) return "Good match";
    if (score >= 40) return "Moderate match";
    return "Needs improvement";
  };

  // Determine status description based on score
  const getStatusDescription = (score: number) => {
    if (score >= 80) return "Your resume is well-optimized for this role and experience level.";
    if (score >= 60) return "Your resume matches well but has room for optimization.";
    if (score >= 40) return "Your resume could use some improvements to better match this role.";
    return "Consider updating your resume to better align with the target position.";
  };

  return (
    <div className="w-full rounded-3xl bg-gradient-to-br from-primary to-primary/80 p-6 text-white shadow-lg overflow-hidden relative">
      <div className="flex items-center gap-2 mb-6 opacity-90 relative z-10">
        <SparklesIcon className="size-5" />
        <span className="font-semibold text-sm">ATS Compatibility Score</span>
      </div>

      <div className="flex items-center gap-6 relative z-10">
        {/* Circle */}
        <div className="relative w-[120px] h-[120px] flex-shrink-0">
          <div
            className="radial-progress text-white/20 absolute inset-0"
            style={
              { "--value": 100, "--size": "120px", "--thickness": "8px" } as React.CSSProperties
            }
          />
          <div
            className="radial-progress text-white absolute inset-0 transition-all duration-1000 ease-out drop-shadow-md"
            style={
              { "--value": score, "--size": "120px", "--thickness": "8px" } as React.CSSProperties
            }
            role="progressbar"
          >
            <div className="flex flex-col items-center justify-center pt-[15px]">
              <span className="text-[40px] leading-none font-bold mb-1">{score}</span>
              <span className="text-[10px] font-medium text-white/80 -mt-1">out of 100</span>
            </div>
          </div>
        </div>

        {/* Info Text */}
        <div className="flex-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/20 backdrop-blur-sm rounded-full text-xs font-semibold mb-3">
            <ArrowTrendingUpIcon className="size-3.5" />
            {getStatusText(score)}
          </div>
          <p className="text-sm text-white/90 leading-relaxed font-medium">
            {getStatusDescription(score)}
          </p>
        </div>
      </div>

      {summary && (
        <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm">
          <h2 className="text-[15px] font-bold text-slate-800 mb-3">ATS Summary</h2>

          <p className="text-[13px] leading-7 text-slate-600">{summary}</p>
        </div>
      )}

      {/* Background decoration */}
      <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl mix-blend-overlay"></div>
    </div>
  );
}
