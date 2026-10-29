import { loginDestination } from "@/lib/login-destination";

export class SessionClientError extends Error {
  constructor(
    public readonly status: number,
    message = "Session request failed. Please try again."
  ) {
    super(message);
    this.name = "SessionClientError";
  }
}
export interface SessionState {
  authenticated: boolean;
  principal: string | null;
  revision: number;
}
type Envelope = Record<string, unknown>;
let clientSequence = 0;

/** Opt-in lifecycle client. Does not activate cookie auth or store bearer credentials. */
export class ServerSessionClient {
  readonly cacheScope = `cookie-client-${++clientSequence}`;
  private readonly base: string;
  private csrf: string | null = null;
  private state: SessionState = { authenticated: false, principal: null, revision: 0 };
  private epoch = 0;
  private listeners = new Set<() => void>();
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  revision = () => this.state.revision;
  private notify(): void {
    this.listeners.forEach((listener) => listener());
  }
  private refreshFlight: Promise<void> | null = null;
  private mutation = false;
  private profileFlight: Promise<SessionProfile> | null = null;

  constructor(
    base: string,
    private readonly transport: typeof fetch = fetch,
    private readonly timeoutMs = 15000
  ) {
    const url = new URL(base);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      /[\\\s]/.test(base)
    ) {
      throw new Error("Session API must use a configured HTTPS URL.");
    }
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new Error("Invalid timeout");
    this.base = url.href.replace(/\/$/, "");
  }

  snapshot(): SessionState {
    return { ...this.state };
  }

  async requestIdentity(): Promise<{ principal: string; csrf: string; revision: number }> {
    if (this.mutation) throw new SessionClientError(409);
    if (!this.state.authenticated) await this.status();
    if (!this.state.authenticated || !this.state.principal || !this.csrf)
      throw new SessionClientError(401);
    return { principal: this.state.principal, csrf: this.csrf, revision: this.state.revision };
  }

  assertIdentity(expected: { principal: string; revision: number }): void {
    if (
      this.mutation ||
      !this.state.authenticated ||
      this.state.principal !== expected.principal ||
      this.state.revision !== expected.revision
    ) {
      throw new SessionClientError(409, "Your session changed. Reload this task.");
    }
  }

  /** Call on a cross-tab account/logout event; re-check status before further work. */
  invalidate(): void {
    this.epoch += 1;
    this.csrf = null;
    this.profileFlight = null;
    this.state = { authenticated: false, principal: null, revision: this.state.revision + 1 };
    this.notify();
  }

  private assertEpoch(expected: number): void {
    if (expected !== this.epoch)
      throw new SessionClientError(409, "Your session changed. Reload this task.");
  }

  private async request(
    path: string,
    method: "GET" | "POST",
    expected: number,
    body?: unknown,
    signal?: AbortSignal
  ): Promise<{ status: number; data: Envelope }> {
    const controller = new AbortController();
    const abort = () => controller.abort();
    if (signal?.aborted) throw new SessionClientError(499, "Request cancelled.");
    signal?.addEventListener("abort", abort, { once: true });
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      this.assertEpoch(expected);
      const headers: Record<string, string> = { Accept: "application/json" };
      if (path === "/auth/session/me" && this.state.principal)
        headers["X-Session-Principal"] = this.state.principal;
      if (body !== undefined) headers["Content-Type"] = "application/json";
      if (method === "POST" && this.csrf) headers["X-CSRF-Token"] = this.csrf;
      // Native browser fetch rejects a class instance as its receiver. Calling
      // through this.transport binds `this` to this client (Illegal invocation).
      const transport = this.transport;
      const response = await transport(this.base + path, {
        method,
        headers,
        credentials: "include",
        cache: "no-store",
        redirect: "error",
        signal: controller.signal,
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      });
      this.assertEpoch(expected);
      if (signal?.aborted) throw new SessionClientError(499, "Request cancelled.");
      const data: unknown = await response.json();
      this.assertEpoch(expected);
      if (signal?.aborted) throw new SessionClientError(499, "Request cancelled.");
      if (!data || typeof data !== "object" || Array.isArray(data))
        throw new SessionClientError(502);
      const envelope = data as Envelope;
      if (
        "token" in envelope ||
        "refresh_token" in envelope ||
        "accessToken" in envelope ||
        "refreshToken" in envelope
      ) {
        throw new SessionClientError(502, "Unexpected session response.");
      }
      return { status: response.status, data: envelope };
    } catch (error) {
      if (signal?.aborted) throw new SessionClientError(499, "Request cancelled.");
      if (error instanceof SessionClientError) throw error;
      throw new SessionClientError(503, "Session service unavailable. Please try again.");
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
    }
  }

  private readCsrf(data: Envelope): string | null {
    if (data.csrf_token === undefined) return null;
    if (typeof data.csrf_token !== "string" || !data.csrf_token || data.csrf_token.length > 128)
      throw new SessionClientError(502);
    return data.csrf_token;
  }

  async restore(): Promise<SessionState> {
    const state = await this.status();
    if (!state.authenticated && this.csrf) {
      await this.refresh();
      return this.snapshot();
    }
    return state;
  }

  async status(): Promise<SessionState> {
    if (this.mutation) throw new SessionClientError(409);
    return this.loadStatus(this.epoch);
  }

  private async loadStatus(expected: number): Promise<SessionState> {
    const { status, data } = await this.request("/auth/session", "GET", expected);
    if (status !== 200 && status !== 401 && status !== 403) throw new SessionClientError(status);
    const csrf = this.readCsrf(data);
    if (
      status === 200 &&
      (data.authenticated !== true ||
        typeof data.principal !== "string" ||
        !data.principal.trim() ||
        data.principal.length > 128 ||
        !csrf)
    ) {
      throw new SessionClientError(502);
    }
    const principal = status === 200 ? (data.principal as string) : null;
    const changed =
      principal !== this.state.principal || (this.csrf !== null && csrf !== this.csrf);
    if (changed) {
      this.epoch += 1;
      this.state.revision += 1;
    }
    this.csrf = csrf;
    this.state = { ...this.state, authenticated: status === 200, principal };
    if (changed) this.notify();
    return this.snapshot();
  }

  async complete(ticket: string): Promise<string> {
    if (!/^[A-Za-z0-9_-]{43}$/.test(ticket)) throw new SessionClientError(400);
    if (this.mutation || this.refreshFlight) throw new SessionClientError(409);
    this.mutation = true;
    this.epoch += 1;
    try {
      // Obtain the current account's CSRF before replacing it, including after reload.
      await this.loadStatus(this.epoch);
      const expected = this.epoch;
      const result = await this.request("/auth/session/complete", "POST", expected, { ticket });
      if (result.status !== 200 || result.data.authenticated !== true)
        throw new SessionClientError(result.status === 200 ? 502 : result.status);
      const csrf = this.readCsrf(result.data);
      if (!csrf) throw new SessionClientError(502);
      this.mutation = false;
      this.invalidate();
      this.csrf = csrf;
      // Do not fabricate identity from completion metadata: load verified status next.
      return loginDestination(
        typeof result.data.return_to === "string" ? result.data.return_to : null
      );
    } finally {
      this.mutation = false;
    }
  }

  refresh(): Promise<void> {
    if (this.refreshFlight) return this.refreshFlight;
    if (this.mutation) return Promise.reject(new SessionClientError(409));
    const run = async () => {
      if (!this.csrf) await this.loadStatus(this.epoch);
      if (!this.csrf) throw new SessionClientError(401);
      const expected = this.epoch;
      const result = await this.request("/auth/session/refresh", "POST", expected);
      if (result.status === 409) {
        // One status check, never retry a possibly consumed refresh token blindly.
        const current = await this.loadStatus(expected);
        if (!current.authenticated)
          throw new SessionClientError(409, "Refresh is still pending. Try again shortly.");
        return;
      }
      if (result.status !== 200 || result.data.refreshed !== true) {
        if (result.status === 401) this.invalidate();
        throw new SessionClientError(result.status === 200 ? 502 : result.status);
      }
      await this.loadStatus(expected);
    };
    this.refreshFlight = run().finally(() => {
      this.refreshFlight = null;
    });
    return this.refreshFlight;
  }

  /** Only the reviewed cookie profile route; callers cannot supply arbitrary URLs. */
  profile(signal?: AbortSignal): Promise<SessionProfile> {
    if (this.mutation) return Promise.reject(new SessionClientError(409));
    // Cancellable callers own their request; they must not cancel another consumer.
    if (!signal && this.profileFlight) return this.profileFlight.then(copyProfile);
    const run = async (): Promise<SessionProfile> => {
      if (signal?.aborted) throw new SessionClientError(499, "Request cancelled.");
      if (!this.state.authenticated) await this.status();
      if (signal?.aborted) throw new SessionClientError(499, "Request cancelled.");
      if (!this.state.authenticated) throw new SessionClientError(401);
      const expected = this.epoch;
      let result = await this.request("/auth/session/me", "GET", expected, undefined, signal);
      if (result.status === 401) {
        await this.refresh();
        this.assertEpoch(expected);
        if (signal?.aborted) throw new SessionClientError(499, "Request cancelled.");
        result = await this.request("/auth/session/me", "GET", expected, undefined, signal);
      }
      if (result.status !== 200) {
        if (result.status === 401 || result.status === 403) this.invalidate();
        throw new SessionClientError(result.status);
      }
      return parseProfile(result.data);
    };
    if (signal) return run();
    const flight = run().finally(() => {
      if (this.profileFlight === flight) this.profileFlight = null;
    });
    this.profileFlight = flight;
    return flight.then(copyProfile);
  }

  async logout(globally = false): Promise<void> {
    if (this.mutation) throw new SessionClientError(409);
    this.mutation = true;
    this.epoch += 1; // Discard responses from reads/refresh already in progress.
    try {
      if (!this.csrf) await this.loadStatus(this.epoch);
      const result = await this.request(
        globally ? "/auth/session/logout-all" : "/auth/session/logout",
        "POST",
        this.epoch
      );
      if (
        result.status !== 200 ||
        result.data.authenticated !== false ||
        (globally && result.data.globally_revoked !== true)
      )
        throw new SessionClientError(result.status === 200 ? 502 : result.status);
      this.mutation = false;
      this.invalidate();
    } finally {
      this.mutation = false;
    }
  }
}

