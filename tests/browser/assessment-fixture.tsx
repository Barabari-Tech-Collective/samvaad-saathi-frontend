import { useSearchParams } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import {
  AssessmentInterruptionNotice,
  ProctoringPreflightModal,
  useProctoring,
} from "@/hooks/useProctoring";
import { createApiClient } from "@/lib/api-config/src/client";
import { APIService } from "@/lib/api-config/src/config";

export function AssessmentFixture() {
  const params = useSearchParams();
  const { user } = useAuth();
  const client = createApiClient(APIService.INTERVIEWS);
  const post = client.useMutation<
    unknown,
    { interviewId: number; reason: "tab_switch" | "fullscreen_exit"; eventId: string }
  >({
    url: "interviews/proctoring-violation",
    method: "post",
    showToastError: false,
    options: { retry: false },
  });
  const monitor = useProctoring({
    enabled: params.get("mode") !== "practice",
    interviewId: Number(params.get("session") ?? "7"),
    scopeKey: String(user?.userId ?? ""),
    reportViolation: post.mutateAsync,
  });
  return (
    <main className="mx-auto max-w-3xl space-y-5 p-4 text-[#1F285B]">
      <h1>Assessment observation recovery fixture</h1>
      <p>Synthetic identity and API; browser signals are triggered by test controls.</p>
      <button
        type="button"
        className="min-h-11 rounded-xl border px-4"
        onClick={monitor.openPreflight}
      >
        Review assessment setup
      </button>
      <output aria-label="Monitoring state">
        {monitor.isActive ? "active" : "inactive"} · {monitor.reportState}
      </output>
      <button
        type="button"
        onClick={() => {
          Object.defineProperty(document, "hidden", { configurable: true, value: true });
          document.dispatchEvent(new Event("visibilitychange"));
        }}
      >
        Simulate interruption
      </button>
      <ProctoringPreflightModal
        isOpen={monitor.showPreflight}
        isStarting={monitor.isBeginning}
        onCancel={monitor.closePreflight}
        onBegin={() => void monitor.beginProctoredSession()}
      />
      {monitor.notice && (
        <AssessmentInterruptionNotice
          reason={monitor.notice}
          reportState={monitor.reportState}
          onRetry={() => void monitor.retryReport()}
          onContinue={monitor.acknowledge}
        />
      )}
    </main>
  );
}
