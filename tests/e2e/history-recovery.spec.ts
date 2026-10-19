import { expect, test } from "@playwright/test";
const item = (interviewId: number, status = "paused", mode: string | null = "practice") => ({
  interviewId,
  track: `Round ${interviewId}`,
  difficulty: "medium",
  status,
  interviewMode: mode,
  createdAt: "2026-10-20T10:00:00Z",
  expiresAt: null,
  knowledgePercentage: 0,
  speechFluencyPercentage: null,
  summaryReportAvailable: false,
});
const report = {
  reportId: "r1",
  reportStatus: "needs_review",
  candidateInfo: {
    name: "Riya",
    interviewDate: "2026-10-20T10:00:00Z",
    roleTopic: "Communication",
  },
  scoreSummary: null,
  questionAnalysis: [],
};

test("history keeps all lifecycle states and explicit interview modes at 320px", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.route("**/api/interviews?*", (route) =>
    route.fulfill({
      json: {
        items: [
          item(9),
          item(8, "active", "assessment"),
          item(7, "completed"),
          item(6, "terminated"),
        ],
        nextCursor: null,
        limit: 20,
      },
    })
  );
  await page.goto("/?fixture=history");
  await expect(page.getByRole("link", { name: "Continue practice" })).toHaveAttribute(
    "href",
    "/interview?interviewId=9&resumed=true&interviewMode=practice"
  );
  await expect(page.getByRole("link", { name: "Open assessment" })).toHaveAttribute(
    "href",
    "/interview?interviewId=8&resumed=true&interviewMode=assessment"
  );
  await page.getByRole("button", { name: "Completed", exact: true }).click();
  await expect(page.getByText("0%", { exact: true })).toBeVisible();
  await expect(page.getByText("Not available", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Open feedback" })).toHaveAttribute(
    "href",
    "/report-summary?interviewId=7"
  );
  await page.getByRole("button", { name: "Closed & other" }).click();
  await expect(page.getByRole("heading", { name: "Round 6" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("failed older-page load preserves previous pages and retries the same cursor", async ({
  page,
}) => {
  let failed = true;
  await page.route("**/api/interviews?*", (route) => {
    if (new URL(route.request().url()).searchParams.has("cursor"))
      return route.fulfill(
        failed
          ? { status: 503, json: { detail: "temporary" } }
          : {
              json: {
                items: [item(4, "completed"), item(3, "expired")],
                nextCursor: null,
                limit: 20,
              },
            }
      );
    return route.fulfill({ json: { items: [item(5), item(4)], nextCursor: 4, limit: 20 } });
  });
  await page.goto("/?fixture=history");
  await page.getByRole("button", { name: "Load older sessions" }).click();
  await expect(page.getByRole("alert")).toContainText("More history could not be loaded");
  await expect(page.getByRole("heading", { name: "Round 5" })).toBeVisible();
  failed = false;
  await page.getByRole("button", { name: "Try loading history again" }).click();
  await expect(page.getByText("3 sessions loaded · 1 in this view")).toBeVisible();
  await page.getByRole("button", { name: "Completed", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Round 4" })).toHaveCount(1);
});

test("access denial hides cached history instead of claiming it is empty", async ({ page }) => {
  let denied = false;
  await page.route("**/api/interviews?*", (route) =>
    route.fulfill(
      denied
        ? { status: 403, json: { detail: "denied" } }
        : { json: { items: [item(5)], nextCursor: null, limit: 20 } }
    )
  );
  await page.goto("/?fixture=history");
  await page.getByRole("heading", { name: "Round 5" }).waitFor();
  denied = true;
  await page.evaluate(() => window.dispatchEvent(new Event("history-test-refresh")));
  await expect(page.getByRole("alert")).toContainText("History access could not be verified");
  await expect(page.getByRole("heading", { name: "Round 5" })).toHaveCount(0);
});

test("stalled cursors give a recoverable error without repeatedly fetching", async ({ page }) => {
  let requests = 0;
  await page.route("**/api/interviews?*", (route) => {
    requests++;
    return route.fulfill({ json: { items: [item(5)], nextCursor: 4, limit: 20 } });
  });
  await page.goto("/?fixture=history");
  await page.getByRole("button", { name: "Load older sessions" }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Round 5" })).toBeVisible();
  expect(requests).toBe(2);
});

test("expired and unverified-mode sessions have no unchecked resume action", async ({ page }) => {
  await page.route("**/api/interviews?*", (route) =>
    route.fulfill({
      json: {
        items: [
          { ...item(5), expiresAt: "2020-01-01T00:00:00Z" },
          item(4, "paused", null),
          item(3, "preparing"),
        ],
        nextCursor: null,
        limit: 20,
      },
    })
  );
  await page.goto("/?fixture=history");
  await expect(page.getByRole("heading", { name: "Round 5" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Continue practice" })).toHaveCount(0);
  await expect(page.getByText(/resume window has ended/)).toBeVisible();
});

test("switching accounts clears accumulated history", async ({ page }) => {
  let switched = false;
  await page.route("**/api/interviews?*", (route) =>
    route.fulfill({ json: { items: switched ? [] : [item(5)], nextCursor: null, limit: 20 } })
  );
  await page.goto("/?fixture=history");
  await page.getByRole("heading", { name: "Round 5" }).waitFor();
  switched = true;
  await page.evaluate(() =>
    window.dispatchEvent(new CustomEvent("practice-test-account", { detail: "2" }))
  );
  await expect(page.getByRole("heading", { name: "Round 5" })).toHaveCount(0);
  await expect(page.getByText("0 sessions loaded · 0 in this view")).toBeVisible();
});

for (const [status, title] of [
  [404, "This report is unavailable"],
  [403, "Report access could not be verified"],
  [503, "Your report could not be loaded"],
] as const) {
  test(`report ${status} is distinct from a confirmed processing state`, async ({ page }) => {
    await page.route("**/api/v2/summary-report/42", (route) =>
      route.fulfill({ status, json: { detail: "unavailable" } })
    );
    await page.route("**/api/interviews/42/receipt", (route) =>
      route.fulfill({ json: { interviewMode: "practice", receipt: null } })
    );
    await page.goto("/?fixture=report&interviewId=42");
    await expect(page.getByRole("heading", { name: title })).toBeVisible();
    await expect(page.getByText("Your report is not ready yet")).toHaveCount(0);
  });
}

test("report retry can recover partial feedback without inventing a score", async ({ page }) => {
  let failed = true;
  await page.route("**/api/v2/summary-report/42", (route) =>
    route.fulfill(failed ? { status: 503, json: { detail: "temporary" } } : { json: report })
  );
  await page.route("**/api/interviews/42/receipt", (route) =>
    route.fulfill({ json: { interviewMode: "assessment", receipt: null } })
  );
  await page.goto("/?fixture=report&interviewId=42");
  await page.getByRole("button", { name: "Try loading report again" }).waitFor();
  failed = false;
  await page.getByRole("button", { name: "Try loading report again" }).click();
  await expect(page.getByRole("heading", { name: "Communication report" })).toBeVisible();
  await expect(page.getByText("Assessment feedback", { exact: true })).toBeVisible();
  await expect(page.getByRole("progressbar")).toHaveCount(0);
  await expect(page.getByText(/An overall score is not available/)).toBeVisible();
});

test("invalid report IDs do not send report or receipt requests", async ({ page }) => {
  let requests = 0;
  await page.route("**/api/**", (route) => {
    requests++;
    return route.fulfill({ status: 500 });
  });
  await page.goto("/?fixture=report&interviewId=1e3");
  await expect(page.getByRole("heading", { name: "Choose a report from History" })).toBeVisible();
  expect(requests).toBe(0);
});

test("a late older-page response cannot reappear after account switching", async ({ page }) => {
  let release: (() => void) | undefined;
  let switched = false;
  await page.route("**/api/interviews?*", async (route) => {
    if (new URL(route.request().url()).searchParams.has("cursor")) {
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      await route
        .fulfill({ json: { items: [item(3)], nextCursor: null, limit: 20 } })
        .catch(() => {});
      return;
    }
    return route.fulfill({
      json: { items: switched ? [] : [item(5)], nextCursor: switched ? null : 5, limit: 20 },
    });
  });
  await page.goto("/?fixture=history");
  await page.getByRole("button", { name: "Load older sessions" }).click();
  await expect.poll(() => !!release).toBe(true);
  switched = true;
  await page.evaluate(() =>
    window.dispatchEvent(new CustomEvent("practice-test-account", { detail: "2" }))
  );
  await expect(page.getByText("0 sessions loaded · 0 in this view")).toBeVisible();
  release!();
  await expect(page.getByRole("heading", { name: "Round 3" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Round 5" })).toHaveCount(0);
});

test("report denial after an account switch removes the previous account's cached feedback", async ({
  page,
}) => {
  let denied = false;
  await page.route("**/api/v2/summary-report/42", (route) =>
    route.fulfill(denied ? { status: 403, json: { detail: "denied" } } : { json: report })
  );
  await page.route("**/api/interviews/42/receipt", (route) =>
    route.fulfill({ json: { interviewMode: "practice", receipt: null } })
  );
  await page.goto("/?fixture=report&interviewId=42");
  await page.getByRole("heading", { name: "Communication report" }).waitFor();
  denied = true;
  await page.evaluate(() =>
    window.dispatchEvent(new CustomEvent("practice-test-account", { detail: "2" }))
  );
  await expect(
    page.getByRole("heading", { name: "Report access could not be verified" })
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Communication report" })).toHaveCount(0);
});

test("an incomplete report response uses recovery instead of crashing or inventing a score", async ({
  page,
}) => {
  await page.route("**/api/v2/summary-report/42", (route) =>
    route.fulfill({ json: { candidateInfo: {}, questionAnalysis: [] } })
  );
  await page.route("**/api/interviews/42/receipt", (route) =>
    route.fulfill({ json: { interviewMode: "practice", receipt: null } })
  );
  await page.goto("/?fixture=report&interviewId=42");
  await expect(
    page.getByRole("heading", { name: "Report details could not be verified" })
  ).toBeVisible();
  await expect(page.getByRole("progressbar")).toHaveCount(0);
});

test("a report that is unavailable does not hide the independently saved submission receipt", async ({
  page,
}) => {
  await page.route("**/api/v2/summary-report/42", (route) =>
    route.fulfill({ status: 404, json: { detail: "not found" } })
  );
  await page.route("**/api/interviews/42/receipt", (route) =>
    route.fulfill({
      json: {
        interviewMode: "assessment",
        receipt: {
          planned: 5,
          answered: 2,
          skipped: 1,
          unresolved: 1,
          unreached: 1,
          reason: "time_limit",
        },
      },
    })
  );
  await page.goto("/?fixture=report&interviewId=42");
  await expect(page.getByRole("heading", { name: "This report is unavailable" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Submission receipt" })).toContainText(
    "5 planned · 2 answers saved"
  );
  await expect(page.getByText(/Time ended before all questions were resolved/)).toBeVisible();
});
