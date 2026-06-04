import { LightBulbIcon } from "@heroicons/react/24/solid";
import { useAIResumeContext } from "../../_components/AIResumeContext";

export function SuggestedProjectsWidget() {
    const { analysisResult } = useAIResumeContext();
    const suggestedProject = analysisResult?.suggestedProject;

    if (!suggestedProject) {
        return null;
    }

    return (
        <div className="space-y-4 pb-4">
            <div className="flex items-center justify-between">
                <h2 className="text-[15px] font-bold text-slate-800">Suggested project</h2>
                <span className="text-xs font-semibold text-slate-400">AI recommended</span>
            </div>
            
            <div className="p-5 rounded-3xl bg-[#f2f6ff] border border-primary/10">
                <div className="flex items-start gap-4">
                    <div className="w-10 h-10 shrink-0 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                        <LightBulbIcon className="size-5 text-white" />
                    </div>
                    <div className="space-y-2">
                        <h3 className="font-bold text-[15px] text-slate-800 leading-snug pr-2">
                            {suggestedProject.title}
                        </h3>
                        <p className="text-[13px] text-slate-500 font-medium leading-relaxed">
                            {suggestedProject.description}
                        </p>
                        
                        <div className="flex flex-wrap gap-2 pt-3">
                            {suggestedProject.tags && suggestedProject.tags.map((tag, i) => {
                                const isHighDemand = tag.toLowerCase().includes("demand");
                                const isPrimaryTag = ["React", "TypeScript", "Node.js", "WebSockets"].some(t => tag.includes(t));
                                
                                return (
                                    <span
                                        key={i}
                                        className={`px-3 py-1.5 rounded-full text-xs font-bold border shadow-sm ${
                                            isHighDemand
                                                ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                                                : isPrimaryTag
                                                ? "bg-white text-primary border-primary/10"
                                                : "bg-white text-slate-600 border-slate-200"
                                        }`}
                                    >
                                        {tag}
                                    </span>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
