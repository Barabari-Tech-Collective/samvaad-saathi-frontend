import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import StudentShell from "@/components/workspace/StudentShell";
const fixture = vi.hoisted(() => ({ path: "/home", bulk: false }));
vi.mock("next/navigation", () => ({ usePathname: () => fixture.path }));
vi.mock("next/link", () => ({
  default: ({ children, ...props }: React.ComponentProps<"a">) => <a {...props}>{children}</a>,
}));
vi.mock("next/image", () => ({
  default: ({ src, alt, width, height }: React.ComponentProps<"img">) => (
    <img src={src} alt={alt} width={width} height={height} />
  ),
}));
vi.mock("@/components/providers/auth-provider", () => ({
  useAuth: () => ({ user: { authorizedUser: { canUseBulkAts: fixture.bulk } } }),
}));
vi.mock("@/lib/posthog/tracking.utils", () => ({ trackBottomNavClick: vi.fn() }));
beforeEach(() => {
  const records = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => records.get(key) ?? null,
    setItem: (key: string, value: string) => records.set(key, value),
  });
  fixture.path = "/home";
  fixture.bulk = false;
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
});
afterEach(() => vi.unstubAllGlobals());
it("keeps icon navigation named and identifies the current page", () => {
  render(
    <StudentShell>
      <h1>Home</h1>
    </StudentShell>
  );
  const nav = screen.getByRole("navigation", { name: "Student navigation" });
  expect(within(nav).getByRole("link", { name: "Home" })).toHaveAttribute("aria-current", "page");
  expect(within(nav).getByRole("link", { name: "Assessment reviews" })).toHaveAttribute(
    "href",
    "/assessment-reviews"
  );
  expect(screen.queryByRole("link", { name: "Bulk ATS" })).toBeNull();
  expect(screen.getByRole("button", { name: "Collapse navigation" })).toHaveAttribute(
    "aria-expanded",
    "true"
  );
  fireEvent.click(screen.getByRole("button", { name: "Collapse navigation" }));
  expect(screen.getByRole("button", { name: "Expand navigation" })).toHaveAttribute(
    "aria-expanded",
    "false"
  );
  expect(localStorage.getItem("samvaad-navigation-compact")).toBe("true");
  fireEvent.click(screen.getByRole("button", { name: "Expand navigation" }));
  expect(screen.getByRole("button", { name: "Collapse navigation" })).toHaveAttribute(
    "aria-expanded",
    "true"
  );
});
it("offers a deterministic parent when a practice drill is opened directly", () => {
  fixture.path = "/pronunciation-practice";
  render(
    <StudentShell>
      <h1>Pronunciation</h1>
    </StudentShell>
  );
  expect(
    within(screen.getByRole("main")).getByRole("link", { name: "Back to Practice" })
  ).toHaveAttribute("href", "/practice");
  const header = screen.getByRole("banner");
  expect(within(header).queryByRole("link", { name: "Back to Practice" })).toBeNull();
  expect(within(header).queryByRole("button", { name: "Collapse navigation" })).toBeNull();
  expect(within(header).getByRole("link", { name: "Samvaad Saathi home" })).toHaveTextContent(
    "Samvaad Saathi"
  );
  expect(
    within(screen.getByRole("complementary", { name: "Student workspace" })).getByRole("button", {
      name: "Collapse navigation",
    })
  ).toBeInTheDocument();
});
it("makes every destination available through the mobile menu and closes after selection", () => {
  render(
    <StudentShell>
      <h1>Home</h1>
    </StudentShell>
  );
  fireEvent.click(screen.getByRole("button", { name: "Open navigation" }));
  const dialog = screen.getByRole("dialog", { name: "Your workspace" });
  expect(within(dialog).getByRole("link", { name: "Human interviews" })).toHaveAttribute(
    "href",
    "/human-interviews"
  );
  fireEvent.click(within(dialog).getByRole("link", { name: "Home" }));
  expect(screen.queryByRole("dialog")).toBeNull();
});
it("does not add a route-away back link inside a live interview", () => {
  fixture.path = "/interview";
  render(
    <StudentShell>
      <h1>Interview</h1>
    </StudentShell>
  );
  expect(screen.queryByRole("navigation", { name: "Student navigation" })).toBeNull();
  expect(screen.queryByRole("link", { name: /^Back to/ })).toBeNull();
  expect(screen.getByRole("main")).toHaveAttribute("id", "student-content");
});

it("restores the saved rail preference", () => {
  localStorage.setItem("samvaad-navigation-compact", "true");
  render(
    <StudentShell>
      <h1>Home</h1>
    </StudentShell>
  );
  expect(screen.getByRole("button", { name: "Expand navigation" })).toHaveAttribute(
    "aria-expanded",
    "false"
  );
});
it("keeps navigation usable when saving the preference is blocked", () => {
  const setter = vi.spyOn(localStorage, "setItem").mockImplementation(() => {
    throw new Error("blocked");
  });
  render(
    <StudentShell>
      <h1>Home</h1>
    </StudentShell>
  );
  fireEvent.click(screen.getByRole("button", { name: "Collapse navigation" }));
  expect(screen.getByRole("button", { name: "Expand navigation" })).toBeInTheDocument();
  setter.mockRestore();
});
it("opens all features from the bottom bar and resets expanded state on close", () => {
  render(
    <StudentShell>
      <h1>Home</h1>
    </StudentShell>
  );
  const more = screen.getByRole("button", { name: "More features" });
  fireEvent.click(more);
  expect(more).toHaveAttribute("aria-expanded", "true");
  const dialog = screen.getByRole("dialog", { name: "Your workspace" });
  expect(dialog).toHaveAttribute("id", more.getAttribute("aria-controls"));
  expect(within(dialog).getByRole("link", { name: "Resume" })).toHaveAttribute(
    "href",
    "/ai-resume"
  );
  fireEvent.click(within(dialog).getByRole("button", { name: "Close navigation" }));
  expect(more).toHaveAttribute("aria-expanded", "false");
});

it.each([
  ["/pronunciation-practice", "Practice"],
  ["/report-summary", "History"],
])("keeps the parent section selected on %s", (path, label) => {
  fixture.path = path;
  render(
    <StudentShell>
      <h1>Task</h1>
    </StudentShell>
  );
  const nav = screen.getByRole("navigation", { name: "Student navigation" });
  expect(within(nav).getByRole("link", { name: label })).toHaveAttribute("aria-current", "page");
  const bottom = screen.getByRole("navigation", { name: "Bottom Navigation" });
  expect(
    within(bottom).getByRole("link", { name: `Go to ${label.toLowerCase()}` })
  ).toHaveAttribute("aria-current", "page");
});
