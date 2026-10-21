"use client";
import StudentGuide from "@/components/guides/StudentGuide";
import StudentShell from "@/components/workspace/StudentShell";
export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <StudentShell>
      {children}
      <StudentGuide />
    </StudentShell>
  );
}
