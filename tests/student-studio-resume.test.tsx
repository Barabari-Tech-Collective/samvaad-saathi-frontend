import { render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import ResumeWorkspace from "@/app/(protected)/ai-resume/_components/ResumeWorkspace";
const fixture = vi.hoisted(() => ({ path: "/ai-resume/score", analysisResult: null as unknown }));
vi.mock("next/navigation", () => ({ usePathname: () => fixture.path }));
vi.mock("next/link", () => ({
  default: ({ children, ...props }: React.ComponentProps<"a">) => <a {...props}>{children}</a>,
}));
vi.mock("@/app/(protected)/ai-resume/_components/resume-provider", () => ({
  useAIResumeContext: () => fixture,
}));
beforeEach(() => {
  fixture.analysisResult = null;
});
it.each(["/ai-resume/score", "/ai-resume/skills", "/ai-resume/hygiene"])(
  "does not render missing analysis as a result at %s",
  (path) => {
    fixture.path = path;
    render(
      <ResumeWorkspace>
        <div>Result details</div>
      </ResumeWorkspace>
    );
    expect(screen.queryByText("Result details")).toBeNull();
    expect(screen.getByRole("link", { name: "Upload a resume" })).toHaveAttribute(
      "href",
      "/ai-resume"
    );
  }
);
it("keeps the current analysis available when moving between review steps", () => {
  fixture.path = "/ai-resume/skills";
  fixture.analysisResult = { score: 72 };
  render(
    <ResumeWorkspace>
      <div>Result details</div>
    </ResumeWorkspace>
  );
  expect(screen.getByText("Result details")).toBeVisible();
  expect(screen.queryByRole("link", { name: "Upload a resume" })).toBeNull();
});
