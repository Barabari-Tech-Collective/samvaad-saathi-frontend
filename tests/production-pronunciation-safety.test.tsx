import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import Entry from "@/app/(protected)/pronunciation-practice/page";
import Start from "@/app/(protected)/pronunciation-practice/start/page";
import {
  readPronunciationSession,
  validatePronunciationSession,
} from "@/lib/pronunciation-session";
const f = vi.hoisted(() => ({
  params: "difficulty=easy",
  push: vi.fn(),
  create: vi.fn(),
  fetch: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(f.params),
  useRouter: () => ({ push: f.push }),
}));
vi.mock("next/link", () => ({
  default: ({ children, ...props }: React.ComponentProps<"a">) => <a {...props}>{children}</a>,
}));
vi.mock("@/lib/posthog/tracking.utils", () => ({ trackDifficultySelected: vi.fn() }));
vi.mock("@lottiefiles/dotlottie-react", () => ({ DotLottieReact: () => null }));
vi.mock("@/lib/api-config/src/client", () => ({
  createApiClient: () => ({
    useMutation: () => ({ mutateAsync: f.create }),
    useQuery: () => ({ refetch: f.fetch, data: undefined, isFetching: false, isError: false }),
  }),
}));
const valid = {
  practiceId: 1,
  difficulty: "easy",
  words: [{ index: 0, word: "Practice", phonetic: "practice" }],
  totalWords: 1,
  status: "active",
  createdAt: "2026-10-22T00:00:00Z",
};
beforeEach(() => {
  const values = new Map<string, string>();
  vi.stubGlobal("sessionStorage", {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
  });
  f.params = "difficulty=easy";
  vi.clearAllMocks();
  f.create.mockReset();
  f.create.mockResolvedValue(valid);
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
it("prefills a deep link but never creates a session until the learner starts", async () => {
  render(<Entry />);
  expect(screen.getByRole("button", { name: "Easy" })).toHaveAttribute("aria-pressed", "true");
  expect(f.create).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Start practice" }));
  await waitFor(() => expect(f.push).toHaveBeenCalledWith("/pronunciation-practice/start"));
  expect(f.create).toHaveBeenCalledWith({ difficulty: "easy" });
});
it("ignores unsupported URL difficulty", () => {
  f.params = "difficulty=impossible";
  render(<Entry />);
  expect(screen.getByRole("button", { name: "Start practice" })).toBeDisabled();
  expect(f.create).not.toHaveBeenCalled();
});
it("does not create a session when storage is blocked", async () => {
  vi.spyOn(sessionStorage, "setItem").mockImplementation(() => {
    throw new Error("blocked");
  });
  render(<Entry />);
  fireEvent.click(screen.getByRole("button", { name: "Start practice" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("allow browser storage");
  expect(f.create).not.toHaveBeenCalled();
});
it("retries saving the existing result after quota failure without creating twice", async () => {
  const original = sessionStorage.setItem;
  const write = vi.spyOn(sessionStorage, "setItem").mockImplementation(function (
    this: Storage,
    key,
    value
  ) {
    if (key === "pronunciationPracticeData") throw new Error("quota");
    original.call(this, key, value);
  });
  render(<Entry />);
  fireEvent.click(screen.getByRole("button", { name: "Start practice" }));
  await screen.findByRole("button", { name: "Continue practice" });
  write.mockRestore();
  fireEvent.click(screen.getByRole("button", { name: "Continue practice" }));
  await waitFor(() => expect(f.push).toHaveBeenCalledOnce());
  expect(f.create).toHaveBeenCalledOnce();
});
it("deduplicates rapid starts and ignores a response after leaving", async () => {
  let resolve!: (value: typeof valid) => void;
  f.create.mockReturnValue(
    new Promise((done) => {
      resolve = done;
    })
  );
  const view = render(<Entry />);
  const start = screen.getByRole("button", { name: "Start practice" });
  fireEvent.click(start);
  fireEvent.click(start);
  expect(f.create).toHaveBeenCalledOnce();
  view.unmount();
  await act(async () => resolve(valid));
  expect(f.push).not.toHaveBeenCalled();
});
it.each([
  null,
  {},
  { ...valid, words: null },
  { ...valid, totalWords: 10 },
  { ...valid, practiceId: -2 },
  { ...valid, words: [{ index: 4, word: "x", phonetic: "x" }] },
])("rejects malformed stored session %j", (value) => {
  expect(validatePronunciationSession(value)).toBeNull();
});
it("handles unreadable storage and invalid JSON", () => {
  expect(
    readPronunciationSession({
      getItem: () => {
        throw new Error("denied");
      },
    })
  ).toBeNull();
  expect(readPronunciationSession({ getItem: () => "{" })).toBeNull();
});
it("renders a usable recovery action on a direct start link with corrupt storage", async () => {
  sessionStorage.setItem("pronunciationPracticeData", '{"practiceId":1}');
  render(<Start />);
  expect(await screen.findByRole("alert")).toHaveTextContent("could not be read");
  expect(screen.getByRole("link", { name: "Choose a level" })).toHaveAttribute(
    "href",
    "/pronunciation-practice"
  );
  expect(f.fetch).not.toHaveBeenCalled();
});
it("loads valid words immediately, labels the final action accurately, and completes without nested buttons", async () => {
  sessionStorage.setItem("pronunciationPracticeData", JSON.stringify(valid));
  render(<Start />);
  expect(await screen.findByText("Practice", { exact: true })).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Finish practice" }));
  const back = screen.getByRole("link", { name: "Back to practice" });
  expect(back.querySelector("button")).toBeNull();
  expect(back).toHaveAttribute("href", "/practice");
});
