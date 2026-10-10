import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";
export default defineConfig({
  root: fileURLToPath(new URL("./", import.meta.url)),
  resolve: {
    alias: {
      "@/lib/posthog/tracking.utils": fileURLToPath(new URL("./tracking.ts", import.meta.url)),
      "@": fileURLToPath(new URL("../../src", import.meta.url)),
    },
  },
  define: { "process.env.NEXT_PUBLIC_API_BASE_URL": JSON.stringify("/api/") },
  server: { host: "127.0.0.1", port: 4173, strictPort: true },
});
