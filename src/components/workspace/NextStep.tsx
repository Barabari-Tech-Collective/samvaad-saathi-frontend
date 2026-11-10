"use client";

import Link from "next/link";
import { ArrowRightIcon } from "@heroicons/react/24/outline";
import { apiClient } from "@/lib/api-config";
import { StudentMessages } from "@/components/workspace/StudentMessages";
import { ActivityTrend } from "@/components/workspace/ActivityTrend";
import { dueText } from "@/lib/dates";
import { useLanguage } from "@/lib/i18n/language";
import type { PracticeHubActivity } from "@/lib/practice-hub";

export type NextAction = {
  kind: string;
  title: string;
  detail: string;
  href: string;
  cta?: string;
  due_date?: string | null;
  from_teacher?: boolean;
};
export type Today = { action: NextAction; activity: PracticeHubActivity; has_assessments: boolean };

const SAFE =
  /^\/(?:warm-up-chat|think-fast|pronunciation-practice|structure-your-answer|control-your-pace|coaching|human-interviews|interview|interview-start)(?:\?[A-Za-z0-9=&%._-]*)?$/;

export function parseToday(value: unknown): Today | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const action = row.action as NextAction | null;
  const activity = row.activity as PracticeHubActivity | undefined;
  if (!activity || !Array.isArray(activity.dailyActivity)) return null;
  if (
    !action ||
    typeof action.title !== "string" ||
    !action.title.trim() ||
    typeof action.detail !== "string" ||
    typeof action.href !== "string" ||
    !SAFE.test(action.href)
  )
    return null;
  return { action, activity, has_assessments: row.has_assessments === true };
}

export const useToday = (accountKey: string) =>
  apiClient.useQuery<unknown>({
    key: ["student-home-today", accountKey],
    url: "v2/student-home/today",
    options: { staleTime: 0, gcTime: 0, retry: false, refetchOnWindowFocus: true },
  });

/** The one thing to do now. Every other option on the page is secondary to this. */
export function NextStep({ accountKey, trend = false }: { accountKey: string; trend?: boolean }) {
  const { t } = useLanguage();
  const query = useToday(accountKey);
  const today = query.isError ? null : parseToday(query.data);
  return (
    <section className="ws-next" aria-labelledby="next-step-title">
      <StudentMessages accountKey={accountKey} />
      <div className="ws-next-card">
        <p className="studio-eyebrow">
          {t(today?.action.from_teacher ? "From your teacher" : "Do this next")}
        </p>
        {query.isLoading ? (
          <div className="ws-next-loading" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        ) : today ? (
          <>
            <h2 id="next-step-title">{t(today.action.title)}</h2>
            <p>{t(today.action.detail)}</p>
            {today.action.due_date && (
              <p className="ws-next-due">{dueText(today.action.due_date)}</p>
            )}
            <Link className="ws-button ws-button-primary" href={today.action.href}>
              {t(today.action.cta ?? "Start")}
              <ArrowRightIcon aria-hidden="true" />
            </Link>
          </>
        ) : (
          <>
            <h2 id="next-step-title" role="alert">{t("We couldn't load your next step")}</h2>
            <p>{t("Your progress is safe.")}</p>
            <button
              type="button"
              className="ws-button ws-button-primary"
              onClick={() => void query.refetch()}
            >
              {t("Try again")}
            </button>
          </>
        )}
      </div>
      {trend && today && <ActivityTrend activity={today.activity} />}
    </section>
  );
}
