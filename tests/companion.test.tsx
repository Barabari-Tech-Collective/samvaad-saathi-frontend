import React from "react";
import { act, renderHook, render, screen, fireEvent } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCompanionPreferences } from "@/hooks/useCompanionPreferences";
import { companionActivity } from "@/lib/interview-companion";
import PracticeCompanion from "@/components/companion/PracticeCompanion";

const originalStorage = Object.getOwnPropertyDescriptor(window, "localStorage");
beforeEach(() => {
  const values = new Map<string, string>();
  const storage: Storage = {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
    removeItem: (key) => {
      values.delete(key);
    },
    key: (index) => [...values.keys()][index] ?? null,
  };
  Object.defineProperty(window, "localStorage", { configurable: true, value: storage });
});
afterEach(() => {
  vi.restoreAllMocks();
  if (originalStorage) Object.defineProperty(window, "localStorage", originalStorage);
});
const baseline = {
  connected: true,
  answer: "idle" as const,
  speech: "idle" as const,
  working: false,
  saved: false,
};
describe("honest companion activity", () => {
  it("only shows microphone-on when actually recording", () => {
    expect(companionActivity({ ...baseline, answer: "recording" }).state).toBe("listening");
    for (const answer of ["idle", "requesting", "saving", "failed", "saved"] as const) {
      expect(companionActivity({ ...baseline, answer }).state).not.toBe("listening");
    }
  });
  it("does not pretend to listen or save while offline", () => {
    const result = companionActivity({ ...baseline, answer: "recording", connected: false });
    expect(result.state).toBe("reconnecting");
    expect(result.text).not.toContain("saved");
  });
  it("distinguishes actual speech from preparing audio", () => {
    expect(companionActivity({ ...baseline, speech: "preparing" }).text).toContain(
      "Preparing question audio"
    );
    expect(companionActivity({ ...baseline, speech: "speaking" }).state).toBe("speaking");
  });
  it("does not imply evidence exists before server acknowledgement", () => {
    expect(companionActivity(baseline).text).not.toContain("saved");
    expect(companionActivity({ ...baseline, saved: true }).text).toContain("Answer saved");
    expect(companionActivity({ ...baseline, answer: "saving", saved: true }).text).toContain(
      "Saving"
    );
  });
  it("does not invite recording while session controls are paused", () => {
    expect(companionActivity({ ...baseline, blocked: true }).text).toContain("paused");
    expect(companionActivity({ ...baseline, answer: "recording", blocked: true }).state).toBe(
      "listening"
    );
  });
  it("keeps microphone permission separate from recording", () => {
    expect(companionActivity({ ...baseline, answer: "requesting" }).text).toContain("permission");
  });
});

describe("account-owned presentation preferences", () => {
  it("restores mute before allowing practice question speech", () => {
    window.localStorage.setItem(
      "samvaad-companion:v1:1",
      JSON.stringify({ version: 1, hidden: true, muted: true, motion: false })
    );
    const { result } = renderHook(() => useCompanionPreferences("1"));
    expect(result.current.preferences).toEqual({
      ready: true,
      hidden: true,
      muted: true,
      motion: false,
    });
  });
  it("isolates account switches and persists only preference fields", () => {
    const { result, rerender } = renderHook(({ scope }) => useCompanionPreferences(scope), {
      initialProps: { scope: "1" },
    });
    act(() => result.current.update({ muted: true, hidden: true }));
    rerender({ scope: "2" });
    expect(result.current.preferences.muted).toBe(false);
    act(() => result.current.update({ motion: false }));
    rerender({ scope: "1" });
    expect(result.current.preferences.muted).toBe(true);
    expect(
      Object.keys(JSON.parse(window.localStorage.getItem("samvaad-companion:v1:1")!)).sort()
    ).toEqual(["hidden", "motion", "muted", "version"]);
  });
  it("does not create anonymous preference records", () => {
    const { result } = renderHook(() => useCompanionPreferences(null));
    act(() => result.current.update({ muted: true }));
    expect(result.current.preferences.ready).toBe(false);
    expect(window.localStorage.length).toBe(0);
  });
  it("ignores malformed and unsupported stored values", () => {
    window.localStorage.setItem(
      "samvaad-companion:v1:1",
      JSON.stringify({ version: 9, hidden: "yes", muted: true })
    );
    const { result } = renderHook(() => useCompanionPreferences("1"));
    expect(result.current.preferences.muted).toBe(false);
  });
  it("keeps in-view choices if storage writes fail but reads work", () => {
    vi.spyOn(window.localStorage, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    const { result } = renderHook(() => useCompanionPreferences("1"));
    act(() => result.current.update({ muted: true }));
    expect(result.current.preferences.muted).toBe(true);
    act(() => result.current.update({ hidden: true }));
    expect(result.current.preferences.muted).toBe(true);
    expect(result.current.preferences.hidden).toBe(true);
  });
  it("stays usable when storage is blocked entirely", () => {
    vi.spyOn(window.localStorage, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(window.localStorage, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const { result } = renderHook(() => useCompanionPreferences("1"));
    act(() => result.current.update({ muted: true }));
    expect(result.current.preferences.muted).toBe(true);
  });
  it("synchronizes same-account instances without leaking into another account", () => {
    const first = renderHook(() => useCompanionPreferences("1"));
    const second = renderHook(() => useCompanionPreferences("1"));
    const other = renderHook(() => useCompanionPreferences("2"));
    act(() => first.result.current.update({ hidden: true }));
    expect(second.result.current.preferences.hidden).toBe(true);
    expect(other.result.current.preferences.hidden).toBe(false);
  });
  it("reacts to cross-tab changes and clearing", () => {
    const { result } = renderHook(() => useCompanionPreferences("1"));
    act(() => {
      window.localStorage.setItem(
        "samvaad-companion:v1:1",
        JSON.stringify({ version: 1, hidden: true, muted: false, motion: false })
      );
      window.dispatchEvent(new StorageEvent("storage", { key: "samvaad-companion:v1:1" }));
    });
    expect(result.current.preferences.hidden).toBe(true);
    act(() => {
      window.localStorage.clear();
      window.dispatchEvent(new StorageEvent("storage", { key: null }));
    });
    expect(result.current.preferences.hidden).toBe(false);
  });
});

it("hides the face without removing audio or recovery controls", () => {
  function Example() {
    const controls = useCompanionPreferences("1");
    return (
      <PracticeCompanion
        controls={{ ...controls, speech: "idle" }}
        answer="idle"
        working={false}
        saved={false}
      />
    );
  }
  render(<Example />);
  fireEvent.click(screen.getByRole("button", { name: "Hide Saathi" }));
  expect(screen.queryByText("Your practice companion")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Mute question audio" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Show Saathi" }));
  expect(screen.getByText("Your practice companion")).toBeInTheDocument();
});
