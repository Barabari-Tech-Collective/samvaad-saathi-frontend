import IncompleteInterviewCard from "./IncompleteInterviewCard";

import { InterviewItem } from "./types";

interface IncompleteInterviewsTabProps {
  incomplete: InterviewItem[];
  onCompleteInterview: (interviewId: number) => Promise<void>;
}

export default function IncompleteInterviewsTab({
  incomplete,
  onCompleteInterview,
}: IncompleteInterviewsTabProps) {
  return (
    <div>
      <p className="text-sm text-black/60 mb-3">
        This page lists all interviews you have put on hold.
      </p>

      {incomplete.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">No incomplete interviews found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {incomplete.map((item) => (
            <IncompleteInterviewCard
              key={item.interviewId}
              item={item}
              onCompleteInterview={onCompleteInterview}
            />
          ))}
        </div>
      )}
    </div>
  );
}
