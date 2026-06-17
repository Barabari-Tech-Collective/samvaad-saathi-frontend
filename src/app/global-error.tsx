"use client";

import { trackError, trackProfileSupportButtonClick } from "@/lib/posthog/tracking.utils";
import { ChatBubbleLeftRightIcon } from "@heroicons/react/24/solid";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import React, { useEffect } from "react";

const GlobalError = ({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) => {
  // Track the error with PostHog when component mounts
  useEffect(() => {
    if (error) {
      trackError(error, {
        error_type: "global_error",
        digest: error.digest,
        page: window.location.pathname,
      });
    }
  }, [error]);

  const handleSupportClick = () => {
    trackProfileSupportButtonClick();
    const phoneNumber = "+918639322365";
    const message = "Hi, I need support with Samvaad Saathi app.";
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
  };

  return (
    <html lang="en">
      <body>
        <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full">
            <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-12 text-center">
              {/* Lottie Animation */}
              <div className="w-48 h-48 mx-auto mb-6">
                <DotLottieReact src="/assets/lottie/Failed.lottie" autoplay loop />
              </div>

              {/* Error Message */}
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Oops! Something went wrong
              </h1>

              <p className="text-gray-600 text-lg mb-8 max-w-md mx-auto">
                We&apos;re sorry, but something unexpected happened. Don&apos;t worry, our team has
                been notified and we&apos;re working on it.
              </p>

              {/* Error Details (Dev Mode) */}
              {process.env.NODE_ENV === "development" && error && (
                <details className="mb-8 text-left">
                  <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700 mb-2">
                    Technical Details (Development Only)
                  </summary>
                  <div className="bg-gray-100 rounded-lg p-4 text-xs font-mono text-gray-700 overflow-auto max-h-40">
                    <p className="mb-2">
                      <strong>Error:</strong> {error.message}
                    </p>
                    {error.digest && (
                      <p className="mb-2">
                        <strong>Digest:</strong> {error.digest}
                      </p>
                    )}
                    {error.stack && (
                      <div>
                        <strong>Stack:</strong>
                        <pre className="mt-1 whitespace-pre-wrap">{error.stack}</pre>
                      </div>
                    )}
                  </div>
                </details>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-6">
                <button
                  onClick={reset}
                  className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                >
                  Try Again
                </button>

                <button
                  onClick={() => (window.location.href = "/")}
                  className="w-full sm:w-auto px-8 py-3 bg-white border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-all duration-200"
                >
                  Go to Home
                </button>
              </div>

              {/* Support Button */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <button
                  onClick={handleSupportClick}
                  className="w-full sm:w-auto px-6 py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 inline-flex items-center justify-center gap-2"
                >
                  <ChatBubbleLeftRightIcon className="size-6" />
                  Contact Support
                </button>
              </div>
            </div>

            {/* Additional Info */}
            <p className="text-center text-sm text-gray-500 mt-6">
              Error ID: {error?.digest || "Unknown"}
            </p>
          </div>
        </div>
      </body>
    </html>
  );
};

export default GlobalError;
