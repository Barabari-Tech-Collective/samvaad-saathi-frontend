import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemberModal } from "../../../sampark-saathi frontend/src/app/dashboard/samvaad/teams/_components/MemberModal";
const mock = vi.hoisted(() => ({
  patch: vi.fn(),
  post: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}));
vi.mock("@/lib/api/config", () => ({ api: { patch: mock.patch, post: mock.post } }));
vi.mock("@/lib/api/hooks/useCollege", () => ({
  useColleges: () => ({ colleges: [], isLoadingColleges: false }),
}));
vi.mock("../../../sampark-saathi frontend/node_modules/react-hot-toast/dist/index.mjs", () => ({
  toast: { success: mock.success, error: mock.error },
  default: { success: mock.success, error: mock.error },
}));
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let root, container;
beforeEach(() => {
  mock.patch.mockReset();
  mock.error.mockReset();
});
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  container?.remove();
  root = undefined;
});
async function render(props = {}) {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () =>
    root.render(
      <MemberModal
        isOpen
        teamId={1}
        teamName="Placement"
        member={{
          id: 2,
          name: "Test person",
          email: "test@example.test",
          accessRole: "Creator",
          domain: "IT",
        }}
        onOpenChange={() => {}}
        onSuccess={() => {}}
        {...props}
      />
    )
  );
}
const button = (text) =>
  [...document.querySelectorAll("button")].find((b) => b.textContent === text);
it("dispatches one save for rapid repeated clicks and locks dismissal while pending", async () => {
  let finish;
  mock.patch.mockReturnValue(
    new Promise((r) => {
      finish = r;
    })
  );
  const close = vi.fn(),
    saved = vi.fn();
  await render({ onOpenChange: close, onSuccess: saved });
  const save = button("Save Changes");
  await act(async () => {
    save.click();
    save.click();
  });
  expect(mock.patch).toHaveBeenCalledOnce();
  expect(document.querySelector("fieldset").disabled).toBe(true);
  expect(button("Close")).toBeUndefined();
  await act(async () =>
    document.activeElement.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
    )
  );
  expect(close).not.toHaveBeenCalled();
  await act(async () => finish({ data: { id: 2 } }));
  expect(saved).toHaveBeenCalledOnce();
  expect(close).toHaveBeenCalledWith(false);
});
it("preserves entered values and unlocks after failure", async () => {
  mock.patch.mockRejectedValue(new Error("offline"));
  const close = vi.fn();
  await render({ onOpenChange: close });
  await act(async () => button("Save Changes").click());
  expect(document.querySelector("fieldset").disabled).toBe(false);
  expect(document.querySelector("#member-modal-name").value).toBe("Test person");
  expect(close).not.toHaveBeenCalled();
  expect(button("Close")).toBeDefined();
});

it("requires an explicit valid domain for a legacy membership instead of guessing", async () => {
  await render({
    member: {
      id: 2,
      name: "Test person",
      email: "test@example.test",
      accessRole: "Creator",
      domain: "placement",
    },
  });
  await act(async () => button("Save Changes").click());
  expect(mock.patch).not.toHaveBeenCalled();
  expect(mock.error).toHaveBeenCalledWith("Please select a domain");
});
