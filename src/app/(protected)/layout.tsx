"use client";
import StudentGuide from "@/components/guides/StudentGuide";
import PlacementGate from "@/components/placement/PlacementGate";
import PrivacyNoticeGate from "@/components/PrivacyNoticeGate";
import StudentShell from "@/components/workspace/StudentShell";
export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <StudentShell>
      {children}
      {/* Placement first in the page, privacy notice after it: a new learner sees the privacy notice on top. */}
      <PlacementGate />
      <PrivacyNoticeGate />
      <StudentGuide />
    </StudentShell>
  );
}
