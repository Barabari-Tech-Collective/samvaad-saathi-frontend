import { expect, test } from "@playwright/test";

for (const size of [
  { width: 1280, height: 900 },
  { width: 320, height: 740 },
  { width: 740, height: 320 },
]) {
  test(`preflight keyboard containment, Escape and focus recovery at ${size.width}x${size.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(size);
    await page.goto("/?fixture=assessment");
    const opener = page.getByRole("button", { name: "Review assessment setup" });
    await opener.focus();
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog", { name: "Ready for your assessment?" });
    await expect(dialog).toBeVisible();
    await expect(page.getByRole("button", { name: "Not yet" })).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "Begin assessment" })).toBeFocused();
    // Keyboard focus cycles through enabled dialog actions.
    await page.keyboard.press("Tab");
    expect(await dialog.evaluate((node) => node.contains(document.activeElement))).toBe(true);
    expect(
      await dialog.evaluate((node) => {
        const r = node.getBoundingClientRect();
        return r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight;
      })
    ).toBe(true);
    for (const name of ["Not yet", "Begin assessment"])
      expect(
        await page
          .getByRole("button", { name })
          .evaluate((node) => node.getBoundingClientRect().height)
      ).toBeGreaterThanOrEqual(44);
    if (size.width === 320)
      await page.screenshot({
        path: "test-results/build28-assessment-preflight-320.png",
        fullPage: true,
      });
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(opener).toBeFocused();
    await expect(page.getByLabel("Monitoring state")).toContainText("inactive");
  });
}
test("an interruption can retry the same event without stopping the assessment", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(Element.prototype, "requestFullscreen", {
      configurable: true,
      value: async () => {
        throw new Error("Denied");
      },
    })
  );
  const writes: Record<string, unknown>[] = [];
  await page.route("**/api/interviews/proctoring-violation", (r) => {
    writes.push(r.request().postDataJSON());
    return writes.length === 1
      ? r.fulfill({ status: 503, json: {} })
      : r.fulfill({ json: { policy: "review_signal_only" } });
  });
  await page.goto("/?fixture=assessment");
  await page.getByRole("button", { name: "Review assessment setup" }).click();
  await page.getByRole("button", { name: "Begin assessment" }).click();
  await expect(page.getByLabel("Monitoring state")).toContainText("active");
  await page.getByRole("button", { name: "Simulate interruption" }).click();
  await expect(page.getByLabel("Monitoring state")).toContainText("active · failed");
  await expect(page.getByRole("status", { name: "Assessment interruption" })).toContainText(
    "does not automatically end"
  );
  await page.getByRole("button", { name: "Retry recording interruption" }).click();
  await expect(page.getByLabel("Monitoring state")).toContainText("active · saved");
  expect(writes).toHaveLength(2);
  expect(writes[0]).toEqual(writes[1]);
  await page.getByRole("button", { name: "Continue answering" }).click();
  await expect(page.getByRole("status", { name: "Assessment interruption" })).toHaveCount(0);
});
test("account change removes stale notices and online does not send the old pending event", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(Element.prototype, "requestFullscreen", {
      configurable: true,
      value: async () => {},
    })
  );
  let posts = 0;
  await page.route("**/api/interviews/proctoring-violation", (r) => {
    posts++;
    return r.fulfill({ status: 503, json: {} });
  });
  await page.goto("/?fixture=assessment");
  await page.getByRole("button", { name: "Review assessment setup" }).click();
  await page.getByRole("button", { name: "Begin assessment" }).click();
  await page.getByRole("button", { name: "Simulate interruption" }).click();
  await expect(page.getByLabel("Monitoring state")).toContainText("failed");
  await page.evaluate(() =>
    window.dispatchEvent(new CustomEvent("practice-test-account", { detail: "2" }))
  );
  await expect(page.getByLabel("Monitoring state")).toHaveText("inactive · idle");
  await expect(page.getByRole("status", { name: "Assessment interruption" })).toHaveCount(0);
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  expect(posts).toBe(1);
});
test("cancelling pending fullscreen cannot activate after the browser promise resolves", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(Element.prototype, "requestFullscreen", {
      configurable: true,
      value: () =>
        new Promise<void>((resolve) =>
          window.addEventListener("test-release-fullscreen", () => resolve(), { once: true })
        ),
    })
  );
  await page.goto("/?fixture=assessment");
  await page.getByRole("button", { name: "Review assessment setup" }).click();
  await page.getByRole("button", { name: "Begin assessment" }).click();
  await expect(page.getByRole("button", { name: "Opening assessment…" })).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.evaluate(() => window.dispatchEvent(new Event("test-release-fullscreen")));
  await expect(page.getByLabel("Monitoring state")).toHaveText("inactive · idle");
});
