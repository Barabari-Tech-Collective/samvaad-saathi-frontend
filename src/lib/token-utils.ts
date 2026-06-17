/**
 * Token management utilities for handling authentication tokens
 * Using native document.cookie API for universal access (works in axios interceptors)
 */

// Helper function to get token from cookies using native API
export const getTokenFromCookies = (): string | null => {
  if (typeof window !== "undefined") {
    const cookies = document.cookie.split(";");
    const tokenCookie = cookies.find((cookie) => cookie.trim().startsWith("token="));
    if (tokenCookie) {
      return tokenCookie.split("=")[1];
    }
  }
  return null;
};

// Helper function to get refresh token from cookies using native API
export const getRefreshTokenFromCookies = (): string | null => {
  if (typeof window !== "undefined") {
    const cookies = document.cookie.split(";");
    const refreshTokenCookie = cookies.find((cookie) => cookie.trim().startsWith("refresh_token="));
    if (refreshTokenCookie) {
      return refreshTokenCookie.split("=")[1];
    }
  }
  return null;
};

// Helper function to set tokens in cookies using native API
export const setTokensInCookies = (token: string, refreshToken: string) => {
  if (typeof window !== "undefined") {
    // Set token cookie (7 days expiry)
    document.cookie = `token=${token}; path=/; max-age=${
      7 * 24 * 60 * 60
    }; secure; samesite=strict`;
    // Set refresh token cookie (30 days expiry)
    document.cookie = `refresh_token=${refreshToken}; path=/; max-age=${
      30 * 24 * 60 * 60
    }; secure; samesite=strict`;
  }
};

// Helper function to clear tokens from cookies using native API
const clearTokensFromCookies = () => {
  if (typeof window !== "undefined") {
    document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    document.cookie = "refresh_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
  }
};

// Helper function to logout user and clear all tokens
export const logoutUser = () => {
  // Clear all tokens from cookies
  clearTokensFromCookies();

  // Log the logout action
  console.log("User logged out - tokens cleared");

  // Redirect to signup page
  if (typeof window !== "undefined") {
    window.location.href = "/auth/signup";
  }
};
