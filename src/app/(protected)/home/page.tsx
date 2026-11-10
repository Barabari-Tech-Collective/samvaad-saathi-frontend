"use client";
import PageHeading from "@/components/studio/PageHeading";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/language";
import {
  ArrowRightIcon,
  ChatBubbleLeftRightIcon,
  ListBulletIcon,
  ClipboardDocumentCheckIcon,
  VideoCameraIcon,
  DocumentTextIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import { NextStep } from "@/components/workspace/NextStep";
import { friendlyDate, statusWord } from "@/lib/dates";
import { firstName } from "@/lib/practice-hub";
import { useAuth } from "@/components/providers/auth-provider";
import { apiClient } from "@/lib/api-config";
import { ENDPOINTS } from "@/lib/api-config/src/endpoints";

interface InterviewItem {
  interviewId: number;
  track: string;
  difficulty: string;
  status: string;
  createdAt: string;
  summaryReportAvailable: boolean;
}
export default function HomePage() {
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const account = user?.userId;
  const query = apiClient.useQuery<{ items: InterviewItem[] }>({
    key: [ENDPOINTS.INTERVIEWS.WITH_SUMMARY, "home", account],
    url: `${ENDPOINTS.INTERVIEWS.WITH_SUMMARY}?limit=3`,
    enabled: !!account && !loading,
    options: { staleTime: 0, gcTime: 0, retry: false },
  });
  const notices = apiClient.useQuery<{ count: number }>({
    key: ["assessment-review-notice-count", account],
    url: "v2/integrity/me/notice-count",
    enabled: !!account && !loading,
    options: { staleTime: 0, gcTime: 0, retry: false },
  });
  const fresh = query.isError || query.isFetching ? undefined : query.data;
  const data = fresh && Array.isArray(fresh.items) ? fresh : undefined;
  if (loading || !account) return <output aria-label="Loading" className="ws-next-loading"><span /><span /><span /></output>;
  const noticeCount = !notices.isError && !notices.isFetching ? (notices.data?.count ?? 0) : 0;
  return (
    <div className="ws-home">
      <PageHeading
                title={`${t("Hi,")} ${firstName(user.authorizedUser.name)}.`}
        description={t("Here is what to do next.")}
      />
      {noticeCount > 0 && (
        <aside className="ws-notice">
          <p>
            {noticeCount} assessment {noticeCount === 1 ? "review needs" : "reviews need"} your
            attention.
          </p>
          <Link className="ws-button" href="/assessment-reviews">
            View reviews <ArrowRightIcon aria-hidden="true" />
          </Link>
        </aside>
      )}
      <NextStep key={`next-${account}`} accountKey={String(account)} trend />
      <details className="ws-more">
        <summary>{t("More practice")}</summary>
        <div className="ws-secondary-tasks">
          {[
            ["/coaching", ListBulletIcon, "Coaching", "Build one skill with short activities"],
            ["/mock-interviews", ChatBubbleLeftRightIcon, "Mock Interviews", "Rehearse a full interview"],
            ["/human-interviews", VideoCameraIcon, "Live interviews", "See your interview time and join"],
            ["/opportunity-outcomes", ClipboardDocumentCheckIcon, "Job results", "See your results and next steps"],
            ["/ai-resume", DocumentTextIcon, "Your resume", "Make or fix your resume"],
          ].map(([href, Icon, title, detail]) => {
            const Glyph = Icon as typeof ListBulletIcon;
            return (
              <Link key={href as string} className="ws-task-link" href={href as string}>
                <Glyph aria-hidden="true" />
                <span>
                  <strong>{t(title as string)}</strong>
                  <small>{t(detail as string)}</small>
                </span>
                <ArrowRightIcon aria-hidden="true" />
              </Link>
            );
          })}
        </div>
      </details>
      <section aria-labelledby="recent-interviews">
        <div className="ws-section-heading">
          <h2 id="recent-interviews">{t("Recent interviews")}</h2>
          <Link className="ws-button" href="/history">
            {t("Open Progress")} <ArrowRightIcon aria-hidden="true" />
          </Link>
        </div>
        {query.isError || (query.isSuccess && !query.isFetching && !data) ? (
          <div role="alert" className="ws-empty">
            <p>We couldn't load your recent interviews. Your work is safe.</p>
            <button className="ws-button mt-4" onClick={() => void query.refetch()}>
              Try again
            </button>
          </div>
        ) : !data ? (
          <output aria-label="Loading" className="ws-next-loading"><span /><span /><span /></output>
        ) : !data.items.length ? (
          <div className="ws-empty">
            <h3>{t("Your first round starts here")}</h3>
            <p>Your interviews and feedback will appear here.</p>
          </div>
        ) : (
          <ul className="ws-history-list">
            {data.items.map((row) => (
              <li key={row.interviewId}>
                <ClockIcon className="ws-history-icon" aria-hidden="true" />
                <div className="ws-history-title">
                  <h3>{row.track}</h3>
                  <p>
                    {friendlyDate(row.createdAt)} · {row.difficulty} · {statusWord(row.status)}
                  </p>
                </div>
                <Link
                  className="ws-button"
                  href={
                    row.status === "completed" && row.summaryReportAvailable
                      ? `/report-summary?interviewId=${row.interviewId}`
                      : "/history"
                  }
                >
                  {row.status === "completed" && row.summaryReportAvailable
                    ? "See feedback"
                    : "Open"}
                  <ArrowRightIcon aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
