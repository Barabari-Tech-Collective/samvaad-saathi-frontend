import { expect, test } from "@playwright/test";

test("student follow-up links to its speaking drill and preserves the receipt across a failed save", async ({
  page,
}) => {
  const bodies: Record<string, unknown>[] = [];
  await page.route("**/api/v2/coaching-assignments/me**", (route) => {
    if (route.request().url().includes("/me/12"))
      return route.fulfill({ json: { id: 12, module: "warm_up", status: "assigned" } });
    return route.fulfill({
      json: {
        items: [
          {
            id: 12,
            course_id: "course-a",
            module: "warm_up",
            reason: "Prepare a clearer introduction",
            note: null,
            due_date: null,
            status: "assigned",
          },
        ],
        total: 1,
        notice: "Practice activity is not a verified score.",
      },
    });
  });
  await page.route("**/api/practice/drills/complete", (route) => {
    bodies.push(route.request().postDataJSON());
    return route.fulfill({
      status: bodies.length === 1 ? 503 : 200,
      json:
        bodies.length === 1
          ? { detail: "Temporary save failure" }
          : {
              assignmentId: 12,
              completionId: 21,
              created: true,
              completedAt: new Date().toISOString(),
            },
    });
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?fixture=assignments");
  await expect(page.getByRole("link", { name: "Start assigned practice" })).toHaveAttribute(
    "href",
    "/warm-up-chat?assignment=12"
  );
  await page.goto("/?fixture=drill&assignment=12");
  await page.getByRole("button", { name: "Start practice", exact: true }).click();
  await expect(page.getByText("Recording now")).toBeVisible();
  await page.waitForTimeout(1400);
  await page.getByRole("button", { name: "Finish answer" }).click();
  await page.getByRole("button", { name: "Complete this practice" }).click();
  await expect(page.getByRole("alert")).toContainText("completion could not be confirmed");
  await page.getByRole("button", { name: "Retry saving assignment completion" }).click();
  await expect(page.getByRole("heading", { name: "Assignment complete" })).toBeVisible();
  expect(bodies).toHaveLength(2);
  expect(bodies[0]).toEqual(bodies[1]);
  expect(bodies[0].assignmentId).toBe(12);
  expect(bodies[0].evidenceKind).toBe("audio");
  await expect(page.getByRole("button", { name: "Practise again" })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
