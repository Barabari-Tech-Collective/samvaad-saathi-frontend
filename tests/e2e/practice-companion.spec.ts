import { expect, type Page, test } from "@playwright/test";
const fixture = "/?fixture=companion";
const face = "[data-companion-state]";
test("microphone and save expressions follow actual answer state", async ({ page }) => {
  let release: () => void = () => {};
  let received = false;
  await page.route("**/api/transcribe-whisper", async (route) => {
    received = true;
    await new Promise<void>((resolve) => {
      release = resolve;
    });
    await route.fulfill({
      status: 202,
      json: {
        saved: true,
        questionAttemptId: 42,
        answerVersion: 1,
        transcriptionStatus: "pending",
      },
    });
  });
  await page.route("**/api/audio/attempts/42/transcription", (route) =>
    route.fulfill({
      json: {
        questionAttemptId: 42,
        status: "processing",
        saved: true,
        answerVersion: 1,
        isTerminal: false,
      },
    })
  );
  await page.goto(fixture);
  await expect(page.locator(face)).toHaveAttribute("data-companion-state", "idle");
  await page.getByRole("button", { name: "Answer", exact: true }).click();
  await expect(page.locator(face)).toHaveAttribute("data-companion-state", "listening");
  await page.waitForTimeout(600);
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await expect(page.locator(face)).toHaveAttribute("data-companion-state", "thinking");
  await expect.poll(() => received).toBe(true);
  release();
  await expect(page.getByText("Answer saved. Continue when you’re ready.")).toBeVisible();
});
test("hide and motion controls persist while answer controls remain usable", async ({ page }) => {
  await page.goto(fixture);
  await page.getByRole("button", { name: "Pause face animation" }).click();
  await page.getByRole("button", { name: "Hide Saathi" }).click();
  await expect(page.locator(face)).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Answer", exact: true })).toBeEnabled();
  await page.reload();
  await expect(page.getByRole("button", { name: "Show Saathi" })).toBeVisible();
  await page.getByRole("button", { name: "Show Saathi" }).click();
  await expect(page.locator(face)).toHaveAttribute("data-companion-motion", "false");
});
test("OS reduced motion and manual pause suppress face animation", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(fixture + "&speaking=true");
  await expect(page.locator(".saathi-mouth")).toHaveCSS("animation-name", "none");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(page.locator(".saathi-mouth")).toHaveCSS("animation-name", "saathi-speaking");
  await page.getByRole("button", { name: "Pause face animation" }).click();
  await expect(page.locator(".saathi-mouth")).toHaveCSS("animation-name", "none");
});
test("offline state never claims the companion is listening", async ({ page, context }) => {
  await page.goto(fixture);
  await context.setOffline(true);
  await expect(page.locator(face)).toHaveAttribute("data-companion-state", "reconnecting");
  await expect(page.getByText(/You’re offline/)).toBeVisible();
  await context.setOffline(false);
  await expect(page.locator(face)).toHaveAttribute("data-companion-state", "idle");
});
for (const width of [320, 768, 1440]) {
  test(`companion reflows with keyboard controls at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(fixture);
    await expect(
      page.getByRole("complementary", { name: "Saathi practice companion" })
    ).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true
    );
    const button = page.getByRole("button", { name: "Hide Saathi" });
    expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await button.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("button", { name: "Show Saathi" })).toBeVisible();
  });
}
const checkpoint = {
  interviewId: 7,
  track: "Communication",
  interviewMode: "practice",
  status: "active",
  difficulty: "easy",
  questions: [
    {
      interviewQuestionId: 70,
      text: "Explain a project decision",
      topic: "Communication",
      category: "behavioral",
      difficulty: "easy",
      isFollowUp: false,
      parentQuestionId: null,
      followUpStrategy: null,
      supplement: null,
      questionAttemptId: 700,
      answerSaved: true,
      answerVersion: 1,
    },
  ],
  plannedQuestionCount: 1,
  stateVersion: 1,
  questionSetVersion: 1,
  currentQuestionId: 70,
  currentQuestionIndex: 0,
  completeReady: false,
  totalQuestions: 1,
};
async function openPractice(page: Page) {
  await page.route("**/api/interviews/resume", (r) => r.fulfill({ json: checkpoint }));
  await page.route("**/api/interviews/session/claim", (r) =>
    r.fulfill({
      json: {
        interviewId: 7,
        leaseToken: "fixture-lease",
        expiresAt: new Date(Date.now() + 120000).toISOString(),
      },
    })
  );
  await page.route("**/api/interviews/begin", (r) =>
    r.fulfill({
      json: {
        plannedQuestionCount: 1,
        answerDeadlineAt: null,
        serverTime: new Date().toISOString(),
      },
    })
  );
  await page.goto("/?fixture=active&interviewId=7&resumed=true&interviewMode=practice");
  await page.getByRole("button", { name: "Begin practice interview", exact: true }).click();
  await expect(page.getByText("Explain a project decision", { exact: true })).toBeVisible();
}
test("stored practice mute prevents provider calls; resizing never remounts question speech", async ({
  page,
}) => {
  let calls = 0;
  await page.addInitScript(() =>
    localStorage.setItem(
      "samvaad-companion:v1:1",
      JSON.stringify({ version: 1, hidden: false, motion: true, muted: true })
    )
  );
  await page.route("**/api/tts/convert", (r) => {
    calls++;
    return r.abort();
  });
  await openPractice(page);
  await expect(page.getByRole("button", { name: "Unmute question audio" })).toBeVisible();
  expect(calls).toBe(0);
  await page.getByRole("button", { name: "Unmute question audio" }).click();
  await expect.poll(() => calls).toBe(1);
  await page.setViewportSize({ width: 390, height: 900 });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForTimeout(300);
  expect(calls).toBe(1);
  await page.getByRole("button", { name: "Mute question audio" }).click();
  await expect(page.getByRole("button", { name: "Unmute question audio" })).toBeVisible();
});
test("late account change cannot reuse the former account's companion preferences", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "samvaad-companion:v1:1",
      JSON.stringify({ version: 1, hidden: true, motion: false, muted: true })
    )
  );
  await openPractice(page);
  await expect(page.getByRole("button", { name: "Show Saathi" })).toBeVisible();
  await page.evaluate(() =>
    window.dispatchEvent(new CustomEvent("practice-test-account", { detail: "2" }))
  );
  await page.getByRole("button", { name: "Begin practice interview", exact: true }).click();
  await expect(page.getByRole("button", { name: "Hide Saathi" })).toBeVisible();
  await expect(page.locator(face)).toHaveAttribute("data-companion-motion", "true");
});

test("formal assessment does not inherit practice companion or mute", async ({ page }) => {
  let speechCalls = 0;
  await page.addInitScript(() => {
    localStorage.setItem(
      "samvaad-companion:v1:1",
      JSON.stringify({ version: 1, hidden: false, motion: false, muted: true })
    );
    Object.defineProperty(Element.prototype, "requestFullscreen", {
      configurable: true,
      value: async () => {},
    });
  });
  await page.route("**/api/interviews/resume", (r) =>
    r.fulfill({ json: { ...checkpoint, interviewMode: "assessment" } })
  );
  await page.route("**/api/interviews/begin", (r) =>
    r.fulfill({
      json: {
        plannedQuestionCount: 1,
        answerDeadlineAt: null,
        serverTime: new Date().toISOString(),
      },
    })
  );
  await page.route("**/api/tts/convert", (r) => {
    speechCalls++;
    return r.abort();
  });
  await page.goto("/?fixture=active&interviewId=7&resumed=true&interviewMode=assessment");
  await page.getByRole("button", { name: "Begin assessment", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Begin assessment", exact: true })
    .click();
  await expect(page.getByText("Explain a project decision", { exact: true })).toBeVisible();
  await expect(page.getByRole("complementary", { name: "Saathi practice companion" })).toHaveCount(
    0
  );
  await expect.poll(() => speechCalls).toBe(1);
});
