import { describe, expect, it } from "vitest";
import {
  confidenceCopy,
  questionEvidenceCopy,
  reportStatusCopy,
  safeDrillHref,
} from "@/lib/practice-report";

describe("Practice report presentation rules", () => {
  it("explains insufficient evidence without calling it a failure", () => {
    expect(reportStatusCopy("insufficient_evidence")).toBe("More evidence needed");
    expect(confidenceCopy("insufficient")).toContain("Not enough evidence");
  });

  it("uses plain-language question evidence labels", () => {
    expect(questionEvidenceCopy("needs_review")).toBe("Analysis pending");
    expect(questionEvidenceCopy("insufficient")).toBe("Not enough speech");
  });

  it("allows only real Practice drill routes", () => {
    expect(safeDrillHref("/control-your-pace")).toBe("/control-your-pace");
    expect(safeDrillHref("https://malicious.example")).toBe("/practice");
    expect(safeDrillHref("/missing-drill")).toBe("/practice");
  });
});
