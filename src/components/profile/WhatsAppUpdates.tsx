"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "@/components/providers/auth-provider";
import { apiClient } from "@/lib/api-config";
import { parseWhatsAppUpdates } from "@/lib/whatsapp-updates";

/**
 * Profile: WhatsApp updates on or off (suite phase 2D). The same choice as replying STOP or
 * START on WhatsApp. Students without a Barabari student id don't see this section.
 */
export default function WhatsAppUpdates() {
  const { user } = useAuth();
  const account = user?.userId;
  const queryClient = useQueryClient();
  const key = ["whatsapp-updates-me", account];
  const query = apiClient.useQuery<unknown>({
    url: "v2/whatsapp-updates/me",
    key,
    options: {
      enabled: !!user,
      staleTime: 0,
      gcTime: 0,
      retry: false,
      refetchOnWindowFocus: false,
    },
  });
  const save = apiClient.useMutation<unknown, { on: boolean }>({
    url: "v2/whatsapp-updates/me",
    method: "put",
    showToastError: false,
  });
  const [saving, setSaving] = useState(false);
  const setting = query.isError || query.isFetching ? null : parseWhatsAppUpdates(query.data);

  // A 404 means this account is not a Barabari student: there are no WhatsApp updates to switch.
  const status = (query.error as { response?: { status?: number } } | null)?.response?.status;
  if (status === 404) return null;

  const change = async (on: boolean) => {
    setSaving(true);
    try {
      const res = parseWhatsAppUpdates(await save.mutateAsync({ on }));
      if (res) queryClient.setQueryData(key, res);
      toast.success(
        on
          ? "WhatsApp updates are on."
          : "WhatsApp updates are off. You can turn them back on here any time."
      );
    } catch {
      toast.error("Your WhatsApp setting was not changed. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="studio-profile-card space-y-3" aria-labelledby="whatsapp-updates-heading">
      <h2 id="whatsapp-updates-heading" className="text-lg font-semibold">
        {"WhatsApp updates"}
      </h2>
      <p className="text-sm text-gray-600">
        {
          "We send your interview times, results and next steps on WhatsApp. Replying STOP on WhatsApp does the same as turning this off."
        }
      </p>
      {query.isError ? (
        <div role="alert" className="space-y-2">
          <p>{"Your WhatsApp setting could not be loaded right now."}</p>
          <button
            type="button"
            className="btn btn-outline min-h-11"
            onClick={() => void query.refetch()}
          >
            {"Try again"}
          </button>
        </div>
      ) : !setting ? (
        <p role="status">{"Loading your WhatsApp setting…"}</p>
      ) : (
        <label className="flex min-h-11 cursor-pointer items-center justify-between gap-4">
          <span className="font-semibold">{setting.on ? "On" : "Off"}</span>
          <input
            type="checkbox"
            role="switch"
            className="toggle toggle-primary"
            checked={setting.on}
            disabled={saving}
            aria-label={"Get WhatsApp updates"}
            onChange={(e) => void change(e.target.checked)}
          />
        </label>
      )}
    </section>
  );
}
