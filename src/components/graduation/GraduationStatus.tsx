"use client";
import { friendlyDate } from "@/lib/dates";
import { apiClient } from "@/lib/api-config/src/instance";
import { useAuth } from "@/components/providers/auth-provider";
type Progress = {
  course_id: string;
  course_name?: string | null;
  state: string;
  course_verified: boolean;
  placement_verified: boolean;
  graduated_at: string | null;
};

const isProgress = (value: unknown): value is Progress => {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.course_id === "string" &&
    row.course_id.trim().length > 0 &&
    typeof row.state === "string" &&
    typeof row.course_verified === "boolean" &&
    typeof row.placement_verified === "boolean" &&
    (typeof row.graduated_at === "string" || row.graduated_at === null)
  );
};

export default function GraduationStatus() {
  const { user } = useAuth();
  const query = apiClient.useQuery<{ items: Progress[] }>({
    url: "v2/graduation/me",
    key: ["graduation-status", user?.userId],
    options: { enabled: !!user, staleTime: 0, gcTime: 0, retry: false, refetchOnWindowFocus: true },
  });
  const data = query.isError ? undefined : query.data;
  const items = Array.isArray(data?.items) && data.items.every(isProgress) ? data.items : null;
  return (
    <section className="studio-profile-card space-y-3" aria-labelledby="graduation-heading">
      <h2 id="graduation-heading" className="text-xl font-semibold">
        Course and job status
      </h2>
      <p className="studio-muted">
        Your teacher checks that you finished the course and got a job. Then you are marked as
        graduated. You can keep learning after that.
      </p>
      {query.isError ? (
        <p role="alert">We couldn't load your graduation details.</p>
      ) : query.isLoading || !data ? (
        <p role="status">Loading your progress…</p>
      ) : !items ? (
        <p role="alert">We couldn't load your graduation details. Please try again.</p>
      ) : !items.length ? (
        <p>
          Nothing yet. Tell your course team when you finish the course and join a job.
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((row) => (
            <li key={row.course_id} className="rounded-xl border p-4">
              <h3 className="font-medium">{row.course_name ?? "Your course"}</h3>
              <p>Course completion: {row.course_verified ? "Done" : "Being checked"}</p>
              <p>Job placement: {row.placement_verified ? "Done" : "Being checked"}</p>
              <p>
                {row.state === "graduated"
                  ? `Graduation approved${row.graduated_at ? ` on ${friendlyDate(row.graduated_at)}` : ""}.`
                  : row.state === "ready"
                    ? "Both checks are complete. Waiting for final approval."
                    : "Your teacher is checking."}
              </p>
            </li>
          ))}
        </ul>
      )}
      <button
        className="inline-flex min-h-11 items-center rounded-lg border px-4 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50"
        type="button"
        disabled={query.isFetching}
        onClick={() => void query.refetch()}
      >
        Refresh
      </button>
    </section>
  );
}
