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
it("offers one plain link to the products hub without enabling unbuilt products", () => {
  render(<ProductNavigation />);
  const links = screen.getAllByRole("link");
  expect(links).toHaveLength(1);
  expect(links[0].getAttribute("href")).toBe("https://home.barabaricollective.org/products");
  expect(screen.queryByRole("button")).toBeNull();
});
it("uses the configured central home for staging", () => {
  vi.stubEnv("NEXT_PUBLIC_CENTRAL_HOME_ORIGIN", "https://staging-sampark.barabaricollective.org");
  render(<ProductNavigation />);
  expect(screen.getByRole("link", { name: "All products" }).getAttribute("href")).toBe(
    "https://staging-sampark.barabaricollective.org/products"
  );
});
it("requires a leave decision for unfinished-task routes", () => {
  state.path = "/profile";
  const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
  render(<ProductNavigation />);
  expect(fireEvent.click(screen.getByRole("link", { name: "All products" }))).toBe(false);
  expect(confirm).toHaveBeenCalledOnce();
});
it("does not render a malformed central destination", () => {
  vi.stubEnv("NEXT_PUBLIC_CENTRAL_HOME_ORIGIN", "https://evil.test/?token=secret");
  expect(centralHome()).toBeNull();
});
