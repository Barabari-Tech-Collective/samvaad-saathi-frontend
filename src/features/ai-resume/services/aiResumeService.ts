import { ENDPOINTS, apiClient } from "@/lib/api-config";
import { getTokenFromCookies } from "@/lib/token-utils";
import axios from "axios";

// API service for AI Resume feature
export const aiResumeService = {
    /**
     * Analyze resume using AI Resume API
     * Sends file as multipart/form-data to /api/ai-resume/analyze
     */
    async analyzeResume(file: File, role: string, experience: string, jd: string) {
        try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("role", role);
            formData.append("experience", experience);
            formData.append("jd", jd);

            const token = getTokenFromCookies();
            const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

            const response = await axios.post(
                `${baseUrl}/${ENDPOINTS.AI_RESUME.ANALYZE}`,
                formData,
                {
                    headers: {
                        "Authorization": `Bearer ${token}`,
                        // Let axios set the Content-Type automatically for FormData
                    },
                    withCredentials: true,
                }
            );

            return response.data;
        } catch (error) {
            console.error("Error analyzing resume:", error);
            throw error;
        }
    },

    /**
     * Fetch analysis results by analysis_id
     * GET /api/ai-resume/analysis/{analysis_id}
     */
    async getAnalysis(analysisId: string) {
        try {
            const { data } = await apiClient.useQuery({
                key: [ENDPOINTS.AI_RESUME.GET_ANALYSIS(analysisId)],
                url: ENDPOINTS.AI_RESUME.GET_ANALYSIS(analysisId),
                enabled: !!analysisId,
            });

            return data;
        } catch (error) {
            console.error("Error fetching analysis:", error);
            throw error;
        }
    }
};
