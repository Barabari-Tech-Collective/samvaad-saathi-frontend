"use client";

import PageHeading from "@/components/studio/PageHeading";
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { useEffect, useRef, useState } from "react";
import { useLanguage } from "@/lib/i18n/language";
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
  const { t } = useLanguage();
  const [network, setNetwork] = useState<CheckStatus>("idle");
  const [storage, setStorage] = useState<CheckStatus>("idle");
  const [microphone, setMicrophone] = useState<CheckStatus>("idle");
  const [microphoneDetail, setMicrophoneDetail] = useState("Check that we can hear you.");
  const [playback, setPlayback] = useState<CheckStatus>("idle");
  const microphoneHelp = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // The student just touched the button, so show the answer where they are looking.
    if (microphone === "failed")
      microphoneHelp.current?.scrollIntoView?.({ block: "center", behavior: "smooth" });
  }, [microphone]);

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
        setMicrophoneDetail("Your microphone works. Recording starts only when you touch Answer.");
        trackEvent("practice_device_check_result", {
          check: "microphone",
          status: "passed",
        });
      }
    } catch {
      setMicrophone("failed");
      setMicrophoneDetail(
        "We cannot hear you yet. Your phone or browser is blocking the microphone."
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
        <ArrowLeftIcon className="size-5" aria-hidden="true" /> {t("Change setup")}
      </button>

      <PageHeading
        eyebrow={t("Before you begin")}
        title={t("Get ready")}
        description={t(
          "Check your internet, microphone and speaker. Your answers stay safe if the internet goes off."
        )}
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
          title={t("Internet")}
          detail={
            network === "passed"
              ? t("Your internet is working. If it goes off, your saved answers are kept.")
              : "You appear to be offline. Reconnect before starting the interview."
          }
          status={network}
          action={{ label: t("Check again"), onClick: runBasicChecks }}
        />
        <CheckRow
          title={t("Saving on this phone")}
          detail={
            storage === "passed"
              ? t("Your phone can keep a copy of your answers.")
              : t("Saving is blocked. Close private mode, then check again.")
          }
          status={storage}
          action={{ label: t("Check again"), onClick: runBasicChecks }}
        />
        <CheckRow
          title={t("Microphone")}
          detail={t(microphoneDetail)}
          status={microphone}
          action={{
            label: microphone === "checking" ? "Checking…" : t("Check microphone"),
            onClick: () => void testMicrophone(),
            disabled: microphone === "checking",
          }}
        />
        {microphone === "failed" && (
          <div
            ref={microphoneHelp}
            role="alert"
            className="rounded-2xl border border-[#F5B971] bg-[#FFF6E8] p-4 text-sm leading-6"
          >
            <p className="font-semibold">{t("How to turn the microphone on")}</p>
            <ol className="mt-2 list-decimal space-y-1 pl-5">
              <li>
                {t("Touch the small lock or settings icon next to the web address, at the top.")}
              </li>
              <li>{t("Touch Permissions, then Microphone, then Allow.")}</li>
              <li>{t("Come back here and touch Check microphone again.")}</li>
            </ol>
            <p className="mt-2">{t("Still stuck? Ask your facilitator or teacher to help you.")}</p>
          </div>
        )}
        <CheckRow
          title={t("Speaker")}
          detail={
            playback === "passed"
              ? t("Did you hear the sound? Good. Questions are also written on the screen.")
              : playback === "failed"
                ? t("No sound. Turn the volume up, then try again.")
                : t("Play a sound to check you can hear.")
          }
          status={playback}
          action={{
            label: playback === "checking" ? "Playing…" : t("Play test sound"),
            onClick: () => void testPlayback(),
            disabled: playback === "checking",
          }}
        />
      </section>

      <section className="mt-6 rounded-2xl bg-[#FFE4BF] p-5">
        <h2 className="font-bold">{t("Before you begin")}</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-gray-800">
          <li>{t("This is practice. It is not a test.")}</li>
          <li>{t("Nothing bad happens if you refresh, get a call or change pages.")}</li>
          <li>{t("You can stop and come back. Saved answers stay on your account.")}</li>
          <li>Your voice is saved safely so we can give you feedback. It is deleted later.</li>
          <li>Your teacher may see a short summary if you allowed it in your profile.</li>
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
          {isStarting ? "Creating your interview…" : t("Start practice interview")}
        </button>
        {!ready && (
          <p className="mt-3 text-center text-sm text-gray-600">
            {t("First do the checks above.")}
          </p>
        )}
      </div>
    </div>
  );
}
