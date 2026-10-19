import { expect, test } from "@playwright/test";

test("guide supports keyboard completion, skip/replay, persistence and narrow viewports", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/?fixture=guide");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await page.getByRole("button", { name: "Next", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(dialog.getByRole("heading", { name: "Saved progress" })).toBeVisible();
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press("Tab");
    expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await page.reload();
  await page.waitForTimeout(900);
  await expect(dialog).not.toBeVisible();
  await page.getByRole("button", { name: "Quick guide" }).click();
  await expect(dialog).toBeVisible();
  await expect(page.getByRole("heading", { name: "Start with practice" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
