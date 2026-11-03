import { afterEach, expect, it, vi } from "vitest";
import {
  clearInterviewQuestions,
  getInterviewQuestions,
  setInterviewQuestions,
} from "@/lib/interview-session-storage";
import { clearPacingRequestKey } from "@/lib/pacing-practice/creation-receipt";

afterEach(() => vi.unstubAllGlobals());

it("treats the interview question cache as optional when local storage is unavailable", () => {
  vi.stubGlobal("localStorage", {
    getItem: () => {
      throw new Error("blocked");
    },
    setItem: () => {
      throw new Error("blocked");
    },
    removeItem: () => {
      throw new Error("blocked");
    },
  });

  expect(() => setInterviewQuestions(14, [{ id: 1 }])).not.toThrow();
  expect(getInterviewQuestions(14)).toBeNull();
  expect(() => clearInterviewQuestions(14)).not.toThrow();
});

it("does not turn a completed pacing session into a failed navigation when storage disappears", () => {
  vi.stubGlobal("sessionStorage", {
    getItem: () => {
      throw new Error("blocked");
    },
    removeItem: () => {
      throw new Error("blocked");
    },
  });

  expect(() => clearPacingRequestKey("learner-1", 1, "request-key")).not.toThrow();
});
