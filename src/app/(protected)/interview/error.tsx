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
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-3">
          Something went wrong with this interview
        </h1>
        <p className="text-gray-600 mb-6">
          This didn&apos;t affect the rest of the app. You can try again, or head back and resume
          from your dashboard.
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
          <button
            onClick={reset}
            className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
          >
            Try Again
          </button>
          <button
            onClick={() => (window.location.href = "/home")}
            className="w-full sm:w-auto px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-all duration-200"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default InterviewError;
