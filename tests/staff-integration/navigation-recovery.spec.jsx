import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { Pagination } from "../../../sampark-saathi frontend/src/components/ui/pagination";
import { RoleCreationStepper } from "../../../sampark-saathi frontend/src/app/dashboard/samvaad/roles/new/_components/RoleCreationStepper";
import { SuccessStep } from "../../../sampark-saathi frontend/src/app/dashboard/samvaad/roles/new/_components/SuccessStep";
const state = vi.hoisted(() => ({ owner: "owner-a", push: vi.fn() }));
vi.mock("../../../sampark-saathi frontend/node_modules/next/navigation.js", () => ({
  useRouter: () => ({ push: state.push }),
}));
vi.mock("@/lib/api/hooks/useOwner", () => ({
  useMe: () => ({ me: { uniqueId: state.owner }, isLoadingMe: false }),
}));
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let root, container;
function storage() {
  const values = new Map();
  return {
    getItem: vi.fn((key) => values.get(key) ?? null),
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
    clear: () => values.clear(),
  };
}
beforeEach(() => {
  vi.stubGlobal("localStorage", storage());
  vi.stubGlobal("sessionStorage", storage());
  localStorage.clear();
  sessionStorage.clear();
  state.owner = "owner-a";
  state.push.mockClear();
});
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  container?.remove();
  root = undefined;
  vi.restoreAllMocks();
});
async function render(ui) {
  if (!root) {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  }
  await act(async () => root.render(ui));
}
const buttons = () => [...container.querySelectorAll("button")];
it("bounds large pagination and displays both missing ranges", async () => {
  await render(<Pagination page={500} totalPages={1000000} onPageChange={() => {}} />);
  expect(buttons()).toHaveLength(7);
  expect(container.textContent.match(/…/g)).toHaveLength(2);
  expect(container.querySelector('[aria-current="page"]').textContent).toBe("500");
});
it("retains adjacent pages at the start", async () => {
  await render(<Pagination page={1} totalPages={10} onPageChange={() => {}} />);
  expect(buttons().some((b) => b.textContent === "2")).toBe(true);
  expect(buttons()[0].disabled).toBe(true);
});
it("retains adjacent pages at the end", async () => {
  await render(<Pagination page={10} totalPages={10} onPageChange={() => {}} />);
  expect(buttons().some((b) => b.textContent === "9")).toBe(true);
  expect(buttons().at(-1).disabled).toBe(true);
});
it("clamps stale page values and dispatches valid page numbers", async () => {
  const change = vi.fn();
  await render(<Pagination page={99} totalPages={3} onPageChange={change} />);
  await act(async () => buttons()[0].click());
  expect(change).toHaveBeenCalledWith(2);
});
it.each([0, 1, NaN, Infinity, 2.5])(
  "does not render invalid or single-page navigation (%s)",
  async (total) => {
    await render(<Pagination page={1} totalPages={total} onPageChange={() => {}} />);
    expect(buttons()).toHaveLength(0);
  }
);
it("disables all pagination controls while loading", async () => {
  await render(<Pagination page={2} totalPages={5} disabled onPageChange={() => {}} />);
  expect(buttons().every((b) => b.disabled)).toBe(true);
});
it("offers semantic step buttons and identifies the current step", async () => {
  const click = vi.fn();
  await render(<RoleCreationStepper currentStep={2} onStepClick={click} />);
  const steps = [...container.querySelectorAll("nav button")];
  expect(steps).toHaveLength(6);
  expect(steps[3].disabled).toBe(true);
  expect(steps[2].getAttribute("aria-current")).toBe("step");
  await act(async () => steps[0].click());
  expect(click).toHaveBeenCalledWith(0);
});
it("survives unavailable draft storage", async () => {
  localStorage.getItem.mockImplementation(() => {
    throw new Error("blocked");
  });
  await render(<RoleCreationStepper currentStep={1} onStepClick={() => {}} />);
  const steps = [...container.querySelectorAll("nav button")];
  expect(steps[0].disabled).toBe(false);
  expect(steps[2].disabled).toBe(true);
});
const receipt = () => ({
  ownerId: "owner-a",
  confirmedAt: Date.now(),
  roleName: "Designer",
  totalQuestions: 4,
  activeLevels: 2,
  submittedDate: "25 October 2026",
  status: "Under Review",
});
it.each(["missing", "malformed", "other-account", "expired", "invalid-count"])(
  "recovers without fabricated success for %s receipt",
  async (kind) => {
    let value = receipt();
    if (kind === "other-account") value.ownerId = "owner-b";
    if (kind === "expired") value.confirmedAt = 1;
    if (kind === "invalid-count") value.totalQuestions = -1;
    if (kind !== "missing")
      sessionStorage.setItem(
        "samvaad_saathi_last_submission",
        kind === "malformed" ? "bad" : JSON.stringify(value)
      );
    localStorage.setItem("samvaad_saathi_draft_role", "keep draft");
    await render(<SuccessStep />);
    expect(container.textContent).toContain("Check your role status");
    expect(container.textContent).not.toContain("Role submitted successfully");
    expect(localStorage.getItem("samvaad_saathi_draft_role")).toBe("keep draft");
  }
);
it("shows a valid receipt only to its owner and hides it after account switch", async () => {
  sessionStorage.setItem("samvaad_saathi_last_submission", JSON.stringify(receipt()));
  await render(<SuccessStep />);
  expect(container.textContent).toContain("Designer");
  state.owner = "owner-b";
  await render(<SuccessStep />);
  expect(container.textContent).not.toContain("Designer");
});
