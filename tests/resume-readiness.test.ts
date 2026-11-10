import { expect, it } from "vitest";
import { assertResumeDataSaved } from "@/lib/resume-readiness";
it("accepts confirmed readable data for this upload", () => {
  expect(() => assertResumeDataSaved({ saved: true, textLength: 120 })).not.toThrow();
});
it("rejects persistence failure even with readable text and suppresses backend details", () => {
  expect(() =>
    assertResumeDataSaved({ saved: false, textLength: 120, saveError: "private SQL" })
  ).toThrow("couldn't save your resume");
});
it.each([
  undefined,
  null,
  {},
  { saved: "true", textLength: 10 },
  { saved: true },
  { saved: true, textLength: "10" },
  { saved: true, textLength: 1.5 },
])("does not treat malformed receipt %j as readiness", (value) => {
  expect(() => assertResumeDataSaved(value)).toThrow("not sure your resume saved");
});
it.each([0, -1])("rejects non-readable extraction length %i", (textLength) => {
  expect(() => assertResumeDataSaved({ saved: true, textLength })).toThrow("No readable text");
});
