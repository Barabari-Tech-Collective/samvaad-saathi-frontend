import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { WorkspaceGuide, guideStorageKey } from "@/components/guides/WorkspaceGuide";
const steps = [
  { title: "Start here", body: "A helpful first step", target: "#missing-target" },
  { title: "Your progress", body: "Return any time" },
];
beforeEach(() => {
  vi.useFakeTimers();
  const records = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => records.get(key) ?? null,
    setItem: (key: string, value: string) => records.set(key, value),
  });
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
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
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
    fireEvent.click(screen.getByText("Start guide"));
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
    fireEvent.click(screen.getByText("Start guide"));
    fireEvent.click(screen.getByText("Skip guide"));
    first.unmount();
    render(<WorkspaceGuide storageKey="guide-skipped-test" steps={steps} />);
    act(() => vi.advanceTimersByTime(700));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
  it("Escape dismisses rather than trapping the user", () => {
    render(<WorkspaceGuide storageKey="guide-escape-test" steps={steps} />);
    act(() => vi.advanceTimersByTime(700));
    fireEvent.click(screen.getByText("Start guide"));
    fireEvent(screen.getByRole("dialog"), new Event("cancel", { cancelable: true }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

it("invites without taking focus and Not now keeps replay available", () => {
  render(
    <>
      <input aria-label="Your work" />
      <WorkspaceGuide storageKey="guide-no-interruption" steps={steps} />
    </>
  );
  const input = screen.getByRole("textbox");
  input.focus();
  act(() => vi.advanceTimersByTime(700));
  expect(input).toHaveFocus();
  expect(screen.queryByRole("dialog")).toBeNull();
  fireEvent.click(screen.getByText("Not now"));
  expect(screen.queryByRole("complementary")).toBeNull();
  act(() => vi.advanceTimersByTime(20));
  expect(screen.getByText("Quick guide")).toHaveFocus();
});
it("handles invalid anchors, malformed preferences and blocked storage", () => {
  localStorage.setItem("guide-invalid-storage", "[bad json");
  const view = render(
    <WorkspaceGuide
      storageKey="guide-invalid-storage"
      steps={[{ title: "Still useful", body: "Read this", target: "[" }]}
    />
  );
  act(() => vi.advanceTimersByTime(700));
  fireEvent.click(screen.getByText("Start guide"));
  expect(screen.getByRole("dialog")).toBeVisible();
  const blocked = vi.spyOn(localStorage, "setItem").mockImplementation(() => {
    throw new Error("blocked");
  });
  fireEvent.click(screen.getByText("Got it"));
  blocked.mockRestore();
  view.unmount();
  render(<WorkspaceGuide storageKey="guide-invalid-storage" steps={steps} />);
  act(() => vi.advanceTimersByTime(700));
  expect(screen.queryByText("Start guide")).toBeNull();
});
it("closes an old session when account or permitted steps change", () => {
  const view = render(<WorkspaceGuide storageKey="guide-role-old" steps={steps} />);
  fireEvent.click(screen.getByText("Quick guide"));
  fireEvent.click(screen.getByText("Next"));
  view.rerender(<WorkspaceGuide storageKey="guide-role-old" steps={[steps[0]]} />);
  expect(screen.queryByRole("dialog")).toBeNull();
  fireEvent.click(screen.getByText("Quick guide"));
  expect(screen.getByText("Step 1 of 1")).toBeVisible();
  view.rerender(<WorkspaceGuide storageKey="guide-role-new" steps={steps} />);
  expect(screen.queryByRole("dialog")).toBeNull();
});
it("hides an invitation when another tab records completion", () => {
  render(<WorkspaceGuide storageKey="guide-other-tab" steps={steps} />);
  act(() => vi.advanceTimersByTime(700));
  localStorage.setItem("guide-other-tab", JSON.stringify({ outcome: "completed" }));
  fireEvent(window, new StorageEvent("storage", { key: "guide-other-tab" }));
  expect(screen.queryByText("Start guide")).toBeNull();
  fireEvent.click(screen.getByText("Quick guide"));
  expect(screen.getByRole("dialog")).toBeVisible();
});
it("does not open on top of another task modal", () => {
  render(
    <>
      <div role="dialog" aria-modal="true" aria-label="Edit assignment" />
      <WorkspaceGuide storageKey="guide-other-modal" steps={steps} />
    </>
  );
  fireEvent.click(screen.getByText("Quick guide"));
  expect(screen.getAllByRole("dialog")).toHaveLength(1);
});
it("cleans highlights and accepts an empty guide after permission removal", () => {
  const view = render(<WorkspaceGuide storageKey="guide-empty-permissions" steps={steps} />);
  fireEvent.click(screen.getByText("Quick guide"));
  view.rerender(<WorkspaceGuide storageKey="guide-empty-permissions" steps={[]} />);
  expect(screen.queryByRole("button")).toBeNull();
});
