import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import StructureYourAnswerPage from "@/app/(protected)/structure-your-answer/page";
import LevelsPage from "@/app/(protected)/control-your-pace/levels/page";
import PageNavigation from "@/components/workspace/PageNavigation";
import ResumeJourney from "@/components/studio/ResumeJourney";
import { ROLE_OPTIONS } from "@/lib/constants";
const fixture = vi.hoisted(() => ({
  path: "/ai-resume/skills",
  push: vi.fn(),
  query: {
    data: { levels: [] as { level: number; status: string; name: string }[], overallReadiness: 0 },
    isLoading: false,
    error: null as Error | null,
    refetch: vi.fn(),
  },
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: fixture.push }),
  usePathname: () => fixture.path,
}));
vi.mock("next/link", () => ({
  default: ({ children, ...props }: React.ComponentProps<"a">) => <a {...props}>{children}</a>,
}));
vi.mock("@/lib/api-config/src/client", () => ({
  createApiClient: () => ({ useQuery: () => fixture.query }),
}));
beforeEach(() => {
  fixture.push.mockClear();
  fixture.query.refetch.mockClear();
  fixture.query.error = null;
  fixture.query.data.levels = [];
});
it("cannot navigate to answer practice before a role is selected", () => {
  render(<StructureYourAnswerPage />);
  const start = screen.getByRole("button", { name: "Start practice" });
  expect(start).toBeDisabled();
  expect(screen.queryByRole("link")).toBeNull();
  fireEvent.click(start);
  expect(fixture.push).not.toHaveBeenCalled();
  const first = screen.getByRole("button", { name: ROLE_OPTIONS[0] });
  fireEvent.click(first);
  expect(first).toHaveAttribute("aria-pressed", "true");
  expect(start).toBeEnabled();
  fireEvent.click(start);
  expect(fixture.push).toHaveBeenCalledWith(
    `/structure-your-answer/interview?role=${encodeURIComponent(ROLE_OPTIONS[0])}`
  );
});
it("moves the announced selected state when the learner changes their role", () => {
  render(<StructureYourAnswerPage />);
  const a = screen.getByRole("button", { name: ROLE_OPTIONS[0] });
  const b = screen.getByRole("button", { name: ROLE_OPTIONS[1] });
  fireEvent.click(a);
  fireEvent.click(b);
  expect(a).toHaveAttribute("aria-pressed", "false");
  expect(b).toHaveAttribute("aria-pressed", "true");
});
it("handles an empty pacing catalogue without an invalid start link", () => {
  render(<LevelsPage />);
  expect(screen.getByText(/No level is available/)).toBeVisible();
  expect(screen.queryByRole("link")).toBeNull();
});
it("does not offer a locked pacing level as the fallback start action", () => {
  fixture.query.data.levels = [{ level: 1, status: "locked", name: "First level" }];
  render(<LevelsPage />);
  expect(screen.getByText("Locked")).toBeVisible();
  expect(screen.queryByRole("link")).toBeNull();
});
it("offers recovery when pacing levels cannot be loaded", () => {
  fixture.query.error = new Error("offline");
  render(<LevelsPage />);
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(fixture.query.refetch).toHaveBeenCalledOnce();
});
it.each([
  ["/ai-resume/skills", "Back to Resume review", "/ai-resume/score"],
  ["/ai-resume/hygiene", "Back to Skills feedback", "/ai-resume/skills"],
  ["/ai-resume/preview", "Back to Resume polish", "/ai-resume/hygiene"],
])("returns %s to the previous task step", (pathname, name, href) => {
  render(<PageNavigation pathname={pathname} />);
  expect(screen.getByRole("link", { name })).toHaveAttribute("href", href);
});
it("announces the current resume step without offering unsafe skip links", () => {
  render(
    <ResumeJourney>
      <h1>Skills feedback</h1>
    </ResumeJourney>
  );
  const progress = screen.getByRole("list", { name: "Resume review stages" });
  expect(within(progress).getByText("Skills").closest("li")).toHaveAttribute(
    "aria-current",
    "step"
  );
  expect(within(progress).queryByRole("link")).toBeNull();
});
