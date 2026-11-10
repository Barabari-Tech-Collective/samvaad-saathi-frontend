"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { apiClient } from "@/lib/api-config";
import { friendlyDate, statusWord } from "@/lib/dates";
import { useLanguage } from "@/lib/i18n/language";

type Item = {
  id: number;
  status: string;
  version: number;
  description: string;
  conditions: { code: string; label: string }[];
  decision_reason: string | null;
  confirmed: boolean;
  created_at: string;
};

/** Ask for extra time or other support in assessments, and follow what was decided. */
export default function ExtraSupport() {
  const { t } = useLanguage();
  const query = apiClient.useQuery<{ items: Item[] }>({
    key: ["my-accommodations"],
    url: "v2/accommodations/me",
    options: { retry: false, staleTime: 0 },
  });
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const create = apiClient.useMutation<unknown, { request_key: string; description: string }>({ url: "v2/accommodations/me", method: "post", showToastError: false });
  const [busy, setBusy] = useState(0);
  const act = async (item: Item, kind: "confirm" | "withdraw") => {
    setBusy(item.id);
    try {
      await apiClient.send("post", `v2/accommodations/me/${item.id}/${kind}`, { expected_version: item.version });
      toast.success(t(kind === "confirm" ? "Thanks. This is now active." : "Your request is withdrawn."));
      await query.refetch();
    } catch {
      toast.error(t("That didn't save. Please try again."));
    } finally {
      setBusy(0);
    }
  };
  const items = query.data?.items ?? [];
  return (
    <section id="extra-support" className="studio-profile-card space-y-3 scroll-mt-20" aria-labelledby="support-title">
      <h2 id="support-title" className="text-lg font-semibold">
        {t("Extra time and support")}
      </h2>
      <p className="text-sm text-gray-600">{t("If you need extra time or other help in assessments, tell us here. Your request goes to the team that arranges this.")}</p>
      {query.isError && <p role="alert">{t("We couldn't load this. Please try again.")}</p>}
      {items.length > 0 && (
        <ul className="divide-y divide-[#DEE8FB]">
          {items.map((item) => (
            <li key={item.id} className="space-y-2 py-3">
              <p className="font-semibold">
                {t(item.status === "requested" ? "Waiting for a decision" : item.status === "approved" ? "Approved" : item.status === "declined" ? "Not approved" : statusWord(item.status))}
                <span className="font-normal text-gray-600"> · {friendlyDate(item.created_at)}</span>
              </p>
              <p className="text-sm">{item.description}</p>
              {item.conditions.length > 0 && <p className="text-sm font-semibold">{item.conditions.map((c) => c.label).join(", ")}</p>}
              {item.decision_reason && <p className="text-sm text-gray-600">{item.decision_reason}</p>}
              <div className="flex flex-wrap gap-2">
                {item.status === "approved" && !item.confirmed && (
                  <button type="button" className="ws-button ws-button-primary" disabled={busy === item.id} onClick={() => void act(item, "confirm")}>
                    {t("Yes, use this")}
                  </button>
                )}
                {(item.status === "requested" || item.status === "approved") && (
                  <button type="button" className="ws-button" disabled={busy === item.id} onClick={() => void act(item, "withdraw")}>
                    {t("Withdraw")}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {open ? (
        <div className="space-y-2">
          <label htmlFor="support-text" className="block font-semibold">
            {t("What would help you?")}
          </label>
          <textarea id="support-text" className="w-full rounded-xl border p-3" rows={3} maxLength={2000} value={text} onChange={(e) => setText(e.target.value)} />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="ws-button ws-button-primary"
              disabled={text.trim().length < 10 || create.isPending}
              onClick={async () => {
                try {
                  await create.mutateAsync({ request_key: crypto.randomUUID(), description: text.trim() });
                  toast.success(t("Your request is sent."));
                  setText("");
                  setOpen(false);
                  await query.refetch();
                } catch {
                  toast.error(t("That didn't save. Please try again."));
                }
              }}
            >
              {t("Send request")}
            </button>
            <button type="button" className="ws-button" onClick={() => setOpen(false)}>
              {t("Cancel")}
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className="ws-button" onClick={() => setOpen(true)}>
          {t("Ask for support")}
        </button>
      )}
    </section>
  );
}
