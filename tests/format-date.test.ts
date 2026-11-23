import { describe, expect, it } from "vitest";
import { formatDate } from "../src/lib/utils";

describe("formatDate", () => {
  it("writes the date without a stray space before the year", () => {
    expect(formatDate("2026-11-20T10:00:00")).toBe("20 Nov 2026");
  });
});
