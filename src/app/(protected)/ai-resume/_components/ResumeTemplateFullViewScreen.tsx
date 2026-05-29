import { ChevronLeftIcon, ShieldCheckIcon, DocumentTextIcon, ArrowDownTrayIcon, CheckIcon } from "@heroicons/react/24/solid";

export function ResumeTemplateFullViewScreen({ onBack, file }: { onBack: () => void, file: File | null }) {
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
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/5 text-primary rounded-full text-sm font-medium">
                    <ShieldCheckIcon className="size-4" />
                    <span>ATS Optimized</span>
                </div>
            </div>

            {/* Title Section */}
            <div className="space-y-1">
                <h1 className="text-2xl font-bold text-slate-900">ATS Resume Template</h1>
                <p className="text-slate-500 text-sm">Professional ATS-friendly resume format.</p>
            </div>

            {/* Resume Preview Card */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col gap-4">
                {/* Preview Header */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-2">
                        <DocumentTextIcon className="size-4 text-primary" />
                        <span className="text-sm font-semibold text-slate-700">Full resume preview</span>
                    </div>
                    <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded-md font-medium">
                        A4 | 1 page
                    </span>
                </div>

                {/* Actual Resume Content Mockup */}
                <div className="flex flex-col gap-4 text-[10px] leading-relaxed text-slate-800 font-sans">
                    {/* Header */}
                    <div className="text-center space-y-1 border-b border-slate-300 pb-4">
                        <h2 className="text-lg font-bold text-slate-900 tracking-wider">ANANYA SHARMA</h2>
                        <p className="text-xs text-slate-600">Digital Marketing Professional</p>
                        <div className="flex flex-wrap justify-center gap-2 text-slate-500 mt-2">
                            <span>✉ ananya.sharma@email.com</span>
                            <span>|</span>
                            <span>📞 +91 98765 43210</span>
                            <span>|</span>
                            <span>📍 Delhi, India</span>
                            <span className="w-full text-center">🔗 linkedin.com/in/ananyasharma</span>
                        </div>
                    </div>

                    {/* Objective */}
                    <div className="space-y-1.5">
                        <h3 className="font-bold text-xs tracking-widest text-slate-900 uppercase">Career Objective</h3>
                        <p className="text-slate-600">
                            Entry-level Digital Marketing professional with hands-on experience in SEO, campaign strategy, and performance analysis through real-world projects. Proficient in Google Analytics, social media marketing, and data-driven decision making.
                        </p>
                    </div>

                    {/* Experience */}
                    <div className="space-y-2">
                        <h3 className="font-bold text-xs tracking-widest text-slate-900 uppercase">Work Experience</h3>
                        <div>
                            <div className="flex justify-between font-semibold">
                                <span>Marketing Intern</span>
                                <span>Jan 2024 - Aug 2024</span>
                            </div>
                            <div className="text-slate-500 italic mb-1">TechStartups (Remote)</div>
                            <ul className="list-disc list-inside space-y-0.5 text-slate-600 ml-1">
                                <li>Managed social media calendar across 3 platforms</li>
                                <li>Conducted competitor SEO audits</li>
                                <li>Assisted in launching paid campaigns</li>
                            </ul>
                        </div>
                    </div>

                    {/* Projects */}
                    <div className="space-y-2">
                        <h3 className="font-bold text-xs tracking-widest text-slate-900 uppercase">Projects</h3>
                        
                        <div>
                            <div className="flex justify-between font-semibold">
                                <span>E-Commerce SEO Optimization Strategy</span>
                                <span>Jan 2024 - Feb 2024</span>
                            </div>
                            <ul className="list-disc list-inside space-y-0.5 text-slate-600 ml-1">
                                <li>Improved keyword rankings</li>
                                <li>Increased traffic visibility</li>
                                <li>Built optimization reports</li>
                            </ul>
                        </div>

                        <div>
                            <div className="flex justify-between font-semibold mt-2">
                                <span>Social Media Campaign for SaaS Product Launch</span>
                                <span>Nov 2023 - Dec 2023</span>
                            </div>
                            <ul className="list-disc list-inside space-y-0.5 text-slate-600 ml-1">
                                <li>Developed launch strategy</li>
                                <li>Managed influencer campaigns</li>
                                <li>Built analytics dashboard</li>
                            </ul>
                        </div>
                    </div>

                    {/* Skills */}
                    <div className="space-y-1.5">
                        <h3 className="font-bold text-xs tracking-widest text-slate-900 uppercase">Skills</h3>
                        <p className="text-slate-600">
                            SEO • Content Strategy • Campaign Analysis • Canva • Performance Marketing • Social Media Marketing • Google Analytics
                        </p>
                    </div>

                    {/* Education */}
                    <div className="space-y-1.5">
                        <h3 className="font-bold text-xs tracking-widest text-slate-900 uppercase">Education</h3>
                        <div className="flex justify-between font-semibold">
                            <span>B.Com in Marketing</span>
                            <span>Delhi University</span>
                        </div>
                    </div>

                    {/* Certifications */}
                    <div className="space-y-1.5">
                        <h3 className="font-bold text-xs tracking-widest text-slate-900 uppercase">Certifications</h3>
                        <ul className="list-disc list-inside space-y-0.5 text-slate-600 ml-1">
                            <li>Google Analytics Certification</li>
                            <li>HubSpot Content Marketing</li>
                            <li>Meta Certified Digital Associate</li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex gap-3 mt-2">
                <button className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition-colors">
                    <ArrowDownTrayIcon className="size-4" />
                    Download PDF
                </button>
                <button className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-primary hover:opacity-90 text-white rounded-xl font-medium transition-colors shadow-sm">
                    <CheckIcon className="size-4" strokeWidth={3} />
                    Use Template
                </button>
            </div>
        </div>
    );
}
