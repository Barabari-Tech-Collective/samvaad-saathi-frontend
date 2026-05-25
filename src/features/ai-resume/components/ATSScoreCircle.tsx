import { SparklesIcon } from "@heroicons/react/24/solid";

export function ATSScoreCircle({ score }: { score: number }) {
    // Math for SVG circle
    const radius = 45;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (score / 100) * circumference;

    return (
        <div className="w-full rounded-3xl bg-gradient-to-br from-[#1e58f1] to-[#4b31e3] p-6 text-white shadow-lg overflow-hidden relative">
            <div className="flex items-center gap-2 mb-6 opacity-90 relative z-10">
                <SparklesIcon className="size-5" />
                <span className="font-semibold text-sm">ATS Compatibility Score</span>
            </div>
            
            <div className="flex items-center gap-6 relative z-10">
                {/* Circle */}
                <div className="relative w-[120px] h-[120px] flex-shrink-0">
                    <svg className="w-full h-full -rotate-90 transform drop-shadow-md" viewBox="0 0 100 100">
                        {/* Background circle */}
                        <circle
                            className="text-white/20 stroke-current"
                            strokeWidth="8"
                            cx="50"
                            cy="50"
                            r={radius}
                            fill="transparent"
                        />
                        {/* Progress circle */}
                        <circle
                            className="text-white stroke-current transition-all duration-1000 ease-out"
                            strokeWidth="8"
                            strokeLinecap="round"
                            cx="50"
                            cy="50"
                            r={radius}
                            fill="transparent"
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                        />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-[40px] leading-none font-bold mb-1">{score}</span>
                        <span className="text-[10px] font-medium text-white/80">out of 100</span>
                    </div>
                </div>

                {/* Info Text */}
                <div className="flex-1">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/20 backdrop-blur-sm rounded-full text-xs font-semibold mb-3">
                        <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                        Moderate match
                    </div>
                    <p className="text-sm text-white/90 leading-relaxed font-medium">
                        Matches the role moderately well but lacks frontend optimization and testing keywords.
                    </p>
                </div>
            </div>
            
            {/* Background decoration */}
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl mix-blend-overlay"></div>
        </div>
    );
}
