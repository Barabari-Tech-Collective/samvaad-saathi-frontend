import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { FileDragDropZone } from "@/app/(protected)/ai-resume/_components/FileDragDropZone";
it("keeps the file input focusable and announces invalid selection", () => {
  render(<FileDragDropZone file={null} onFileSelect={vi.fn()} />);
  const input = screen.getByLabelText("Choose résumé file");
  expect(input).not.toHaveClass("hidden");
  fireEvent.change(input, { target: { files: [new File([], "empty.pdf")] } });
  expect(screen.getByRole("alert")).toHaveTextContent("empty");
  expect(input).toHaveAttribute("aria-invalid", "true");
});
it("distinguishes local selection from upload and names the replacement action", () => {
  const replace = vi.fn();
  render(<FileDragDropZone file={new File(["test"], "resume.pdf")} onFileSelect={replace} />);
  expect(screen.getByText(/Not uploaded yet/)).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Choose a different résumé file" }));
  expect(replace).toHaveBeenCalledWith(null);
});
