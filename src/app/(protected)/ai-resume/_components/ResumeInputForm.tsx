"use client";

import { useForm, Controller } from "react-hook-form";
import axios from "axios";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { FileDragDropZone } from "./FileDragDropZone";
import { ChevronDownIcon } from "@heroicons/react/24/solid";
import { useAIResumeContext } from "./resume-provider";
import { aiResumeService } from "@/features/ai-resume/services/aiResumeService";
import { useState } from "react";
import toast from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";
import { ENDPOINTS } from "@/lib/api-config";

const formSchema = z.object({
  targetRole: z.string().min(1, "Target role is required"),
  experienceLevel: z.string().min(1, "Experience level is required"),
  jobDescription: z.string().min(10, "Job description must be at least 10 characters"),
  resume: z.any().refine((file) => file instanceof File, "Resume file is required"),
});

type FormData = z.infer<typeof formSchema>;

export function ResumeInputForm({
  onNext,
  onFileChange,
}: {
  onNext: () => void;
  onFileChange: (file: File | null) => void;
}) {
  const {
    formData,
    setFormData,
    setHasExperience,
    setAnalysisResult,
    setAnalysisId,
    setIsAnalyzing,
    setAnalysisError,
  } = useAIResumeContext();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isValid },
    watch,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      targetRole: formData.targetRole || "",
      experienceLevel: formData.experienceLevel || "Entry Level",
      jobDescription: formData.jobDescription || "",
      resume: undefined,
    },
    mode: "onChange",
  });

  const experienceLevel = watch("experienceLevel");

  const onSubmit = async (data: FormData) => {
    try {
      setIsSubmitting(true);
      setIsAnalyzing(true);
      setAnalysisError(null);

      // Determine if resume has experience based on experience level
      const hasExp = data.experienceLevel !== "Entry Level";
      setHasExperience(hasExp);

      // Save form data to context so it survives navigation
      setFormData({
        targetRole: data.targetRole,
        experienceLevel: data.experienceLevel,
        jobDescription: data.jobDescription,
      });

      // Call AI Resume API to analyze the resume
      const analysisResult = await aiResumeService.analyzeResume(
        data.resume,
        data.targetRole,
        data.experienceLevel,
        data.jobDescription
      );

      // Store analysis result and ID in context
      setAnalysisResult(analysisResult);
      if (analysisResult.analysisId) {
        setAnalysisId(analysisResult.analysisId);
      }

      toast.success("Resume analyzed successfully!");

      // Invalidate the auth cache so the system knows we have a resume now
      queryClient.invalidateQueries({ queryKey: [ENDPOINTS.AUTH.ABOUT_ME] });

      // Navigate to next step
      onNext();
    } catch (error) {
      let errorMessage = "Failed to analyze resume. Please try again.";
      if (axios.isAxiosError(error) && error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      setAnalysisError(errorMessage);
      toast.error(errorMessage);
      console.error("Resume analysis error:", error);
    } finally {
      setIsSubmitting(false);
      setIsAnalyzing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
      {/* Target Role */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700">Target role</label>
        <input
          type="text"
          placeholder="Frontend Engineer"
          {...register("targetRole")}
          className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
        />
        {errors.targetRole && <p className="text-xs text-red-500">{errors.targetRole.message}</p>}
      </div>

      {/* Experience Level */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700">Experience level</label>
        <div className="relative">
          <select
            {...register("experienceLevel")}
            className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none appearance-none transition-all"
          >
            <option value="Entry Level">Entry Level</option>
            <option value="Mid Level">Mid Level</option>
            <option value="Senior Level">Senior Level</option>
            <option value="Lead / Manager">Lead / Manager</option>
          </select>
          <ChevronDownIcon className="absolute right-4 top-1/2 -translate-y-1/2 size-5 text-slate-400 pointer-events-none" />
        </div>
        {errors.experienceLevel && (
          <p className="text-xs text-red-500">{errors.experienceLevel.message}</p>
        )}
      </div>

      {/* Target Job Description */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700">Target job description</label>
        <textarea
          placeholder="Paste target job description here..."
          {...register("jobDescription")}
          rows={4}
          className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all resize-none"
        />
        {errors.jobDescription && (
          <p className="text-xs text-red-500">{errors.jobDescription.message}</p>
        )}
      </div>

      {/* Upload Resume */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-slate-700">Upload resume</label>
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
            PDF - DOCX
          </span>
        </div>
        <Controller
          name="resume"
          control={control}
          render={({ field: { onChange, value } }) => (
            <FileDragDropZone
              file={value || null}
              onFileSelect={(file) => {
                onChange(file);
                onFileChange(file);
              }}
            />
          )}
        />
        {errors.resume && <p className="text-xs text-red-500">{errors.resume.message as string}</p>}
      </div>

      <button
        type="submit"
        disabled={!isValid || isSubmitting}
        className="mt-4 w-full py-4 bg-primary hover:opacity-90 disabled:opacity-50 disabled:bg-primary text-white rounded-2xl font-medium transition-all shadow-sm active:scale-[0.98]"
      >
        {isSubmitting ? "Analyzing..." : "Analyze My Resume"}
      </button>
    </form>
  );
}
