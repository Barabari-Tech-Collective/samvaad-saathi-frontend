import { ENDPOINTS, apiClient } from "@/lib/api-config";
import { getTokenFromCookies } from "@/lib/token-utils";
import axios from "axios";

interface TemplateData {
  id: string;
  name: string;
  description?: string;
  thumbnail?: string;
}

interface ResumeData {
  id: string;
  templateId: string;
  content: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

/**
 * Resume Builder API service
 * Handles all resume builder operations including templates, creation, updates
 */
export const resumeBuilderService = {
  /**
   * Fetch available resume templates
   * GET /api/resume-builder/templates
   */
  async getTemplates() {
    try {
      const token = getTokenFromCookies();
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

      const response = await axios.get<TemplateData[]>(
        `${baseUrl}/${ENDPOINTS.RESUME_BUILDER.GET_TEMPLATES}`,
        {
          headers: {
            "Authorization": `Bearer ${token}`,
          },
          withCredentials: true,
        }
      );

      return response.data;
    } catch (error) {
      console.error("Error fetching resume templates:", error);
      throw error;
    }
  },

  /**
   * Create resume from template with AI-generated data
   * POST /api/resume-builder/from-template
   */
  async createFromTemplate(data: {
    templateId: string;
    analysisId?: string;
    jobDescription?: string;
    [key: string]: any;
  }) {
    try {
      const token = getTokenFromCookies();
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

      const response = await axios.post<ResumeData>(
        `${baseUrl}/${ENDPOINTS.RESUME_BUILDER.CREATE_FROM_TEMPLATE}`,
        data,
        {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          withCredentials: true,
        }
      );

      return response.data;
    } catch (error) {
      console.error("Error creating resume from template:", error);
      throw error;
    }
  },

  /**
   * Update resume content
   * PUT /api/resume-builder/{resume_id}
   */
  async updateResume(resumeId: string, content: Record<string, any>) {
    try {
      const token = getTokenFromCookies();
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

      const response = await axios.put<ResumeData>(
        `${baseUrl}/${ENDPOINTS.RESUME_BUILDER.UPDATE(resumeId)}`,
        { content },
        {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          withCredentials: true,
        }
      );

      return response.data;
    } catch (error) {
      console.error("Error updating resume:", error);
      throw error;
    }
  },

  /**
   * Download resume as PDF/DOCX
   * GET /api/resume-builder/{resume_id}/download
   */
  async downloadResume(resumeId: string, format: "pdf" | "docx" = "pdf") {
    try {
      const token = getTokenFromCookies();
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

      const response = await axios.get(
        `${baseUrl}/${ENDPOINTS.RESUME_BUILDER.GET_DOWNLOAD(resumeId)}?format=${format}`,
        {
          headers: {
            "Authorization": `Bearer ${token}`,
          },
          withCredentials: true,
          responseType: "blob",
        }
      );

      return response.data;
    } catch (error) {
      console.error("Error downloading resume:", error);
      throw error;
    }
  },
};
