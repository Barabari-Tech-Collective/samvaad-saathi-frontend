"use client";

import { trackBottomNavClick } from "@/lib/posthog/tracking.utils";
import { HomeIcon, ListBulletIcon, UserIcon } from "@heroicons/react/24/solid";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { TargetPracticeIcon } from "./icons";

/**
 * Bottom navigation bar with four primary actions: Home, History, Target Practice, Profile.
 * Automatically highlights the currently active route based on pathname.
 */
export default function BottomNav({ className = "" }: { className?: string }) {
  const pathname = usePathname();

  // Determine which nav item should be active based on pathname
  const getActiveNav = () => {
    if (pathname.startsWith("/home")) return "home";
    if (pathname.startsWith("/history")) return "history";
    if (pathname.startsWith("/practice")) return "practice";
    if (pathname.startsWith("/profile")) return "profile";
    return undefined;
  };

  const active = getActiveNav();
  const baseItemClass =
    "flex flex-col items-center justify-center cursor-pointer transition-colors duration-200 hover:text-white";
  const isActive = (key: string) => active === key;

  // Handle tracking on navigation
  const handleClick = (destination: string) => {
    trackBottomNavClick(destination);
  };

  return (
    <nav
      className={`fixed bottom-0 left-0 w-full h-16 bg-[#1F285B] rounded-t-[14px] flex justify-around items-center ${className}`}
      aria-label="Bottom Navigation"
    >
      <Link
        href="/home"
        className={`${baseItemClass} ${isActive("home") ? "text-white" : "text-gray-400"}`}
        onClick={() => handleClick("home")}
        aria-label="Go to home"
      >
        <HomeIcon className="size-7" />
      </Link>

      <Link
        href="/history"
        className={`${baseItemClass} ${isActive("history") ? "text-white" : "text-gray-400"}`}
        onClick={() => handleClick("history")}
        aria-label="Go to history"
      >
        <ListBulletIcon className="size-7" />
      </Link>

      <Link
        href="/practice"
        className={`${baseItemClass} ${isActive("practice") ? "text-white" : "text-gray-400"}`}
        onClick={() => handleClick("practice")}
        aria-label="Go to target practice"
      >
        <TargetPracticeIcon className="size-10" />
      </Link>

      <Link
        href="/profile"
        className={`${baseItemClass} ${isActive("profile") ? "text-white" : "text-gray-400"}`}
        onClick={() => handleClick("profile")}
        aria-label="Go to profile"
      >
        <UserIcon className="size-7" />
      </Link>
    </nav>
  );
}
