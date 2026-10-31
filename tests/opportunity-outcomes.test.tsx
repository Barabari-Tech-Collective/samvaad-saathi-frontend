import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import OutcomesPage from "@/app/(protected)/opportunity-outcomes/page";
const f = vi.hoisted(() => ({
  account: 1,
  loading: false,
  query: vi.fn(),
  refetch: vi.fn(),
  response: {} as Record<string, unknown>,
}));
vi.mock("@/components/providers/auth-provider", () => ({
  useAuth: () => ({ user: { userId: f.account }, loading: f.loading }),
}));
vi.mock("@/lib/api-config", () => ({
  apiClient: {
    useQuery: (args: unknown) => {
      f.query(args);
      return { ...f.response, refetch: f.refetch };
    },
  },
}));
const released = {
  opportunity_id: 4,
  revision: 1,
  title: "Developer",
  organisation: "Example",
  decision: "include",
  feedback: "Clear project explanation",
  next_step: "Attend the panel round",
  released_at: "2026-10-31T10:00:00Z",
  reason: "PRIVATE INTERNAL NOTE",
};
beforeEach(() => {
  vi.clearAllMocks();
  f.account = 1;
  f.loading = false;
  f.response = { data: { items: [released] }, isError: false, isFetching: false };
});
it("shows released feedback and next steps without internal notes", () => {
  render(<OutcomesPage />);
  expect(screen.getByText("Shortlisted")).toBeInTheDocument();
  expect(screen.getByText(released.feedback)).toBeInTheDocument();
  expect(screen.getByText(released.next_step)).toBeInTheDocument();
  expect(screen.queryByText(released.reason)).toBeNull();
});
it.each(["isError", "isFetching"])("hides prior results while %s", (state) => {
  f.response[state] = true;
  render(<OutcomesPage />);
  expect(screen.queryByText("Developer")).toBeNull();
  if (state === "isError") expect(screen.getByRole("alert")).toBeInTheDocument();
});
it("binds requests to the current account and hides stale results on account change", () => {
  const { rerender } = render(<OutcomesPage />);
  expect(f.query).toHaveBeenLastCalledWith(
    expect.objectContaining({ key: ["opportunity-outcomes", "1"] })
  );
  f.account = 2;
  f.response = { isFetching: true };
  rerender(<OutcomesPage />);
  expect(f.query).toHaveBeenLastCalledWith(
    expect.objectContaining({ key: ["opportunity-outcomes", "2"] })
  );
  expect(screen.queryByText("Developer")).toBeNull();
});
it("shows a neutral empty state and offers refresh", () => {
  f.response.data = { items: [] };
  render(<OutcomesPage />);
  expect(screen.getByText("No released outcomes yet")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Refresh outcomes" }));
  expect(f.refetch).toHaveBeenCalledOnce();
});
it("does not render malformed unreleased outcomes", () => {
  f.response.data = { items: [{ ...released, released_at: null }] };
  render(<OutcomesPage />);
  expect(screen.queryByText("Developer")).toBeNull();
});
it("does not request results before identity is known", () => {
  f.loading = true;
  render(<OutcomesPage />);
  expect(f.query).not.toHaveBeenCalled();
});
