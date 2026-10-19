"use client";

import { useEffect, useRef, useState } from "react";

const Header = ({
  role,
  hasStarted,
  interviewId,
  onTimerExpire,
  deadlineAt,
  serverClockOffsetMs = 0,
}: {
  role?: string;
  hasStarted: boolean;
  interviewId?: string | null;
  onTimerExpire?: () => void;
  deadlineAt?: string | null;
  serverClockOffsetMs?: number;
}) => {
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes in seconds
  const hasExpiredRef = useRef(false);
  const onTimerExpireRef = useRef(onTimerExpire);

  // Keep the ref updated with the latest callback
  useEffect(() => {
    onTimerExpireRef.current = onTimerExpire;
  }, [onTimerExpire]);

  useEffect(() => {
    // Only start timer when interview has actually started
    if (!hasStarted || !interviewId) return;

    if (deadlineAt !== undefined) {
      if (deadlineAt === null) return;
      const update = () => {
        const remaining = Math.max(
          0,
          Math.ceil((Date.parse(deadlineAt) - Date.now() - serverClockOffsetMs) / 1000)
        );
        setTimeLeft(remaining);
        if (remaining === 0 && !hasExpiredRef.current) {
          hasExpiredRef.current = true;
          onTimerExpireRef.current?.();
        }
      };
      update();
      const timer = setInterval(update, 1000);
      return () => clearInterval(timer);
    }

    // Reset expired flag when interview starts (new interview)
    hasExpiredRef.current = false;

    // Create interview-specific storage key
    const storageKey = `interviewEndTime_${interviewId}`;

    // Check session storage for existing timer
    const savedEndTime = sessionStorage.getItem(storageKey);

    if (savedEndTime) {
      const remaining = Math.floor((parseInt(savedEndTime) - Date.now()) / 1000);
      if (remaining > 0) {
        setTimeLeft(remaining);
      } else {
        setTimeLeft(0);
        // Handle timer expiry if needed (only once)
        if (onTimerExpireRef.current && !hasExpiredRef.current) {
          hasExpiredRef.current = true;
          onTimerExpireRef.current();
        }
      }
    } else {
      // Set new end time only when interview actually starts (questions are ready)
      const endTime = Date.now() + 25 * 60 * 1000;
      sessionStorage.setItem(storageKey, endTime.toString());
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Trigger auto-submit when timer reaches 0 (only once)
          if (onTimerExpireRef.current && !hasExpiredRef.current) {
            hasExpiredRef.current = true;
            onTimerExpireRef.current();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [hasStarted, interviewId, deadlineAt, serverClockOffsetMs]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <header className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#DEE8FB] bg-white p-4 sm:p-5">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-[#6B7280]">Interview room</p>
        <h3 className="mt-1 break-words text-xl font-semibold text-[#1F285B] sm:text-2xl">
          {role || "Interview"}
        </h3>
      </div>
      <p
        className="rounded-lg bg-[#F5F9FF] px-4 py-3 text-base font-semibold tabular-nums text-[#1F285B]"
        aria-label="Interview time"
      >
        {deadlineAt === null ? "Practice · no time limit" : formatTime(timeLeft)}
      </p>
    </header>
  );
};

export default Header;
