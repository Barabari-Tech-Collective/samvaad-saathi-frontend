/**
 * Utility functions for interview type-specific metric labels and formatting
 */

export interface MetricLabels {
  firstMetric: string;
  secondMetric: string;
  firstMetricIcon: string;
  secondMetricIcon: string;
}

/**
 * Get the appropriate metric labels based on interview type/track
 * @param track - Interview track/type (e.g., "HR and Communication", "Frontend Developer")
 * @returns Object with metric labels and icon sources
 */
export function getMetricLabels(track?: string): MetricLabels {
  // Normalize track name for comparison
  const normalizedTrack = track?.toLowerCase().trim() ?? "";

  // Check if this is an HR/Communication interview
  if (normalizedTrack.includes("hr") || normalizedTrack.includes("communication")) {
    return {
      firstMetric: "Communication Effectiveness",
      secondMetric: "Speech Fluency",
      firstMetricIcon: "/communication-icon.png",
      secondMetricIcon: "/text-to-speech.png",
    };
  }

  // Default labels for technical interviews
  return {
    firstMetric: "Technical Knowledge",
    secondMetric: "Speech Fluency",
    firstMetricIcon: "/brain.png",
    secondMetricIcon: "/text-to-speech.png",
  };
}

/**
 * Get metric labels for report summary components
 * @param track - Interview track/type
 * @returns Object with metric labels for the detailed report
 */
export function getReportMetricLabels(track?: string): {
  firstMetricLabel: string;
  secondMetricLabel: string;
} {
  const normalizedTrack = track?.toLowerCase().trim() ?? "";

  if (normalizedTrack.includes("hr") || normalizedTrack.includes("communication")) {
    return {
      firstMetricLabel: "Communication Effectiveness",
      secondMetricLabel: "Speech & Structure",
    };
  }

  return {
    firstMetricLabel: "Knowledge Competence",
    secondMetricLabel: "Speech & Structure",
  };
}
