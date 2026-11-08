import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { StudentMessages } from "@/components/workspace/StudentMessages";

const state = vi.hoisted(() => ({ data: {} as unknown, isError: false, mutate: vi.fn() }));

vi.mock("@/lib/api-config", () => ({
  apiClient: {
    useQuery: () => ({ data: state.data, isError: state.isError }),
    useMutation: () => ({ mutate: state.mutate }),
  },
}));

afterEach(cleanup);

beforeEach(() => {
  state.isError = false;
  state.mutate.mockClear();
  state.data = {
    items: [
      { id: 7, title: "Your next practice is waiting", body: "A short practice today.", href: "/" },
      { id: 8, title: "Bad link", body: null, href: "https://evil.example" },
    ],
  };
});

it("shows a reminder and marks it read when dismissed", () => {
  render(<StudentMessages accountKey="a" />);
  expect(screen.getByText("Your next practice is waiting")).toBeInTheDocument();
  fireEvent.click(screen.getAllByRole("button", { name: "Dismiss" })[0]);
  expect(state.mutate).toHaveBeenCalledTimes(1);
  expect(screen.queryByText("Your next practice is waiting")).toBeNull();
});

it("never follows a link to another site", () => {
  render(<StudentMessages accountKey="a" />);
  expect(screen.queryByRole("link")).toBeNull();
});

it("stays out of the way when messages cannot be loaded", () => {
  state.isError = true;
  const { container } = render(<StudentMessages accountKey="a" />);
  expect(container).toBeEmptyDOMElement();
});
