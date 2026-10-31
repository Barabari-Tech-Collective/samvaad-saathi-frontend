import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { AssessmentReviews } from "@/components/integrity-review/AssessmentReviews";

const fixture = vi.hoisted(() => ({
  query: {
    data: undefined as unknown,
    isError: false,
    isFetching: false,
    refetch: vi.fn(),
  },
  mutateAsync: vi.fn(),
  revision: 1,
}));

vi.mock("@/lib/api-config/src/instance", () => ({
  apiClient: {
    useQuery: () => fixture.query,
    useMutation: () => ({ mutateAsync: fixture.mutateAsync }),
  },
}));
vi.mock("@/lib/auth-session", () => ({ getAuthRevision: () => fixture.revision }));

const review = {
  id: 7,
  interview_id: 42,
  state: "decided",
  outcome: "concern",
  version: 3,
  appeal_deadline: "2026-12-01T12:00:00Z",
  can_appeal: true,
  can_explain: false,
  history: [
    {
      kind: "decide",
      reason: "Shared human observation requires review.",
      at: "2026-10-21T10:00:00Z",
      outcome: "concern",
    },
  ],
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((yes) => {
    resolve = yes;
  });
  return { promise, resolve };
}

beforeEach(() => {
  vi.clearAllMocks();
  fixture.revision = 1;
  fixture.query = {
    data: { items: [review], total: 1, notice: "Formal review" },
    isError: false,
    isFetching: false,
    refetch: vi.fn(),
  };
  vi.stubGlobal("crypto", { randomUUID: () => "request-key" });
});
afterEach(() => vi.unstubAllGlobals());

it("fails closed and hides stale review evidence when its response is malformed", () => {
  fixture.query.data = { items: [{ id: 7 }], total: 1, notice: "" };
  render(<AssessmentReviews accountKey="student-1" />);
  expect(screen.getByRole("alert")).toHaveTextContent("could not be verified");
  expect(screen.queryByText(/Shared human observation/)).toBeNull();
});

it("submits a single versioned, idempotent appeal during a rapid double action", async () => {
  const pending = deferred<unknown>();
  fixture.mutateAsync.mockReturnValue(pending.promise);
  render(<AssessmentReviews accountKey="student-1" />);
  fireEvent.change(screen.getByLabelText("Your explanation (10–2,000 characters)"), {
    target: { value: "My connection dropped and I would like an independent review." },
  });
  const submit = screen.getByRole("button", { name: "Submit appeal" });
  fireEvent.click(submit);
  fireEvent.click(submit);
  expect(fixture.mutateAsync).toHaveBeenCalledOnce();
  expect(fixture.mutateAsync).toHaveBeenCalledWith({
    action: "appeal",
    reason: "My connection dropped and I would like an independent review.",
    expected_version: 3,
    request_key: "request-key",
  });
  await act(async () => {
    pending.resolve({});
  });
  expect(fixture.query.refetch).toHaveBeenCalledOnce();
});
