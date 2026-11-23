import { describe, expect, it } from "vitest";
import { startRefusalMessage } from "@/lib/start-refusal";

describe("start interview refusals", () => {
  it("tells the student to wait, not retry, when the hourly limit is hit", () => {
    expect(startRefusalMessage(429)).toMatch(/wait/i);
    expect(startRefusalMessage(429)).not.toMatch(/try again/);
  });
  it("sends an expired sign-in back to sign-in", () => {
    expect(startRefusalMessage(401)).toMatch(/sign in again/i);
  });
  it("gives every refusal its own message", () => {
    const messages = [400, 401, 403, 404, 429].map(startRefusalMessage);
    expect(new Set(messages).size).toBe(5);
  });
});
