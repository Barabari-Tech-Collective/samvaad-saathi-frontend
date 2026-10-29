import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { MicPermissionModal } from "@/hooks/useMicPermission";
beforeEach(() => {
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.open = true;
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, "close", {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.open = false;
    },
  });
});
afterEach(() => vi.restoreAllMocks());
it("opens a named native modal and handles Escape cancellation", () => {
  const close = vi.fn();
  const { rerender } = render(
    <MicPermissionModal isOpen onClose={close} onRequestPermission={vi.fn()} />
  );
  const dialog = screen.getByRole("dialog", { name: "Microphone Access Required" });
  expect(dialog).toHaveAccessibleDescription(/record your interview answers/);
  fireEvent(dialog, new Event("cancel", { bubbles: true }));
  expect(close).toHaveBeenCalledOnce();
  rerender(<MicPermissionModal isOpen={false} onClose={close} onRequestPermission={vi.fn()} />);
  expect(screen.queryByRole("dialog")).toBeNull();
});
it("prevents repeated permission requests and announces denial", async () => {
  let resolve!: (value: boolean) => void;
  const request = vi.fn(
    () =>
      new Promise<boolean>((done) => {
        resolve = done;
      })
  );
  render(<MicPermissionModal isOpen onClose={vi.fn()} onRequestPermission={request} />);
  const button = screen.getByRole("button", { name: "Allow microphone access" });
  fireEvent.click(button);
  fireEvent.click(button);
  expect(request).toHaveBeenCalledOnce();
  expect(button).toBeDisabled();
  await act(async () => resolve(false));
  expect(screen.getByRole("alert")).toHaveTextContent("Check your browser settings");
  expect(button).toBeEnabled();
});

import StudioDialog from "@/components/studio/StudioDialog";
it("shared studio dialog opens with its content heading and closes on Escape", () => {
  const close = vi.fn();
  const view = render(
    <StudioDialog labelledBy="guidelines" onClose={close}>
      <h2 id="guidelines">Profile link guidelines</h2>
      <button onClick={close}>Close guidelines</button>
    </StudioDialog>
  );
  const dialog = screen.getByRole("dialog", { name: "Profile link guidelines" });
  fireEvent(dialog, new Event("cancel", { bubbles: true }));
  expect(close).toHaveBeenCalledOnce();
  view.unmount();
  expect(dialog).not.toHaveAttribute("open");
});
