"use client";

import { trackError } from "@/lib/posthog/tracking.utils";
import { useEffect } from "react";

const InterviewError = ({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) => {
  useEffect(() => {
    trackError(error, {
      error_type: "interview_route_error",
      digest: error.digest,
      page: window.location.pathname,
    });
  }, [error]);

  return (
    <div className="min-h-dvh flex items-center justify-center p-4">
      <div className="studio-panel max-w-xl w-full">
        <h1 className="text-2xl font-bold text-gray-900 mb-3">
          Something went wrong with this interview
        </h1>
        <p className="text-gray-600 mb-6">
          Try reloading this interview. You can also open History to check saved answers and
          available recovery options.
        </p>

        {process.env.NODE_ENV === "development" && (
          <details className="mb-6 text-left">
            <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700 mb-2">
              Technical Details (Development Only)
            </summary>
            <div className="bg-gray-100 rounded-lg p-4 text-xs font-mono text-gray-700 overflow-auto max-h-40">
              <p className="mb-2">
                <strong>Error:</strong> {error.message}
              </p>
              {error.stack && <pre className="whitespace-pre-wrap">{error.stack}</pre>}
            </div>
          </details>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button onClick={reset} className="btn btn-neutral">
            Try Again
          </button>
          <button onClick={() => (window.location.href = "/history")} className="btn btn-outline">
            Open history
          </button>
        </div>
      </div>
    </div>
  );
};

export default InterviewError;
