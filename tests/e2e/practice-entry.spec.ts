import { expect, test } from "@playwright/test";
import { practiceHub } from "../fixtures/practice-hub";

test.beforeEach(async ({ page }) => {
  await page.route("**/api/v2/coaching-assignments/me?*", (route) =>
    route.fulfill({ json: { items: [], total: 0, notice: "Client-reported speaking practice." } })
  );
});

for (const viewport of [
  { width: 320, height: 740 },
  { width: 1280, height: 800 },
  { width: 740, height: 320 },
]) {
  test(`saved practice entry fits ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const hub = practiceHub();
    hub.resume!.track = "VeryLongUnbrokenTrackName".repeat(12);
    await page.route("**/api/practice/hub", (route) => route.fulfill({ json: hub }));
    await page.goto("/?fixture=practice-hub");
    await expect(page.getByRole("link", { name: "Continue Mock Interview" })).toHaveAttribute(
      "href",
      "/interview?interviewId=42&resumed=true&interviewMode=practice"
    );
    await expect(page.getByText(/2 of 5 answers are saved/)).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true
    );
    await page.getByRole("link", { name: "Continue Mock Interview" }).focus();
    await expect(page.getByRole("link", { name: "Continue Mock Interview" })).toBeFocused();
  });
}

test("an expired saved session cannot remain the continue action", async ({ page }) => {
  const hub = practiceHub();
  hub.resume!.expiresAt = new Date(Date.now() + 3500).toISOString();
  await page.route("**/api/practice/hub", (route) => route.fulfill({ json: hub }));
  await page.goto("/?fixture=practice-hub");
  await page.getByRole("link", { name: "Continue Mock Interview" }).waitFor();
  await expect(page.getByText(/can no longer be continued/)).toBeVisible();
  await expect(page.getByRole("link", { name: "Continue Mock Interview" })).toHaveCount(0);
});

for (const readiness of [
  "preparing",
  "enrollment_revoked",
  "enrollment_unverified",
  "plan_unavailable",
] as const) {
  test(`saved session readiness ${readiness} preserves recovery without a continue link`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 740 });
    const hub = practiceHub();
    hub.resume!.readiness = readiness;
    if (readiness === "plan_unavailable") {
      hub.resume!.answeredQuestions = null;
      hub.resume!.totalQuestions = null;
    }
    await page.route("**/api/practice/hub", (route) => route.fulfill({ json: hub }));
    await page.goto("/?fixture=practice-hub");
    await expect(page.getByRole("link", { name: "Open in Progress" })).toHaveAttribute(
      "href",
      "/history"
    );
    await expect(page.getByRole("link", { name: "Continue Mock Interview" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Begin mock interview" })).toHaveCount(0);
    await expect(page.getByText(/2 of 5 answers are saved/)).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Check again" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true
    );
  });
}

test("restoring course readiness re-enables the original saved session", async ({ page }) => {
  let restored = false;
  await page.route("**/api/practice/hub", (route) => {
    const hub = practiceHub();
    if (!restored) hub.resume!.readiness = "enrollment_revoked";
    return route.fulfill({ json: hub });
  });
  await page.goto("/?fixture=practice-hub");
  await expect(page.getByRole("heading", { name: "Check your course" })).toBeVisible();
  restored = true;
  await page.getByRole("button", { name: "Check again" }).click();
  await expect(page.getByRole("link", { name: "Continue Mock Interview" })).toHaveAttribute(
    "href",
    "/interview?interviewId=42&resumed=true&interviewMode=practice"
  );
});
