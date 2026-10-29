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
    await expect(page.getByRole("link", { name: "Continue saved interview" })).toHaveAttribute(
      "href",
      "/interview?interviewId=42&resumed=true&interviewMode=practice"
    );
    await expect(page.getByText(/2 of 5 answers are saved/)).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true
    );
    await page.getByRole("link", { name: "Continue saved interview" }).focus();
    await expect(page.getByRole("link", { name: "Continue saved interview" })).toBeFocused();
  });
}

test("failed refresh removes cached progress, then retry restores the verified action", async ({
  page,
}) => {
  let phase = "ready";
  let release: (() => void) | undefined;
  await page.route("**/api/practice/hub", async (route) => {
    if (phase === "refresh")
      await new Promise<void>((resolve) => {
        release = resolve;
      });
    if (phase === "revoked")
      return route.fulfill({
        status: 403,
        json: { detail: "Current access could not be verified." },
      });
    return route.fulfill({ json: practiceHub() });
  });
  await page.goto("/?fixture=practice-hub");
  await page.getByRole("link", { name: "Continue saved interview" }).waitFor();
  phase = "refresh";
  await page.evaluate(() => window.dispatchEvent(new Event("practice-test-refresh")));
  await expect(
    page.getByText("Checking your latest coach plan. Your saved answers are retained.")
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Continue saved interview" })).toHaveCount(0);
  phase = "revoked";
  await expect.poll(() => !!release).toBe(true);
  release!();
  await expect(page.getByRole("link", { name: "Find saved interviews" })).toBeVisible();
  await expect(page.getByText(/2 of 5 answers are saved/)).toHaveCount(0);
  await expect(page.getByRole("progressbar")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Warm-up chat" })).toBeVisible();
  phase = "ready";
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByRole("link", { name: "Continue saved interview" })).toBeVisible();
});

test("account change clears another student's progress while the new plan loads", async ({
  page,
}) => {
  let account = "1";
  let release: (() => void) | undefined;
  await page.route("**/api/practice/hub", async (route) => {
    if (account === "2")
      await new Promise<void>((resolve) => {
        release = resolve;
      });
    const hub = practiceHub();
    if (account === "2") hub.resume = null;
    return route.fulfill({ json: hub });
  });
  await page.goto("/?fixture=practice-hub");
  await page.getByRole("link", { name: "Continue saved interview" }).waitFor();
  account = "2";
  await page.evaluate(() =>
    window.dispatchEvent(new CustomEvent("practice-test-account", { detail: "2" }))
  );
  await expect(page.getByRole("link", { name: "Continue saved interview" })).toHaveCount(0);
  await expect(page.getByText(/2 of 5 answers are saved/)).toHaveCount(0);
  await expect.poll(() => !!release).toBe(true);
  release!();
  await expect(page.getByRole("link", { name: "Begin mock interview" })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Aarav/ })).toBeVisible();
});

test("an expired saved session cannot remain the continue action", async ({ page }) => {
  const hub = practiceHub();
  hub.resume!.expiresAt = new Date(Date.now() + 3500).toISOString();
  await page.route("**/api/practice/hub", (route) => route.fulfill({ json: hub }));
  await page.goto("/?fixture=practice-hub");
  await page.getByRole("link", { name: "Continue saved interview" }).waitFor();
  await expect(page.getByText(/resume window has ended/)).toBeVisible();
  await expect(page.getByRole("link", { name: "Continue saved interview" })).toHaveCount(0);
});

test("a new student's verified zero state differs from malformed data", async ({ page }) => {
  let malformed = false;
  await page.route("**/api/practice/hub", (route) => {
    const hub = practiceHub();
    hub.resume = null;
    hub.activity = { practiceDaysStreak: 0, completedMocksThisWeek: 0, completedDrillsThisWeek: 0 };
    return route.fulfill({ json: malformed ? { ...hub, focusEvidenceRequired: 0 } : hub });
  });
  await page.goto("/?fixture=practice-hub");
  await expect(page.getByText("0 interviews · 0 skill rounds this week")).toBeVisible();
  await expect(page.getByRole("link", { name: "Begin mock interview" })).toBeVisible();
  malformed = true;
  await page.evaluate(() => window.dispatchEvent(new Event("practice-test-refresh")));
  await expect(page.getByRole("link", { name: "Find saved interviews" })).toBeVisible();
  await expect(page.getByText("0 interviews · 0 skill rounds this week")).toHaveCount(0);
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
    await expect(page.getByRole("link", { name: "View saved session" })).toHaveAttribute(
      "href",
      "/history"
    );
    await expect(page.getByRole("link", { name: "Continue saved interview" })).toHaveCount(0);
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
  await expect(page.getByRole("heading", { name: "Check your course enrollment" })).toBeVisible();
  restored = true;
  await page.getByRole("button", { name: "Check again" }).click();
  await expect(page.getByRole("link", { name: "Continue saved interview" })).toHaveAttribute(
    "href",
    "/interview?interviewId=42&resumed=true&interviewMode=practice"
  );
});
