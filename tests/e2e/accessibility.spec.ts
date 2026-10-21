import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { acceptanceData } from "../browser/acceptance-data";
for (const view of ["home", "profile"])
  for (const width of [320, 768, 1440]) {
    test(`Student ${view} workspace, ${width}px: accessibility and reflow`, async ({
      page,
      browserName,
    }, testInfo) => {
      await page.route("**/api/**", (route) =>
        route.fulfill({ json: acceptanceData(new URL(route.request().url()).pathname) ?? {} })
      );
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/${view}?fixture=student-shell&view=${view}`);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      const result = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze();
      await testInfo.attach("axe-report", {
        body: JSON.stringify(result, null, 2),
        contentType: "application/json",
      });
      expect(
        result.violations.map(({ id, nodes }) => ({
          id,
          nodes: nodes.map((node) => ({ target: node.target, summary: node.failureSummary })),
        }))
      ).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true
      );
      await page.keyboard.press(
        browserName === "webkit" && process.platform === "darwin" ? "Alt+Tab" : "Tab"
      );
      await expect(page.getByRole("link", { name: "Skip to main content" })).toBeFocused();
      await page.keyboard.press("Enter");
      await expect(page.getByRole("main")).toBeFocused();
    });
  }

test("Profile editing focuses the field and returns focus on cancel", async ({ page }) => {
  await page.route("**/api/**", (route) =>
    route.fulfill({ json: acceptanceData(new URL(route.request().url()).pathname) ?? {} })
  );
  await page.goto("/profile?fixture=student-shell&view=profile");
  await page.getByRole("button", { name: "Edit Target Position", exact: true }).click();
  await expect(page.getByRole("combobox", { name: "Target Position", exact: true })).toBeFocused();
  await page.getByRole("button", { name: "Cancel editing Target Position", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Edit Target Position", exact: true })
  ).toBeFocused();
});

test("Student tasks reflow with doubled text size", async ({ page }) => {
  await page.route("**/api/**", (route) =>
    route.fulfill({ json: acceptanceData(new URL(route.request().url()).pathname) ?? {} })
  );
  await page.setViewportSize({ width: 640, height: 900 });
  await page.goto("/home?fixture=student-shell&view=home");
  await page.evaluate(() => (document.documentElement.style.fontSize = "200%"));
  await expect(page.getByRole("link", { name: "Open practice coach", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
