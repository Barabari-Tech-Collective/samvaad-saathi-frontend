export function ExperienceEvaluationList() {
    const experiences = [
        {
            title: "Frontend Developer at TechCorp",
            status: "Good",
            statusColor: "bg-emerald-50 text-emerald-600 border border-emerald-100",
            iconColor: "bg-slate-50 text-slate-500",
            description: "Strong experience with modern React patterns. Add more emphasis on leadership or mentoring to stand out.",
            icon: "💼"
        },
        {
            title: "Junior Developer at StartupXYZ",
            status: "Average",
            statusColor: "bg-orange-50 text-orange-600 border border-orange-100",
            iconColor: "bg-slate-50 text-slate-500",
            description: "Demonstrates foundational web development skills. Highlight specific achievements with metrics and impact.",
            icon: "📋"
        }
    ];

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-[15px] font-bold text-slate-800">Experience evaluation</h2>
                <span className="text-xs font-semibold text-slate-400">2 detected</span>
            </div>
            
            <div className="flex flex-col gap-4">
                {experiences.map((exp, i) => (
                    <div key={i} className="p-5 rounded-3xl bg-white border border-slate-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm ${exp.iconColor}`}>
                                    {exp.icon}
                                </div>
                                <span className="font-semibold text-[15px] text-slate-800">{exp.title}</span>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-[11px] uppercase tracking-wider font-bold ${exp.statusColor}`}>
                                {exp.status}
                            </span>
                        </div>
                        <p className="text-[13px] leading-relaxed text-slate-500 font-medium">{exp.description}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}
