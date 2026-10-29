import { afterEach, expect, it, vi } from "vitest";
import axios, { AxiosError, AxiosHeaders } from "axios";
import { createAxiosInstance } from "@/lib/api-config/src/config";
import { getAuthRevision } from "@/lib/auth-session";
const token = (email: string) => `x.${btoa(JSON.stringify({ email, sub: "access" }))}.x`;
function login(email: string) {
  document.cookie = `token=${token(email)}; path=/`;
  document.cookie = `refresh_token=refresh-${email}; path=/`;
  getAuthRevision();
}
afterEach(() => {
  vi.restoreAllMocks();
  document.cookie = "token=; max-age=0; path=/";
  document.cookie = "refresh_token=; max-age=0; path=/";
  getAuthRevision();
});
it("rejects an old successful response after the account changes", async () => {
  login("a");
  const client = createAxiosInstance("https://example.invalid");
  let release!: () => void;
  client.defaults.adapter = async (config) => {
    await new Promise<void>((resolve) => {
      release = resolve;
    });
    return { data: "A secret", status: 200, statusText: "OK", headers: {}, config };
  };
  const pending = client.get("/report");
  const rejected = expect(pending).rejects.toMatchObject({ name: "SessionChangedError" });
  await vi.waitFor(() => expect(release).toBeDefined());
  login("b");
  release();
  await rejected;
});
it("does not install A's delayed refresh credentials or retry A's request under B", async () => {
  login("a");
  const client = createAxiosInstance("https://example.invalid");
  let resolveRefresh!: (value: unknown) => void;
  vi.spyOn(axios, "post").mockImplementation(
    () =>
      new Promise((resolve) => {
        resolveRefresh = resolve;
      })
  );
  const adapter = vi.fn(async (config) => {
    throw new AxiosError("expired", "ERR_BAD_REQUEST", config, null, {
      data: {},
      status: 401,
      statusText: "Unauthorized",
      headers: new AxiosHeaders(),
      config,
    });
  });
  client.defaults.adapter = adapter;
  const pending = client.get("/report");
  const rejected = expect(pending).rejects.toMatchObject({ name: "SessionChangedError" });
  await vi.waitFor(() => expect(resolveRefresh).toBeDefined());
  login("b");
  resolveRefresh({ data: { token: token("a"), refresh_token: "new-a-refresh" } });
  await rejected;
  expect(document.cookie).toContain(`token=${token("b")}`);
  expect(adapter).toHaveBeenCalledOnce();
});
it("keeps a same-account refresh usable and retries with the new access token", async () => {
  login("a");
  const client = createAxiosInstance("https://example.invalid");
  vi.spyOn(axios, "post").mockResolvedValue({
    data: { token: token("a"), refresh_token: "rotated" },
  });
  let calls = 0;
  client.defaults.adapter = async (config) => {
    calls += 1;
    if (calls === 1)
      throw new AxiosError("expired", "ERR_BAD_REQUEST", config, null, {
        data: {},
        status: 401,
        statusText: "Unauthorized",
        headers: new AxiosHeaders(),
        config,
      });
    return { data: "current report", status: 200, statusText: "OK", headers: {}, config };
  };
  expect((await client.get("/report")).data).toBe("current report");
  expect(calls).toBe(2);
});
it("an old failed refresh cannot log out the replacement account", async () => {
  login("a");
  const client = createAxiosInstance("https://example.invalid");
  let rejectRefresh!: (error: Error) => void;
  vi.spyOn(axios, "post").mockImplementation(
    () =>
      new Promise((_resolve, reject) => {
        rejectRefresh = reject;
      })
  );
  client.defaults.adapter = async (config) => {
    throw new AxiosError("expired", "ERR_BAD_REQUEST", config, null, {
      data: {},
      status: 401,
      statusText: "Unauthorized",
      headers: new AxiosHeaders(),
      config,
    });
  };
  const pending = client.get("/report");
  const rejected = expect(pending).rejects.toMatchObject({ name: "SessionChangedError" });
  await vi.waitFor(() => expect(rejectRefresh).toBeDefined());
  login("b");
  rejectRefresh(new Error("invalid refresh"));
  await rejected;
  expect(document.cookie).toContain(`token=${token("b")}`);
});
