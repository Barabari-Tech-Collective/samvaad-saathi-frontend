import { describe, expect, it } from "vitest";
import { loginDestination } from "@/lib/login-destination";
import { proxy } from "@/proxy";
import { NextRequest } from "next/server";

describe("safe login destination", () => {
  it.each([null, "https://evil.test", "//evil.test", "/%2fevil.test", "/%252fevil.test", "/\\evil.test", "/%0aevil", "/auth/signup", "/%61uth/signup", "/x/../api/logout", "/%zz"])("rejects %s", value => {
    expect(loginDestination(value)).toBe("/home");
  });
  it("preserves a permitted deep link", () => expect(loginDestination("/interview/42?mode=assessment#resume")).toBe("/interview/42?mode=assessment#resume"));
  it("uses home for root", () => expect(loginDestination("/")).toBe("/home"));
});
describe("login route selection", () => {
  it.each(["handoff", "callback"])("preserves %s callbacks despite old cookies", flow => {
    const response = proxy(new NextRequest(`https://product.test/auth/signup?flow=${flow}`, {headers:{cookie:"token=old"}}));
    expect(response.headers.get("location")).toBeNull();
  });
  it("preserves the requested page for a signed-out user", () => {
    const response = proxy(new NextRequest("https://product.test/interview/42?mode=assessment"));
    const target = new URL(response.headers.get("location")!);
    expect(target.pathname).toBe("/auth/signup");
    expect(target.searchParams.get("return_to")).toBe("/interview/42?mode=assessment");
  });
  it("signed-in user can proceed to a protected page", () => {
    const response = proxy(new NextRequest("https://product.test/interview/42", {headers:{cookie:"token=existing"}}));
    expect(response.headers.get("location")).toBeNull();
  });
  it("does not discard a fresh callback when older cookies exist", () => {
    const response = proxy(new NextRequest("https://product.test/auth/signup?token=new&refresh_token=new", {headers:{cookie:"token=old"}}));
    expect(response.headers.get("location")).toBeNull();
  });
  it("signed-in login entry returns to a safe destination", () => {
    const response = proxy(new NextRequest("https://product.test/auth/signup?return_to=%2Freports%2F3", {headers:{cookie:"token=existing"}}));
    expect(new URL(response.headers.get("location")!).pathname).toBe("/reports/3");
  });
  it("signed-in entry cannot redirect offsite", () => {
    const response = proxy(new NextRequest("https://product.test/auth/signup?return_to=https://evil.test", {headers:{cookie:"token=existing"}}));
    expect(response.headers.get("location")).toBe("https://product.test/home");
  });
});

it('keeps isolated session workspace reachable despite legacy cookies', () => {
  const response = proxy(new NextRequest('https://product.test/auth/session-workspace?flow=handoff', {headers:{cookie:'token=old'}}));
  expect(response.headers.get('location')).toBeNull();
});
