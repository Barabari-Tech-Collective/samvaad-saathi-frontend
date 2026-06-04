import { ArrowRightIcon } from "@heroicons/react/24/outline";
import { useAIResumeContext } from "../../_components/AIResumeContext";

export function TopRecommendationsCard() {
    const { analysisResult } = useAIResumeContext();
    
    const recs = analysisResult?.recommendations ?? [];

    return (
        <div className="space-y-4 pb-4">
            <div className="flex items-center justify-between">
                <h2 className="text-[15px] font-bold text-slate-800">Top recommendations</h2>
                <span className="text-xs text-slate-400 font-semibold">AI suggested</span>
            </div>
            
            <div className="bg-white rounded-3xl border border-slate-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] p-2 flex flex-col">
                {recs.length > 0 ? (
                    recs.map((rec, i) => (
                        <div key={i} className={`flex items-center gap-4 p-4 ${i !== recs.length - 1 ? 'border-b border-slate-50' : ''} hover:bg-slate-50/50 transition-colors cursor-pointer rounded-2xl group`}>
                            <div className="w-6 h-6 shrink-0 rounded-full bg-primary/5 text-primary flex items-center justify-center text-xs font-bold">
                                {i + 1}
                            </div>
                            <p className="flex-1 text-[13px] text-slate-700 font-medium leading-snug">{rec}</p>
                            <ArrowRightIcon className="size-4 text-slate-300 group-hover:text-primary/80 transition-colors" />
                        </div>
                    ))
                ) : (
                    <div className="p-4 text-center text-slate-500 text-sm">
                        No recommendations available yet.
                    </div>
                )}
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
                <span className="px-4 py-2 bg-primary/5 text-primary rounded-full text-xs font-bold border border-primary/10">Frontend Developer</span>
                <span className="px-4 py-2 bg-slate-50 text-slate-500 rounded-full text-xs font-bold border border-slate-200">Entry Level</span>
            </div>
        </div>
    );
}
