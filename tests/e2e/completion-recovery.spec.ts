import { expect, type Page, test } from "@playwright/test";
const receipt = {
  planned: 5,
  answered: 2,
  skipped: 1,
  unresolved: 1,
  unreached: 1,
  reason: "time_limit",
};
const envelope = (status = "completed") => ({
  status,
  receipt: status === "completed" ? receipt : null,
  interviewMode: "assessment",
});
const report = {
  candidateInfo: { roleTopic: "Communication", interviewDate: "2026-10-20T10:00:00Z" },
  questionAnalysis: [],
  reportStatus: "partial",
};
async function switchAccount(page: Page) {
  await page.evaluate(() =>
    window.dispatchEvent(new CustomEvent("practice-test-account", { detail: "2" }))
  );
}
const url = "/?fixture=completed&interviewId=9&role=You%20passed";

for (const id of ["", "0", "-1", "1.5", "1e2", "9007199254740992"]) {
  test(`invalid completion link ${JSON.stringify(id)} makes no interview requests`, async ({
    page,
  }) => {
    let reads = 0;
    await page.route("**/api/**", (r) => {
      reads++;
      return r.fulfill({ json: {} });
    });
    await page.goto(`/?fixture=completed&interviewId=${id}`);
    await expect(page.getByRole("heading", { name: "Check this interview link" })).toBeVisible();
    expect(reads).toBe(0);
  });
}
for (const status of ["active", "paused", "terminated", "preparing", "expired", "unknown"]) {
  test(`uncompleted status ${status} cannot claim submission or prepare feedback`, async ({
    page,
  }) => {
    let reports = 0;
    await page.route("**/api/interviews/9/receipt", (r) => r.fulfill({ json: envelope(status) }));
    await page.route("**/api/v2/summary-report**", (r) => {
      reports++;
      return r.fulfill({ json: report });
    });
    await page.goto(url);
    await expect(page.getByRole("heading", { name: "Completion is not confirmed" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Prepare feedback" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: /You passed/ })).toHaveCount(0);
    expect(reports).toBe(0);
  });
}
test("verified time-limit receipt and missing feedback require an explicit preparation action at 320px", async ({
  page,
}) => {
  let posts = 0;
  await page.route("**/api/interviews/9/receipt", (r) => r.fulfill({ json: envelope() }));
  await page.route("**/api/v2/summary-report**", (r) =>
    r.request().method() === "POST"
      ? (posts++, r.fulfill({ json: report }))
      : r.fulfill({ status: 404, json: { detail: "Missing" } })
  );
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto(url);
  await expect(
    page.getByRole("heading", { name: "Assessment submission confirmed" })
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "5 planned · 2 answers saved" })).toBeVisible();
  await expect(page.getByText("Time ended", { exact: false })).toBeVisible();
  await expect(page.getByRole("button", { name: "Prepare feedback" })).toBeVisible();
  expect(posts).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results/build26-completed-320.png", fullPage: true });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.screenshot({ path: "test-results/build26-completed-1280.png", fullPage: true });
  await page.getByRole("button", { name: "Prepare feedback" }).click();
  await expect(page).toHaveURL(/report-summary\?interviewId=9/);
  expect(posts).toBe(1);
});
test("saved feedback opens without regenerating it; completed legacy session has honest missing-count copy", async ({
  page,
}) => {
  let posts = 0;
  await page.route("**/api/interviews/9/receipt", (r) =>
    r.fulfill({ json: { status: "completed", receipt: null, interviewMode: null } })
  );
  await page.route("**/api/v2/summary-report**", (r) => {
    if (r.request().method() === "POST") posts++;
    return r.fulfill({ json: report });
  });
  await page.goto(url);
  await expect(
    page.getByText("Saved-answer counts cannot be confirmed", { exact: false })
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Open feedback" })).toHaveAttribute(
    "href",
    "/report-summary?interviewId=9"
  );
  await expect(page.getByRole("button", { name: "Prepare feedback" })).toHaveCount(0);
  expect(posts).toBe(0);
});
for (const code of [403, 404, 503]) {
  test(`receipt failure ${code} cannot claim saved completion or trigger a report request`, async ({
    page,
  }) => {
    let reports = 0;
    await page.route("**/api/interviews/9/receipt", (r) =>
      r.fulfill({ status: code, json: { detail: "Unavailable" } })
    );
    await page.route("**/api/v2/summary-report**", (r) => {
      reports++;
      return r.fulfill({ json: report });
    });
    await page.goto(url);
    await expect(
      page.getByRole("heading", { name: "Submission could not be verified" })
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Check submission again" })).toBeVisible();
    expect(reports).toBe(0);
  });
}
test("malformed counts cannot become a submission confirmation", async ({ page }) => {
  await page.route("**/api/interviews/9/receipt", (r) =>
    r.fulfill({ json: { ...envelope(), receipt: { ...receipt, answered: 99 } } })
  );
  await page.goto(url);
  await expect(
    page.getByRole("heading", { name: "Submission could not be verified" })
  ).toBeVisible();
  await expect(page.getByRole("region", { name: "Submission receipt" })).toHaveCount(0);
});
for (const result of [403, 503, "malformed"]) {
  test(`unverified report result ${result} does not offer preparation`, async ({ page }) => {
    await page.route("**/api/interviews/9/receipt", (r) => r.fulfill({ json: envelope() }));
    await page.route("**/api/v2/summary-report**", (r) =>
      r.fulfill({ status: typeof result === "number" ? result : 200, json: {} })
    );
    await page.goto(url);
    await expect(page.getByRole("button", { name: "Check feedback again" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Prepare feedback" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Open feedback" })).toHaveCount(0);
  });
}
test("uncertain generation checks for an accepted report before offering another request", async ({
  page,
}) => {
  let posts = 0;
  await page.route("**/api/interviews/9/receipt", (r) => r.fulfill({ json: envelope() }));
  await page.route("**/api/v2/summary-report**", (r) => {
    if (r.request().method() === "POST") {
      posts++;
      return r.fulfill({ status: 503, json: { detail: "Lost response" } });
    }
    return posts
      ? r.fulfill({ json: report })
      : r.fulfill({ status: 404, json: { detail: "Missing" } });
  });
  await page.goto(url);
  await page.getByRole("button", { name: "Prepare feedback" }).click();
  await expect(page.getByText("Preparation was not confirmed", { exact: false })).toBeVisible();
  await expect(page.getByRole("button", { name: "Prepare feedback" })).toHaveCount(0);
  await page.getByRole("button", { name: "Check feedback again" }).click();
  await expect(page.getByRole("link", { name: "Open feedback" })).toBeVisible();
  expect(posts).toBe(1);
});
test("late report preparation cannot redirect a different account", async ({ page }) => {
  let denied = false;
  let release: () => void = () => {};
  let posts = 0;
  await page.route("**/api/interviews/9/receipt", (r) =>
    denied ? r.fulfill({ status: 404, json: {} }) : r.fulfill({ json: envelope() })
  );
  await page.route("**/api/v2/summary-report**", async (r) => {
    if (r.request().method() !== "POST") return r.fulfill({ status: 404, json: {} });
    posts++;
    await new Promise<void>((resolve) => {
      release = resolve;
    });
    await r.fulfill({ json: report });
  });
  await page.goto(url);
  await page.getByRole("button", { name: "Prepare feedback" }).click();
  await expect.poll(() => posts).toBe(1);
  denied = true;
  await switchAccount(page);
  await expect(
    page.getByRole("heading", { name: "Submission could not be verified" })
  ).toBeVisible();
  const response = page.waitForResponse((r) => r.request().method() === "POST");
  release();
  await response;
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      )
  );
  await expect(page).toHaveURL(/fixture=completed/);
  await expect(page.getByRole("region", { name: "Submission receipt" })).toHaveCount(0);
});
test("changing the sitting ID rechecks completion instead of retaining the first submission", async ({
  page,
}) => {
  await page.route("**/api/interviews/9/receipt", (r) => r.fulfill({ json: envelope() }));
  await page.route("**/api/interviews/10/receipt", (r) => r.fulfill({ json: envelope("active") }));
  await page.route("**/api/v2/summary-report**", (r) => r.fulfill({ json: report }));
  await page.goto(url);
  await expect(
    page.getByRole("heading", { name: "Assessment submission confirmed" })
  ).toBeVisible();
  await page.evaluate(() => {
    window.history.pushState({}, "", "/?fixture=completed&interviewId=10");
    window.dispatchEvent(new Event("popstate"));
  });
  await expect(page.getByRole("heading", { name: "Completion is not confirmed" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Submission receipt" })).toHaveCount(0);
});

test("double submission clicks send one preparation request", async ({ page }) => {
  let posts = 0;
  let release: () => void = () => {};
  await page.route("**/api/interviews/9/receipt", (r) => r.fulfill({ json: envelope() }));
  await page.route("**/api/v2/summary-report**", async (r) => {
    if (r.request().method() !== "POST") return r.fulfill({ status: 404, json: {} });
    posts++;
    await new Promise<void>((resolve) => {
      release = resolve;
    });
    await r.fulfill({ json: report });
  });
  await page.goto(url);
  await page.getByRole("button", { name: "Prepare feedback" }).evaluate((button) => {
    (button as HTMLButtonElement).click();
    (button as HTMLButtonElement).click();
  });
  await expect.poll(() => posts).toBe(1);
  release();
  await expect(page).toHaveURL(/report-summary\?interviewId=9/);
  expect(posts).toBe(1);
});
test("rechecking completion during a pending preparation cannot redirect after access fails", async ({
  page,
}) => {
  let denied = false;
  let posts = 0;
  let release: () => void = () => {};
  await page.route("**/api/interviews/9/receipt", (r) =>
    denied ? r.fulfill({ status: 403, json: {} }) : r.fulfill({ json: envelope() })
  );
  await page.route("**/api/v2/summary-report**", async (r) => {
    if (r.request().method() !== "POST") return r.fulfill({ status: 404, json: {} });
    posts++;
    await new Promise<void>((resolve) => {
      release = resolve;
    });
    await r.fulfill({ json: report });
  });
  await page.goto(url);
  await page.getByRole("button", { name: "Prepare feedback" }).click();
  await expect.poll(() => posts).toBe(1);
  denied = true;
  await page.evaluate(() => window.dispatchEvent(new Event("completion-test-refresh")));
  await expect(
    page.getByRole("heading", { name: "Submission could not be verified" })
  ).toBeVisible();
  const response = page.waitForResponse((r) => r.request().method() === "POST");
  release();
  await response;
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      )
  );
  await expect(page).toHaveURL(/fixture=completed/);
});
