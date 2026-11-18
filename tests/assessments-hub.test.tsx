import { render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import AssessmentsHub from "@/components/assessments/AssessmentsHub";

const mocks = vi.hoisted(() => ({ useQuery: vi.fn() }));

vi.mock("next/link", () => ({
  default: ({ children, ...props }: React.ComponentProps<"a">) => <a {...props}>{children}</a>,
}));

vi.mock("@/components/providers/auth-provider", () => ({
  useAuth: () => ({ user: { userId: "student-1" }, loading: false }),
}));

vi.mock("@/lib/api-config", () => ({
  apiClient: { useQuery: mocks.useQuery },
}));

beforeEach(() => {
  mocks.useQuery.mockReturnValue({
    data: { items: [] },
    isError: false,
    isFetching: false,
    refetch: vi.fn(),
  });
});

it("does not offer an AI interview when none is assigned", () => {
  render(<AssessmentsHub />);

  expect(screen.getByRole("heading", { name: "Assessments" })).toBeVisible();
  expect(screen.getByRole("heading", { name: "AI interview" })).toBeVisible();
  expect(screen.getByText(/No AI interview is assigned right now/i)).toBeVisible();
  expect(screen.queryByRole("link", { name: /Open .*AI interview/i })).not.toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Human interview" })).toBeVisible();
  expect(screen.getByRole("link", { name: "View human interviews" })).toHaveAttribute(
    "href",
    "/human-interviews"
  );
  expect(screen.getByText(/only when your placement team has made it available/i)).toBeVisible();
});

it("offers only the verified open AI interview", () => {
  mocks.useQuery.mockReturnValue({
    data: { items: [{ id: 7, job_name: "Backend Developer", phase: "open" }] },
    isError: false,
    isFetching: false,
    refetch: vi.fn(),
  });

  render(<AssessmentsHub />);

  expect(screen.getByRole("link", { name: /Open Backend Developer/i })).toHaveAttribute(
    "href",
    "/interview-start?mode=assessment"
  );
});
