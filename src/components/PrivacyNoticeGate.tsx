"use client";

import { useState } from "react";
import { createApiClient } from "@/lib/api-config";
import { APIService } from "@/lib/api-config/src/config";

const client = createApiClient(APIService.INTERVIEWS);
const URL = "v2/privacy-notice";

interface Notice {
  version: string;
  title: string;
  paragraphs: string[];
  accepted: boolean;
}

// One plain page, shown once. It switches nothing on or off; if it cannot load, the app stays usable.
export default function PrivacyNoticeGate() {
  const [understood, setUnderstood] = useState(false);
  const notice = client.useQuery<Notice>({ key: [URL], url: URL, options: { staleTime: 60_000 } });
  const accept = client.useMutation<{ accepted: boolean }, { version: string }>({
    url: `${URL}/accept`,
    method: "post",
    keyToInvalidate: { queryKey: [URL] },
    showToastError: false,
  });

  const data = notice.data;
  if (!data || data.accepted) return null;

  return (
    <div
      className="modal modal-open"
      role="dialog"
      aria-modal="true"
      aria-labelledby="privacy-title"
    >
      <div className="modal-box max-w-lg">
        <h2 id="privacy-title" className="text-lg font-semibold">
          {data.title}
        </h2>
        <div className="mt-3 space-y-2 text-sm leading-relaxed">
          {data.paragraphs.map((text) => (
            <p key={text}>{text}</p>
          ))}
        </div>
        <label className="mt-4 flex min-h-11 items-center gap-3 text-sm">
          <input
            type="checkbox"
            className="checkbox checkbox-primary"
            checked={understood}
            onChange={(event) => setUnderstood(event.target.checked)}
          />
          I have read and understood this.
        </label>
        {accept.isError && (
          <p role="alert" className="mt-2 text-sm text-error">
            That did not save. Please try again.
          </p>
        )}
        <div className="modal-action">
          <button
            type="button"
            className="btn btn-primary min-h-11"
            disabled={!understood || accept.isPending}
            onClick={() => accept.mutate({ version: data.version })}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
