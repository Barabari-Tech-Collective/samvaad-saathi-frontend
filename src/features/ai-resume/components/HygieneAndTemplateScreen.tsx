import { ChevronLeftIcon, CheckIcon, XMarkIcon, ArrowPathIcon, DocumentTextIcon, EyeIcon, ArrowDownTrayIcon, ArrowRightIcon } from "@heroicons/react/24/solid";
import { SparklesIcon, CheckCircleIcon } from "@heroicons/react/24/outline";

export function HygieneAndTemplateScreen({ onBack, onNext }: { onBack: () => void, onNext: () => void }) {
    return (
        <div className="flex flex-col gap-6 relative animate-in fade-in slide-in-from-right-4 duration-500 pt-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <button 
                    onClick={onBack}
                    className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                    <ChevronLeftIcon className="size-5 text-slate-700" />
                </button>
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-full text-sm font-medium">
                    <SparklesIcon className="size-4" />
                    <span>AI Powered</span>
                </div>
            </div>

            {/* Title Section */}
            <div className="space-y-1">
                <h1 className="text-2xl font-bold text-slate-900">Hygiene & Template</h1>
                <p className="text-slate-500 text-sm">Final polish and an ATS-ready template.</p>
            </div>

            {/* Content */}
            <div className="flex flex-col gap-4">
                {/* Grammar & Spelling Card */}
                <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="font-semibold text-slate-900">Grammar & spelling</h2>
                        <span className="bg-orange-50 text-orange-600 text-xs font-medium px-2.5 py-1 rounded-full">3 issues</span>
                    </div>
                    <ul className="space-y-2 text-sm text-slate-600 list-disc list-inside">
                        <li>Missing comma in summary section</li>
                        <li>"Develoeped" should be "Developed"</li>
                        <li>Tense inconsistency in project bullets</li>
                    </ul>
                </div>

                {/* Profile Links Card */}
                <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="font-semibold text-slate-900">Profile links</h2>
                        <span className="text-slate-400 text-xs">Developer track</span>
                    </div>
                    <div className="space-y-3">
                        {[
                            { name: "LinkedIn Profile", valid: true },
                            { name: "GitHub Profile", valid: true },
                            { name: "Portfolio Website", valid: false },
                            { name: "Phone Number", valid: true },
                            { name: "Email Address", valid: true },
                        ].map((link, idx) => (
                            <div key={idx} className="flex items-center justify-between text-sm">
                                <span className="text-slate-700">{link.name}</span>
                                {link.valid ? (
                                    <div className="size-5 rounded-full bg-green-50 flex items-center justify-center">
                                        <CheckIcon className="size-3 text-green-500" />
                                    </div>
                                ) : (
                                    <div className="size-5 rounded-full bg-red-50 flex items-center justify-center">
                                        <XMarkIcon className="size-3 text-red-500" strokeWidth={2} />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Final Recommendations Card */}
                <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
                    <h2 className="font-semibold text-slate-900">Final recommendations</h2>
                    <div className="space-y-3">
                        {[
                            "Add measurable achievements with metrics",
                            "Improve project descriptions with impact",
                            "Add ATS-friendly keywords (testing, performance)",
                            "Add a personal portfolio website"
                        ].map((rec, idx) => (
                            <div key={idx} className="flex gap-3 text-sm text-slate-600">
                                <div className="mt-0.5 size-4 rounded-full bg-blue-50 flex-shrink-0 flex items-center justify-center">
                                    <CheckIcon className="size-2.5 text-blue-500" strokeWidth={3} />
                                </div>
                                <span>{rec}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ATS Template Card */}
                <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl p-5 shadow-md flex flex-col sm:flex-row gap-5 items-start">
                    {/* Resume Visual */}
                    <div className="bg-white rounded-lg p-3 w-24 h-32 flex-shrink-0 flex flex-col gap-2 shadow-sm mx-auto sm:mx-0">
                        <div className="h-2 w-3/4 bg-slate-200 rounded-full mx-auto mb-1"></div>
                        <div className="h-1 w-full bg-slate-100 rounded-full"></div>
                        <div className="h-1 w-5/6 bg-slate-100 rounded-full"></div>
                        <div className="h-1.5 w-1/2 bg-blue-400 rounded-full mt-2"></div>
                        <div className="h-1 w-full bg-slate-100 rounded-full"></div>
                        <div className="h-1 w-4/5 bg-slate-100 rounded-full"></div>
                        <div className="h-1.5 w-1/2 bg-blue-400 rounded-full mt-1"></div>
                        <div className="h-1 w-full bg-slate-100 rounded-full"></div>
                        <div className="h-1 w-full bg-slate-100 rounded-full"></div>
                    </div>
                    
                    {/* Template Info & Actions */}
                    <div className="flex flex-col gap-3 flex-1">
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/20 w-fit rounded-full">
                            <DocumentTextIcon className="size-3 text-white" />
                            <span className="text-white text-[10px] font-medium uppercase tracking-wider">ATS Optimized</span>
                        </div>
                        <div>
                            <h3 className="text-white font-bold leading-tight">Use ATS-friendly resume template</h3>
                            <p className="text-blue-100 text-xs mt-1">Professionally structured for ATS systems and modern recruiters.</p>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-1">
                            <button className="flex items-center gap-1 px-3 py-1.5 bg-white/10 hover:bg-white/20 transition-colors rounded-lg text-white text-xs font-medium">
                                <EyeIcon className="size-3.5" />
                                Preview
                            </button>
                            <button className="flex items-center gap-1 px-3 py-1.5 bg-white/10 hover:bg-white/20 transition-colors rounded-lg text-white text-xs font-medium">
                                <ArrowDownTrayIcon className="size-3.5" />
                                Download
                            </button>
                            <button onClick={onNext} className="flex items-center gap-1 px-4 py-1.5 bg-white hover:bg-slate-50 transition-colors rounded-lg text-blue-600 text-xs font-semibold ml-auto">
                                Use
                                <ArrowRightIcon className="size-3" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex gap-3 mt-4">
                <button className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition-colors">
                    <ArrowPathIcon className="size-4" />
                    Re-Analyze
                </button>
                <button className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-[#1e58f1] hover:bg-blue-700 text-white rounded-xl font-medium transition-colors shadow-sm">
                    <DocumentTextIcon className="size-4" />
                    Download Report
                </button>
            </div>
        </div>
    );
}
