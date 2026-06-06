import { apiClient, ENDPOINTS } from "@/lib/api-config";
import { TemplateData, ResumeData } from "@/features/ai-resume/types";

export const useGetTemplates = () => {
  return apiClient.useQuery<TemplateData[]>({
    key: ["resume-templates"],
    url: ENDPOINTS.RESUME_BUILDER.GET_TEMPLATES,
  });
};

export const useCreateFromTemplate = () => {
  return apiClient.useMutation<ResumeData, { templateId: string; analysisId?: string; jobDescription?: string }>({
    url: ENDPOINTS.RESUME_BUILDER.CREATE_FROM_TEMPLATE,
    method: "post",
  });
};

export const useUpdateResume = (resumeId: string) => {
  return apiClient.useMutation<ResumeData, { content: Record<string, unknown> }>({
    url: ENDPOINTS.RESUME_BUILDER.UPDATE(resumeId),
    method: "put",
  });
};

export const useDownloadResume = (resumeId: string, format: "pdf" | "docx" = "pdf") => {
  return apiClient.useQuery<Blob>({
    key: ["resume-download", resumeId, format],
    url: `${ENDPOINTS.RESUME_BUILDER.GET_DOWNLOAD(resumeId)}?format=${format}`,
    enabled: !!resumeId,
    config: { responseType: "blob" },
  });
};
