"use client";
import PageHeading from "@/components/studio/PageHeading";
import Link from "next/link";
import {
  ArrowRightIcon,
  ChatBubbleLeftRightIcon,
  SignalIcon,
  ListBulletIcon,
  ClipboardDocumentCheckIcon,
  VideoCameraIcon,
  DocumentTextIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import HomePractice from "@/components/workspace/HomePractice";
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
  const data = query.isError || query.isFetching ? undefined : query.data;
  if (loading || !account) return <output>Checking your workspace…</output>;
  const noticeCount = !notices.isError && !notices.isFetching ? (notices.data?.count ?? 0) : 0;
  return (
    <div className="ws-home">
      <PageHeading
        eyebrow="Your interview studio"
        title={`Hi, ${firstName(user.authorizedUser.name)}.`}
        description="A full interview or a little practice. Start where you are."
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
      <section className="ws-home-start" aria-label="Choose your next step">
        <HomePractice key={String(account)} accountKey={String(account)} />
        <div className="ws-secondary-tasks">
          <Link className="ws-task-link" href="/interview-start?mode=assessment">
            <ClipboardDocumentCheckIcon aria-hidden="true" />
            <span>
              <strong>Assessments</strong>
              <small>View available interviews and instructions</small>
            </span>
            <ArrowRightIcon aria-hidden="true" />
          </Link>
          <Link className="ws-task-link" href="/human-interviews">
            <VideoCameraIcon aria-hidden="true" />
            <span>
              <strong>Human interviews</strong>
              <small>Check your schedule and join your interviewer</small>
            </span>
            <ArrowRightIcon aria-hidden="true" />
          </Link>
          <Link className="ws-task-link" href="/ai-resume">
            <DocumentTextIcon aria-hidden="true" />
            <span>
              <strong>Your resume</strong>
              <small>Build or update your resume</small>
            </span>
            <ArrowRightIcon aria-hidden="true" />
          </Link>
        </div>
      </section>
      <section aria-labelledby="home-skills-title">
        <div className="ws-section-heading">
          <h2 id="home-skills-title">Work on one skill</h2>
          <Link className="ws-button" href="/practice#skill-builders-title">
            All skills <ArrowRightIcon aria-hidden="true" />
          </Link>
        </div>
        <div className="ws-quick-skills">
          {[
            {
              href: "/warm-up-chat",
              title: "Warm-up chat",
              detail: "Practise your introduction",
              icon: ChatBubbleLeftRightIcon,
            },
            {
              href: "/control-your-pace",
              title: "Pace & pauses",
              detail: "Work on fillers and speaking speed",
              icon: SignalIcon,
            },
            {
              href: "/structure-your-answer",
              title: "Answer structure",
              detail: "Give a clear, complete answer",
              icon: ListBulletIcon,
            },
          ].map(({ href, title, detail, icon: Icon }) => (
            <Link key={href} href={href} className="ws-quick-skill">
              <Icon aria-hidden="true" />
              <span>
                <strong>{title}</strong>
                <small>{detail}</small>
              </span>
              <ArrowRightIcon aria-hidden="true" />
            </Link>
          ))}
        </div>
      </section>
      <section aria-labelledby="recent-interviews">
        <div className="ws-section-heading">
          <h2 id="recent-interviews">Recent interviews</h2>
          <Link className="ws-button" href="/history">
            View history <ArrowRightIcon aria-hidden="true" />
          </Link>
        </div>
        {query.isError ? (
          <div role="alert" className="ws-empty">
            <p>Your recent interviews could not be loaded. Your saved work is retained.</p>
            <button className="ws-button mt-4" onClick={() => void query.refetch()}>
              Retry
            </button>
          </div>
        ) : !data ? (
          <output>Loading recent interviews…</output>
        ) : !data.items.length ? (
          <div className="ws-empty">
            <h3>Your first round starts here</h3>
            <p>
              New to interviews? Try a warm-up chat before a full round. Saved interviews and
              feedback will appear here.
            </p>
            <Link className="ws-button mt-4" href="/warm-up-chat">
              Try a warm-up <ArrowRightIcon aria-hidden="true" />
            </Link>
          </div>
        ) : (
          <ul className="ws-history-list">
            {data.items.map((row) => (
              <li key={row.interviewId}>
                <ClockIcon className="ws-history-icon" aria-hidden="true" />
                <div className="ws-history-title">
                  <h3>{row.track}</h3>
                  <p>
                    {new Date(row.createdAt).toLocaleDateString(undefined, {
                      day: "numeric",
                      month: "short",
                    })}{" "}
                    · {row.difficulty} · {row.status.replaceAll("_", " ")}
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
                    ? "Feedback"
                    : "View status"}
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
