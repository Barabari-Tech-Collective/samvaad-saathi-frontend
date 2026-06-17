"use client";

import { cn } from "@/lib/utils";
import * as React from "react";

type Ring = {
  // 0-100
  value: number;
  // Any CSS color (e.g., "var(--color-primary)" or "#0ea5e9")
  color?: string;
  // Track color behind progress
  trackColor?: string;
  // Thickness in px (converted to SVG units internally)
  thickness?: number;
  // Rounded arc ends
  rounded?: boolean;
  // Optional aria-label for this ring
  ariaLabel?: string;
};

interface ConcentricRadialProgressProps {
  // Overall rendered size (width/height) in px
  size?: number;
  // Rings from outside to inside
  rings: Ring[];
  // Gap between rings in px
  gap?: number;
  // Starting angle in degrees (0=east, -90=north)
  startAngle?: number;
  // Optional center content
  centerRender?: (rings: Ring[]) => React.ReactNode;
  className?: string;
}

/**
 * ConcentricRadialProgress
 * - Pure SVG with Tailwind-friendly host wrapper
 * - Accepts arbitrary number of rings, each with its own color, thickness, and value
 * - Uses CSS variables by default so it fits your theme (no hard-coded colors)
 */
export function ConcentricRadialProgress({
  size = 220,
  rings,
  gap = 10,
  startAngle = -90,
  centerRender,
  className,
}: ConcentricRadialProgressProps) {
  const safeRings = React.useMemo(() => {
    const clamp = (n: number) => Math.max(0, Math.min(100, n));
    return rings.map((r) => ({ ...r, value: clamp(r.value) }));
  }, [rings]);

  // SVG coordinate system is 100x100. Convert px to this unit space.
  const unit = 100 / size;
  const gapU = gap * unit;

  // If ring has no thickness, default to 12 px
  const thicknessesU = safeRings.map((r) => (r.thickness ?? 12) * unit);
  const maxStroke = thicknessesU[0] ?? 12 * unit;
  const baseRadius = 50 - maxStroke / 2;

  // We render from outside → inside
  let offsetFromEdge = 0;

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", "select-none", className)}
      style={{
        // Ensure text uses your design tokens
        color: "var(--color-foreground)",
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        role="img"
        aria-label="Concentric radial progress"
        className="block"
      >
        {safeRings.map((ring, i) => {
          const strokeU = thicknessesU[i];
          const r = baseRadius - offsetFromEdge - strokeU / 2;
          const circumference = 2 * Math.PI * r;

          const progressLen = (ring.value / 100) * circumference;
          const remainder = Math.max(0, circumference - progressLen);

          // Prepare for next (inner) ring
          offsetFromEdge += strokeU + gapU;

          const commonCircleProps = {
            cx: 50,
            cy: 50,
            r,
            fill: "none" as const,
            strokeWidth: strokeU,
            transform: `rotate(${startAngle} 50 50)`,
            strokeLinecap: "round" as const,
          };

          const trackColor =
            ring.trackColor ??
            "color-mix(in oklch, var(--color-muted-foreground) 30%, transparent)";
          const strokeColor = ring.color ?? "var(--color-primary)";

          return (
            <g key={i} aria-label={ring.ariaLabel}>
              {/* Track */}
              <circle
                {...commonCircleProps}
                stroke={trackColor}
                // full circle track
                className="opacity-50"
              />
              {/* Progress */}
              <circle
                {...commonCircleProps}
                stroke={strokeColor}
                strokeDasharray={`${progressLen} ${remainder}`}
                // Keep offset at 0 to start where transform angle begins
                strokeDashoffset={0}
                // Improve rendering crispness
                shapeRendering="geometricPrecision"
              />
            </g>
          );
        })}
      </svg>

      {/* Center content */}
      {centerRender ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className={cn("flex flex-col items-center justify-center text-center", "text-balance")}
          >
            {centerRender(safeRings)}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default ConcentricRadialProgress;
