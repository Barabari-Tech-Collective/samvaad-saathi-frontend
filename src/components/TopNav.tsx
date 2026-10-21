"use client";

import Image from "next/image";

/**
 * Top navigation bar used across protected screens.
 * Renders a solid brand strip with app logo and name on the left
 * and a settings icon button on the right.
 */
export default function TopNav({
  title,

  className = "",
}: {
  title?: string;
  onSettingsClick?: () => void;
  className?: string;
}) {
  return (
    <header className={`student-topbar ${className}`}>
      <div className="flex-1 flex items-center">
        {/* App Logo and Name */}
        <div className="flex items-center gap-3">
          <Image
            src="/barabari_logo.png"
            alt="Samvaad Saathi Logo"
            width={32}
            height={32}
            className="w-8 h-8 object-contain"
            priority
            unoptimized
          />
          <span className="text-[#1F285B] text-lg font-semibold">Samvaad Saathi</span>
        </div>

        {/* Optional Title */}
        {title && (
          <div className="ml-8">
            <h2 className="text-[#1F285B] text-lg font-medium">{title}</h2>
          </div>
        )}
      </div>
    </header>
  );
}
