import { expect, it, vi } from "vitest";
import { trackApiError } from "@/lib/posthog/tracking.utils";
const f = vi.hoisted(() => ({ capture: vi.fn(), captureException: vi.fn(), identify: vi.fn() }));
vi.mock("posthog-js", () => ({ default: f }));
it("keeps useful diagnostics without transporting credentials, response bodies or query strings", () => {
  const error = Object.assign(new Error("private resume text"), {
    config: { headers: { Authorization: "Bearer synthetic-secret" }, data: "private answer" },
    response: { data: { email: "private@example.test" } },
  });
  trackApiError(error, {
    endpoint: "/interviews/1?token=synthetic-secret#private",
    method: "POST",
    status_code: 500,
    request_id: "request-1",
    user_id: "private-user",
  });
  expect(f.captureException).toHaveBeenCalledOnce();
  const [sentError, properties] = f.captureException.mock.calls[0];
  expect(sentError).not.toBe(error);
  expect(sentError.message).toBe("API request failed");
  expect(properties).toMatchObject({
    endpoint: "/interviews/1",
    status_code: 500,
    request_id: "request-1",
  });
  expect(JSON.stringify([f.capture.mock.calls, f.captureException.mock.calls])).not.toMatch(
    /synthetic-secret|private/
  );
});

it("strips raw application errors, nested causes, stack and unrestricted context", async () => {
  f.captureException.mockClear();
  const { trackError } = await import("@/lib/posthog/tracking.utils");
  const raw = Object.assign(new Error("private résumé answer"), { cause: { token: "secret" } });
  trackError(raw, {
    error_type: "global_error",
    digest: "secret",
    page: "/private-user",
    payload: raw,
  });
  const [sent, props] = f.captureException.mock.calls[0];
  expect(sent).not.toBe(raw);
  expect(sent.message).toBe("Application operation failed");
  expect(sent.stack).toBeUndefined();
  expect(sent.cause).toBeUndefined();
  expect(props).toEqual({ error_type: "global_error" });
});

it("does not send profile values or free-text report failures", async () => {
  f.capture.mockClear();
  const { trackProfileFieldValueChanged, trackReportGenerationError } =
    await import("@/lib/posthog/tracking.utils");
  trackProfileFieldValueChanged("degree", "private qualification");
  trackReportGenerationError("private answer with token");
  expect(JSON.stringify(f.capture.mock.calls)).not.toMatch(/private|qualification|token/);
});

it("does not send free-text login failures", async () => {
  f.capture.mockClear();
  const { trackLoginFailure } = await import("@/lib/posthog/tracking.utils");
  trackLoginFailure("private@example.test token=secret");
  expect(f.capture).toHaveBeenCalledWith("login_failure", { error_type: "login_failed" });
});

it("identifies with operational flags only, never contact or education data", async () => {
  const { identifyUser } = await import("@/lib/posthog/tracking.utils");
  identifyUser("test-user", {
    email: "private@example.test",
    name: "Private",
    degree: "Private degree",
    is_onboarded: true,
    total_attempts: 2,
    nested: { token: "secret" },
  });
  expect(f.identify).toHaveBeenLastCalledWith("test-user", {
    is_onboarded: true,
    total_attempts: 2,
  });
  identifyUser("test-user", { is_onboarded: "true", total_attempts: NaN });
  expect(f.identify).toHaveBeenLastCalledWith("test-user", {});
});
