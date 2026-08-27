"use client";
import ConcentricRadialProgress from "@/components/ConcentricRadialProgress";
import DifficultyTag from "@/components/DifficultyTag";
import { useAuth } from "@/components/providers/auth-provider";
import { createApiClient } from "@/lib/api-config/src/client";
import { APIService } from "@/lib/api-config/src/config";
import { ENDPOINTS } from "@/lib/api-config/src/endpoints";
import { setInterviewQuestions } from "@/lib/interview-session-storage";
import { trackButtonClick, trackGetStartedButtonClick } from "@/lib/posthog/tracking.utils";
import { getInitials } from "@/lib/utils";
import { ClockIcon } from "@heroicons/react/24/outline";
import dayjs from "dayjs";
import useEmblaCarousel from "embla-carousel-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface InterviewItem {
  interviewId: number;
  track: string;
  difficulty: string;
  status: string;
  createdAt: string;
  knowledgePercentage: number;
  speechFluencyPercentage: number;
  summaryReportAvailable: boolean;
  topActionItems: string[];
  attemptsCount: number;
}

interface InterviewsResponse {
  items: InterviewItem[];
}

interface ResumeInterviewQuestion {
  interviewQuestionId: number;
  text: string;
  topic: string;
  category: string;
  status: string;
  resumeUsed: boolean;
}

