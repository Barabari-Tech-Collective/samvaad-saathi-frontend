import { assertAuthRevision, getAuthRevision } from "@/lib/auth-session";
import { getRefreshTokenFromCookies, logoutUser, setTokensInCookies } from "@/lib/token-utils";
import axios, { AxiosError } from "axios";
import { ServerSessionClient } from "@/lib/server-session-client";
import { createSessionAxios } from "@/lib/session-axios";
import { ENDPOINTS } from "./endpoints";

interface ErrorResponse {
  error?: {
    code?: string;
  };
}

// TODO: Move to env variables
export const AUTH_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export enum APIService {
  AUTH = "AUTH",
  USERS = "USERS",
  RESUME = "RESUME",
  INTERVIEWS = "INTERVIEWS",
  TRANSCRIBE = "TRANSCRIBE",
  ANALYSIS = "ANALYSIS",
  TTS = "TTS",
  PACING = "PACING",
}

export enum APIServiceV2 {
  INTERVIEWS = "INTERVIEWS",
}

/**
 * One refresh at a time for the whole tab. When several requests expire together
 * (Home loads a dozen queries at once), each used to start its own refresh with
 * the same refresh token. Central Auth rotates refresh tokens, so every refresh
 * after the first was rejected and logged the student out. Callers now share the
 * refresh already in flight and retry with its token.
 */
let refreshInFlight: Promise<string | null> | null = null;

class RefreshRejected extends Error {}

async function refreshAccessToken(): Promise<string | null> {
  // The refresh belongs to the account that started it; a different account
  // signing in meanwhile must not get these tokens or this logout.
  const startedFor = getAuthRevision();
  const refreshToken = getRefreshTokenFromCookies();
  if (!refreshToken) {
    logoutUser();
    throw new RefreshRejected("No refresh token");
  }
  try {
    // LEGACY - COGNITO, kept for rollback: `${AUTH_BASE_URL}/${ENDPOINTS.AUTH.COGNITO_REFRESH}`
    const refreshResponse = await axios.post(
      `${AUTH_BASE_URL}/${ENDPOINTS.AUTH.SSO_REFRESH}`,
      new URLSearchParams({ refresh_token: refreshToken }).toString(),
      {
        timeout: 15_000,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          accept: "application/json",
        },
        withCredentials: true,
      }
    );
    const { token, refresh_token: nextRefresh } = refreshResponse.data ?? {};
    assertAuthRevision(startedFor);
    if (token && nextRefresh) {
      setTokensInCookies(token, nextRefresh);
      return token as string;
    }
    return null;
  } catch (err: unknown) {
    assertAuthRevision(startedFor);
    const axiosError = err as AxiosError<ErrorResponse>;
    const errorStatus = axiosError.response?.status;
    const errorCode = axiosError.response?.data?.error?.code;
    const confirmedInvalidRefresh =
      errorStatus === 400 ||
      errorStatus === 401 ||
      errorCode === "REFRESH_TOKEN_EXPIRED" ||
      errorCode === "INVALID_REFRESH_TOKEN";

    // A network timeout, 429, or 5xx from Central Auth says nothing about the
    // student's credentials. Clearing their browser in that case creates an
    // unnecessary logout loop when they return to a tab. Keep the existing
    // refresh token so a later request can recover; only a confirmed invalid
    // refresh credential ends the local session (once, not once per request).
    if (confirmedInvalidRefresh) {
      logoutUser();
      throw new RefreshRejected("Refresh token rejected");
    }
    throw err;
  }
}

function sharedRefresh(): Promise<string | null> {
  refreshInFlight ??= refreshAccessToken().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

export const createAxiosInstance = (baseURL: string, session?: ServerSessionClient) => {
  if (session) return createSessionAxios(baseURL, session);
  const axiosInstance = axios.create({
    baseURL,
    timeout: 60000, // 1 minute
    headers: {
      "Content-Type": "application/json",
    },
    withCredentials: true,
  });

  axiosInstance.interceptors.request.use((config) => {
    const expected = getAuthRevision();
    assertAuthRevision(expected);
    // Axios merges configs on retry, so also carry the non-secret revision.
    (config as typeof config & { _authRevision?: number })._authRevision ??= expected;
    assertAuthRevision((config as typeof config & { _authRevision: number })._authRevision);
    return config;
  });
  axiosInstance.interceptors.response.use(
    (response) => {
      assertAuthRevision(
        (response.config as typeof response.config & { _authRevision: number })._authRevision
      );
      return response;
    },
    async (error) => {
      const originalRequest = error.config;
      if (!originalRequest) return Promise.reject(error);
      const expected = originalRequest._authRevision;
      assertAuthRevision(expected);

      // Handle TOKEN_EXPIRED - try to refresh
      if (error?.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        try {
          const token = await sharedRefresh();
          // An old refresh must never overwrite or log out the new account.
          assertAuthRevision(expected);
          if (token && originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${token}`;
          }
          return axiosInstance(originalRequest);
        } catch {
          // Rejected (already logged out once) or Central Auth unreachable (session kept):
          // either way this request reports its original 401.
          assertAuthRevision(expected);
        }
      }

      return Promise.reject(error);
    }
  );

  return axiosInstance;
};
