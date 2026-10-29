import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
const row = {
  id: 7,
  interview_id: 42,
  state: "decided",
  outcome: "concern",
  version: 3,
  can_appeal: true,
  can_explain: false,
  appeal_deadline: "2026-12-01T12:00:00Z",
  history: [
    {
      kind: "decide",
      reason: "Shared human observation requires review.",
      at: "2026-10-21T10:00:00Z",
      outcome: "concern",
    },
  ],
};
test("Learner appeal is explicit, retry-safe and accessible", async ({ page }) => {
  let body: unknown;
  let count = 0;
  await page.route("**/api/v2/integrity/me/cases**", async (route) => {
    if (route.request().method() === "POST") {
      body = route.request().postDataJSON();
      count++;
      await route.fulfill({ status: 503, json: { detail: "Uncertain connection" } });
    } else
      await route.fulfill({
        json: { items: [row], total: 1, notice: "Formal assessment review only." },
      });
  });
  await page.goto("/?fixture=integrity");
  await expect(page.getByRole("heading", { name: "Assessment reviews and appeals" })).toBeVisible();
  await page
    .getByLabel("Your explanation (10–2,000 characters)")
    .fill("My connection dropped and I would like an independent review.");
  await page.getByRole("button", { name: "Submit appeal", exact: true }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  const first = body as { request_key: string };
  await page.getByRole("button", { name: "Submit appeal", exact: true }).click();
  await expect.poll(() => count).toBe(2);
  expect((body as { request_key: string }).request_key).toBe(first.request_key);
  expect((body as { action: string }).action).toBe("appeal");
  await expect(page.getByRole("button", { name: "Submit appeal", exact: true })).toBeEnabled();
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    await Promise.all(
      document
        .getAnimations()
        .filter(
          (animation) =>
            animation.effect?.getComputedTiming().iterations !== Number.POSITIVE_INFINITY
        )
        .map((animation) => animation.finished.catch(() => undefined))
    );
  });
  const scan = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(scan.violations).toEqual([]);
});
test("Revoked or failed reads hide old evidence", async ({ page }) => {
  let revoked = false;
  await page.route("**/api/v2/integrity/me/cases**", (route) =>
    route.fulfill(
      revoked
        ? { status: 403, json: { detail: "Denied" } }
        : { json: { items: [row], total: 1, notice: "Formal review" } }
    )
  );
  await page.goto("/?fixture=integrity");
  await expect(page.getByText(row.history[0].reason)).toBeVisible();
  revoked = true;
  await page.getByRole("button", { name: "Reload review notices" }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByText(row.history[0].reason)).toHaveCount(0);
});
