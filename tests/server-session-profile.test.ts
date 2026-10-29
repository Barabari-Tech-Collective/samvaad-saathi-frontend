import { describe, expect, it, vi } from "vitest";
import { ServerSessionClient } from "@/lib/server-session-client";
const response = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status });
const status = (principal = "u") =>
  response({ authenticated: true, principal, csrf_token: "csrf" });
const profile = () => ({
  userId: 1,
  authorizedUser: {
    email: "u@example.org",
    name: "User",
    isOnboarded: true,
    isAdmin: false,
    isSuperAdmin: false,
    canEdit: false,
    canCreateRoles: false,
    totalAttempts: 2,
    membershipRoles: ["STUDENT"],
  },
});
const setup = () => {
  const fetcher = vi.fn<typeof fetch>();
  return { fetcher, client: new ServerSessionClient("https://api.test", fetcher) };
};
describe("cookie product profile transport", () => {
  it("hydrates status and requests only reviewed profile route", async () => {
    const { client, fetcher } = setup();
    fetcher.mockResolvedValueOnce(status()).mockResolvedValueOnce(response(profile()));
    expect((await client.profile()).userId).toBe(1);
    expect(fetcher.mock.calls[1][0]).toBe("https://api.test/auth/session/me");
    expect(fetcher.mock.calls[1][1]?.headers).toHaveProperty("X-Session-Principal", "u");
  });
  it("anonymous status blocks profile dispatch", async () => {
    const { client, fetcher } = setup();
    fetcher.mockResolvedValueOnce(response({ authenticated: false }, 401));
    await expect(client.profile()).rejects.toMatchObject({ status: 401 });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("shares a profile read and returns independent copies", async () => {
    const { client, fetcher } = setup();
    fetcher.mockResolvedValueOnce(status()).mockResolvedValueOnce(response(profile()));
    const [a, b] = await Promise.all([client.profile(), client.profile()]);
    a.authorizedUser.membershipRoles.push("ADMIN");
    expect(b.authorizedUser.membershipRoles).toEqual(["STUDENT"]);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it("does not retain profile data between calls", async () => {
    const { client, fetcher } = setup();
    fetcher
      .mockResolvedValueOnce(status())
      .mockResolvedValueOnce(response(profile()))
      .mockResolvedValueOnce(response(profile()));
    await client.profile();
    await client.profile();
    expect(fetcher).toHaveBeenCalledTimes(3);
  });
  it("refreshes once on 401 then retries read once", async () => {
    const { client, fetcher } = setup();
    fetcher
      .mockResolvedValueOnce(status())
      .mockResolvedValueOnce(response({}, 401))
      .mockResolvedValueOnce(response({ refreshed: true }))
      .mockResolvedValueOnce(status())
      .mockResolvedValueOnce(response(profile()));
    await client.profile();
    expect(fetcher).toHaveBeenCalledTimes(5);
  });
  it("second 401 cannot cause a retry loop", async () => {
    const { client, fetcher } = setup();
    fetcher
      .mockResolvedValueOnce(status())
      .mockResolvedValueOnce(response({}, 401))
      .mockResolvedValueOnce(response({ refreshed: true }))
      .mockResolvedValueOnce(status())
      .mockResolvedValueOnce(response({}, 401));
    await expect(client.profile()).rejects.toMatchObject({ status: 401 });
    expect(fetcher).toHaveBeenCalledTimes(5);
    expect(client.snapshot().authenticated).toBe(false);
  });
  it.each([403, 409, 429, 500, 503])("does not refresh or retry status %s", async (code) => {
    const { client, fetcher } = setup();
    fetcher
      .mockResolvedValueOnce(status())
      .mockResolvedValueOnce(response({ detail: "PRIVATE" }, code));
    await expect(client.profile()).rejects.toMatchObject({ status: code });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it("does not retry after account changes during refresh", async () => {
    const { client, fetcher } = setup();
    fetcher
      .mockResolvedValueOnce(status())
      .mockResolvedValueOnce(response({}, 401))
      .mockResolvedValueOnce(response({ refreshed: true }))
      .mockResolvedValueOnce(status("other"));
    await expect(client.profile()).rejects.toMatchObject({ status: 409 });
    expect(fetcher).toHaveBeenCalledTimes(4);
  });
  it("pre-aborted request makes no network call", async () => {
    const { client, fetcher } = setup();
    const controller = new AbortController();
    controller.abort();
    await expect(client.profile(controller.signal)).rejects.toMatchObject({ status: 499 });
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("abort after hydration prevents profile dispatch", async () => {
    const { client, fetcher } = setup();
    const controller = new AbortController();
    fetcher.mockImplementationOnce(async () => {
      controller.abort();
      return status();
    });
    await expect(client.profile(controller.signal)).rejects.toMatchObject({ status: 499 });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("inflight abort does not clear authenticated state", async () => {
    const { client, fetcher } = setup();
    fetcher.mockResolvedValueOnce(status());
    await client.status();
    const controller = new AbortController();
    fetcher.mockImplementationOnce(
      (_, init) =>
        new Promise((_, reject) =>
          init?.signal?.addEventListener("abort", () => reject(new Error("aborted")))
        )
    );
    const pending = client.profile(controller.signal);
    controller.abort();
    await expect(pending).rejects.toMatchObject({ status: 499 });
    expect(client.snapshot().authenticated).toBe(true);
  });
  it("invalidation discards late profile result", async () => {
    const { client, fetcher } = setup();
    fetcher.mockResolvedValueOnce(status());
    await client.status();
    let finish!: (r: Response) => void;
    fetcher.mockReturnValueOnce(
      new Promise((r) => {
        finish = r;
      })
    );
    const pending = client.profile();
    client.invalidate();
    finish(response(profile()));
    await expect(pending).rejects.toMatchObject({ status: 409 });
  });
  it.each(["token", "refresh_token", "accessToken", "refreshToken"])(
    "rejects nested credential %s",
    async (key) => {
      const { client, fetcher } = setup();
      fetcher
        .mockResolvedValueOnce(status())
        .mockResolvedValueOnce(
          response({ userId: 1, authorizedUser: { ...profile().authorizedUser, [key]: "SECRET" } })
        );
      await expect(client.profile()).rejects.toMatchObject({ status: 502 });
    }
  );
  it.each([0, -1, 1.5, "1", null])("rejects invalid user id %s", async (userId) => {
    const { client, fetcher } = setup();
    fetcher
      .mockResolvedValueOnce(status())
      .mockResolvedValueOnce(response({ ...profile(), userId }));
    await expect(client.profile()).rejects.toMatchObject({ status: 502 });
  });
  it.each(["isAdmin", "isSuperAdmin", "canEdit", "canCreateRoles", "isOnboarded"])(
    "requires boolean %s",
    async (key) => {
      const { client, fetcher } = setup();
      fetcher
        .mockResolvedValueOnce(status())
        .mockResolvedValueOnce(
          response({ userId: 1, authorizedUser: { ...profile().authorizedUser, [key]: "true" } })
        );
      await expect(client.profile()).rejects.toMatchObject({ status: 502 });
    }
  );
  it.each([
    { totalAttempts: -1 },
    { totalAttempts: 1.5 },
    { membershipRoles: [1] },
    { email: "" },
    { name: "" },
  ])("rejects malformed profile metadata %j", async (patch) => {
    const { client, fetcher } = setup();
    fetcher
      .mockResolvedValueOnce(status())
      .mockResolvedValueOnce(
        response({ userId: 1, authorizedUser: { ...profile().authorizedUser, ...patch } })
      );
    await expect(client.profile()).rejects.toMatchObject({ status: 502 });
  });
  it("projects known fields without trusting arbitrary authorization flags", async () => {
    const { client, fetcher } = setup();
    fetcher
      .mockResolvedValueOnce(status())
      .mockResolvedValueOnce(
        response({ userId: 1, authorizedUser: { ...profile().authorizedUser, canDeleteAll: true } })
      );
    expect((await client.profile()).authorizedUser).not.toHaveProperty("canDeleteAll");
  });
});
