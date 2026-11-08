"use client";

import Link from "next/link";
import { useState } from "react";
import { apiClient } from "@/lib/api-config";

type Message = { id: number; title: string; body: string | null; href: string | null };

// Reminders and updates sent to this learner. Only same-site links are followed.
function parse(value: unknown): Message[] {
  const items = (value as { items?: unknown } | null | undefined)?.items;
  if (!Array.isArray(items)) return [];
  return items.flatMap((item) => {
    const row = item as Record<string, unknown>;
    if (typeof row?.id !== "number" || typeof row.title !== "string" || !row.title.trim()) return [];
    const href =
      typeof row.href === "string" && row.href.startsWith("/") && !row.href.startsWith("//")
        ? row.href
        : null;
    return [{ id: row.id, title: row.title, body: typeof row.body === "string" ? row.body : null, href }];
  });
}

function MessageRow({ message, onDismiss }: { message: Message; onDismiss: () => void }) {
  const markRead = apiClient.useMutation<unknown, void>({
    url: `v2/notifications/me/${message.id}/read`,
    method: "post",
  });
  return (
    <li>
      <span>
        <strong>{message.title}</strong>
        {message.body && <small>{message.body}</small>}
      </span>
      {message.href && message.href !== "/" && message.href !== "/home" && (
        <Link href={message.href}>Open</Link>
      )}
      <button
        type="button"
        className="ws-button"
        onClick={() => {
          onDismiss();
          markRead.mutate();
        }}
      >
        Dismiss
      </button>
    </li>
  );
}

export function StudentMessages({ accountKey }: { accountKey: string }) {
  const query = apiClient.useQuery<unknown>({
    key: ["student-messages", accountKey],
    url: "v2/notifications/me?unread_only=true&limit=3",
    options: { staleTime: 0, gcTime: 0, retry: false, refetchOnWindowFocus: true },
  });
  const [gone, setGone] = useState<number[]>([]);
  // A failed check shows nothing: messages must never get in the way of today's work.
  const messages = query.isError ? [] : parse(query.data).filter((m) => !gone.includes(m.id));
  if (messages.length === 0) return null;
  return (
    <ul className="ws-messages" aria-label="Messages for you">
      {messages.map((message) => (
        <MessageRow
          key={message.id}
          message={message}
          onDismiss={() => setGone((ids) => [...ids, message.id])}
        />
      ))}
    </ul>
  );
}
