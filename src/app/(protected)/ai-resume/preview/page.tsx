"use client";

import { ChevronLeftIcon, ArrowRightIcon, CheckIcon, ShieldCheckIcon, UserGroupIcon, Squares2X2Icon, AcademicCapIcon, ArrowDownTrayIcon, PencilIcon } from "@heroicons/react/24/solid";
import { useRouter } from "next/navigation";

export default function ResumeTemplatePreviewPage() {
    const router = useRouter();

    return (
        <div className="w-full max-w-2xl mx-auto pb-20">
            <div className="flex flex-col gap-6 relative animate-in fade-in slide-in-from-right-4 duration-500 pt-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <button 
                        onClick={() => router.push("/ai-resume/hygiene")}
                        className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors"
                    >
                        <ChevronLeftIcon className="size-5 text-slate-700" />
                    </button>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/5 text-primary rounded-full text-sm font-medium">
                        <ShieldCheckIcon className="size-4" />
                        <span>ATS Optimized</span>
                    </div>
                </div>

                {/* Title Section */}
                <div className="space-y-1">
                    <h1 className="text-2xl font-bold text-slate-900">ATS Resume Template</h1>
                    <p className="text-slate-500 text-sm">Professional ATS-friendly resume format</p>
                </div>

                {/* Template Preview Section */}
                <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-5">
                    
                    {/* Visual Preview Area */}
                    <div className="bg-slate-50 rounded-2xl p-6 flex justify-center items-center relative overflow-hidden h-72">
                        {/* The resume paper */}
                        <div className="bg-white shadow-md rounded-lg w-48 h-64 p-4 flex flex-col gap-3 relative z-10">
                            {/* Fake ATS Badge on the paper */}
                            <div className="absolute -right-3 top-4 bg-primary text-white text-[9px] font-bold px-2 py-1 rounded-full shadow-sm">
                                ATS Optimized
                            </div>

                            {/* Fake Resume Content Lines */}
                            <div className="h-3 w-4/5 bg-slate-800 rounded-full mb-1"></div>
                            <div className="h-1.5 w-1/2 bg-slate-300 rounded-full"></div>
                            
                            <div className="h-2 w-1/3 bg-primary/60 rounded-full mt-3"></div>
                            <div className="h-1 w-full bg-slate-200 rounded-full"></div>
                            <div className="h-1 w-full bg-slate-200 rounded-full"></div>
                            <div className="h-1 w-5/6 bg-slate-200 rounded-full"></div>

                            <div className="h-2 w-1/3 bg-primary/60 rounded-full mt-2"></div>
                            <div className="h-1 w-full bg-slate-200 rounded-full"></div>
                            <div className="h-1 w-11/12 bg-slate-200 rounded-full"></div>
                            <div className="h-1 w-4/5 bg-slate-200 rounded-full"></div>

                            <div className="h-2 w-1/3 bg-primary/60 rounded-full mt-2"></div>
                            <div className="h-1 w-full bg-slate-200 rounded-full"></div>
                            <div className="h-1 w-full bg-slate-200 rounded-full"></div>
                        </div>
                    </div>

                    {/* Features Grid */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex items-center gap-2 bg-slate-50 rounded-xl p-3">
                            <ShieldCheckIcon className="size-4 text-primary" />
                            <span className="text-xs font-medium text-slate-700">ATS Friendly</span>
                        </div>
                        <div className="flex items-center gap-2 bg-slate-50 rounded-xl p-3">
                            <UserGroupIcon className="size-4 text-primary" />
                            <span className="text-xs font-medium text-slate-700 leading-tight">Recruiter<br/>Approved</span>
                        </div>
                        <div className="flex items-center gap-2 bg-slate-50 rounded-xl p-3">
                            <Squares2X2Icon className="size-4 text-primary" />
                            <span className="text-xs font-medium text-slate-700">Clean Structure</span>
                        </div>
                        <div className="flex items-center gap-2 bg-slate-50 rounded-xl p-3">
                            <AcademicCapIcon className="size-4 text-primary" />
                            <span className="text-xs font-medium text-slate-700 leading-tight">Optimized for<br/>Freshers</span>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-3 mt-2">
                    <button onClick={() => router.push("/ai-resume/final")} className="w-full flex items-center justify-center gap-2 py-4 bg-primary hover:opacity-90 text-white rounded-2xl font-medium transition-colors shadow-sm active:scale-[0.98]">
                        <CheckIcon className="size-4" strokeWidth={3} />
                        <span>Use This Template</span>
                        <ArrowRightIcon className="size-4 ml-1" />
                    </button>
                    
                    <div className="flex gap-3">
                        <button className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-medium transition-colors shadow-sm">
                            <ArrowDownTrayIcon className="size-4" />
                            Download PDF
                        </button>
                        <button className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-slate-900 hover:bg-black text-white rounded-xl font-medium transition-colors shadow-sm">
                            <PencilIcon className="size-4" />
                            Edit Template
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
