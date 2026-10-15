import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useInterviewSessionLease } from "@/hooks/useInterviewSessionLease";

const mocks = vi.hoisted(() => ({
  claim: vi.fn(),
  heartbeat: vi.fn(),
}));

vi.mock("@/lib/api-config/src/client", () => ({
  createApiClient: () => ({
    useMutation: ({ url }: { url: string }) => ({
      mutateAsync: url.includes("heartbeat") ? mocks.heartbeat : mocks.claim,
    }),
  }),
}));

const token = "lease-token-12345678901234567890";
const replacementToken = "replacement-token-123456789012345";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

function response(state: "acquired" | "renewed" | "taken_over" = "acquired") {
  return {
    interviewId: 7,
    leaseToken: token,
    leaseExpiresAt: new Date(Date.now() + 90_000).toISOString(),
    state,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  window.sessionStorage.clear();
  mocks.claim.mockResolvedValue(response());
  mocks.heartbeat.mockResolvedValue(response("renewed"));
  Object.defineProperty(navigator, "locks", { configurable: true, value: undefined });
});

afterEach(() => {
  vi.useRealTimers();
});

it("claims a Practice interview and restores the token through session storage", async () => {
  const { result } = renderHook(() => useInterviewSessionLease({ interviewId: 7, enabled: true }));

  await waitFor(() => expect(result.current.status).toBe("active"));
  expect(result.current.canWrite).toBe(true);
  expect(result.current.token).toBe(token);
  expect(window.sessionStorage.getItem("samvaad:interview-lease:7")).toBe(token);
  expect(mocks.claim).toHaveBeenCalledWith({ interviewId: 7, force: false });
});

it("presents a stored token when reconnecting after refresh", async () => {
  window.sessionStorage.setItem("samvaad:interview-lease:7", token);
  renderHook(() => useInterviewSessionLease({ interviewId: 7, enabled: true }));

  await waitFor(() =>
    expect(mocks.claim).toHaveBeenCalledWith({
      interviewId: 7,
      leaseToken: token,
      force: false,
    })
  );
});

it("blocks a duplicate browser tab before it calls the server", async () => {
  Object.defineProperty(navigator, "locks", {
    configurable: true,
    value: {
      request: vi.fn(
        async (
          _name: string,
          _options: { ifAvailable: true },
          callback: (lock: null) => Promise<void>
        ) => callback(null)
      ),
    },
  });
  const { result } = renderHook(() => useInterviewSessionLease({ interviewId: 7, enabled: true }));

  await waitFor(() => expect(result.current.status).toBe("conflict"));
  expect(result.current.canWrite).toBe(false);
  expect(mocks.claim).not.toHaveBeenCalled();
});

it("uses an explicit forced claim when the student chooses this device", async () => {
  mocks.claim
    .mockRejectedValueOnce({
      response: { data: { detail: { code: "SESSION_ACTIVE_ELSEWHERE" } } },
    })
    .mockResolvedValueOnce(response("taken_over"));
  const { result } = renderHook(() => useInterviewSessionLease({ interviewId: 7, enabled: true }));
  await waitFor(() => expect(result.current.status).toBe("conflict"));

  await act(() => result.current.takeOver());

  expect(result.current.status).toBe("active");
  expect(mocks.claim).toHaveBeenLastCalledWith({ interviewId: 7, force: true });
});

it("heartbeats when a backgrounded interview becomes visible again", async () => {
  const { result } = renderHook(() => useInterviewSessionLease({ interviewId: 7, enabled: true }));
  await waitFor(() => expect(result.current.status).toBe("active"));
  Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });

  await act(async () => {
    document.dispatchEvent(new Event("visibilitychange"));
  });

  expect(mocks.heartbeat).toHaveBeenCalledWith({ interviewId: 7, leaseToken: token });
});

it("moves to conflict when the server says this token was replaced", async () => {
  const { result } = renderHook(() => useInterviewSessionLease({ interviewId: 7, enabled: true }));
  await waitFor(() => expect(result.current.status).toBe("active"));
  mocks.heartbeat.mockRejectedValueOnce({
    response: { data: { detail: { code: "SESSION_LEASE_REPLACED" } } },
  });
  Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });

  await act(async () => {
    document.dispatchEvent(new Event("visibilitychange"));
  });

  expect(result.current.status).toBe("conflict");
  expect(result.current.canWrite).toBe(false);
});

it("ignores a late old-token heartbeat after a successful takeover", async () => {
  const oldHeartbeat = deferred<ReturnType<typeof response>>();
  mocks.heartbeat.mockReturnValueOnce(oldHeartbeat.promise);
  mocks.claim.mockResolvedValueOnce(response()).mockResolvedValueOnce({
    ...response("taken_over"),
    leaseToken: replacementToken,
  });
  const { result } = renderHook(() => useInterviewSessionLease({ interviewId: 7, enabled: true }));
  await waitFor(() => expect(result.current.status).toBe("active"));
  Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
  act(() => document.dispatchEvent(new Event("visibilitychange")));
  await waitFor(() => expect(mocks.heartbeat).toHaveBeenCalledTimes(1));

  await act(() => result.current.takeOver());
  expect(result.current.token).toBe(replacementToken);
  await act(async () => {
    oldHeartbeat.reject({
      response: { data: { detail: { code: "SESSION_LEASE_REPLACED" } } },
    });
  });

  expect(result.current.status).toBe("active");
  expect(result.current.token).toBe(replacementToken);
});
