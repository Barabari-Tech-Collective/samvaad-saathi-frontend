import { useAIResumeContext } from "../../_components/resume-provider";

export function ScoreBreakdownGrid() {
  const { analysisResult } = useAIResumeContext();

  // Map API breakdown fields to display labels with colors
  const getScoreItems = () => {
    if (!analysisResult?.scoreBreakdown) {
      return [];
    }

    const breakdown = analysisResult.scoreBreakdown;
    const scoreMap = [
      { key: "skillsMatch", label: "Skills Match", color: "bg-primary", track: "bg-blue-100" },
      {
        key: "experienceMatch",
        label: "Experience",
        color: "bg-emerald-500",
        track: "bg-emerald-100",
      },
      {
        key: "linkIntegrity",
        label: "Links",
        color: "bg-emerald-500",
        track: "bg-emerald-100",
      },
      { key: "educationScore", label: "Education", color: "bg-orange-500", track: "bg-orange-100" },
    ];

    return scoreMap
      .filter((item) => breakdown[item.key as keyof typeof breakdown] !== undefined)
      .map((item) => ({
        label: item.label,
        score: breakdown[item.key as keyof typeof breakdown] || 0,
        color: item.color,
        track: item.track,
      }))
      .slice(0, 4); // Limit to 4 items max
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
              <span className="text-[13px] font-semibold text-slate-600">{item.label}</span>
              <span className="text-[15px] font-bold text-slate-900">{item.score}%</span>
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
