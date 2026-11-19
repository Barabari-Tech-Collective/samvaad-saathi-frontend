"use client";
import { trackBottomNavClick } from "@/lib/posthog/tracking.utils";
import {
  AcademicCapIcon,
  HomeIcon,
  ClockIcon,
  ShieldCheckIcon,
  Squares2X2Icon,
} from "@heroicons/react/24/outline";
import { workspaceSection } from "@/lib/workspace-navigation";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/language";
import { usePathname } from "next/navigation";
const items = [
  { href: "/home", label: "Home", icon: HomeIcon },
  { href: "/coaching", label: "Practice", icon: AcademicCapIcon },
  // Assigned assessments are a learner's main task when they have one, so they sit in
  // the bar instead of behind "More".
  { href: "/assessments", label: "Assessments", icon: ShieldCheckIcon, assigned: true },
  { href: "/history", label: "Progress", icon: ClockIcon },
];
export default function BottomNav({
  className = "",
  onMoreClick,
  menuOpen = false,
  showAssessments = false,
}: {
  className?: string;
  onMoreClick?: () => void;
  menuOpen?: boolean;
  showAssessments?: boolean;
}) {
  const { t } = useLanguage();
  const path = workspaceSection(usePathname());
  const shown = items.filter((item) => !item.assigned || showAssessments);
  const moreActive = !shown.some(({ href }) => path === href || path.startsWith(`${href}/`));
  return (
    <nav className={`student-bottom-nav ${className}`} aria-label="Bottom Navigation">
      {shown.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          aria-label={`Go to ${label.toLowerCase()}`}
          aria-current={path === href || path.startsWith(`${href}/`) ? "page" : undefined}
          onClick={() => trackBottomNavClick(label.toLowerCase())}
        >
          <Icon aria-hidden="true" />
          <span>{t(label)}</span>
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
        <span>{t("More")}</span>
      </button>
    </nav>
  );
}
