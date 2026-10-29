"use client";
import ProductNavigation from "@/components/workspace/ProductNavigation";
import Image from "next/image";
import Link from "next/link";
import { Bars3Icon, UserCircleIcon } from "@heroicons/react/24/outline";

export default function TopNav({
  onMenuClick,
  menuOpen = false,
  className = "",
}: {
  onMenuClick?: () => void;
  menuOpen?: boolean;
  className?: string;
}) {
  return (
    <header className={`student-topbar ${className}`}>
      <button
        type="button"
        className="ws-icon-button student-menu-trigger"
        aria-label="Open navigation"
        aria-haspopup="dialog"
        aria-expanded={menuOpen}
        aria-controls="student-mobile-menu"
        onClick={onMenuClick}
      >
        <Bars3Icon aria-hidden="true" />
      </button>
      <Link className="student-brand" href="/home" aria-label="Samvaad Saathi home">
        <Image src="/barabari_logo.png" alt="" width={30} height={30} unoptimized priority />
        <span>Samvaad Saathi</span>
      </Link>
      <ProductNavigation />
      <Link
        className="ws-icon-button student-profile-link"
        href="/profile"
        aria-label="Open profile"
        title="Profile"
      >
        <UserCircleIcon aria-hidden="true" />
      </Link>
    </header>
  );
}
