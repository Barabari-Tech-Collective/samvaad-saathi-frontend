"use client";

import { DEFAULT_TTS_VOICE_ID, TTS_VOICE_OPTIONS, TTS_VOICE_STORAGE_KEY } from "@/lib/constants";
import { useEffect, useState } from "react";

const allowedTtsVoiceIds = new Set<string>(TTS_VOICE_OPTIONS.map((option) => option.id));

function readStoredTtsVoiceId(): string {
  if (typeof window === "undefined") return DEFAULT_TTS_VOICE_ID;
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(TTS_VOICE_STORAGE_KEY);
  } catch {
    return DEFAULT_TTS_VOICE_ID;
  }
  if (raw && allowedTtsVoiceIds.has(raw)) return raw;
  return DEFAULT_TTS_VOICE_ID;
}

export function VoiceSelector() {
  const [ttsVoiceId, setTtsVoiceId] = useState<string>(DEFAULT_TTS_VOICE_ID);

  useEffect(() => {
    setTtsVoiceId(readStoredTtsVoiceId());
  }, []);

  const handleChange = (id: string) => {
    setTtsVoiceId(id);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(TTS_VOICE_STORAGE_KEY, id);
      } catch {
        /* Current-view preference still works when storage is unavailable. */
      }
    }
  };

  return (
    <div className="form-control">
      <label htmlFor="default-interview-voice" className="label mb-2">
        <span className="label-text">Default interview voice</span>
      </label>
      <select
        id="default-interview-voice"
        className="select select-bordered w-full"
        value={ttsVoiceId}
        onChange={(e) => handleChange(e.target.value)}
      >
        {TTS_VOICE_OPTIONS.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
    </div>
  );
}
