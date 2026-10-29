"use client";

import PageHeading from "@/components/studio/PageHeading";
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { useEffect, useState } from "react";
import { trackEvent } from "@/lib/posthog/tracking.utils";

type CheckStatus = "idle" | "checking" | "passed" | "warning" | "failed";

interface PracticePreflightProps {
  role: string;
  level: string;
  questionCount: number;
  durationMinutes: number;
  isStarting: boolean;
  onBack: () => void;
  onStart: () => void;
}

interface CheckRowProps {
  title: string;
  detail: string;
  status: CheckStatus;
  action?: { label: string; onClick: () => void; disabled?: boolean };
}

function CheckRow({ title, detail, status, action }: CheckRowProps) {
  const passed = status === "passed";
  const caution = status === "warning" || status === "failed";
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex gap-3">
        {passed ? (
          <CheckCircleIcon className="mt-0.5 size-6 shrink-0 text-emerald-600" aria-hidden="true" />
        ) : caution ? (
          <ExclamationTriangleIcon
            className="mt-0.5 size-6 shrink-0 text-amber-600"
            aria-hidden="true"
          />
        ) : (
          <span
            className="mt-1 size-5 shrink-0 rounded-full border-2 border-gray-300"
            aria-hidden="true"
          />
        )}
        <div>
          <h3 className="font-bold">{title}</h3>
          <p className="mt-1 text-sm leading-5 text-gray-600">{detail}</p>
        </div>
      </div>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          disabled={action.disabled}
          className="min-h-11 shrink-0 rounded-xl border border-[#344499] px-4 text-sm font-bold text-[#344499] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#344499] disabled:cursor-wait disabled:opacity-60"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

function testLocalStorage(): boolean {
  try {
    const key = "samvaad:preflight:storage-test";
    localStorage.setItem(key, "ok");
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

export default function PracticePreflight({
  role,
  level,
  questionCount,
  durationMinutes,
  isStarting,
  onBack,
  onStart,
}: PracticePreflightProps) {
  const [network, setNetwork] = useState<CheckStatus>("idle");
  const [storage, setStorage] = useState<CheckStatus>("idle");
  const [microphone, setMicrophone] = useState<CheckStatus>("idle");
  const [microphoneDetail, setMicrophoneDetail] = useState(
    "Check that the browser can hear you before starting the interview."
  );
  const [playback, setPlayback] = useState<CheckStatus>("idle");

  const runBasicChecks = () => {
    const networkStatus = navigator.onLine ? "passed" : "failed";
    const storageStatus = testLocalStorage() ? "passed" : "failed";
    setNetwork(networkStatus);
    setStorage(storageStatus);
    trackEvent("practice_device_check_result", {
      check: "basic",
      network_status: networkStatus,
      storage_status: storageStatus,
    });
  };

  useEffect(() => {
    runBasicChecks();
    const syncNetwork = () => setNetwork(navigator.onLine ? "passed" : "failed");
    window.addEventListener("online", syncNetwork);
    window.addEventListener("offline", syncNetwork);
    return () => {
      window.removeEventListener("online", syncNetwork);
      window.removeEventListener("offline", syncNetwork);
    };
  }, []);

  const testMicrophone = async () => {
    setMicrophone("checking");
    if (!navigator.mediaDevices?.getUserMedia) {
      setMicrophone("failed");
      setMicrophoneDetail(
        "This browser cannot record audio. Open Samvaad Saathi in the latest Chrome or Edge on a device with a microphone."
      );
      trackEvent("practice_device_check_result", {
        check: "microphone",
        status: "unsupported",
      });
      return;
    }
    let stream: MediaStream | null = null;
    let context: AudioContext | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      context = new AudioContext();
      const source = context.createMediaStreamSource(stream);
      const analyser = context.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      const samples = new Uint8Array(analyser.frequencyBinCount);
      await new Promise((resolve) => window.setTimeout(resolve, 700));
      analyser.getByteFrequencyData(samples);
      const average = samples.reduce((sum, value) => sum + value, 0) / samples.length;
      if (average > 75) {
        setMicrophone("warning");
        setMicrophoneDetail(
          "Microphone works, but the room sounds noisy. Move somewhere quieter if you can."
        );
        trackEvent("practice_device_check_result", {
          check: "microphone",
          status: "warning",
        });
      } else {
        setMicrophone("passed");
        setMicrophoneDetail(
          "Microphone access works. Your recording will start only when you choose Answer."
        );
        trackEvent("practice_device_check_result", {
          check: "microphone",
          status: "passed",
        });
      }
    } catch {
      setMicrophone("failed");
      setMicrophoneDetail(
        "Microphone access was denied or unavailable. Allow microphone access in browser settings, then check again."
      );
      trackEvent("practice_device_check_result", {
        check: "microphone",
        status: "failed",
      });
    } finally {
      stream?.getTracks().forEach((track) => track.stop());
      if (context) await context.close().catch(() => undefined);
    }
  };

  const testPlayback = async () => {
    setPlayback("checking");
    try {
      const context = new AudioContext();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.value = 523.25;
      gain.gain.value = 0.08;
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.4);
      await new Promise((resolve) => window.setTimeout(resolve, 500));
      await context.close();
      setPlayback("passed");
      trackEvent("practice_device_check_result", {
        check: "playback",
        status: "passed",
      });
    } catch {
      setPlayback("failed");
      trackEvent("practice_device_check_result", {
        check: "playback",
        status: "failed",
      });
    }
  };

  const voiceReady = microphone === "passed" || microphone === "warning";
  const ready = network === "passed" && storage === "passed" && voiceReady && playback === "passed";

  return (
    <div className="mx-auto w-full max-w-3xl pb-8 text-[#111827]">
      <button
        type="button"
        onClick={onBack}
        className="mb-5 inline-flex min-h-11 items-center gap-2 rounded-lg font-semibold text-[#344499] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#344499]"
      >
        <ArrowLeftIcon className="size-5" aria-hidden="true" /> Change setup
      </button>

      <PageHeading
        eyebrow="Before you begin"
        title="Make sure Practice can save your work"
        description="Check your connection, microphone and speaker. This helps your answers stay safe if you need to reconnect."
      />

      <section className="mt-6 rounded-2xl bg-[#F5F7FF] p-5" aria-label="Interview preview">
        <dl className="grid gap-4 sm:grid-cols-3">
          <div>
            <dt className="text-sm text-gray-600">Role</dt>
            <dd className="mt-1 font-bold">{role}</dd>
          </div>
          <div>
            <dt className="text-sm text-gray-600">Level</dt>
            <dd className="mt-1 font-bold capitalize">{level}</dd>
          </div>
          <div>
            <dt className="text-sm text-gray-600">What to expect</dt>
            <dd className="mt-1 font-bold">
              {questionCount} questions · about {durationMinutes} min
            </dd>
          </div>
        </dl>
      </section>

      <section className="mt-6 space-y-3" aria-label="Device checks" aria-live="polite">
        <CheckRow
          title="Internet connection"
          detail={
            network === "passed"
              ? "You are online. If the connection drops later, saved work can be resumed."
              : "You appear to be offline. Reconnect before starting the interview."
          }
          status={network}
          action={{ label: "Check again", onClick: runBasicChecks }}
        />
        <CheckRow
          title="Safe browser storage"
          detail={
            storage === "passed"
              ? "This browser can keep a temporary recovery copy on this device."
              : "Storage is blocked. Leave private browsing or allow site storage, then check again."
          }
          status={storage}
          action={{ label: "Check again", onClick: runBasicChecks }}
        />
        <CheckRow
          title="Microphone and background noise"
          detail={microphoneDetail}
          status={microphone}
          action={{
            label: microphone === "checking" ? "Checking…" : "Check microphone",
            onClick: () => void testMicrophone(),
            disabled: microphone === "checking",
          }}
        />
        <CheckRow
          title="Speaker playback"
          detail={
            playback === "passed"
              ? "Test sound played. Questions are also always shown as text."
              : playback === "failed"
                ? "The test sound could not play. Check your device volume, speaker output, or headphones, then try again."
                : "Play a short sound to check your speaker or headphones."
          }
          status={playback}
          action={{
            label: playback === "checking" ? "Playing…" : "Play test sound",
            onClick: () => void testPlayback(),
            disabled: playback === "checking",
          }}
        />
      </section>

      <section className="mt-6 rounded-2xl bg-[#FFE4BF] p-5">
        <h2 className="font-bold">Before you begin</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-gray-800">
          <li>Practice is private coaching, not a formal assessment.</li>
          <li>Refreshing, reconnecting, receiving a call or changing tabs will not punish you.</li>
          <li>You can save and exit. Answers confirmed as saved remain on your account.</li>
          <li>
            Your voice recording is stored securely so delayed speech feedback can be retried, then
            deleted according to the programme retention policy.
          </li>
          <li>Your facilitator may see coaching summaries according to your consent settings.</li>
        </ul>
      </section>

      <div className="mt-7">
        <button
          type="button"
          onClick={() => {
            trackEvent("practice_preflight_completed", {
              answer_mode: "voice",
              microphone_status: microphone,
              network_status: network,
              storage_status: storage,
            });
            onStart();
          }}
          disabled={!ready || isStarting}
          className="min-h-12 w-full rounded-xl bg-[#FFCC33] px-6 text-base font-bold text-[#1F285B] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#344499] disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500"
        >
          {isStarting ? "Creating your interview…" : "Start practice interview"}
        </button>
        {!ready && (
          <p className="mt-3 text-center text-sm text-gray-600">
            Complete the connection and storage checks, then check your microphone and playback.
          </p>
        )}
      </div>
    </div>
  );
}
