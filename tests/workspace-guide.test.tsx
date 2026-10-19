import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { WorkspaceGuide, guideStorageKey } from "@/components/guides/WorkspaceGuide";
const steps = [
  { title: "Start here", body: "A helpful first step", target: "#missing-target" },
  { title: "Your progress", body: "Return any time" },
];
beforeEach(() => {
  vi.useFakeTimers();
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.open = true;
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, "close", {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.open = false;
    },
  });
});
afterEach(() => vi.useRealTimers());
describe("workspace guides", () => {
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
  it("can finish despite a missing tooltip target and replay the guide", () => {
    render(<WorkspaceGuide storageKey="guide-complete-test" steps={steps} />);
    act(() => vi.advanceTimersByTime(700));
    expect(screen.getByRole("dialog")).toBeVisible();
    fireEvent.click(screen.getByText("Next"));
    expect(screen.getByText("Your progress")).toBeVisible();
    fireEvent.click(screen.getByText("Got it"));
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByText("Quick guide"));
    expect(screen.getByText("Start here")).toBeVisible();
  });
  it("remembers skipped guides across component mounts", () => {
    const first = render(<WorkspaceGuide storageKey="guide-skipped-test" steps={steps} />);
    act(() => vi.advanceTimersByTime(700));
    fireEvent.click(screen.getByText("Skip guide"));
    first.unmount();
    render(<WorkspaceGuide storageKey="guide-skipped-test" steps={steps} />);
    act(() => vi.advanceTimersByTime(700));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
  it("Escape dismisses rather than trapping the user", () => {
    render(<WorkspaceGuide storageKey="guide-escape-test" steps={steps} />);
    act(() => vi.advanceTimersByTime(700));
    fireEvent(screen.getByRole("dialog"), new Event("cancel", { cancelable: true }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
