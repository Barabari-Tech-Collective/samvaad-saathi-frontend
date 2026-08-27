import { useAIResumeContext } from "../../_components/resume-provider";

export function ScoreBreakdownGrid() {
  const { analysisResult } = useAIResumeContext();

  const getScoreItems = () => {
    if (!analysisResult?.scoreBreakdown) {
      return [];
    }

    const breakdown = analysisResult.scoreBreakdown;
    const expEval = analysisResult.experienceEvaluation;

    // Detect if candidate is a fresher
    const isFresher =
      breakdown.isFresher === true ||
      breakdown.totalMonths === 0 ||
      expEval?.rating?.includes("None listed") ||
      expEval?.rating?.includes("Fresher");

    // Dynamic Experience vs. Projects Card
    const experienceOrProjectsCard = isFresher
      ? {
          label: "Projects",
          score: breakdown.projectMatch ?? breakdown.experienceMatch ?? 0,
          color: "bg-emerald-500",
          track: "bg-emerald-100",
        }
      : {
          label: "Experience",
          score: breakdown.experienceMatch ?? 0,
          color: "bg-emerald-500",
          track: "bg-emerald-100",
        };

    // Directly construct the 4 items with pre-calculated scores
    return [
      {
        label: "Skills Match",
        score: breakdown.skillsMatch ?? 0,
        color: "bg-primary",
        track: "bg-blue-100",
      },
      experienceOrProjectsCard,
      {
        label: "Links",
        score: breakdown.linkIntegrity ?? 0,
        color: "bg-emerald-500",
        track: "bg-emerald-100",
      },
      {
        label: "Education",
        score: breakdown.educationScore ?? 0,
        color: "bg-orange-500",
        track: "bg-orange-100",
      },
    ];
  };

  const scores = getScoreItems();

  return (
    <div className="space-y-4">
      <h2 className="text-[15px] font-bold text-slate-800">Score breakdown</h2>
      <div className="grid grid-cols-2 gap-4">
        {scores.map((item) => (
          <div
            key={item.label}
            className="px-5 py-4 rounded-3xl bg-white border border-slate-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] flex flex-col gap-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-semibold text-slate-600">
                {item.label}
              </span>
              <span className="text-[15px] font-bold text-slate-900">
                {item.score}%
              </span>
            </div>
            <div className={`w-full h-1.5 rounded-full ${item.track} overflow-hidden`}>
              <div
                className={`h-full rounded-full ${item.color} transition-all duration-1000 ease-out`}
                style={{ width: `${item.score}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}