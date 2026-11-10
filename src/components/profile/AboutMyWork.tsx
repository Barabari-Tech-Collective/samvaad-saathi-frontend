"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { apiClient } from "@/lib/api-config";
import { useLanguage } from "@/lib/i18n/language";

type Item = { id: number; kind: "project" | "experience"; title: string; summary: string; status: string; version: number; confirmed_at: string | null };
type Draft = { id?: number; version?: number; kind: "project" | "experience"; title: string; summary: string };
const empty: Draft = { kind: "project", title: "", summary: "" };

/** Projects and work the learner wants practice questions to draw on. */
export default function AboutMyWork() {
  const { t } = useLanguage();
  const query = apiClient.useQuery<{ items: Item[]; limit: number }>({
    key: ["my-profile-context"],
    url: "v2/profile-context/me",
    options: { retry: false, staleTime: 0 },
  });
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const items = query.data?.items ?? [];
  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    try {
      await fn();
      toast.success(t(ok));
      setDraft(null);
      await query.refetch();
    } catch {
      toast.error(t("That didn't save. Please try again."));
    } finally {
      setBusy(false);
    }
  };
  const valid = draft && draft.title.trim().length >= 3 && draft.summary.trim().length >= 20;
  return (
    <section className="studio-profile-card space-y-3" aria-labelledby="work-title">
      <h2 id="work-title" className="text-lg font-semibold">
        {t("Your projects and work")}
      </h2>
      <p className="text-sm text-gray-600">{t("Add these and your practice questions can be about your own work.")}</p>
      {query.isError && <p role="alert">{t("We couldn't load this. Please try again.")}</p>}
      {items.length > 0 && (
        <ul className="divide-y divide-[#DEE8FB]">
          {items.map((item) => (
            <li key={item.id} className="space-y-1 py-3">
              <p className="font-semibold">{item.title}</p>
              <p className="text-sm">{item.summary}</p>
              <div className="flex flex-wrap gap-2 pt-1">
                {!item.confirmed_at && (
                  <button type="button" className="ws-button ws-button-primary" disabled={busy} onClick={() => void run(() => apiClient.send("post", `v2/profile-context/me/${item.id}/confirm`, { expected_version: item.version }), "Saved. Your questions can use this now.")}>
                    {t("Use this in practice")}
                  </button>
                )}
                <button type="button" className="ws-button" disabled={busy} onClick={() => setDraft({ id: item.id, version: item.version, kind: item.kind, title: item.title, summary: item.summary })}>
                  {t("Edit")}
                </button>
                <button type="button" className="ws-button" disabled={busy} onClick={() => void run(() => apiClient.send("delete", `v2/profile-context/me/${item.id}`), "Removed.")}>
                  {t("Remove")}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {draft ? (
        <div className="space-y-2">
          {!draft.id && (
            <div className="flex gap-2" role="group" aria-label={t("Type")}>
              {(["project", "experience"] as const).map((k) => (
                <button key={k} type="button" aria-pressed={draft.kind === k} className={draft.kind === k ? "ws-button ws-button-primary" : "ws-button"} onClick={() => setDraft({ ...draft, kind: k })}>
                  {t(k === "project" ? "Project" : "Work experience")}
                </button>
              ))}
            </div>
          )}
          <label htmlFor="work-name" className="block font-semibold">
            {t("Name")}
          </label>
          <input id="work-name" className="input input-bordered w-full" maxLength={120} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          <label htmlFor="work-summary" className="block font-semibold">
            {t("What did you do?")}
          </label>
          <textarea id="work-summary" className="w-full rounded-xl border p-3" rows={3} maxLength={1500} value={draft.summary} onChange={(e) => setDraft({ ...draft, summary: e.target.value })} />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="ws-button ws-button-primary"
              disabled={!valid || busy}
              onClick={() =>
                void run(
                  () =>
                    draft.id
                      ? apiClient.send("put", `v2/profile-context/me/${draft.id}`, { title: draft.title.trim(), summary: draft.summary.trim(), expected_version: draft.version })
                      : apiClient.send("post", "v2/profile-context/me", { kind: draft.kind, title: draft.title.trim(), summary: draft.summary.trim() }),
                  "Saved.",
                )
              }
            >
              {t("Save")}
            </button>
            <button type="button" className="ws-button" onClick={() => setDraft(null)}>
              {t("Cancel")}
            </button>
          </div>
        </div>
      ) : (
        items.length < (query.data?.limit ?? 10) && (
          <button type="button" className="ws-button" onClick={() => setDraft({ ...empty })}>
            {t("Add a project or job")}
          </button>
        )
      )}
    </section>
  );
}
