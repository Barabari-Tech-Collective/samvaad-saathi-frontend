import { afterEach, describe, expect, it, vi } from "vitest";
import { ServerSessionClient } from "@/lib/server-session-client";
const ok = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status });
const signed = (principal = "u", csrf = "csrf") => ok({ authenticated: true, principal, csrf_token: csrf });
const anonymous = () => ok({ authenticated: false }, 401);
const make = () => { const fetcher = vi.fn<typeof fetch>(); return { fetcher, client: new ServerSessionClient("https://api.test/v1", fetcher) }; };
afterEach(() => vi.useRealTimers());

describe("server session browser lifecycle", () => {
  it("does not invoke browser fetch with the session client as its receiver", async () => {
    const nativeLikeFetch = function (this: unknown) {
      if (this !== undefined && this !== globalThis) throw new TypeError("Illegal invocation");
      return Promise.resolve(anonymous());
    } as typeof fetch;
    const client = new ServerSessionClient("https://api.test", nativeLikeFetch);
    expect((await client.restore()).authenticated).toBe(false);
  });
  it.each(["http://api.test", "https://user:pass@api.test", "https://api.test/?secret=x", "https://api.test/#x", "https://api.test/ path"])("rejects unsafe base %s", base => {
    expect(() => new ServerSessionClient(base)).toThrow();
  });
  it("sends credentials without bearer authorization and forbids redirects/cache", async () => {
    const {client,fetcher}=make();fetcher.mockResolvedValueOnce(signed());await client.status();
    expect(fetcher.mock.calls[0][0]).toBe("https://api.test/v1/auth/session");
    expect(fetcher.mock.calls[0][1]).toMatchObject({credentials:"include",cache:"no-store",redirect:"error"});
    expect(fetcher.mock.calls[0][1]?.headers).not.toHaveProperty("Authorization");
  });
  it("returns a copy of session metadata", async () => {
    const {client,fetcher}=make();fetcher.mockResolvedValueOnce(signed());const snapshot=await client.status();snapshot.principal="other";
    expect(client.snapshot().principal).toBe("u");
  });
  it("increments revision on account switch", async () => {
    const {client,fetcher}=make();fetcher.mockResolvedValueOnce(signed()).mockResolvedValueOnce(signed("other"));
    const a=await client.status();const b=await client.status();expect(b.revision).toBeGreaterThan(a.revision);
  });
  it("detects replacement sessions for same account using CSRF", async () => {
    const {client,fetcher}=make();fetcher.mockResolvedValueOnce(signed()).mockResolvedValueOnce(signed("u","new"));
    const a=await client.status();expect((await client.status()).revision).toBeGreaterThan(a.revision);
  });
  it("keeps status anonymous on 401", async () => {
    const {client,fetcher}=make();fetcher.mockResolvedValueOnce(anonymous());expect((await client.status()).authenticated).toBe(false);
  });
  it.each([[],null,{authenticated:true},{authenticated:true,principal:"u",csrf_token:"x".repeat(129)}])("rejects malformed status %j", async value => {
    const {client,fetcher}=make();fetcher.mockResolvedValueOnce(ok(value));await expect(client.status()).rejects.toMatchObject({status:502});
  });
  it.each(["token","refresh_token","accessToken","refreshToken"])("rejects leaked credential field %s", async field => {
    const {client,fetcher}=make();fetcher.mockResolvedValueOnce(ok({authenticated:true,principal:"u",csrf_token:"c",[field]:"SECRET"}));await expect(client.status()).rejects.toMatchObject({status:502});
  });
  it("does not expose server errors", async () => {
    const {client,fetcher}=make();fetcher.mockResolvedValueOnce(ok({detail:"SECRET"},503));await expect(client.status()).rejects.not.toThrow("SECRET");
  });
  it("handles invalid JSON without raw response disclosure", async () => {
    const {client,fetcher}=make();fetcher.mockResolvedValueOnce(new Response("SECRET"));await expect(client.status()).rejects.toMatchObject({status:503});
  });
  it("discards delayed status after invalidation", async () => {
    const {client,fetcher}=make();let resolve!:(r:Response)=>void;fetcher.mockReturnValueOnce(new Promise(r=>{resolve=r;}));
    const pending=client.status();client.invalidate();resolve(signed());await expect(pending).rejects.toMatchObject({status:409});expect(client.snapshot().authenticated).toBe(false);
  });
  it("validates ticket before network dispatch", async () => {
    const {client,fetcher}=make();await expect(client.complete("bad")).rejects.toMatchObject({status:400});expect(fetcher).not.toHaveBeenCalled();
  });
  it("hydrates existing CSRF before completion and sanitizes destination", async () => {
    const {client,fetcher}=make();fetcher.mockResolvedValueOnce(signed()).mockResolvedValueOnce(ok({authenticated:true,csrf_token:"new",return_to:"https://evil.test"}));
    expect(await client.complete("t".repeat(43))).toBe("/home");
    expect(fetcher.mock.calls[1][1]?.headers).toHaveProperty("X-CSRF-Token","csrf");expect(client.snapshot().principal).toBeNull();
  });
  it("permits anonymous completion without inventing CSRF", async () => {
    const {client,fetcher}=make();fetcher.mockResolvedValueOnce(anonymous()).mockResolvedValueOnce(ok({authenticated:true,csrf_token:"new",return_to:"/practice"}));
    expect(await client.complete("t".repeat(43))).toBe("/practice");expect(fetcher.mock.calls[1][1]?.headers).not.toHaveProperty("X-CSRF-Token");
  });
  it("blocks concurrent completions", async () => {
    const {client,fetcher}=make();let resolve!:(r:Response)=>void;fetcher.mockReturnValueOnce(new Promise(r=>{resolve=r;}));
    const first=client.complete("t".repeat(43));await expect(client.complete("b".repeat(43))).rejects.toMatchObject({status:409});
    resolve(ok({},503));await expect(first).rejects.toMatchObject({status:503});expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("shares a single refresh flight", async () => {
    const {client,fetcher}=make();fetcher.mockResolvedValueOnce(signed());await client.status();
    fetcher.mockResolvedValueOnce(ok({refreshed:true})).mockResolvedValueOnce(signed());
    const a=client.refresh();const b=client.refresh();expect(a).toBe(b);await a;
    expect(fetcher.mock.calls.filter(([url])=>String(url).endsWith('/refresh'))).toHaveLength(1);
  });
  it("busy refresh checks status once without rotation retry", async () => {
    const {client,fetcher}=make();fetcher.mockResolvedValueOnce(signed());await client.status();
    fetcher.mockResolvedValueOnce(ok({},409)).mockResolvedValueOnce(signed());await client.refresh();expect(fetcher).toHaveBeenCalledTimes(3);
  });
  it("busy and expired refresh does not loop", async () => {
    const {client,fetcher}=make();fetcher.mockResolvedValueOnce(signed());await client.status();fetcher.mockResolvedValueOnce(ok({},409)).mockResolvedValueOnce(anonymous());
    await expect(client.refresh()).rejects.toMatchObject({status:409});expect(fetcher).toHaveBeenCalledTimes(3);
  });
  it("refresh denial clears client identity", async () => {
    const {client,fetcher}=make();fetcher.mockResolvedValueOnce(signed());await client.status();fetcher.mockResolvedValueOnce(ok({},401));
    await expect(client.refresh()).rejects.toMatchObject({status:401});expect(client.snapshot().authenticated).toBe(false);
  });
  it("expired status can supply CSRF for logout after reload", async () => {
    const {client,fetcher}=make();fetcher.mockResolvedValueOnce(ok({authenticated:false,csrf_token:"expired-csrf"},401)).mockResolvedValueOnce(ok({authenticated:false}));
    await client.logout();expect(fetcher.mock.calls[1][1]?.headers).toHaveProperty("X-CSRF-Token","expired-csrf");
  });
  it("failed logout does not claim successful sign-out", async () => {
    const {client,fetcher}=make();fetcher.mockResolvedValueOnce(signed());await client.status();fetcher.mockResolvedValueOnce(ok({},503));
    await expect(client.logout()).rejects.toMatchObject({status:503});expect(client.snapshot().authenticated).toBe(true);
  });
  it("confirmed logout clears identity", async () => {
    const {client,fetcher}=make();fetcher.mockResolvedValueOnce(signed());await client.status();fetcher.mockResolvedValueOnce(ok({authenticated:false}));
    await client.logout();expect(client.snapshot().authenticated).toBe(false);
  });
  it("timeout aborts request with recoverable error", async () => {
    vi.useFakeTimers();const fetcher=vi.fn<typeof fetch>((_,init)=>new Promise((_,reject)=>init?.signal?.addEventListener('abort',()=>reject(new Error('abort')))));
    const client=new ServerSessionClient('https://api.test',fetcher,10);const pending=expect(client.status()).rejects.toMatchObject({status:503});
    await vi.advanceTimersByTimeAsync(11);await pending;
  });
});

it("late refresh cannot restore client state after logout", async () => {
  const {client,fetcher}=make();fetcher.mockResolvedValueOnce(signed());await client.status();
  let finish!:(r:Response)=>void;fetcher.mockReturnValueOnce(new Promise(r=>{finish=r;}));
  const refresh=client.refresh();fetcher.mockResolvedValueOnce(ok({authenticated:false}));await client.logout();
  finish(ok({refreshed:true}));await expect(refresh).rejects.toMatchObject({status:409});expect(client.snapshot().authenticated).toBe(false);
});
it("changed account during response-body parsing rejects stale metadata", async () => {
  const {client,fetcher}=make();let finish!:(v:unknown)=>void;
  fetcher.mockResolvedValueOnce({status:200,json:()=>new Promise(r=>{finish=r;})} as Response);
  const pending=client.status();await Promise.resolve();client.invalidate();finish({authenticated:true,principal:'old',csrf_token:'c'});
  await expect(pending).rejects.toMatchObject({status:409});expect(client.snapshot().principal).toBeNull();
});
it("concurrent status cannot run during completion", async () => {
  const {client,fetcher}=make();let finish!:(r:Response)=>void;fetcher.mockReturnValueOnce(new Promise(r=>{finish=r;}));
  const pending=client.complete('t'.repeat(43));await expect(client.status()).rejects.toMatchObject({status:409});
  finish(ok({},503));await expect(pending).rejects.toMatchObject({status:503});
});

it("global logout requires explicit central confirmation", async () => {
  const {client,fetcher}=make();fetcher.mockResolvedValueOnce(signed());await client.status();fetcher.mockResolvedValueOnce(ok({authenticated:false}));
  await expect(client.logout(true)).rejects.toMatchObject({status:502});
  expect(fetcher.mock.calls[1][0]).toBe("https://api.test/v1/auth/session/logout-all");
});
it("confirmed global logout clears client identity", async () => {
  const {client,fetcher}=make();fetcher.mockResolvedValueOnce(signed());await client.status();fetcher.mockResolvedValueOnce(ok({authenticated:false,globally_revoked:true}));
  await client.logout(true);expect(client.snapshot().authenticated).toBe(false);
});
