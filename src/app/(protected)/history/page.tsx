"use client";

import Empty from "@/components/Empty";
import { createApiClient } from "@/lib/api-config/src/client";
import { APIService } from "@/lib/api-config/src/config";
import { ENDPOINTS } from "@/lib/api-config/src/endpoints";
import { setInterviewQuestions } from "@/lib/interview-session-storage";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import CompletedInterviewsTab from "./_components/CompletedInterviewsTab";
import HistorySkeletonLoader from "./_components/HistorySkeletonLoader";
import IncompleteInterviewsTab from "./_components/IncompleteInterviewsTab";
import {
  InterviewItem,
  InterviewStatus,
  InterviewsListResponse,
  ResumeInterviewResponse,
} from "./_components/types";
import { HARDCODED_INTERVIEWS } from "../../../hardcoded-reports";

export default function InterviewHistory() {
  const [activeTab, setActiveTab] = useState<InterviewStatus>("incomplete");
  const router = useRouter();
  const searchParams = useSearchParams();
  const { useQuery, useMutation } = createApiClient(APIService.INTERVIEWS);

  // Read tab from query params on component mount
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam && (tabParam === "incomplete" || tabParam === "completed")) {
      setActiveTab(tabParam as InterviewStatus);
    }
  }, [searchParams]);

  // Helper function to update tab and query params
  const handleTabChange = (tab: InterviewStatus) => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const {
    data: interviewsData,
    isLoading,
    error,
  } = useQuery<InterviewsListResponse>({
    key: [ENDPOINTS.INTERVIEWS.LIST, "list"],
    url: ENDPOINTS.INTERVIEWS.LIST,
    method: "get",
  });

  // Mutation for resume interview
  const { mutateAsync: resumeInterviewMutation } = useMutation<
    ResumeInterviewResponse,
    { interviewId: number }
  >({
    url: ENDPOINTS.INTERVIEWS.RESUME_INTERVIEW,
    method: "post",
    successMessage: "Interview resumed successfully!",
    errorMessage: "Failed to resume interview. Please try again.",
  });

  const { incomplete, completed } = useMemo(() => {
    if (!interviewsData?.items) {
      return { incomplete: [], completed: [] };
    }

    const incompleteInterviews: InterviewItem[] = [];
    const completedInterviews: InterviewItem[] = [];

    interviewsData.items.forEach((interview) => {
      if (interview.status === "active") {
        incompleteInterviews.push(interview);
      } else if (interview.status === "completed") {
        completedInterviews.push(interview);
      }
    });

    return {
      incomplete: incompleteInterviews,
      completed: [...HARDCODED_INTERVIEWS, ...completedInterviews], // TEMPORARY DEMO HARDCODING
    };
  }, [interviewsData]);

  // Handle complete interview
  const handleCompleteInterview = async (interviewId: number): Promise<void> => {
    const response = await resumeInterviewMutation({ interviewId });

    setInterviewQuestions(response.interviewId, response.questions);

    const resumeParams = new URLSearchParams({
      interviewId: response.interviewId.toString(),
      role: response.track,
      useResume: "true",
      resumed: "true",
    });

    router.push(`/interview?${resumeParams.toString()}`);
  };

  if (isLoading) {
    return (
      <div className="max-w-md mx-auto pb-8">
        <h2 className="text-[20px] font-semibold text-primary my-4">History</h2>
        <HistorySkeletonLoader />
      </div>
    );
  }

  if (error) {
    return <Empty />;
  }

  return (
    <div className="max-w-md mx-auto pb-8">
      <h2 className="text-[20px] font-semibold text-primary my-4">History</h2>

      <div role="tablist" className="tabs tabs-box mb-3 w-full bg-gray-200 p-2 font-bold text-2xl">
        <Link
          href={`?tab=incomplete`}
          role="tab"
          className={`tab flex-1 ${
            activeTab === "incomplete" ? "tab-active shadow-2xl rounded-xl" : ""
          }`}
          onClick={(e) => {
            e.preventDefault();
            handleTabChange("incomplete");
          }}
        >
          Incomplete
        </Link>
        <Link
          href={`?tab=completed`}
          role="tab"
          className={`tab flex-1 ${activeTab === "completed" ? "tab-active" : ""}`}
          onClick={(e) => {
            e.preventDefault();
            handleTabChange("completed");
          }}
        >
          Completed
        </Link>
      </div>

      {activeTab === "incomplete" ? (
        <IncompleteInterviewsTab
          incomplete={incomplete}
          onCompleteInterview={handleCompleteInterview}
        />
      ) : (
        <CompletedInterviewsTab completed={completed} />
      )}
    </div>
  );
}
