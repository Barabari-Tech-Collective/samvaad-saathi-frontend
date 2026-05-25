import { useState } from "react";
import { FileDragDropZone } from "./FileDragDropZone";
import { ChevronDownIcon } from "@heroicons/react/24/solid";

export function ResumeInputForm({ onNext }: { onNext: () => void }) {
    const [role, setRole] = useState("");
    const [experience, setExperience] = useState("Entry Level");
    const [jd, setJd] = useState("");
    const [file, setFile] = useState<File | null>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // In a real app, you'd upload the file and data here.
        // For now, we simulate the upload and move to the next step.
        if (file && role) {
            onNext();
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            {/* Target Role */}
            <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Target role</label>
                <input 
                    type="text" 
                    placeholder="Frontend Engineer"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    required
                />
            </div>

            {/* Experience Level */}
            <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Experience level</label>
                <div className="relative">
                    <select 
                        value={experience}
                        onChange={(e) => setExperience(e.target.value)}
                        className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none appearance-none transition-all"
                    >
                        <option>Entry Level</option>
                        <option>Mid Level</option>
                        <option>Senior Level</option>
                        <option>Lead / Manager</option>
                    </select>
                    <ChevronDownIcon className="absolute right-4 top-1/2 -translate-y-1/2 size-5 text-slate-400 pointer-events-none" />
                </div>
            </div>

            {/* Target Job Description */}
            <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Target job description</label>
                <textarea 
                    placeholder="Paste target job description here..."
                    value={jd}
                    onChange={(e) => setJd(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none"
                />
            </div>

            {/* Upload Resume */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-slate-700">Upload resume</label>
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">PDF - DOCX</span>
                </div>
                <FileDragDropZone file={file} onFileSelect={setFile} />
            </div>

            <button 
                type="submit"
                disabled={!file || !role}
                className="mt-4 w-full py-4 bg-[#1e58f1] hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-2xl font-medium transition-colors shadow-sm active:scale-[0.98]"
            >
                Analyze My Resume
            </button>
        </form>
    );
}
