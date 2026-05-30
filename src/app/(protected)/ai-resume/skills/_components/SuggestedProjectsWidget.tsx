import { LightBulbIcon } from "@heroicons/react/24/solid";

export function SuggestedProjectsWidget() {
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
                            Real-time collaborative dashboard with React + WebSockets
                        </h3>
                        <p className="text-[13px] text-slate-500 font-medium leading-relaxed">
                            Aligns with modern frontend engineering expectations and shows scalable state handling.
                        </p>
                        
                        <div className="flex flex-wrap gap-2 pt-3">
                            <span className="px-3 py-1.5 bg-white text-primary rounded-full text-xs font-bold border border-primary/10 shadow-sm">React</span>
                            <span className="px-3 py-1.5 bg-white text-primary rounded-full text-xs font-bold border border-primary/10 shadow-sm">WebSockets</span>
                            <span className="px-3 py-1.5 bg-white text-slate-600 rounded-full text-xs font-bold border border-slate-200 shadow-sm">Intermediate</span>
                            <span className="px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-full text-xs font-bold border border-emerald-100">High demand</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
