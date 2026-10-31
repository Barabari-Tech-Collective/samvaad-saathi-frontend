import PageHeading from "@/components/studio/PageHeading";
import {
  ArrowRightIcon,
  ClipboardDocumentCheckIcon,
  VideoCameraIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";

const choices = [
  {
    title: "AI Interview",
    description:
      "Complete an assigned assessment in Samvaad Saathi. Your placement team sets the role, instructions and rules.",
    href: "/interview-start?mode=assessment",
    action: "Open AI Interview",
    icon: ClipboardDocumentCheckIcon,
  },
  {
    title: "Human Interview",
    description:
      "See a scheduled meeting, preparation instructions and the verified link to join your interviewer.",
    href: "/human-interviews",
    action: "View Human Interviews",
    icon: VideoCameraIcon,
  },
] as const;

export default function AssessmentsHub() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 pb-10 pt-4 [overflow-wrap:anywhere] sm:pt-7">
      <PageHeading
        eyebrow="Formal assessments"
        title="Assessments"
        description="Your placement team may assign either an AI Interview or a Human Interview. These are separate from Mock Interviews."
      />
      <section className="studio-panel space-y-3" aria-label="Assessment information">
        <h2 className="text-lg font-semibold text-[#1F285B]">Choose the round you were assigned</h2>
        <p className="text-gray-700">
          An assessment is shown only when your placement team has made it available. It has its own
          instructions, timing and result-release policy.
        </p>
      </section>
      <section aria-label="Assessment round types" className="grid gap-5 md:grid-cols-2">
        {choices.map(({ title, description, href, action, icon: Icon }) => (
          <article key={title} className="studio-panel flex min-h-64 flex-col items-start gap-4">
            <span className="ws-feature-icon" aria-hidden="true">
              <Icon />
            </span>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-[#1F285B]">{title}</h2>
              <p className="text-gray-700">{description}</p>
            </div>
            <Link className="ws-button ws-button-primary mt-auto" href={href}>
              {action} <ArrowRightIcon aria-hidden="true" />
            </Link>
          </article>
        ))}
      </section>
      <section className="flex flex-wrap items-center gap-3 text-sm">
        <Link className="ws-button" href="/assessment-reviews">
          View assessment reviews
        </Link>
        <p className="text-gray-600">
          A review notice is not a result and does not change your score by itself.
        </p>
      </section>
    </div>
  );
}
