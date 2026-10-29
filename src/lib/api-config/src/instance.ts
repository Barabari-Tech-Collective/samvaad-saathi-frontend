"use client";
import { createApiClient } from "./client";
import { APIService } from "./config";
export const apiClient = createApiClient(APIService.AUTH);
