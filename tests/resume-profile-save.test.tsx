import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import Page from "@/app/(protected)/ai-resume/final/page";
const f = vi.hoisted(() => ({
  create: vi.fn(),
  get: vi.fn(),
  save: vi.fn(),
  refresh: vi.fn(),
  invalidate: vi.fn(),
  router: { replace: vi.fn(), refresh: vi.fn() },
  file: {},
}));
vi.mock("next/navigation", () => ({
  useRouter: () => f.router,
  useSearchParams: () => new URLSearchParams("templateId=classic"),
}));
vi.mock("next/link", () => ({
  default: ({ children, ...props }: React.ComponentProps<"a">) => <a {...props}>{children}</a>,
}));
vi.mock("@/app/(protected)/ai-resume/_components/resume-provider", () => ({
  useAIResumeContext: () => ({ uploadedFile: f.file, analysisId: "1" }),
}));
vi.mock("@/features/ai-resume/services/resumeBuilderService", () => ({
  useCreateFromTemplate: () => ({ mutateAsync: f.create, isPending: false }),
  useUpdateResume: () => ({ isPending: false, mutate: vi.fn() }),
}));
vi.mock("@/features/ai-resume/services/resumeDocumentService", () => ({
  getResumePdf: f.get,
  saveResumePdfToProfile: f.save,
}));
vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: f.invalidate }),
}));
vi.mock("@/app/(protected)/ai-resume/final/_components/ResumeEditorForm", () => ({
  default: () => <div>Edit form</div>,
}));
beforeEach(() => {
  vi.clearAllMocks();
  f.create.mockResolvedValue({ resumeId: "7", data: { header: { name: "Learner" } } });
  f.get.mockResolvedValue(new Blob(["PDF"], { type: "application/pdf" }));
  f.save.mockResolvedValue(undefined);
  f.invalidate.mockResolvedValue(undefined);
});
it("saves server PDF once even with rapid clicks and locks editing during save", async () => {
  let resolve!: () => void;
  f.save.mockReturnValue(
    new Promise<void>((done) => {
      resolve = done;
    })
  );
  render(<Page />);
  const save = await screen.findByRole("button", { name: "Save Resume" });
  fireEvent.click(save);
  fireEvent.click(save);
  await waitFor(() => expect(f.save).toHaveBeenCalledOnce());
  expect(f.get).toHaveBeenCalledExactlyOnceWith("7", expect.any(Number));
  expect(screen.getByRole("button", { name: "Edit" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Download PDF" })).toBeDisabled();
  await act(async () => resolve());
  expect(f.invalidate).toHaveBeenCalledOnce();
  expect(f.router.refresh).toHaveBeenCalledOnce();
});
it("keeps the draft and offers retry when PDF generation fails", async () => {
  f.get.mockRejectedValueOnce(new Error("offline"));
  render(<Page />);
  fireEvent.click(await screen.findByRole("button", { name: "Save Resume" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Your draft is still here");
  expect(f.save).not.toHaveBeenCalled();
  expect(f.router.refresh).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Save Resume" }));
  await waitFor(() => expect(f.save).toHaveBeenCalledOnce());
});
it("does not fill missing resume fields with fictional sample experience", async () => {
  render(<Page />);
  await screen.findByRole("button", { name: "Save Resume" });
  expect(screen.queryByText(/ANANYA SHARMA|Marketing Intern|TechStartups/)).toBeNull();
});

it("does not upload or refresh when the account changes during PDF preparation", async () => {
  let finish!: (pdf: Blob) => void;
  f.get.mockReturnValue(new Promise<Blob>(resolve => { finish = resolve; }));
  render(<Page />);
  fireEvent.click(await screen.findByRole("button", { name: "Save Resume" }));
  document.cookie = 'token=another-account; path=/';
  await act(async () => finish(new Blob(["PDF"], { type: "application/pdf" })));
  expect(f.save).not.toHaveBeenCalled();
  expect(f.router.refresh).not.toHaveBeenCalled();
  expect(screen.queryByRole("alert")).toBeNull();
  document.cookie = 'token=; max-age=0; path=/';
});
