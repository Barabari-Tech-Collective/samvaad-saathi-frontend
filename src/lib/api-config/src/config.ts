import { getRefreshTokenFromCookies, logoutUser, setTokensInCookies } from "@/lib/token-utils";
import axios, { AxiosError } from "axios";
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

export const createAxiosInstance = (baseURL: string) => {
  const axiosInstance = axios.create({
    baseURL,
    timeout: 60000,
    headers: {
      "Content-Type": "application/json",
    },
    withCredentials: true,
  });

  axiosInstance.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;

      // Handle TOKEN_EXPIRED - try to refresh
      if (error?.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        try {
          const refreshToken = getRefreshTokenFromCookies();

          if (!refreshToken) {
            logoutUser();
            return Promise.reject(error);
          }

          // Call refresh endpoint using normal axios with form data
          const refreshResponse = await axios.post(
            `${AUTH_BASE_URL}/${ENDPOINTS.AUTH.COGNITO_REFRESH}`,
            `refresh_token=${refreshToken}`,
            {
              headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                accept: "application/json",
              },
              withCredentials: true,
            }
          );

          // Update tokens in cookies
          if (refreshResponse.data?.token && refreshResponse.data?.refresh_token) {
            setTokensInCookies(refreshResponse.data.token, refreshResponse.data.refresh_token);

            // Update the original request with the new token
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${refreshResponse.data.token}`;
            }
          }

          // Retry original request after refresh
          return axiosInstance(originalRequest);
        } catch (err: unknown) {
          // Check if it's an AxiosError
          if (err && typeof err === "object" && "response" in err) {
            const axiosError = err as AxiosError<ErrorResponse>;
            const errorStatus = axiosError.response?.status;
            const errorCode = axiosError.response?.data?.error?.code;

            if (errorStatus === 401 || errorStatus === 400) {
              console.log("Refresh token expired or invalid, logging out user");
            } else if (
              errorCode === "REFRESH_TOKEN_EXPIRED" ||
              errorCode === "INVALID_REFRESH_TOKEN"
            ) {
              console.log("Refresh token has expired, logging out user");
            } else {
              console.log("Unknown refresh token error, logging out user for security");
            }
          } else {
            console.log("Non-axios error during token refresh, logging out user for security");
          }

          // Logout user and clear all tokens
          logoutUser();
        }
      }

      return Promise.reject(error);
    }
  );

  return axiosInstance;
};
