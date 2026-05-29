import { ReactNode } from "react";
import { AIResumeProvider } from "./_components/AIResumeContext";

export default function AIResumeLayout({ children }: { children: ReactNode }) {
    return (
        <AIResumeProvider>
            {children}
        </AIResumeProvider>
    );
}
