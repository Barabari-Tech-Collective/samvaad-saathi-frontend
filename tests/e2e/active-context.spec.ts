import { expect, type Page, test } from "@playwright/test";
const checkpoint = (id = 7, text = "Explain your project decision") => ({
  interviewId: id,
  track: "Communication",
  interviewMode: "assessment",
  status: "active",
  difficulty: "easy",
  questions: [
    {
      interviewQuestionId: id * 10,
      text,
      topic: "Communication",
      difficulty: "easy",
      category: "behavioral",
      isFollowUp: false,
      parentQuestionId: null,
      followUpStrategy: null,
      supplement: null,
      questionAttemptId: id * 100,
      answerSaved: true,
      answerVersion: 1,
    },
  ],
  plannedQuestionCount: 1,
  stateVersion: 1,
  questionSetVersion: 1,
  currentQuestionId: id * 10,
  currentQuestionIndex: 0,
  completeReady: false,
  totalQuestions: 1,
});
const url = "/?fixture=active&interviewId=7&resumed=true&interviewMode=assessment";
async function mocks(page: Page) {
  await page.addInitScript(() =>
    Object.defineProperty(Element.prototype, "requestFullscreen", {
      configurable: true,
      value: async () => {},
    })
  );
  await page.route("**/api/tts/convert", (r) => r.fulfill({ contentType: "audio/mpeg", body: "" }));
  await page.route("**/api/interviews/begin", (r) =>
    r.fulfill({
      json: {
        plannedQuestionCount: 1,
        answerDeadlineAt: null,
        serverTime: new Date().toISOString(),
      },
    })
  );
  await page.route("**/api/interviews/resume", (r) =>
    r.fulfill({ json: checkpoint(Number(r.request().postDataJSON().interviewId)) })
  );
}
async function start(page: Page) {
  await page.getByRole("button", { name: "Begin assessment" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Begin assessment", exact: true })
    .click();
  await expect(page.getByText("Explain your project decision", { exact: true })).toBeVisible();
}
for (const query of [
  "interviewId=0&interviewMode=practice",
  "interviewId=7",
  "interviewId=7&interviewMode=unknown",
  "interviewId=7&reattempt=true&interviewMode=assessment",
]) {
  test(`invalid active link makes no interview requests ${query}`, async ({ page }) => {
    let calls = 0;
    await page.route("**/api/**", (r) => {
      calls++;
      return r.fulfill({ json: {} });
    });
    await page.goto(`/?fixture=active&${query}`);
    await expect(
      page.getByRole("heading", { name: "Restore this interview from History" })
    ).toBeVisible();
    expect(calls).toBe(0);
  });
}
test("denied restore never displays cached local questions", async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "interview_questions_7",
      JSON.stringify([{ text: "Private cached question", interviewQuestionId: 70 }])
    )
  );
  await page.route("**/api/interviews/resume", (r) => r.fulfill({ status: 403, json: {} }));
  await page.goto(url);
  await expect(page.getByRole("alert")).toContainText("could not verify");
  await expect(page.getByText("Private cached question", { exact: true })).toHaveCount(0);
});
test("late restore cannot redirect the new account", async ({ page }) => {
  let release: () => void = () => {};
  let reads = 0;
  await page.route("**/api/interviews/resume", async (r) => {
    reads++;
    if (reads === 1) {
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      return r.fulfill({ json: { ...checkpoint(), status: "completed" } });
    }
    return r.fulfill({ status: 404, json: {} });
  });
  await page.goto(url);
  await expect.poll(() => reads).toBe(1);
  await page.evaluate(() =>
    window.dispatchEvent(new CustomEvent("practice-test-account", { detail: "2" }))
  );
  await expect(page.getByRole("alert")).toContainText("could not verify");
  release();
  await expect(page).toHaveURL(/fixture=active/);
});
test("generation sends the explicit URL sitting and rejects a mismatched checkpoint", async ({
  page,
}) => {
  let id: unknown;
  await page.route("**/api/v2/interviews/generate-questions", (r) => {
    id = r.request().postDataJSON().interviewId;
    return r.fulfill({
      json: {
        interviewId: 7,
        items: [{ interviewQuestionId: 70, text: "Question" }],
        interviewMode: "assessment",
      },
    });
  });
  await page.route("**/api/interviews/resume", (r) => r.fulfill({ json: checkpoint(8) }));
  await page.goto("/?fixture=active&interviewId=7&interviewMode=assessment");
  await expect(page.getByRole("alert")).toContainText("could not confirm");
  expect(id).toBe(7);
});
test("sitting change removes the active question and loads the canonical new sitting", async ({
  page,
}) => {
  await mocks(page);
  await page.goto(url);
  await start(page);
  await page.route("**/api/interviews/resume", (r) =>
    r.fulfill({ json: checkpoint(8, "New sitting prompt") })
  );
  await page.evaluate(() => {
    history.pushState(
      {},
      "",
      "/?fixture=active&interviewId=8&resumed=true&interviewMode=assessment"
    );
    window.dispatchEvent(new Event("popstate"));
  });
  await expect(page.getByText("Explain your project decision", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Begin assessment" })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("interview_questions_8"))).toBeNull();
});

for (const phase of ["advance", "complete"])
  for (const context of ["account", "sitting"]) {
    test(`late ${phase} cannot complete or redirect another ${context}`, async ({ page }) => {
      await mocks(page);
      let release: () => void = () => {};
      let held = false;
      let released = false;
      let completes = 0;
      const hold = async () => {
        held = true;
        await new Promise<void>((resolve) => {
          release = resolve;
        });
      };
      await page.route("**/api/interviews/navigation/advance", async (r) => {
        if (phase === "advance") await hold();
        await r.fulfill({
          json: {
            ...checkpoint(),
            completeReady: true,
            currentQuestionId: null,
            currentQuestionIndex: null,
          },
        });
        if (phase === "advance") released = true;
      });
      await page.route("**/api/interviews/complete", async (r) => {
        completes++;
        if (phase === "complete") await hold();
        await r.fulfill({ json: { id: 7, status: "completed" } });
        if (phase === "complete") released = true;
      });
      await page.goto(url);
      await start(page);
      await page.getByRole("button", { name: "Submit", exact: true }).click();
      await page.getByRole("button", { name: "Yes, Submit", exact: true }).click();
      await expect.poll(() => held).toBe(true);
      await page.route("**/api/interviews/resume", (r) => r.fulfill({ status: 404, json: {} }));
      if (context === "account")
        await page.evaluate(() =>
          window.dispatchEvent(new CustomEvent("practice-test-account", { detail: "2" }))
        );
      else
        await page.evaluate(() => {
          history.pushState(
            {},
            "",
            "/?fixture=active&interviewId=8&resumed=true&interviewMode=assessment"
          );
          window.dispatchEvent(new Event("popstate"));
        });
      await expect(page.getByRole("alert")).toContainText("could not verify");
      await expect(page.getByText("Explain your project decision", { exact: true })).toHaveCount(0);
      release();
      await expect.poll(() => released).toBe(true);
      await page.evaluate(
        () =>
          new Promise<void>((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
          )
      );
      await expect(page).toHaveURL(/fixture=active/);
      expect(completes).toBe(phase === "advance" ? 0 : 1);
    });
  }
test("completion still navigates to the owned receipt when optional storage is blocked", async ({
  page,
}) => {
  await mocks(page);
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new Error("Blocked");
    };
    Storage.prototype.removeItem = () => {
      throw new Error("Blocked");
    };
  });
  await page.route("**/api/interviews/navigation/advance", (r) =>
    r.fulfill({
      json: {
        ...checkpoint(),
        completeReady: true,
        currentQuestionId: null,
        currentQuestionIndex: null,
      },
    })
  );
  await page.route("**/api/interviews/complete", (r) =>
    r.fulfill({ json: { id: 7, status: "completed" } })
  );
  await page.goto(url);
  await start(page);
  await page.getByRole("button", { name: "Submit", exact: true }).click();
  await page.getByRole("button", { name: "Yes, Submit", exact: true }).click();
  await expect(page).toHaveURL(/interview-completed\?interviewId=7/);
});
