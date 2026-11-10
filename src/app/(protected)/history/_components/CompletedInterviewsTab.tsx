import CompletedInterviewCard from "./CompletedInterviewCard";

import { InterviewItem } from "./types";

interface CompletedInterviewsTabProps {
  completed: InterviewItem[];
}

export default function CompletedInterviewsTab({ completed }: CompletedInterviewsTabProps) {
  return (
    <div>
      <p className="text-sm text-black/60 mb-3">Your finished interviews</p>
      {completed.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">No finished interviews yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {completed.map((item) => (
            <CompletedInterviewCard key={item?.interviewId} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
