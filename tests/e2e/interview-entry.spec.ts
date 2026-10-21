import { expect, type Page, test } from "@playwright/test";
const profile = (id = 1, mode = "assessment", category = "Tech") => ({
  id,
  interviewMode: mode,
  title: `Role ${id}`,
  category,
  questionsPerInterview: 5,
  availableDifficulties: ["easy"],
  description: "Interview",
  created_at: "2026-10-20T10:00:00Z",
});
const result = { interviewId: 9, interviewMode: "assessment", plannedQuestionCount: 5, items: [] };
const url = "/?fixture=start&mode=assessment";
async function catalogue(page: Page, items: unknown[] = [profile()]) {
  await page.route("**/api/v2/job-profiles", (r) =>
    r.fulfill({ json: { items, total: items.length } })
  );
}
async function choose(page: Page, category = "Tech") {
  await catalogue(page, [profile(1, "assessment", category)]);
  await page.goto(url);
  await page.getByLabel("Which assessment are you joining?").selectOption("hr::1::Role 1");
}
async function account(page: Page) {
  await page.evaluate(() =>
    window.dispatchEvent(new CustomEvent("practice-test-account", { detail: "2" }))
  );
}

test("role service failure is not an empty assessment catalogue and can recover", async ({
  page,
}) => {
  let failed = true;
  await page.route("**/api/v2/job-profiles", (r) =>
    failed ? r.fulfill({ status: 503, json: {} }) : r.fulfill({ json: { items: [], total: 0 } })
  );
  await page.goto(url);
  await expect(
    page.getByRole("heading", { name: "Interview roles could not be loaded" })
  ).toBeVisible();
  await expect(
    page.getByText("No assessment roles are available yet.", { exact: false })
  ).toHaveCount(0);
  failed = false;
  await page.getByRole("button", { name: "Check roles again" }).click();
  await expect(
    page.getByText("No assessment roles are available yet.", { exact: false })
  ).toBeVisible();
});
test("invalid purpose makes no catalogue or creation requests", async ({ page }) => {
  let reads = 0;
  await page.route("**/api/**", (r) => {
    reads++;
    return r.fulfill({ json: {} });
  });
  await page.goto("/?fixture=start&mode=unknown");
  await expect(page.getByRole("heading", { name: "Check this interview purpose" })).toBeVisible();
  expect(reads).toBe(0);
});
for (const category of ["Tech", "HR & Non-Technical"]) {
  test(`${category} assessment creation preserves exact mode and N without caching returned questions`, async ({
    page,
  }) => {
    const writes: unknown[] = [];
    await page.route("**/api/v2/interviews/**", (r) => {
      writes.push(r.request().postDataJSON());
      return r.fulfill({ json: result });
    });
    await choose(page, category);
    await expect(page.getByText("5 approved questions · about 15 minutes")).toBeVisible();
    await page.setViewportSize({ width: 320, height: 740 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true
    );
    await page.screenshot({
      path: `test-results/build27-entry-${category === "Tech" ? "tech" : "hr"}-320.png`,
      fullPage: true,
    });
    await page.getByRole("button", { name: "Start assessment" }).click();
    await expect(page).toHaveURL(/interview\?interviewId=9.*interviewMode=assessment/);
    expect(writes).toHaveLength(1);
    expect(writes[0]).toMatchObject({
      clientContract: "fixed-round-v1",
      jobProfileId: 1,
      difficulty: "easy",
    });
    expect(await page.evaluate(() => Object.keys(sessionStorage))).toEqual([]);
  });
}
for (const data of [
  { ...result, interviewMode: "practice" },
  { ...result, plannedQuestionCount: 4 },
  { ...result, interviewId: 0 },
  { ...result, interviewMode: null },
]) {
  test(`unverified creation blocks navigation ${JSON.stringify(data)}`, async ({ page }) => {
    await page.route("**/api/v2/interviews/create", (r) => r.fulfill({ json: data }));
    await choose(page);
    await page.getByRole("button", { name: "Start assessment" }).click();
    await expect(
      page.getByRole("heading", { name: "Check whether your interview was created" })
    ).toBeVisible();
    await expect(page).toHaveURL(/fixture=start/);
    await expect(page.getByRole("button", { name: "Start assessment" })).toHaveCount(0);
  });
}
test("an uncertain create response offers History instead of an automatic repeat", async ({
  page,
}) => {
  let posts = 0;
  await page.route("**/api/v2/interviews/create", (r) => {
    posts++;
    return r.fulfill({ status: 503, json: {} });
  });
  await choose(page);
  await page.getByRole("button", { name: "Start assessment" }).click();
  await expect(page.getByRole("alert")).toContainText("A sitting may already exist");
  await expect(page.getByRole("link", { name: "Check History" })).toBeVisible();
  expect(posts).toBe(1);
});
test("422 rejection rechecks the catalogue and allows corrected setup", async ({ page }) => {
  let posts = 0;
  await page.route("**/api/v2/interviews/create", (r) => {
    posts++;
    return posts === 1 ? r.fulfill({ status: 422, json: {} }) : r.fulfill({ json: result });
  });
  await choose(page);
  await page.getByRole("button", { name: "Start assessment" }).click();
  await expect(page.getByRole("alert")).toContainText("request was rejected");
  await page.getByRole("button", { name: "Start assessment" }).click();
  await expect(page).toHaveURL(/interview\?interviewId=9/);
  expect(posts).toBe(2);
});
for (const change of ["account", "mode"]) {
  test(`a pending creation cannot redirect after ${change} changes`, async ({ page }) => {
    let posts = 0;
    let release: () => void = () => {};
    await page.route("**/api/v2/interviews/create", async (r) => {
      posts++;
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      await r.fulfill({ json: result });
    });
    await choose(page);
    await page.getByRole("button", { name: "Start assessment" }).click();
    await expect.poll(() => posts).toBe(1);
    if (change === "account") await account(page);
    else
      await page.evaluate(() => {
        history.pushState({}, "", "/?fixture=start&mode=practice");
        window.dispatchEvent(new Event("popstate"));
      });
    await expect(page.getByRole("combobox")).toHaveValue("");
    const response = page.waitForResponse((r) => r.request().method() === "POST");
    release();
    await response;
    await page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
        )
    );
    await expect(page).toHaveURL(/fixture=start/);
  });
}
test("rapid clicks send only one creation request", async ({ page }) => {
  let posts = 0;
  let release: () => void = () => {};
  await page.route("**/api/v2/interviews/create", async (r) => {
    posts++;
    await new Promise<void>((resolve) => {
      release = resolve;
    });
    await r.fulfill({ json: result });
  });
  await choose(page);
  await page.getByRole("button", { name: "Start assessment" }).evaluate((button) => {
    (button as HTMLButtonElement).click();
    (button as HTMLButtonElement).click();
  });
  await expect.poll(() => posts).toBe(1);
  release();
  await expect(page).toHaveURL(/interview\?interviewId=9/);
  expect(posts).toBe(1);
});
test("legacy reattempt links do not read questions or reopen a completed assessment", async ({
  page,
}) => {
  let calls = 0;
  await page.route("**/api/**", (r) => {
    calls++;
    return r.fulfill({ json: {} });
  });
  await page.goto("/?fixture=reattempt&interviewId=9&role=Assessment&attemptsCount=99");
  await expect(page.getByRole("heading", { name: "Start a fresh practice round" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Set up practice" })).toHaveAttribute(
    "href",
    "/interview-start?mode=practice"
  );
  expect(calls).toBe(0);
  expect(await page.evaluate(() => Object.keys(sessionStorage))).toEqual([]);
});
test("invalid published counts cannot silently fall back to five questions", async ({ page }) => {
  await catalogue(page, [{ ...profile(), questionsPerInterview: 0 }]);
  await page.goto(url);
  await expect(page.getByRole("option", { name: "Role 1", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Start assessment" })).toBeDisabled();
});
test("changing identity clears a chosen published role", async ({ page }) => {
  await choose(page);
  await account(page);
  await expect(page.getByRole("combobox")).toHaveValue("");
});

test("signing out clears setup without issuing a new catalogue request", async ({ page }) => {
  let reads = 0;
  await page.route("**/api/v2/job-profiles", (r) => {
    reads++;
    return r.fulfill({ json: { items: [profile()], total: 1 } });
  });
  await page.goto(url);
  await page.getByRole("combobox").waitFor();
  await page.evaluate(() =>
    window.dispatchEvent(new CustomEvent("practice-test-account", { detail: "" }))
  );
  await expect(page.getByRole("heading", { name: "Checking your account" })).toBeVisible();
  expect(reads).toBe(1);
});
for (const items of [[{ ...profile(), title: null }], [profile(), profile()]]) {
  test(`malformed catalogue is recoverable ${JSON.stringify(items)}`, async ({ page }) => {
    await page.route("**/api/v2/job-profiles", (r) =>
      r.fulfill({ json: { items, total: items.length } })
    );
    await page.goto(url);
    await expect(
      page.getByRole("heading", { name: "Interview roles could not be loaded" })
    ).toBeVisible();
  });
}
test("free practice preserves selected N through device checks and creation", async ({ page }) => {
  let body: Record<string, unknown> | undefined;
  await catalogue(page, []);
  await page.route("**/api/v2/interviews/create", (r) => {
    body = r.request().postDataJSON();
    return r.fulfill({
      json: { interviewId: 12, interviewMode: "practice", plannedQuestionCount: 7 },
    });
  });
  await page.goto("/?fixture=start&mode=practice");
  await page.getByLabel("What role are you practising for?").selectOption("General interview");
  await page.getByLabel("Questions in this practice round").fill("7");
  await page.getByRole("button", { name: "Continue to device check" }).click();
  await expect(page.getByText("7 questions · about 21 min")).toBeVisible();
  expect(body).toBeUndefined();
  await page.getByRole("button", { name: "Check microphone" }).click();
  await page.getByRole("button", { name: "Play test sound" }).click();
  await page.getByRole("button", { name: "Start practice interview" }).click();
  await expect(page).toHaveURL(/interview\?interviewId=12.*interviewMode=practice/);
  expect(body).toMatchObject({
    questionCount: 7,
    track: "General interview",
    clientContract: "fixed-round-v1",
  });
});

test("curated technical roles without level evidence cannot offer arbitrary difficulty", async ({
  page,
}) => {
  await catalogue(page, [{ ...profile(), availableDifficulties: undefined }]);
  await page.goto(url);
  await page.getByRole("combobox").selectOption("hr::1::Role 1");
  await expect(page.getByRole("button", { name: "Start assessment" })).toBeDisabled();
  await expect(
    page.getByText("This role has no interview levels ready yet.", { exact: false })
  ).toBeVisible();
});
