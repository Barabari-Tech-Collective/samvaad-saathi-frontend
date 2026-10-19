import { describe, expect, it } from "vitest";
import { createdInterview, publishedQuestionCount } from "@/lib/interview-entry";
const response = { interviewId: 9, interviewMode: "assessment", plannedQuestionCount: 5 };
describe("new sitting contract", () => {
  it("accepts canonical numeric and string IDs with exact purpose and N", () => {
    expect(createdInterview(response, "assessment", 5)).toBe("9");
    expect(createdInterview({ ...response, interviewId: "9" }, "assessment", 5)).toBe("9");
  });
  it.each([
    null,
    {},
    { ...response, interviewId: 0 },
    { ...response, interviewId: 1.5 },
    { ...response, interviewId: "01" },
    { ...response, interviewId: Number.MAX_SAFE_INTEGER + 1 },
    { ...response, interviewMode: "practice" },
    { ...response, interviewMode: undefined },
    { ...response, plannedQuestionCount: 4 },
    { ...response, plannedQuestionCount: "5" },
  ])("rejects unverified creation response %j", (data) =>
    expect(() => createdInterview(data, "assessment", 5)).toThrow()
  );
  it.each([null, undefined, 0, -1, 51, 1.5, "5", true, Infinity, NaN])(
    "does not invent a published question count from %j",
    (count) => expect(publishedQuestionCount(count)).toBeNull()
  );
  it("accepts the supported published boundaries", () => {
    expect(publishedQuestionCount(1)).toBe(1);
    expect(publishedQuestionCount(50)).toBe(50);
  });
});
