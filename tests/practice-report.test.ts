import { describe, expect, it } from "vitest";
import {
  confidenceCopy,
  questionEvidenceCopy,
  reportStatusCopy,
  safeDrillHref,
} from "@/lib/practice-report";

describe("Practice report presentation rules", () => {
  it("explains insufficient evidence without calling it a failure", () => {
    expect(reportStatusCopy("insufficient_evidence")).toBe("A few more answers needed");
    expect(confidenceCopy("insufficient")).toContain("Not enough to give a score");
  });

  it("uses plain-language question evidence labels", () => {
    expect(questionEvidenceCopy("needs_review")).toBe("Analysis pending");
    expect(questionEvidenceCopy("insufficient")).toBe("Not enough speech");
  });

  it("allows only real Practice drill routes", () => {
    expect(safeDrillHref("/control-your-pace")).toBe("/control-your-pace");
    expect(safeDrillHref("https://malicious.example")).toBe("/coaching");
    expect(safeDrillHref("/missing-drill")).toBe("/coaching");
  });
});
