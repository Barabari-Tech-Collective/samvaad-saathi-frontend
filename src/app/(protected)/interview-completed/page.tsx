"use client";
import { createApiClient } from "@/lib/api-config/src/client";
import { APIServiceV2 } from "@/lib/api-config/src/config";
import { ENDPOINTS, ENDPOINTS_V2 } from "@/lib/api-config/src/endpoints";
import {
  trackReportGenerationError,
  trackReportGenerationStart,
} from "@/lib/posthog/tracking.utils";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import toast from "react-hot-toast";

const InterviewCompleted = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const interviewId = searchParams.get("interviewId");
  const role = searchParams.get("role") || "Interview";

  const apiClient = createApiClient(APIServiceV2.INTERVIEWS);

  // Generate final report mutation
  const { mutateAsync: generateFinalReport, isPending: isGeneratingReport } = apiClient.useMutation<
    unknown,
    { interviewId: number }
  >({
    url: ENDPOINTS_V2.SUMMARY_REPORT,
    method: "post",
    successMessage: "Report generated successfully!",
    errorMessage: "Failed to generate report. Please try again.",
    options: {
      onSuccess: () => {
        router.push(`/report-summary?interviewId=${interviewId}`);
      },
      onError: (error) => {
        // Track report generation error
        trackReportGenerationError(error?.message || "Unknown error occurred");
      },
    },
    keyToInvalidate: {
      queryKey: [ENDPOINTS.INTERVIEWS.LIST, ENDPOINTS.INTERVIEWS.WITH_SUMMARY],
    },
  });

  const generateReport = async () => {
    try {
      console.log("interviewId for generating report:", interviewId);
      if (interviewId) {
        await generateFinalReport({
          interviewId: parseInt(interviewId),
        });
      } else {
        toast.error("Interview ID is required for generating report");
      }
    } catch (error) {
      console.error("Failed to generate final report:", error);
      console.log("Failed to generate final report:", error);
      toast.error("Failed to generate final report");
    }
  };

  // Track screen view on component mount
  useEffect(() => {
    if (!interviewId) {
      return;
    }

    // Track report generation start
    trackReportGenerationStart();

    generateReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interviewId]);

  return (
    <div className="hero">
      <div className="hero-content text-center">
        <div className="max-w-md">
          {/* Lottie Animation */}
          <div className="mb-8">
            <DotLottieReact src="assets/lottie/Trophy.lottie" autoplay />
          </div>

          {/* Congratulations Message */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold italic">
            Congratulations!
          </h1>

          {/* Success Message */}
          <p className="py-4 sm:py-6 text-base sm:text-lg md:text-xl">
            You have successfully completed your{" "}
            <span className="text-primary font-semibold">{role}</span> interview
          </p>

          {/* Loading State */}
          {isGeneratingReport ? (
            <>
              <p className="text-sm sm:text-base md:text-lg text-base-content/70 mb-6 sm:mb-8">
                Generating your performance report...
              </p>
              <div className="flex justify-center">
                <span className="loading loading-spinner loading-lg"></span>
              </div>
              <p className="mt-4 text-sm text-base-content/60">
                Please wait while we analyze your interview
              </p>
            </>
          ) : (
            <>
              {/* Performance Report Message */}
              <p className="text-sm sm:text-base md:text-lg text-base-content/70 mb-6 sm:mb-8">
                Your performance report is being prepared...
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default InterviewCompleted;
