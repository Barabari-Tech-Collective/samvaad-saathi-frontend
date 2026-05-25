export function ProjectEvaluationList() {
    const projects = [
        {
            title: "E-commerce React App",
            status: "Average",
            statusColor: "bg-orange-50 text-orange-600 border border-orange-100",
            iconColor: "bg-slate-50 text-slate-500",
            description: "Demonstrates frontend basics but lacks scalability and production-level architecture.",
            icon: "</>"
        },
        {
            title: "Weather Dashboard",
            status: "Good",
            statusColor: "bg-emerald-50 text-emerald-600 border border-emerald-100",
            iconColor: "bg-slate-50 text-slate-500",
            description: "Clean component structure. Add API error states and loading skeletons.",
            icon: "≡"
        }
    ];

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-[15px] font-bold text-slate-800">Project evaluation</h2>
                <span className="text-xs font-semibold text-slate-400">2 detected</span>
            </div>
            
            <div className="flex flex-col gap-4">
                {projects.map((proj, i) => (
                    <div key={i} className="p-5 rounded-3xl bg-white border border-slate-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm ${proj.iconColor}`}>
                                    {proj.icon}
                                </div>
                                <span className="font-semibold text-[15px] text-slate-800">{proj.title}</span>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-[11px] uppercase tracking-wider font-bold ${proj.statusColor}`}>
                                {proj.status}
                            </span>
                        </div>
                        <p className="text-[13px] leading-relaxed text-slate-500 font-medium">{proj.description}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}
