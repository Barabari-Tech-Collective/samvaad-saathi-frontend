"use client";

import Link from "next/link";
import { ArrowRightIcon } from "@heroicons/react/24/outline";
import { apiClient } from "@/lib/api-config";
import { StudentMessages } from "@/components/workspace/StudentMessages";
import type { PracticeHubActivity } from "@/lib/practice-hub";

type ActionKind = "human_interview" | "ai_interview" | "learning_plan" | "mock_assignment";
type TodayAction = { kind: ActionKind; title: string; detail: string; href: string };
type Today = { action: TodayAction | null; activity: PracticeHubActivity };

const text = (value: unknown, maximum: number) =>
  typeof value === "string" && value.trim().length > 0 && value.trim().length <= maximum
    ? value.trim()
    : null;
const count = (value: unknown): value is number =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0;

function parseToday(value: unknown): Today | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const activity = row.activity as PracticeHubActivity | undefined;
  if (
    !activity ||
    !count(activity.practiceDaysStreak) ||
    !count(activity.completedMocksThisWeek) ||
    !count(activity.completedDrillsThisWeek) ||
    !Array.isArray(activity.dailyActivity) ||
    activity.dailyActivity.length !== 7 ||
    activity.dailyActivity.some(
      (day) =>
        !day ||
        typeof day !== "object" ||
        typeof day.date !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(day.date) ||
        !count(day.completedMocks) ||
        !count(day.completedDrills)
    )
  )
    return null;
  if (row.action === null) return { action: null, activity };
  if (!row.action || typeof row.action !== "object") return null;
  const action = row.action as Record<string, unknown>;
  const kind = action.kind;
  const title = text(action.title, 200);
  const detail = text(action.detail, 500);
  const href = action.href;
  const safeHref =
    (kind === "human_interview" && href === "/human-interviews") ||
    (kind === "learning_plan" &&
      typeof href === "string" &&
      (href === "/coaching" ||
        /^\/(?:warm-up-chat|think-fast|pronunciation-practice|structure-your-answer|control-your-pace)\?planAssignment=[1-9]\d*&planStep=[1-9]\d*$/.test(
          href
        ) ||
        /^\/interview-start\?mode=practice&jobProfileId=[1-9]\d*&courseId=[A-Za-z0-9%._-]+$/.test(
          href
        ))) ||
    (kind === "ai_interview" &&
      typeof href === "string" &&
      /^\/interview\?interviewId=[1-9]\d*&interviewMode=assessment$/.test(href)) ||
    (kind === "mock_assignment" &&
      typeof href === "string" &&
      /^\/interview-start\?mode=practice&jobProfileId=[1-9]\d*&courseId=[A-Za-z0-9%._-]+$/.test(
        href
      ));
  if (
    !title ||
    !detail ||
    !safeHref ||
    !["human_interview", "ai_interview", "learning_plan", "mock_assignment"].includes(
      kind as string
    )
  )
    return null;
  return { action: { kind: kind as ActionKind, title, detail, href: href as string }, activity };
}

export function StudentToday({ accountKey }: { accountKey: string }) {
  const query = apiClient.useQuery<unknown>({
    key: ["student-home-today", accountKey],
    url: "v2/student-home/today",
    options: { staleTime: 0, gcTime: 0, retry: false, refetchOnWindowFocus: true },
  });
  // Keep the last verified action visible during a background focus refresh.
  // Hiding it made an ordinary tab switch look like an app-wide reload.
  const today = query.isError ? null : parseToday(query.data);
  const invalid = !query.isError && !query.isLoading && query.data !== undefined && !today;
  return (
    <section className="ws-today" aria-labelledby="today-title">
      <div>
        <p className="studio-eyebrow">Today</p>
        <h2 id="today-title">Your next action</h2>
      </div>
      <StudentMessages accountKey={accountKey} />
      {query.isLoading ? (
        <output>Checking your assigned work…</output>
      ) : query.isError || invalid ? (
        <div role="alert">
          <p>Your next action could not be verified.</p>
          <button className="ws-button mt-2" onClick={() => void query.refetch()}>
            Try again
          </button>
        </div>
      ) : today?.action ? (
        <Link className="ws-today-action" href={today.action.href}>
          <span>
            <strong>{today.action.title}</strong>
            <small>{today.action.detail}</small>
          </span>
          <ArrowRightIcon aria-hidden="true" />
        </Link>
      ) : (
        <div className="ws-today-empty">
          <p>Nothing needs your attention right now.</p>
          <Link href="/coaching">Choose a Coaching activity</Link>
        </div>
      )}
      <p className="ws-today-note">
        This list only uses work that Samvaad Saathi can verify. Open the relevant page for all
        details.
      </p>
    </section>
  );
}
