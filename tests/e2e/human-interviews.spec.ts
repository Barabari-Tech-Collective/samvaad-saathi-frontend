import { expect, test } from "@playwright/test";
const appointment = {
  id: 12,
  title: "Engineering conversation",
  starts_at: "2026-10-21T09:00:00Z",
  ends_at: "2026-10-21T09:30:00Z",
  join_opens_at: "2026-10-21T08:45:00Z",
  status: "scheduled",
  can_join: true,
  outcome_source: null,
};
test("student gets a verified external Meet link, refresh removes it after revocation", async ({
  page,
}) => {
  let revoked = false;
  let joins = 0;
  await page.route("**/api/v2/human-interviews/me**", (route) => {
    if (revoked) return route.fulfill({ status: 403, json: { detail: "Revoked" } });
    if (route.request().url().includes("/join")) {
      joins++;
      return route.fulfill({ json: { url: "https://meet.google.com/abc-defg-hij" } });
    }
    return route.fulfill({
      json: {
        items: [appointment],
        total: 1,
        notice: "Google Meet opens separately. No automatic AI fallback.",
      },
    });
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?fixture=human-interviews");
  await expect(page.getByRole("heading", { name: "Engineering conversation" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Open Google Meet in a new tab" })).toHaveCount(0);
  await page.getByRole("button", { name: "Check meeting access" }).click();
  const link = page.getByRole("link", { name: "Open Google Meet in a new tab" });
  await expect(link).toHaveAttribute("href", "https://meet.google.com/abc-defg-hij");
  await expect(link).toHaveAttribute("target", "_blank");
  await expect(link).toHaveAttribute("rel", "noopener noreferrer");
  expect(joins).toBe(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  revoked = true;
  await page.getByRole("button", { name: "Refresh" }).click();
  await expect(link).toHaveCount(0);
  await expect(page.getByRole("alert")).toContainText("could not be loaded");
});
test("closed appointment gives replacement guidance without an AI fallback", async ({ page }) => {
  await page.route("**/api/v2/human-interviews/me**", (route) =>
    route.fulfill({
      json: {
        items: [
          {
            ...appointment,
            status: "technical_issue",
            can_join: false,
            outcome_source: "host_reported",
          },
        ],
        total: 1,
        notice: "External human interview",
      },
    })
  );
  await page.goto("/?fixture=human-interviews");
  await expect(
    page.getByText("Ask your program team about a replacement appointment.", { exact: false })
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Check meeting access" })).toHaveCount(0);
});
test("student rejects an unexpected link even if the API returns it", async ({ page }) => {
  await page.route("**/api/v2/human-interviews/me**", (route) =>
    route.fulfill({
      json: route.request().url().includes("/join")
        ? { url: "https://evil.test/" }
        : { items: [appointment], total: 1, notice: "External human interview" },
    })
  );
  await page.goto("/?fixture=human-interviews");
  await page.getByRole("button", { name: "Check meeting access" }).click();
  await expect(page.getByRole("alert")).toContainText("could not be verified");
  await expect(page.getByRole("link", { name: "Open Google Meet in a new tab" })).toHaveCount(0);
});
