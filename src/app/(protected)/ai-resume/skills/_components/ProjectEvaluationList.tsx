import { useAIResumeContext } from "../../_components/resume-provider";

export function ProjectEvaluationList() {
    const { analysisResult } = useAIResumeContext();
    
    const projects = analysisResult?.projectEvaluation ?? [];

    const getStatusColor = (status: string) => {
        if (!status) return "bg-slate-50 text-slate-600 border border-slate-100";
        switch (status.toLowerCase()) {
            case "excellent":
                return "bg-emerald-50 text-emerald-600 border border-emerald-100";
            case "good":
                return "bg-emerald-50 text-emerald-600 border border-emerald-100";
            case "average":
                return "bg-orange-50 text-orange-600 border border-orange-100";
            case "poor":
                return "bg-red-50 text-red-600 border border-red-100";
            default:
                return "bg-slate-50 text-slate-600 border border-slate-100";
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-[15px] font-bold text-slate-800">Project evaluation</h2>
                <span className="text-xs font-semibold text-slate-400">{projects.length} detected</span>
            </div>
            
            <div className="flex flex-col gap-4">
                {projects.length > 0 ? (
                    projects.map((proj, i) => (
                        <div key={i} className="p-5 rounded-3xl bg-white border border-slate-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
                             <div className="flex items-center justify-between mb-3">
                                 <div className="flex items-center gap-3">
                                     <div className="w-9 h-9 rounded-full bg-slate-50 text-slate-500 flex items-center justify-center font-bold text-sm">
                                         &lt;/&gt;
                                     </div>
                                     <span className="font-semibold text-[15px] text-slate-800">{proj.projectName}</span>
                                 </div>
                                 <span className={`px-3 py-1 rounded-full text-[11px] uppercase tracking-wider font-bold ${getStatusColor(proj.rating)}`}>
                                     {proj.rating}
                                 </span>
                             </div>
                             <p className="text-[13px] leading-relaxed text-slate-500 font-medium mb-2">{proj.feedback}</p>
                             {proj.projectUrl && (
                                 <a 
                                     href={proj.projectUrl} 
                                     target="_blank" 
                                     rel="noopener noreferrer"
                                     className="text-xs text-primary hover:underline font-semibold"
                                 >
                                     View Project Link ↗
                                 </a>
                             )}
                        </div>
                    ))
                ) : (
                    <div className="p-5 rounded-3xl bg-white border border-slate-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] text-center text-slate-500 text-sm">
                        No projects detected in resume.
                    </div>
                )}
            </div>
        </div>
    );
}
