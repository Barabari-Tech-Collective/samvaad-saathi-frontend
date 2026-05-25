import { ChevronLeftIcon } from "@heroicons/react/24/solid";
import { SparklesIcon } from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";
import { ResumeInputForm } from "./ResumeInputForm";

export function ResumeInputScreen({ onNext }: { onNext: () => void }) {
    const router = useRouter();

    return (
        <div className="flex flex-col gap-6 relative animate-in fade-in slide-in-from-bottom-4 duration-500 pt-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <button 
                    onClick={() => router.back()}
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
            <div className="space-y-2">
                <h1 className="text-2xl font-bold text-slate-900">AI Resume Feedback</h1>
                <p className="text-slate-500 text-sm">Optimize your resume for ATS and role-specific hiring.</p>
            </div>

            {/* Form */}
            <ResumeInputForm onNext={onNext} />
        </div>
    );
}