interface ResumeInterviewResponse {
  interviewId: number;
  track: string;
  difficulty: string;
  questions: ResumeInterviewQuestion[];
  totalQuestions: number;
  attemptedQuestions: number;
  remainingQuestions: number;
}

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const userName = user?.authorizedUser?.name || "User";

  const userInitials = getInitials(userName);

  // Create API client for interviews
  const apiClient = createApiClient(APIService.INTERVIEWS);

  // Embla Carousel setup
  const [emblaRef] = useEmblaCarousel({
    loop: true,
    align: "center",
  });

  // Fetch interviews with summary data
  const {
    data: interviewsData,
    isLoading: interviewsLoading,
    error: interviewsError,
  } = apiClient.useQuery<InterviewsResponse>({
    key: [ENDPOINTS.INTERVIEWS.WITH_SUMMARY, "interview-list"],
    url: `${ENDPOINTS.INTERVIEWS.WITH_SUMMARY}?limit=3`,
    enabled: !loading, // Only fetch when auth is loaded
  });

  // Mutation for resume interview
  const { loading: isResumingInterview, mutateAsync: resumeInterviewMutation } =
    apiClient.useMutation<ResumeInterviewResponse, { interviewId: number }>({
      url: ENDPOINTS.INTERVIEWS.RESUME_INTERVIEW,
      method: "post",
      successMessage: "Interview resumed successfully!",
      errorMessage: "Failed to resume interview. Please try again.",
    });

  // Helper function to format date
  const formatDate = (dateString: string) => {
    return dayjs(dateString).format("DD MMM, YYYY");
  };

  // Handle continue interview
  const handleContinueInterview = async (interviewId: number) => {
    trackButtonClick("continue_interview", "home_page_recent_interviews");
    try {
      const response = await resumeInterviewMutation({ interviewId });

      setInterviewQuestions(response.interviewId, response.questions);

      const resumeParams = new URLSearchParams({
        interviewId: response.interviewId.toString(),
        role: response.track,
        useResume: "true",
        resumed: "true",
      });

      router.push(`/interview?${resumeParams.toString()}`);
    } catch (error) {
      console.error("Failed to resume interview:", error);
    }
  };

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || loading) {
    return (
      <div className="flex flex-col">
        <div className="flex justify-between items-center py-4 relative">
          <div className="h-8 bg-gray-200 rounded w-32 animate-pulse"></div>
          <div className="w-12 h-12 bg-gray-200 rounded-full animate-pulse"></div>
        </div>

        <div className="flex items-center justify-center flex-col gap-20">
          <div className="w-72 h-72 bg-gray-200 rounded-lg animate-pulse"></div>
        </div>

        <div className="absolute inset-x-0 bottom-20 px-6">
          <div className="w-full h-14 bg-gray-200 rounded-xl animate-pulse"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col py-6">
      <div className="flex justify-between items-center relative">
        <h2 className="text-2xl font-bold">Hi {userName},</h2>
        <div className="avatar avatar-placeholder">
          <div className="bg-primary text-neutral-content w-12 rounded-full">
            <span className="text-xl">{userInitials}</span>
          </div>
        </div>
      </div>

      <div className="my-6">
        <h2 className="text-2xl font-bold">Recent Interviews</h2>

        {interviewsLoading ? (
          // Skeleton loader
          <div className="space-y-4 mt-4">
            <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2"></div>
            <div className="h-32 bg-gray-200 rounded-lg animate-pulse"></div>
          </div>
        ) : interviewsError || !interviewsData?.items || interviewsData.items.length === 0 ? (
          // Fallback illustration and message
          <div className="text-center py-8">
            <Image
              src="/home.png"
              alt="No interviews illustration"
              height={200}
              width={200}
              className="mx-auto mb-4 opacity-50"
            />
            <p className="text-gray-500 mb-4">
              {interviewsError
                ? "Unable to load interviews. Please try again later."
                : "Your recent interviews will be shown here. Complete your first interview to see your progress and history."}
            </p>
          </div>
        ) : (
          // Carousel with interview data
          <div className="space-y-4">
            {/* Embla Carousel */}
            <div className="embla overflow-hidden" ref={emblaRef}>
              <div className="embla__container flex p-4">
                {interviewsData.items.map((interview) => {
                  const isHrOrCommunication =
                    interview.track.toLowerCase().includes("hr") ||
                    interview.track.toLowerCase().includes("communication");
                  const knowledgeLabel = isHrOrCommunication
                    ? "Communication Effectiveness"
                    : "Technical Knowledge";
                  return (
                    <div key={interview.interviewId} className="embla__slide flex-[0_0_100%] min-w-0">
                      <div className="card bg-base-100 w-full shadow-lg ">
                        <div className="card-body">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h3 className="card-title text-lg">{interview.track}</h3>
                              <p className="text-sm text-gray-500">
                                {formatDate(interview.createdAt)} • Attempt{" "}
                                {interview.attemptsCount ?? 0}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <DifficultyTag difficulty={interview.difficulty} soft={false} />
                            </div>
                          </div>

                          {/* Show completion message for active interviews, otherwise show progress data */}
                          {interview.status.toLowerCase() === "active" ? (
                            <div className="text-center py-8">
                              <div className="mb-4">
                                <div className="size-10 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                  <ClockIcon className="size-6 text-yellow-600" />
                                </div>
                                <h4 className="text-lg font-semibold text-gray-800 mb-2">
                                  Complete Your Interview
                                </h4>
                                <p className="text-sm text-gray-600 mb-2">
                                  Finish your interview to see detailed performance insights and
                                  actionable recommendations.
                                </p>
                                <p className="text-xs text-blue-600 font-medium italic">
                                  Every expert was once a beginner. Every pro was once an amateur.
                                  Keep going! 💪
                                </p>
                              </div>
                            </div>
                          ) : (
                            <>
                              {/* Radial Progress Chart */}
                              <div className="flex items-center gap-4 mb-4">
                                <ConcentricRadialProgress
                                  size={120}
                                  rings={[
                                    {
                                      value: interview.knowledgePercentage ?? 0,
                                      color: "#3b82f6",
                                      ariaLabel: `${knowledgeLabel} progress`,
                                      trackColor: "#e5e5e5",
                                      thickness: 10,
                                    },
                                    {
                                      value: interview.speechFluencyPercentage ?? 0,
                                      color: "#6b7280",
                                      ariaLabel: "Speech Fluency progress",
                                      trackColor: "#bedbff",
                                      thickness: 8,
                                    },
                                  ]}
                                  centerRender={(rings) => (
                                    <div className="text-center">
                                      <div className="text-xs text-blue-500 font-bold">
                                        {rings[0]?.value ? `${Math.round(rings[0].value)}%` : "0%"}
                                      </div>
                                      <div className="text-xs text-gray-500 font-bold">
                                        {rings[1]?.value ? `${Math.round(rings[1].value)}%` : "0%"}
                                      </div>
                                    </div>
                                  )}
                                />
                                <div className="flex-1">
                                  <p className="text-sm text-gray-600 mb-2 font-semibold">
                                    Performance Score
                                  </p>
                                  <div className="space-y-2">
                                    <div className="flex items-center">
                                      <div className="p-2">
                                        <svg width="8" height="8" viewBox="0 0 8 8">
                                          <circle cx="4" cy="4" r="4" fill="#3b82f6" />
                                        </svg>
                                      </div>
                                      <span className="text-sm text-gray-700">
                                        {knowledgeLabel}
                                      </span>
                                    </div>
                                    <div className="flex items-center">
                                      <div className="p-2">
                                        <svg width="8" height="8" viewBox="0 0 8 8">
                                          <circle cx="4" cy="4" r="4" fill="#6b7280" />
                                        </svg>
                                      </div>
                                      <span className="text-sm text-gray-700">Speech Fluency</span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="space-y-2">
                                <h4 className="text-sm font-semibold text-gray-700 mb-2">
                                  Actionable Insights
                                </h4>
                                {interview.topActionItems.map((item) => (
                                  <div key={item} className="flex items-start gap-2">
                                    <div className="flex-shrink-0 mt-1">
                                      <svg width="6" height="6" viewBox="0 0 6 6">
                                        <circle cx="3" cy="3" r="3" className="fill-primary" />
                                      </svg>
                                    </div>
                                    <p className="text-xs font-semibold text-gray-700">{item}</p>
                                  </div>
                                ))}
                              </div>
                            </>
                          )}

                          {/* Action buttons */}
                          <div className="card-actions justify-end">
                            {interview.status.toLowerCase() === "completed" ? (
                              <>
                                {interview.summaryReportAvailable ? (
                                  <Link
                                    href={`/report-summary?interviewId=${interview.interviewId}`}
                                    onClick={() =>
                                      trackButtonClick("view_report", "home_page_recent_interviews")
                                    }
                                    className="btn btn-outline btn-sm"
                                  >
                                    View Report
                                  </Link>
                                ) : (
                                  <button className="btn btn-outline btn-sm" disabled>
                                    Report Pending
                                  </button>
                                )}
                                <Link
                                  href={`/reattempt-interview?interviewId=${interview.interviewId}&role=${interview.track}&attemptsCount=${interview.attemptsCount}`}
                                  onClick={() =>
                                    trackButtonClick(
                                      "reattempt_interview",
                                      "home_page_recent_interviews"
                                    )
                                  }
                                  className="btn btn-neutral btn-sm"
                                >
                                  Reattempt
                                </Link>
                              </>
                            ) : interview.status.toLowerCase() === "active" ? (
                              <button
                                className="btn btn-primary btn-sm disabled:opacity-50"
                                onClick={() => handleContinueInterview(interview.interviewId)}
                                disabled={isResumingInterview}
                              >
                                {isResumingInterview ? (
                                  <>
                                    <span className="loading loading-spinner loading-xs"></span>
                                    Resuming...
                                  </>
                                ) : (
                                  "Continue Interview"
                                )}
                              </button>
                            ) : (
                              <Link href="interview-start">
                                <button className="btn btn-primary btn-sm cursor-pointer">
                                  Start Interview
                                </button>
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      <Link href="interview-start">
        <button
          className="btn btn-neutral btn-block btn-lg rounded-lg"
          onClick={trackGetStartedButtonClick}
        >
          Get Started
        </button>
      </Link>
    </div>
  );
}
