"use client";
import PrivacyNoticeGate from "@/components/PrivacyNoticeGate";
import StudentShell from "@/components/workspace/StudentShell";
export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <StudentShell>
      {children}
      <PrivacyNoticeGate />
    </StudentShell>
  );
}