export interface SessionProfile {
  userId: number;
  authorizedUser: {
    email: string;
    name: string;
    isOnboarded: boolean;
    isAdmin: boolean;
    isSuperAdmin: boolean;
    canEdit: boolean;
    canCreateRoles: boolean;
    totalAttempts: number;
    membershipRoles: string[];
    createdAt?: string;
    degree?: string | null;
    university?: string | null;
    targetPosition?: string | null;
    yearsExperience?: number | null;
    hasResume?: boolean;
    onboardingResumeFilename?: string | null;
    atsResumeFilename?: string | null;
    atsResumeId?: number | null;
    canUseBulkAts?: boolean;
    role?: string | null;
  };
}

function copyProfile(value: SessionProfile): SessionProfile {
  return {
    ...value,
    authorizedUser: {
      ...value.authorizedUser,
      membershipRoles: [...value.authorizedUser.membershipRoles],
    },
  };
}

function parseProfile(data: Envelope): SessionProfile {
  const raw = data.authorizedUser;
  if (
    !Number.isSafeInteger(data.userId) ||
    (data.userId as number) <= 0 ||
    !raw ||
    typeof raw !== "object" ||
    Array.isArray(raw)
  )
    throw new SessionClientError(502);
  const user = raw as Envelope;
  if (["token", "refresh_token", "accessToken", "refreshToken"].some((key) => key in user))
    throw new SessionClientError(502, "Unexpected credentials in profile response.");
  if (
    typeof user.email !== "string" ||
    !user.email.trim() ||
    typeof user.name !== "string" ||
    !user.name.trim()
  )
    throw new SessionClientError(502);
  for (const key of ["isOnboarded", "isAdmin", "isSuperAdmin", "canEdit", "canCreateRoles"]) {
    if (typeof user[key] !== "boolean") throw new SessionClientError(502);
  }
  if (
    !Number.isSafeInteger(user.totalAttempts) ||
    (user.totalAttempts as number) < 0 ||
    !Array.isArray(user.membershipRoles) ||
    !user.membershipRoles.every((role) => typeof role === "string")
  )
    throw new SessionClientError(502);
  const extra: Partial<SessionProfile["authorizedUser"]> = {};
  for (const field of [
    "createdAt",
    "degree",
    "university",
    "targetPosition",
    "onboardingResumeFilename",
    "atsResumeFilename",
    "role",
  ] as const) {
    if (!(field in user)) continue;
    const value = user[field];
    if (value !== null && typeof value !== "string") throw new SessionClientError(502);
    if (field === "createdAt") {
      if (typeof value !== "string" || !Number.isFinite(Date.parse(value)))
        throw new SessionClientError(502);
      extra.createdAt = value;
    } else extra[field] = value as string | null;
  }
  for (const field of ["hasResume", "canUseBulkAts"] as const) {
    if (field in user) {
      if (typeof user[field] !== "boolean") throw new SessionClientError(502);
      extra[field] = user[field] as boolean;
    }
  }
  for (const field of ["yearsExperience", "atsResumeId"] as const) {
    if (!(field in user)) continue;
    const value = user[field];
    if (
      value !== null &&
      (typeof value !== "number" ||
        !Number.isFinite(value) ||
        value < 0 ||
        (field === "atsResumeId" && (!Number.isSafeInteger(value) || value === 0)))
    )
      throw new SessionClientError(502);
    extra[field] = value as number | null;
  }
  // Explicit projection: unknown server fields never become client authorization flags.
  return {
    userId: data.userId as number,
    authorizedUser: {
      ...extra,
      email: user.email,
      name: user.name,
      isOnboarded: user.isOnboarded as boolean,
      isAdmin: user.isAdmin as boolean,
      isSuperAdmin: user.isSuperAdmin as boolean,
      canEdit: user.canEdit as boolean,
      canCreateRoles: user.canCreateRoles as boolean,
      totalAttempts: user.totalAttempts as number,
      membershipRoles: [...user.membershipRoles] as string[],
    },
  };
}
