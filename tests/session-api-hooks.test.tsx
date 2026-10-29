import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CookiesProvider } from "react-cookie";
import { ServerSessionClient } from "@/lib/server-session-client";
import { createApiClient } from "@/lib/api-config/src/client";
import { APIService } from "@/lib/api-config/src/config";
const request = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api-config/src/config", () => ({
  APIService: { AUTH: "AUTH" },
  APIServiceV2: {},
  AUTH_BASE_URL: "https://api.test/api",
  createAxiosInstance: () => Object.assign(request, { get: request }),
}));
vi.mock("@/lib/posthog/tracking.utils", () => ({ trackApiError: vi.fn() }));
vi.mock("react-hot-toast", () => ({ default: { success: vi.fn(), error: vi.fn() } }));
const signed = () =>
  new Response(JSON.stringify({ authenticated: true, principal: "u", csrf_token: "csrf" }));
function setup() {
  const session = new ServerSessionClient("https://api.test", vi.fn().mockResolvedValue(signed()));
  const api = createApiClient(APIService.AUTH, session);
  const cache = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <CookiesProvider>
      <QueryClientProvider client={cache}>{children}</QueryClientProvider>
    </CookiesProvider>
  );
  return { session, api, cache, wrapper };
}
beforeEach(() => {
  request.mockReset();
  document.cookie = "token=legacy; path=/";
});
describe("cookie API hook ownership", () => {
  it("does not request while session is anonymous", () => {
    const { api, wrapper } = setup();
    renderHook(() => api.useQuery({ key: ["hub"], url: "practice/hub" }), { wrapper });
    expect(request).not.toHaveBeenCalled();
  });
  it("becomes enabled on verified session status and omits bearer", async () => {
    const { session, api, wrapper } = setup();
    request.mockResolvedValue({ data: { ok: true } });
    const hook = renderHook(() => api.useQuery({ key: ["hub"], url: "practice/hub" }), { wrapper });
    await act(async () => {
      await session.status();
    });
    await waitFor(() => expect(hook.result.current.data).toEqual({ ok: true }));
    expect(request.mock.calls[0][0].headers).not.toHaveProperty("Authorization");
  });
  it("hides old account data after invalidation even with placeholder option", async () => {
    const { session, api, wrapper } = setup();
    await session.status();
    request.mockResolvedValue({ data: { private: "old" } });
    const hook = renderHook(
      () =>
        api.useQuery<{ private: string }>({
          key: ["hub"],
          url: "practice/hub",
          options: { placeholderData: (previous) => previous },
        }),
      { wrapper }
    );
    await waitFor(() => expect(hook.result.current.data).toEqual({ private: "old" }));
    act(() => session.invalidate());
    await waitFor(() => expect(hook.result.current.data).toBeUndefined());
  });
  it("rejects stale mutation closures before dispatch", async () => {
    const { session, api, wrapper } = setup();
    await session.status();
    const hook = renderHook(() => api.useMutation({ url: "interviews/create" }), { wrapper });
    const mutate = hook.result.current.mutateAsync;
    act(() => session.invalidate());
    await expect(mutate({})).rejects.toMatchObject({ status: 409 });
    expect(request).not.toHaveBeenCalled();
  });
  it("rejects late reads after account invalidation", async () => {
    const { session, api } = setup();
    await session.status();
    let finish!: (v: unknown) => void;
    request.mockReturnValue(
      new Promise((r) => {
        finish = r;
      })
    );
    const pending = api.get("practice/hub");
    session.invalidate();
    finish({ data: { private: "old" } });
    await expect(pending).rejects.toMatchObject({ status: 409 });
  });
  it("prevents options from forcing anonymous query dispatch", () => {
    const { api, wrapper } = setup();
    renderHook(
      () => api.useQuery({ key: ["hub"], url: "practice/hub", options: { enabled: true } }),
      { wrapper }
    );
    expect(request).not.toHaveBeenCalled();
  });
  it("isolates independent session clients sharing a query cache", async () => {
    const first = setup();
    await first.session.status();
    const second = new ServerSessionClient("https://api.test", vi.fn().mockResolvedValue(signed()));
    await second.status();
    const api2 = createApiClient(APIService.AUTH, second);
    request.mockResolvedValueOnce({ data: "first" }).mockResolvedValueOnce({ data: "second" });
    const a = renderHook(() => first.api.useQuery({ key: ["hub"], url: "practice/hub" }), {
      wrapper: first.wrapper,
    });
    await waitFor(() => expect(a.result.current.data).toBe("first"));
    const b = renderHook(() => api2.useQuery({ key: ["hub"], url: "practice/hub" }), {
      wrapper: first.wrapper,
    });
    await waitFor(() => expect(b.result.current.data).toBe("second"));
  });
});

it("clears a previous mutation result after session invalidation", async () => {
  const { session, api, wrapper } = setup();
  await session.status();
  request.mockResolvedValue({ data: { private: "old" } });
  const hook = renderHook(() => api.useMutation({ url: "interviews/create" }), { wrapper });
  await act(async () => {
    await hook.result.current.mutateAsync({});
  });
  await waitFor(() => expect(hook.result.current.data).toEqual({ private: "old" }));
  act(() => session.invalidate());
  await waitFor(() => expect(hook.result.current.data).toBeUndefined());
});

