import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { guideStorageKey, WorkspaceGuide } from "@/components/guides/WorkspaceGuide";

const push = vi.fn();
let pathname = "/home";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  usePathname: () => pathname,
}));

const steps = [
  { title: "Start here", body: "A helpful first step" },
  {
    title: "Your progress",
    body: "Return any time",
    href: "/history",
    target: "#history-link",
    optional: true,
  },
  {
    title: "Missing page",
    body: "Not for this account",
    href: "/nope",
    target: "#not-there",
    optional: true,
  },
  { title: "All set", body: "Replay any time" },
];

const memory = () => {
  const records = new Map<string, string>();
  return {
    getItem: (key: string) => records.get(key) ?? null,
    setItem: (key: string, value: string) => void records.set(key, value),
    removeItem: (key: string) => void records.delete(key),
  };
};

beforeEach(() => {
  vi.useFakeTimers();
  pathname = "/home";
  push.mockClear();
  vi.stubGlobal("localStorage", memory());
  vi.stubGlobal("sessionStorage", memory());
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  // Remove only what a test added; the tour itself is drawn on the page body by a portal.
  document.getElementById("history-link")?.remove();
});

describe("workspace tour", () => {
  it("scopes persistence to account, role, workspace and version", () => {
    const base = guideStorageKey("1", "student", "student", 1);
    for (const key of [
      guideStorageKey("2", "student", "student", 1),
      guideStorageKey("1", "operator", "student", 1),
      guideStorageKey("1", "student", "creator", 1),
      guideStorageKey("1", "student", "student", 2),
    ])
      expect(key).not.toBe(base);
  });

  it("walks the steps, opens the page for a step, and skips pages this account lacks", () => {
    document.body.insertAdjacentHTML(
      "beforeend",
      '<a id="history-link" href="/history">History</a>'
    );
    // jsdom has no layout; report the history link as visible and everything else as not.
    vi.spyOn(HTMLElement.prototype, "getClientRects").mockImplementation(function (
      this: HTMLElement
    ) {
      return (this.id === "history-link" ? [{}] : []) as unknown as DOMRectList;
    });
    render(<WorkspaceGuide storageKey="tour-walk" steps={steps} />);
    act(() => vi.advanceTimersByTime(700));
    fireEvent.click(screen.getByText("Start guide"));
    expect(screen.getByRole("dialog")).toHaveAttribute("aria-modal", "false");
    // "Missing page" cannot be shown to this account, so it is not counted.
    expect(screen.getByText("Step 1 of 3")).toBeVisible();
    fireEvent.click(screen.getByText("Next"));
    expect(screen.getByText("Your progress")).toBeVisible();
    // The tour opens the page the step is about.
    expect(push).toHaveBeenCalledWith("/history");
    fireEvent.click(screen.getByText("Next"));
    // "Missing page" has no target on screen, so the tour moves straight to the last step.
    expect(screen.queryByText("Missing page")).toBeNull();
    expect(screen.getByText("All set")).toBeVisible();
    fireEvent.click(screen.getByText("Got it"));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("remembers a skipped tour and keeps replay available", () => {
    const first = render(<WorkspaceGuide storageKey="tour-skip" steps={steps} />);
    act(() => vi.advanceTimersByTime(700));
    fireEvent.click(screen.getByText("Start guide"));
    fireEvent.click(screen.getByText("Skip guide"));
    first.unmount();
    render(<WorkspaceGuide storageKey="tour-skip" steps={steps} />);
    act(() => vi.advanceTimersByTime(700));
    expect(screen.queryByText("Take a one-minute tour.")).toBeNull();
    fireEvent.click(screen.getByText("Quick guide"));
    expect(screen.getByText("Start here")).toBeVisible();
  });

  it("Escape ends the tour instead of trapping the person", () => {
    render(<WorkspaceGuide storageKey="tour-escape" steps={steps} />);
    act(() => vi.advanceTimersByTime(700));
    fireEvent.click(screen.getByText("Start guide"));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("invites without taking focus", () => {
    render(
      <>
        <input aria-label="Your work" />
        <WorkspaceGuide storageKey="tour-invite" steps={steps} />
      </>
    );
    const input = screen.getByRole("textbox");
    input.focus();
    act(() => vi.advanceTimersByTime(700));
    expect(input).toHaveFocus();
    expect(screen.getByText("Take a one-minute tour.")).toBeVisible();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("is not offered where help would interrupt work", () => {
    render(<WorkspaceGuide storageKey="tour-quiet" steps={steps} offerHere={false} />);
    act(() => vi.advanceTimersByTime(700));
    expect(screen.queryByText("Quick guide")).toBeNull();
    expect(screen.queryByText("Take a one-minute tour.")).toBeNull();
  });
});
