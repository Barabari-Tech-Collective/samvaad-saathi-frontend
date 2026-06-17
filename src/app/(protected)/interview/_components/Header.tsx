"use client";

import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useEffect, useRef, useState } from "react";

const Header = ({
  role,
  hasStarted,
  interviewId,
  onTimerExpire,
}: {
  role?: string;
  hasStarted: boolean;
  interviewId?: string | null;
  onTimerExpire?: () => void;
}) => {
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes in seconds
  const hasExpiredRef = useRef(false);
  const onTimerExpireRef = useRef(onTimerExpire);
  const isMobile = useMediaQuery("(max-width: 768px)");

  // Keep the ref updated with the latest callback
  useEffect(() => {
    onTimerExpireRef.current = onTimerExpire;
  }, [onTimerExpire]);

  useEffect(() => {
    // Only start timer when interview has actually started
    if (!hasStarted || !interviewId) return;

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
  }, [hasStarted, interviewId]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div
      className={`flex items-center justify-between p-4 gap-4 ${
        isMobile ? "" : "bg-[#ACADF1]/20 rounded-lg"
      }`}
    >
      <h3 className="text-[#1f285b] text-2xl font-bold uppercase tracking-wide">
        {role || "Developer"}
      </h3>

      <div className="flex-none pr-4">
        {/* Timer Container with Gradient Border */}
        <div className="relative p-[2px] rounded-xl bg-gradient-to-r from-pink-500 to-blue-600 shadow-md">
          <div className="bg-slate-50 rounded-[10px] px-6 py-2 min-w-[100px] flex items-center justify-center">
            <p className="font-orbitron text-2xl font-semibold text-slate-900 tracking-widest">
              {formatTime(timeLeft)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;