it.each([
  ["different URLs", { url: "practice/other" }],
  ["different methods", { method: "post" as const }],
  ["different config parameters", { config: { params: { page: 2 } } }],
])("separates cache entries for %s", async (_label, change) => {
  const { session, api, wrapper } = setup();
  await session.status();
  request.mockResolvedValueOnce({ data: "first" }).mockResolvedValueOnce({ data: "second" });
  const a = renderHook(() => api.useQuery({ key: ["same"], url: "practice/hub" }), { wrapper });
  await waitFor(() => expect(a.result.current.data).toBe("first"));
  const b = renderHook(() => api.useQuery({ key: ["same"], url: "practice/hub", ...change }), {
    wrapper,
  });
  await waitFor(() => expect(b.result.current.data).toBe("second"));
});
it("does not display unverified initial data", () => {
  const { api, wrapper } = setup();
  const h = renderHook(
    () => api.useQuery({ key: ["hub"], url: "practice/hub", options: { initialData: "private" } }),
    { wrapper }
  );
  expect(h.result.current.data).toBeUndefined();
});
it("cancels query transport when the observer unmounts", async () => {
  const { session, api, wrapper } = setup();
  await session.status();
  request.mockReturnValue(new Promise(() => {}));
  const h = renderHook(() => api.useQuery({ key: ["hub"], url: "practice/hub" }), { wrapper });
  await waitFor(() => expect(request).toHaveBeenCalled());
  const signal = request.mock.calls[0][0].signal;
  h.unmount();
  expect(signal.aborted).toBe(true);
});
it("invalidates only this session prefix while composing success callbacks", async () => {
  const { session, api, wrapper, cache } = setup();
  await session.status();
  request.mockResolvedValue({ data: "ok" });
  const spy = vi.spyOn(cache, "invalidateQueries");
  const onSuccess = vi.fn();
  const h = renderHook(
    () =>
      api.useMutation({
        url: "practice/save",
        keyToInvalidate: { queryKey: ["hub"] },
        options: { onSuccess },
      }),
    { wrapper }
  );
  await act(async () => {
    await h.result.current.mutateAsync({});
  });
  expect(spy).toHaveBeenCalledWith({
    queryKey: ["cookie-session", session.cacheScope, session.revision(), "hub"],
  });
  expect(onSuccess).toHaveBeenCalledOnce();
});
it("suppresses stale error and settled callbacks", async () => {
  const { session, api, wrapper } = setup();
  await session.status();
  let fail!: (e: Error) => void;
  request.mockReturnValue(
    new Promise((_, reject) => {
      fail = reject;
    })
  );
  const onError = vi.fn(),
    onSettled = vi.fn();
  const h = renderHook(
    () => api.useMutation({ url: "practice/save", options: { onError, onSettled } }),
    { wrapper }
  );
  let pending!: Promise<unknown>;
  act(() => {
    pending = h.result.current.mutateAsync({}).catch((e) => e);
  });
  await waitFor(() => expect(request).toHaveBeenCalled());
  act(() => session.invalidate());
  await act(async () => {
    fail(new Error("old failure"));
    await pending;
  });
  expect(onError).not.toHaveBeenCalled();
  expect(onSettled).not.toHaveBeenCalled();
});
it("suppresses settled callback if success callback changes account", async () => {
  const { session, api, wrapper } = setup();
  await session.status();
  request.mockResolvedValue({ data: "ok" });
  const onSettled = vi.fn();
  const h = renderHook(
    () =>
      api.useMutation({
        url: "practice/save",
        options: { onSuccess: () => session.invalidate(), onSettled },
      }),
    { wrapper }
  );
  await act(async () => {
    await h.result.current.mutateAsync({});
  });
  expect(onSettled).not.toHaveBeenCalled();
});
it("does not let mutation options replace the owner key", async () => {
  const { session, api, wrapper, cache } = setup();
  await session.status();
  request.mockResolvedValue({ data: "ok" });
  const h = renderHook(
    () => api.useMutation({ url: "practice/save", options: { mutationKey: ["shared"] } }),
    { wrapper }
  );
  await act(async () => {
    await h.result.current.mutateAsync({});
  });
  expect(cache.getMutationCache().getAll()[0].options.mutationKey).toEqual([
    "cookie-session",
    session.cacheScope,
    session.revision(),
    "practice/save",
    "post",
  ]);
});
it("rejects stale optimistic updates before onMutate runs", async () => {
  const { session, api, wrapper } = setup();
  await session.status();
  const onMutate = vi.fn();
  const h = renderHook(() => api.useMutation({ url: "practice/save", options: { onMutate } }), {
    wrapper,
  });
  const mutate = h.result.current.mutateAsync;
  session.invalidate();
  await act(async () => {
    await expect(mutate({})).rejects.toMatchObject({ status: 409 });
  });
  expect(onMutate).not.toHaveBeenCalled();
});
it("suppresses per-call settled callbacks after the success callback changes account", async () => {
  const { session, api, wrapper } = setup();
  await session.status();
  request.mockResolvedValue({ data: "ok" });
  const onSettled = vi.fn();
  const h = renderHook(() => api.useMutation({ url: "practice/save" }), { wrapper });
  await act(async () => {
    await h.result.current.mutateAsync({}, { onSuccess: () => session.invalidate(), onSettled });
  });
  expect(onSettled).not.toHaveBeenCalled();
});
