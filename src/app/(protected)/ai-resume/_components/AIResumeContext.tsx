"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface AIResumeContextType {
    uploadedFile: File | null;
    setUploadedFile: (file: File | null) => void;
}

const AIResumeContext = createContext<AIResumeContextType | undefined>(undefined);

export function AIResumeProvider({ children }: { children: ReactNode }) {
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);

    return (
        <AIResumeContext.Provider value={{ uploadedFile, setUploadedFile }}>
            {children}
        </AIResumeContext.Provider>
    );
}

export function useAIResumeContext() {
    const context = useContext(AIResumeContext);
    if (context === undefined) {
        throw new Error("useAIResumeContext must be used within an AIResumeProvider");
    }
    return context;
}
