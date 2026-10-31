import Link from "next/link";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { workspaceSection } from "@/lib/workspace-navigation";

function parentDestination(path: string) {
  if (path === "/report-summary") return { href: "/history", label: "History" };
  const section = workspaceSection(path);
  if (section === "/coaching" && path !== "/coaching") {
    return { href: "/coaching", label: "Coaching" };
  }
  if (section === "/mock-interviews" && path !== "/mock-interviews") {
    return { href: "/mock-interviews", label: "Mock Interviews" };
  }
  const resumeParents: Record<string, { href: string; label: string }> = {
    "/ai-resume/score": { href: "/ai-resume", label: "Resume upload" },
    "/ai-resume/skills": { href: "/ai-resume/score", label: "Resume review" },
    "/ai-resume/hygiene": { href: "/ai-resume/skills", label: "Skills feedback" },
    "/ai-resume/preview": { href: "/ai-resume/hygiene", label: "Resume polish" },
    "/ai-resume/final": { href: "/ai-resume/hygiene", label: "Resume polish" },
  };
  if (resumeParents[path]) return resumeParents[path];
  return { href: "/home", label: "Home" };
}

/** Page navigation stays with the content; the application header owns identity. */
export default function PageNavigation({ pathname }: { pathname: string }) {
  if (pathname === "/home") return null;
  const parent = parentDestination(pathname);
  return (
    <nav className="student-page-navigation" aria-label="Page navigation">
      <Link className="ws-back" href={parent.href} aria-label={`Back to ${parent.label}`}>
        <ArrowLeftIcon aria-hidden="true" />
        <span>Back to {parent.label}</span>
      </Link>
    </nav>
  );
}
