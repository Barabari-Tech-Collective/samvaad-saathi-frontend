import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render as renderBase, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import Onboarding from "@/app/(protected)/onboarding/page";
import { ROLE_OPTIONS, UNIVERSITY_OPTIONS } from "@/lib/constants";

const fixture = vi.hoisted(() => {
  const save = vi.fn();
  return {
    save,
    push: vi.fn(),
    client: () => ({
      useQuery: () => ({ data: { items: [] }, isLoading: false }),
      useMutation: (config: { options?: { onSuccess?: () => void } }) => ({
        isPending: false,
        mutateAsync: async (data: unknown) => {
          const value = await save(data);
          await config.options?.onSuccess?.();
          return value;
        },
      }),
    }),
  };
});
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: fixture.push }) }));
vi.mock("next/image", () => ({
  default: ({ src, alt, width, height }: React.ComponentProps<"img">) => (
    <img src={src} alt={alt} width={width} height={height} />
  ),
}));
vi.mock("react-hot-toast", () => ({
  default: { success: vi.fn(), error: vi.fn(), loading: vi.fn(), dismiss: vi.fn() },
}));
vi.mock("@/lib/api-config", () => ({
  ENDPOINTS: { USERS: { PROFILE: "profile" }, AUTH: { ABOUT_ME: "about" } },
  extractApiErrorMessage: () => "Request failed",
  createApiClient: fixture.client,
}));
vi.mock("@/lib/api-config/src/client", () => ({ createApiClient: fixture.client }));
const render = (ui: React.ReactElement) =>
  renderBase(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>);
const college = UNIVERSITY_OPTIONS.find((x) => x !== "Others") as string;
function answer() {
  fireEvent.change(screen.getByRole("combobox", { name: "What job are you preparing for?" }), {
    target: { value: ROLE_OPTIONS[0] },
  });
  fireEvent.change(screen.getByRole("combobox", { name: "Which college are you from?" }), {
    target: { value: college },
  });
}
beforeEach(() => {
  fixture.save.mockReset();
  fixture.push.mockReset();
});

it("asks only two things and can't be sent half-filled", () => {
  render(<Onboarding />);
  expect(screen.getAllByRole("combobox")).toHaveLength(2);
  expect(screen.getByRole("button", { name: "Start practising" })).toBeDisabled();
});

it("saves both answers once and goes straight to a first practice", async () => {
  fixture.save.mockResolvedValue({});
  render(<Onboarding />);
  answer();
  fireEvent.click(screen.getByRole("button", { name: "Start practising" }));
  await waitFor(() => expect(fixture.save).toHaveBeenCalledOnce());
  expect(fixture.save).toHaveBeenCalledWith({ university: college, target_position: ROLE_OPTIONS[0] });
  await waitFor(() => expect(fixture.push).toHaveBeenCalledWith("/warm-up-chat"));
});

it("takes a typed college when it isn't in the list", async () => {
  fixture.save.mockResolvedValue({});
  render(<Onboarding />);
  answer();
  fireEvent.change(screen.getByRole("combobox", { name: "Which college are you from?" }), {
    target: { value: "Others" },
  });
  expect(screen.getByRole("button", { name: "Start practising" })).toBeDisabled();
  fireEvent.change(screen.getByRole("textbox", { name: "College name" }), {
    target: { value: "Govt College Bhopal" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Start practising" }));
  await waitFor(() =>
    expect(fixture.save).toHaveBeenCalledWith({ university: "Govt College Bhopal", target_position: ROLE_OPTIONS[0] })
  );
});

it("stays on the screen when saving fails, so nothing typed is lost", async () => {
  fixture.save.mockRejectedValue(new Error("no"));
  render(<Onboarding />);
  answer();
  fireEvent.click(screen.getByRole("button", { name: "Start practising" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Start practising" })).toBeEnabled());
  expect(fixture.push).not.toHaveBeenCalled();
  expect(screen.getByRole("combobox", { name: "Which college are you from?" })).toHaveValue(college);
});
