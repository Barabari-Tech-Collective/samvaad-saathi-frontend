import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { parseWhatsAppUpdates } from "@/lib/whatsapp-updates";

// Phase 2D: the student's "WhatsApp updates" switch on the Profile page.

const state = vi.hoisted(() => ({
  query: {
    data: undefined as unknown,
    isError: false,
    isFetching: false,
    error: null as unknown,
    refetch: vi.fn(),
  },
  mutateAsync: vi.fn(),
  setQueryData: vi.fn(),
}));
vi.mock("@/lib/api-config", () => ({
  apiClient: {
    useQuery: () => state.query,
    useMutation: () => ({ mutateAsync: state.mutateAsync }),
  },
}));
vi.mock("@/components/providers/auth-provider", () => ({
  useAuth: () => ({ user: { userId: 7 } }),
}));
vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ setQueryData: state.setQueryData }),
}));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("react-hot-toast", () => ({ default: toast }));

import WhatsAppUpdates from "@/components/profile/WhatsAppUpdates";

beforeEach(() => {
  Object.assign(state.query, {
    data: { on: true, decided_at: null },
    isError: false,
    isFetching: false,
    error: null,
  });
  state.mutateAsync.mockReset();
  state.setQueryData.mockReset();
  toast.success.mockReset();
  toast.error.mockReset();
});

describe("parseWhatsAppUpdates", () => {
  it("reads on and the decision time", () => {
    expect(parseWhatsAppUpdates({ on: false, decided_at: "2026-11-19T10:00:00Z" })).toEqual({
      on: false,
      decided_at: "2026-11-19T10:00:00Z",
    });
  });
  it("never treats an unexpected answer as on", () => {
    expect(parseWhatsAppUpdates({ on: "yes" })).toBeNull();
    expect(parseWhatsAppUpdates(null)).toBeNull();
  });
});

describe("WhatsAppUpdates", () => {
  it("shows the switch on by default and explains STOP", () => {
    render(<WhatsAppUpdates />);
    expect(screen.getByRole("switch", { name: "Get WhatsApp updates" })).toBeChecked();
    expect(screen.getByText(/Replying STOP on WhatsApp does the same/)).toBeInTheDocument();
  });

  it("turning it off saves and says how to turn it back on", async () => {
    state.mutateAsync.mockResolvedValue({ on: false, decided_at: "2026-11-19T10:00:00Z" });
    render(<WhatsAppUpdates />);
    fireEvent.click(screen.getByRole("switch", { name: "Get WhatsApp updates" }));
    await waitFor(() => expect(state.mutateAsync).toHaveBeenCalledWith({ on: false }));
    expect(state.setQueryData).toHaveBeenCalledWith(["whatsapp-updates-me", 7], {
      on: false,
      decided_at: "2026-11-19T10:00:00Z",
    });
    expect(toast.success).toHaveBeenCalledWith(expect.stringMatching(/turn them back on/));
  });

  it("a failed save says nothing changed", async () => {
    state.mutateAsync.mockRejectedValue(new Error("503"));
    render(<WhatsAppUpdates />);
    fireEvent.click(screen.getByRole("switch", { name: "Get WhatsApp updates" }));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Your WhatsApp setting was not changed. Please try again."
      )
    );
    expect(state.setQueryData).not.toHaveBeenCalled();
  });

  it("a load error offers to try again", () => {
    Object.assign(state.query, { isError: true, error: { response: { status: 503 } } });
    render(<WhatsAppUpdates />);
    expect(screen.getByRole("alert")).toHaveTextContent("could not be loaded");
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(state.query.refetch).toHaveBeenCalled();
  });

  it("accounts that are not Barabari students see nothing", () => {
    Object.assign(state.query, { isError: true, error: { response: { status: 404 } } });
    const { container } = render(<WhatsAppUpdates />);
    expect(container).toBeEmptyDOMElement();
  });
});
