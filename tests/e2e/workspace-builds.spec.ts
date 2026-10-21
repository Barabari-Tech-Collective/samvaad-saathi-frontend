import { expect, test } from "@playwright/test";

test("guide supports keyboard completion, skip/replay, persistence and narrow viewports", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/?fixture=guide");
  const dialog = page.getByRole("dialog");
  await expect(page.getByRole("complementary", { name: "Getting started" })).toBeVisible();
  await expect(dialog).not.toBeVisible();
  await page.getByRole("button", { name: "Start guide" }).click();
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

for (const viewport of [
  { width: 1280, height: 800 },
  { width: 740, height: 320 },
]) {
  test(`invitation preserves working focus at ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto("/?fixture=guide");
    const input = page.getByRole("textbox", { name: "Your work" });
    await input.fill("My answer");
    await expect(page.getByRole("button", { name: "Start guide" })).toBeVisible();
    await expect(input).toBeFocused();
    await page.getByRole("button", { name: "Not now" }).click();
    await expect(page.getByRole("button", { name: "Quick guide" })).toBeFocused();
    await page.getByRole("button", { name: "Quick guide" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Start with practice" })).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true
    );
  });
}

test("permission/account changes close obsolete help sessions", async ({ page }) => {
  await page.goto("/?fixture=guide");
  await page.getByRole("button", { name: "Quick guide" }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.evaluate(() => window.dispatchEvent(new Event("guide-test-role")));
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("button", { name: "Start guide" }).click();
  await expect(page.getByRole("heading", { name: "Start with practice" })).toBeFocused();
  await page.evaluate(() => window.dispatchEvent(new Event("guide-test-revoke")));
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.getByRole("button", { name: "Quick guide" })).toHaveCount(0);
  await expect(page.locator('[data-guide-highlight="true"]')).toHaveCount(0);
});

test("blocked persistence still permits skip and replay with reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    Object.defineProperty(Storage.prototype, "getItem", {
      value() {
        throw new Error("blocked");
      },
    });
    Object.defineProperty(Storage.prototype, "setItem", {
      value() {
        throw new Error("blocked");
      },
    });
  });
  await page.goto("/?fixture=guide");
  await page.getByRole("button", { name: "Start guide" }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Quick guide" })).toBeFocused();
  await page.getByRole("button", { name: "Quick guide" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("button", { name: "Got it" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
});

test("another tab dismisses only the matching first-use invitation", async ({ page, context }) => {
  await page.goto("/?fixture=guide");
  await page.getByRole("button", { name: "Start guide" }).waitFor();
  const other = await context.newPage();
  await other.goto("/?fixture=guide");
  await other.getByRole("button", { name: "Start guide" }).waitFor();
  await page.getByRole("button", { name: "Not now" }).click();
  await expect(other.getByRole("button", { name: "Start guide" })).toHaveCount(0);
  await other.getByRole("button", { name: "Quick guide" }).click();
  await expect(other.getByRole("dialog")).toBeVisible();
  await other.close();
});
