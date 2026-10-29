"use client";
import { trackBottomNavClick } from "@/lib/posthog/tracking.utils";
import { HomeIcon, MicrophoneIcon, ClockIcon, Squares2X2Icon } from "@heroicons/react/24/outline";
import { workspaceSection } from "@/lib/workspace-navigation";
import Link from "next/link";
import { usePathname } from "next/navigation";
const items = [
  { href: "/home", label: "Home", icon: HomeIcon },
  { href: "/practice", label: "Practice", icon: MicrophoneIcon },
  { href: "/history", label: "History", icon: ClockIcon },
];
export default function BottomNav({
  className = "",
  onMoreClick,
  menuOpen = false,
}: {
  className?: string;
  onMoreClick?: () => void;
  menuOpen?: boolean;
}) {
  const path = workspaceSection(usePathname());
  const moreActive = !items.some(({ href }) => path === href || path.startsWith(`${href}/`));
  return (
    <nav className={`student-bottom-nav ${className}`} aria-label="Bottom Navigation">
      {items.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          aria-label={`Go to ${label.toLowerCase()}`}
          aria-current={path === href || path.startsWith(`${href}/`) ? "page" : undefined}
          onClick={() => trackBottomNavClick(label.toLowerCase())}
        >
          <Icon aria-hidden="true" />
          <span>{label}</span>
        </Link>
      ))}
      <button
        type="button"
        aria-label="More features"
        data-active={moreActive}
        aria-haspopup="dialog"
        aria-controls="student-mobile-menu"
        aria-expanded={menuOpen}
        onClick={() => {
          trackBottomNavClick("more");
          onMoreClick?.();
        }}
      >
        <Squares2X2Icon aria-hidden="true" />
        <span>More</span>
      </button>
    </nav>
  );
}
