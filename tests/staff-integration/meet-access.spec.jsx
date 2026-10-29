import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
const f = vi.hoisted(() => ({ current: true, get: vi.fn(), query: {} }));
vi.mock("@/samvaad/components/course-session", () => ({
  CourseSessionBoundary: ({ children }) => children,
  useCourseQuery: () => f.query,
  useCurrentCourseAction: () => () => f.current,
}));
vi.mock("@/lib/api/config", () => ({
  api: { get: f.get, useMutation: () => ({ mutateAsync: vi.fn() }) },
}));
vi.mock("@/components/ui/button", () => ({
  Button: ({ variant, ...props }) => <button {...props} />,
}));
import { HumanInterviews } from "@/samvaad/components/human-interviews";
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let root, container;
beforeEach(() => {
  f.current = true;
  f.get.mockReset().mockResolvedValue({ url: "https://meet.google.com/abc-defg-hij" });
  f.query = {
    isError: false,
    isFetching: false,
    data: {
      items: [
        {
          id: 1,
          version: 1,
          title: "Interview",
          student_name: "Learner",
          status: "scheduled",
          can_join: true,
          can_manage: false,
          starts_at: "2099-10-22",
          ends_at: "2099-10-23",
        },
      ],
      total: 1,
      can_create: false,
    },
    refetch: vi.fn(),
  };
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});
async function mount() {
  await act(async () => root.render(<HumanInterviews courseId="1" />));
}
async function verify() {
  await act(async () =>
    [...container.querySelectorAll("button")]
      .find((b) => b.textContent === "Check meeting access")
      .click()
  );
}
it("does not dispatch from a revoked course view", async () => {
  await mount();
  f.current = false;
  await verify();
  expect(f.get).not.toHaveBeenCalled();
});
it.each(["revocation", "expiry"])("blocks released links after %s", async (reason) => {
  await mount();
  await verify();
  const link = container.querySelector("a");
  expect(link).not.toBeNull();
  if (reason === "revocation") f.current = false;
  else vi.spyOn(Date, "now").mockReturnValue(Date.parse("2099-10-23"));
  const event = new MouseEvent("click", { bubbles: true, cancelable: true });
  await act(async () => link.dispatchEvent(event));
  expect(event.defaultPrevented).toBe(true);
  expect(container.querySelector("a")).toBeNull();
});
it("keeps active external links isolated from their opener", async () => {
  await mount();
  await verify();
  const link = container.querySelector("a");
  expect(link.target).toBe("_blank");
  expect(link.rel).toBe("noopener noreferrer");
  expect(link.getAttribute("referrerpolicy")).toBe("no-referrer");
});
