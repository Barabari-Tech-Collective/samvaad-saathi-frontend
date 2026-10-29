import axios, { type InternalAxiosRequestConfig } from "axios";
import { ServerSessionClient, SessionClientError } from "@/lib/server-session-client";

type BoundConfig = InternalAxiosRequestConfig & {
  _sessionIdentity?: { principal: string; revision: number };
  _sessionRetried?: boolean;
};

/** Explicit cookie transport. Never applies the legacy bearer-refresh interceptor. */
export function createSessionAxios(baseURL: string, session: ServerSessionClient) {
  const base = new URL(baseURL.endsWith("/") ? baseURL : baseURL + "/");
  if (base.protocol !== "https:" || base.username || base.password || base.search || base.hash) throw new Error("Invalid session API URL");
  const instance = axios.create({ baseURL, withCredentials: true, timeout: 60_000, adapter: "fetch", fetchOptions: { redirect: "error", cache: "no-store" } });
  instance.interceptors.request.use(async raw => {
    const config = raw as BoundConfig;
    if (config.signal?.aborted) throw new axios.CanceledError();
    const path = config.url || "";
    if (config.baseURL !== baseURL || /[\\\s]/.test(path)) throw new SessionClientError(400, "Unsupported API destination.");
    const target = new URL(path, base);
    if (target.origin !== base.origin || !target.pathname.startsWith(base.pathname) || target.username || target.password || target.hash) throw new SessionClientError(400, "Unsupported API destination.");
    // Credential lifecycle endpoints have their own bounded, validated fetch client.
    const relative = target.pathname.slice(base.pathname.length);
    if (target.pathname.includes("%") || !/^(?:me\/(?:resume-storage|resume-operations)\/|practice(?:\/|$)|interviews(?:\/|$)|interviews-with-summary$|users\/profile$|(?:extract-resume|set-active-resume|download-original|save-final-resume|transcribe-whisper|complete-analysis|summary-report)$|(?:tts|audio|final-report|pacing-practice|ai-resume|resume-builder|bulk-ats)(?:\/|$)|v2\/(?:interviews|summary-report|pronunciation|structure-practice|human-interviews|coaching-assignments|integrity|graduation)(?:\/|$)|v2\/job-profiles$|v2\/practice-dashboard\/consents\/me$)/.test(relative)) throw new SessionClientError(400, "Use the session lifecycle client.");
    const identity = await session.requestIdentity();
    if (config.signal?.aborted) throw new axios.CanceledError();
    if (config._sessionIdentity) session.assertIdentity(config._sessionIdentity);
    else config._sessionIdentity = { principal: identity.principal, revision: identity.revision };
    // Axios receives fully qualified, validated destinations; never caller auth settings.
    config.url = target.href;
    config.auth = undefined;
    config.withCredentials = true;
    config.fetchOptions = { ...config.fetchOptions, redirect: "error", cache: "no-store" };
    config.headers.delete("Authorization");
    config.headers.set("X-Session-Principal", identity.principal);
    config.headers.set("Cache-Control", "no-store");
    config.headers.delete("X-CSRF-Token");
    if (!["get", "head", "options"].includes((config.method || "get").toLowerCase())) config.headers.set("X-CSRF-Token", identity.csrf);
    return config;
  });
  instance.interceptors.response.use(response => {
    const identity = (response.config as BoundConfig)._sessionIdentity;
    if (!identity) throw new SessionClientError(502);
    session.assertIdentity(identity);
    return response;
  }, async error => {
    const config = error.config as BoundConfig | undefined;
    if (!config?._sessionIdentity) throw error;
    session.assertIdentity(config._sessionIdentity);
    // Reads only. Never replay a mutation whose server outcome might be ambiguous.
    if (error.response?.status !== 401 || config._sessionRetried || !["get", "head"].includes((config.method || "get").toLowerCase())) throw error;
    config._sessionRetried = true;
    await session.refresh();
    session.assertIdentity(config._sessionIdentity);
    if (config.signal?.aborted) throw new axios.CanceledError();
    return instance(config);
  });
  return instance;
}
