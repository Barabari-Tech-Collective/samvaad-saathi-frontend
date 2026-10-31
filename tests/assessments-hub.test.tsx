import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import AssessmentsHub from "@/components/assessments/AssessmentsHub";

vi.mock("next/link", () => ({
  default: ({ children, ...props }: React.ComponentProps<"a">) => <a {...props}>{children}</a>,
}));

it("offers the two distinct assessment round types without inventing an assignment", () => {
  render(<AssessmentsHub />);

  expect(screen.getByRole("heading", { name: "Assessments" })).toBeVisible();
  expect(screen.getByRole("heading", { name: "AI Interview" })).toBeVisible();
  expect(screen.getByRole("link", { name: "Open AI Interview" })).toHaveAttribute(
    "href",
    "/interview-start?mode=assessment"
  );
  expect(screen.getByRole("heading", { name: "Human Interview" })).toBeVisible();
  expect(screen.getByRole("link", { name: "View Human Interviews" })).toHaveAttribute(
    "href",
    "/human-interviews"
  );
  expect(screen.getByText(/only when your placement team has made it available/i)).toBeVisible();
});
