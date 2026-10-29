import React from "react";
import { beforeEach, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
const state = vi.hoisted(() => ({ path: "/home" }));
vi.mock("next/navigation", () => ({ usePathname: () => state.path }));
import ProductNavigation, { centralHome } from "@/components/workspace/ProductNavigation";
beforeEach(() => {
  state.path = "/home";
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});
it("offers hub and new-tab navigation without enabling unbuilt products", () => {
  render(<ProductNavigation />);
  fireEvent.click(screen.getByRole("button", { name: "Products" }));
  expect(screen.getByRole("link", { name: "All products" }).getAttribute("href")).toBe(
    "https://home.barabaricollective.org/products"
  );
  expect(screen.getByRole("link", { name: "All products (new tab)" }).getAttribute("rel")).toBe(
    "noopener noreferrer"
  );
  expect(screen.getAllByRole("link")).toHaveLength(2);
});
it("requires a leave decision for unfinished-task routes even for new tabs", () => {
  state.path = "/profile";
  const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
  render(<ProductNavigation />);
  fireEvent.click(screen.getByRole("button", { name: "Products" }));
  expect(fireEvent.click(screen.getByRole("link", { name: "All products (new tab)" }))).toBe(false);
  expect(confirm).toHaveBeenCalledOnce();
});
it("Escape closes navigation and returns focus", () => {
  render(<ProductNavigation />);
  fireEvent.click(screen.getByRole("button", { name: "Products" }));
  fireEvent.keyDown(screen.getByRole("navigation"), { key: "Escape" });
  expect(screen.queryByRole("navigation")).toBeNull();
  expect(document.activeElement).toBe(screen.getByRole("button", { name: "Products" }));
});
it("does not render a malformed central destination", () => {
  vi.stubEnv("NEXT_PUBLIC_CENTRAL_HOME_ORIGIN", "https://evil.test/?token=secret");
  expect(centralHome()).toBeNull();
});
