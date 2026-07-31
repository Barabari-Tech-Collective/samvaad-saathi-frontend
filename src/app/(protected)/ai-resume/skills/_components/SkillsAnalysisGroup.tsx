import { useAIResumeContext } from "../../_components/resume-provider";

export function SkillsAnalysisGroup() {
  const { analysisResult } = useAIResumeContext();

  const skillsAnalysis = analysisResult?.skillsAnalysis;

  const groups = [
    {
      title: "Strong skills",
      key: "strongSkills" as const,
      color: "bg-emerald-50 text-emerald-700",
      iconColor: "text-slate-600",
    },
    {
      title: "Missing skills",
      key: "missingSkills" as const,
      color: "bg-red-50 text-red-600",
      iconColor: "text-slate-600",
    },
    {
      title: "Additional Skills",
      key: "additionalSkills" as const,
      color: "bg-orange-50 text-orange-700",
      iconColor: "text-slate-600",
      description: "Additional technologies and skills found in your resume.",
    },
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-[15px] font-bold text-slate-800">Skills analysis</h2>

      <div className="flex flex-col gap-4">
        {groups.map((group, i) => {
          const items = skillsAnalysis?.[group.key] ?? [];
          return (
            <div
              key={i}
              className="p-4 rounded-3xl bg-white border border-slate-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center">
                    {/* Abstract icon based on screenshot */}
                    <div className="w-3 h-3 rounded-full border-[2.5px] border-slate-500"></div>
                  </div>
                  <span className="font-semibold text-[15px] text-slate-800">{group.title}</span>
                </div>
                <span className="text-xs font-semibold text-slate-400">{items.length}</span>
              </div>

              <div className="flex flex-wrap gap-2">
                {items.length > 0 ? (
                  items.map((item, j) => (
                    <span
                      key={j}
                      className={`px-3 py-1.5 rounded-full text-[13px] font-bold ${group.color}`}
                    >
                      {item}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-400">No items</span>
                )}
              </div>

              {group.description && (
                <p className="mt-4 text-[13px] font-medium text-slate-400">{group.description}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
