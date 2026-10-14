"use client";

import { createApiClient, extractApiErrorMessage } from "./src/client";
import { APIService } from "./src/config";
export * from "axios";
export { ENDPOINTS } from "./src/endpoints";
export { createApiClient, extractApiErrorMessage };

export const apiClient = createApiClient(APIService.AUTH);
