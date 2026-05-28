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
    <div
      className={`fixed top-0 left-0 w-full h-16 bg-primary z-50 flex items-center px-4 ${className}`}
    >
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
          <h1 className="text-white text-xl font-bold">Samvaad Saathi</h1>
        </div>

        {/* Optional Title */}
        {title && (
          <div className="ml-8">
            <h2 className="text-white text-lg font-medium">{title}</h2>
          </div>
        )}
      </div>
    </div>
  );
}
