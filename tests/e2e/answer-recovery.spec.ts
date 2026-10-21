import { expect, test } from "@playwright/test";

test("real MediaRecorder retains a failed answer and retries the same WAV before advancing", async ({
  page,
}) => {
  const bodies: Buffer[] = [];
  await page.route("**/api/transcribe-whisper", async (route) => {
    bodies.push(route.request().postDataBuffer()!);
    await route.fulfill({
      status: bodies.length === 1 ? 503 : 202,
      json:
        bodies.length === 1
          ? { detail: "Temporary save failure" }
          : { saved: true, questionAttemptId: 42 },
    });
  });
  await page.route("**/api/complete-analysis", (route) => route.fulfill({ json: {} }));
  await page.goto("/");
  await page.getByRole("button", { name: "Answer", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Listening…" })).toBeVisible();
  // Fake microphone still needs to generate actual audio frames for browser decoding.
  await page.waitForTimeout(1200);
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await expect(page.getByRole("button", { name: "Retry save" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Next", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Retry save" }).click();
  await expect(page.getByText("Answer saved.", { exact: true })).toBeVisible();
  expect(bodies).toHaveLength(2);
  const wav = (body: Buffer) =>
    body.subarray(body.indexOf(Buffer.from("RIFF")), body.lastIndexOf(Buffer.from("\r\n--")));
  expect(wav(bodies[0]).length).toBeGreaterThan(44);
  expect(wav(bodies[0])).toEqual(wav(bodies[1]));
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Next question" })).toBeVisible();
});

test("a durable answer can advance while speech feedback is still processing", async ({ page }) => {
  await page.route("**/api/transcribe-whisper", (route) =>
    route.fulfill({
      status: 202,
      json: {
        saved: true,
        questionAttemptId: 42,
        answerVersion: 1,
        transcriptionStatus: "pending",
      },
    })
  );
  await page.route("**/api/audio/attempts/42/transcription", (route) =>
    route.fulfill({
      status: 200,
      json: {
        questionAttemptId: 42,
        status: "processing",
        isTerminal: false,
        saved: true,
        answerVersion: 1,
      },
    })
  );

  await page.goto("/");
  await page.getByRole("button", { name: "Answer", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Listening…" })).toBeVisible();
  await page.waitForTimeout(1200);
  await page.getByRole("button", { name: "Done", exact: true }).click();

  await expect(page.getByText("Answer saved. Preparing speech feedback…")).toBeVisible();
  await expect(page.getByRole("button", { name: "Next", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Next question" })).toBeVisible();
});

test("enrollment denial keeps recorded audio unsaved and retryable after access is restored", async ({
  page,
}) => {
  const bodies: Buffer[] = [];
  await page.route("**/api/transcribe-whisper", async (route) => {
    bodies.push(route.request().postDataBuffer()!);
    return route.fulfill({
      status: bodies.length === 1 ? 403 : 202,
      json:
        bodies.length === 1
          ? { detail: { code: "COURSE_ACCESS_REVOKED", message: "Enrollment revoked" } }
          : { saved: true, questionAttemptId: 42 },
    });
  });
  await page.route("**/api/complete-analysis", (route) => route.fulfill({ json: {} }));
  await page.goto("/");
  await page.getByRole("button", { name: "Answer", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Listening…" })).toBeVisible();
  await page.waitForTimeout(1200);
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await expect(
    page.getByText("This recording has not been saved to your account.", { exact: false })
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Next", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Retry save", exact: true }).click();
  await expect(page.getByText("Answer saved.", { exact: true })).toBeVisible();
  const wav = (body: Buffer) =>
    body.subarray(body.indexOf(Buffer.from("RIFF")), body.lastIndexOf(Buffer.from("\r\n--")));
  expect(bodies).toHaveLength(2);
  expect(wav(bodies[0])).toEqual(wav(bodies[1]));
});
