import { apiClient, ENDPOINTS } from "@/lib/api-config";
import { TemplateData, TemplateDetailData, ResumeData } from "@/features/ai-resume/types";

export const useGetTemplates = () => {
  return apiClient.useQuery<TemplateData[]>({
    key: ["resume-templates"],
    url: ENDPOINTS.RESUME_BUILDER.GET_TEMPLATES,
  });
};

export const useGetTemplateDetails = (templateId: string) => {
  return apiClient.useQuery<TemplateDetailData>({
    key: ["resume-template-detail", templateId],
    url: `${ENDPOINTS.RESUME_BUILDER.GET_TEMPLATES}/${templateId}`,
    enabled: !!templateId,
  });
};

export const useCreateFromTemplate = () => {
  return apiClient.useMutation<ResumeData, { templateId: string; analysisId?: string; jobDescription?: string }>({
    url: ENDPOINTS.RESUME_BUILDER.CREATE_FROM_TEMPLATE,
    method: "post",
  });
};

export const useUpdateResume = (resumeId: string) => {
  return apiClient.useMutation<{ resumeId: string; status: string }, { content: Record<string, unknown> }>({
    url: `${ENDPOINTS.RESUME_BUILDER.UPDATE(resumeId)}?resume_id=${resumeId}`,
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
