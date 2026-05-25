import { mockATSResponse } from "../mock/mockATSResponse";

export const aiResumeService = {
    async analyzeResume(file: File, role: string, experience: string, jd: string) {
        // Simulate network latency
        await new Promise(resolve => setTimeout(resolve, 1500));
        return mockATSResponse;
    }
};
