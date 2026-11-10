import { expect, it } from "vitest";
import { courseAccessMessage } from "@/lib/interview-course-access";
it("distinguishes enrollment verification from revocation and ignores unrelated errors", () => {
  expect(
    courseAccessMessage({ response: { data: { detail: { code: "COURSE_ACCESS_UNVERIFIED" } } } })
  ).toContain("confirm your course");
  expect(
    courseAccessMessage({ response: { data: { detail: { code: "COURSE_ACCESS_REVOKED" } } } })
  ).toContain("Your answers are safe");
  expect(courseAccessMessage(new Error("Offline"))).toBeNull();
  expect(
    courseAccessMessage({ response: { data: { detail: "Unexpected server error" } } })
  ).toBeNull();
});
