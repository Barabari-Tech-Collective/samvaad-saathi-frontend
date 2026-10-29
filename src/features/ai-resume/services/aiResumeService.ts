import { assertAuthRevision, getAuthRevision } from "@/lib/auth-session";
import { ENDPOINTS } from "@/lib/api-config/src/endpoints";
import { getTokenFromCookies } from "@/lib/token-utils";
import axios from "axios";
import { productSession } from "@/lib/session-runtime";
import { createSessionAxios } from "@/lib/session-axios";

// API service for AI Resume feature
export const aiResumeService = {
  /**
   * Analyze resume using AI Resume API
   * Sends file as multipart/form-data to /api/ai-resume/analyze
   */
  async analyzeResume(
    file: File,
    role: string,
    experience: string,
    jd: string,
    ownerRevision = getAuthRevision()
  ) {
    try {
      assertAuthRevision(ownerRevision);
      const formData = new FormData();
      formData.append("resumeFile", file);
      formData.append("targetRole", role);
      formData.append("experienceLevel", experience);
      formData.append("jobDescription", jd);

      const session = productSession();
      if (session) {
        const api = createSessionAxios(process.env.NEXT_PUBLIC_API_BASE_URL || "", session);
        const response = await api.post(ENDPOINTS.AI_RESUME.ANALYZE, formData);
        assertAuthRevision(ownerRevision);
        return response.data;
      }
      const token = getTokenFromCookies();
      if (!token) throw new Error("Sign in again to continue.");
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

      const response = await axios.post(`${baseUrl}/${ENDPOINTS.AI_RESUME.ANALYZE}`, formData, {
        headers: {
          // Let axios set the Content-Type automatically for FormData
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        withCredentials: true,
      });

      assertAuthRevision(ownerRevision);
      return response.data;
    } catch (error) {
      assertAuthRevision(ownerRevision);
      if (axios.isAxiosError(error) && error.response?.data?.detail) {
        throw new Error(
          typeof error.response.data.detail === "string"
            ? error.response.data.detail
            : JSON.stringify(error.response.data.detail)
        );
      }
      throw error;
    }
  },
};
