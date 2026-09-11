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

  // The backend paginates this list (default 20/page, cursor-based) and
  // this page previously never requested more than the first page, so any
  // user with over 20 total interviews couldn't see their older history at
  // all - not just a performance concern, actual data was inaccessible.
  const [cursor, setCursor] = useState<number | null>(null);
  const [allItems, setAllItems] = useState<InterviewItem[]>([]);

  const {
    data: interviewsData,
    isLoading,
    isFetching,
    error,
  } = useQuery<InterviewsListResponse>({
    key: [ENDPOINTS.INTERVIEWS.LIST, "list"],
    url: ENDPOINTS.INTERVIEWS.LIST,
    method: "get",
    params: cursor ? { cursor } : undefined,
  });

  useEffect(() => {
    if (!interviewsData) return;
    setAllItems((prev) => {
      if (cursor === null) return interviewsData.items;
      // Dedupe by id - guards against React StrictMode's double effect
      // invocation in dev, and any accidental overlap across pages.
      const seen = new Set(prev.map((item) => item.interviewId));
      const newItems = interviewsData.items.filter((item) => !seen.has(item.interviewId));
      return [...prev, ...newItems];
    });
    // Only re-run when a new page actually arrives, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interviewsData]);

  const handleLoadMore = () => {
    if (interviewsData?.nextCursor != null) {
      setCursor(interviewsData.nextCursor);
    }
  };

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
    const incompleteInterviews: InterviewItem[] = [];
    const completedInterviews: InterviewItem[] = [];

    allItems.forEach((interview) => {
      if (interview.status === "active") {
        incompleteInterviews.push(interview);
      } else if (interview.status === "completed") {
        completedInterviews.push(interview);
      }
    });

    return {
      incomplete: incompleteInterviews,
      completed: completedInterviews,
    };
  }, [allItems]);

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

  // Only show the full skeleton on the genuine first load - isLoading flips
  // true again for each new cursor page, which would otherwise blank out
  // the already-loaded list every time "Load More" is clicked.
  if (isLoading && allItems.length === 0) {
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

      {interviewsData?.nextCursor != null && (
        <div className="flex justify-center mt-4">
          <button
            onClick={handleLoadMore}
            disabled={isFetching}
            className="px-6 py-2 text-sm font-medium text-primary border border-primary rounded-lg disabled:opacity-50"
          >
            {isFetching ? "Loading..." : "Load More"}
          </button>
        </div>
      )}
    </div>
  );
}
