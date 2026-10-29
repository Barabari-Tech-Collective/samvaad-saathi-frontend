import { afterEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { AddQuestionDialog } from "../../../sampark-saathi frontend/src/app/dashboard/samvaad/roles/new/_components/AddQuestionDialog";
import { EditQuestionDialog } from "../../../sampark-saathi frontend/src/app/dashboard/samvaad/roles/new/_components/EditQuestionDialog";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let root, container;
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  container?.remove(); root = undefined;
});
async function render(ui) {
  if (!root) { container = document.createElement("div"); document.body.append(container); root = createRoot(container); }
  await act(async () => { root.render(ui); });
}
const props = () => ({
  isOpen: true, onClose: vi.fn(), modalText: "Explain your decision", setModalText: vi.fn(),
  modalCategory: "THEORETICAL", setModalCategory: vi.fn(), modalDifficulty: "EASY",
  setModalDifficulty: vi.fn(), onAdd: vi.fn(), onSave: vi.fn(), categories: ["behavioral"],
});
for (const [name, Component] of [["Add question", AddQuestionDialog], ["Edit question", EditQuestionDialog]]) {
  describe(name, () => {
    it("exposes a named dialog, labelled fields and current category", async () => {
      await render(<Component {...props()} />);
      const dialog = document.querySelector('[role="dialog"]');
      expect(document.getElementById(dialog.getAttribute("aria-labelledby")).textContent).toBe(name);
      for (const label of dialog.querySelectorAll("label")) expect(document.getElementById(label.htmlFor)).not.toBeNull();
      expect(dialog.querySelector("textarea").value).toBe("Explain your decision");
      expect(dialog.querySelector("select").value).toBe("THEORETICAL");
      expect([...dialog.querySelectorAll("button")].some(b => b.textContent === "Close")).toBe(true);
    });
    it("blocks blank submissions and pending edits and dismissal", async () => {
      const data = props();
      await render(<Component {...data} modalText="   " />);
      expect([...document.querySelectorAll("button")].find(b => /Save Changes|Add Question/.test(b.textContent)).disabled).toBe(true);
      await render(<Component {...data} disabled />);
      expect(document.querySelector("textarea").disabled).toBe(true);
      expect(document.querySelector("select").disabled).toBe(true);
      expect([...document.querySelectorAll("button")].find(b => b.textContent.includes("Saving")).disabled).toBe(true);
      await act(async () => document.activeElement.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
      expect(data.onClose).not.toHaveBeenCalled();
    });
    it("handles Escape and restores focus to the invoking control", async () => {
      const trigger = document.createElement("button"); document.body.append(trigger); trigger.focus();
      const data = props();
      await render(<Component {...data} />);
      expect(document.querySelector('[role="dialog"]').contains(document.activeElement)).toBe(true);
      await act(async () => document.activeElement.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
      expect(data.onClose).toHaveBeenCalledOnce();
      await render(<Component {...data} isOpen={false} />);
      await act(async () => new Promise(resolve => setTimeout(resolve, 20)));
      expect(document.activeElement).toBe(trigger); trigger.remove();
    });
  });
}
