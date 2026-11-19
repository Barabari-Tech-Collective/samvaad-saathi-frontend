import { beforeEach, describe, expect, it, vi } from "vitest";

// Central Auth rotates refresh tokens: each one may be used once.
const auth = vi.hoisted(() => ({
  refresh: "r0",
  used: new Set<string>(),
  issued: 0,
  sent: [] as string[],
  logouts: 0,
}));

vi.mock("@/lib/token-utils", () => ({
  getRefreshTokenFromCookies: () => auth.refresh,
  setTokensInCookies: (_token: string, refresh: string) => {
    auth.refresh = refresh;
  },
  logoutUser: () => {
    auth.logouts += 1;
  },
}));

vi.mock("@/lib/auth-session", () => ({
  getAuthRevision: () => 1,
  assertAuthRevision: () => undefined,
}));

vi.mock("axios", async (importOriginal) => {
  const real = await importOriginal<typeof import("axios")>();
  const post = async (_url: string, body: string) => {
    const token = new URLSearchParams(body).get("refresh_token") ?? "";
    auth.sent.push(token);
    await new Promise((resolve) => setTimeout(resolve, 10));
    if (auth.used.has(token)) {
      throw Object.assign(new Error("reused"), {
        response: { status: 401, data: { error: { code: "INVALID_REFRESH_TOKEN" } } },
      });
    }
    auth.used.add(token);
    auth.issued += 1;
    return { data: { token: `a${auth.issued}`, refresh_token: `r${auth.issued}` } };
  };
  return {
    ...real,
    default: Object.assign(real.default.create.bind(real.default), real.default, { post }),
  };
});

async function expiredClient() {
  const { createAxiosInstance } = await import("@/lib/api-config/src/config");
  const client = createAxiosInstance("http://api.test");
  client.defaults.adapter = async (config) => {
    if (!String(config.headers?.Authorization ?? "").startsWith("Bearer a")) {
      throw Object.assign(new Error("401"), {
        config,
        response: { status: 401, config, data: {} },
      });
    }
    return { data: { ok: true }, status: 200, statusText: "OK", headers: {}, config };
  };
  return client;
}

describe("token refresh when several requests expire together", () => {
  beforeEach(() => {
    Object.assign(auth, { refresh: "r0", used: new Set(), issued: 0, sent: [], logouts: 0 });
  });

  it("refreshes once and retries every request with the new token", async () => {
    const client = await expiredClient();
    const results = await Promise.allSettled([
      client.get("/a"),
      client.get("/b"),
      client.get("/c"),
    ]);
    expect(auth.sent).toEqual(["r0"]);
    expect(auth.logouts).toBe(0);
    expect(results.map((r) => r.status)).toEqual(["fulfilled", "fulfilled", "fulfilled"]);
  });

  it("logs out once when the shared refresh is rejected", async () => {
    auth.used.add("r0");
    const client = await expiredClient();
    const results = await Promise.allSettled([client.get("/a"), client.get("/b")]);
    expect(auth.sent).toEqual(["r0"]);
    expect(auth.logouts).toBe(1);
    expect(results.every((r) => r.status === "rejected")).toBe(true);
  });
});
