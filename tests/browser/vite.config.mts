import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";
export default defineConfig({
  oxc: { jsx: { runtime: "automatic" } },
  root: fileURLToPath(new URL("./", import.meta.url)),
  resolve: {
    dedupe: ["react", "react-dom", "@tanstack/react-query"],
    alias: {
      "@lottiefiles/dotlottie-react": fileURLToPath(new URL("./lottie.tsx", import.meta.url)),
      "@/components/providers/auth-provider": fileURLToPath(
        new URL("./practice-auth.ts", import.meta.url)
      ),
      "@/lib/api/config": fileURLToPath(new URL("./workspace-api.tsx", import.meta.url)),
      "@/samvaad/lib/api/hooks/useAuth": fileURLToPath(
        new URL("./workspace-api.tsx", import.meta.url)
      ),
      "@/samvaad/lib/api/hooks/analytics/useJobProfiles": fileURLToPath(
        new URL("./workspace-api.tsx", import.meta.url)
      ),
      "next/navigation": fileURLToPath(new URL("./workspace-api.tsx", import.meta.url)),
      "next/link": fileURLToPath(new URL("./workspace-api.tsx", import.meta.url)),
      "@/lib/posthog/tracking.utils": fileURLToPath(new URL("./tracking.ts", import.meta.url)),
      "@": fileURLToPath(new URL("../../src", import.meta.url)),
    },
  },
  define: { "process.env.NEXT_PUBLIC_API_BASE_URL": JSON.stringify("/api/") },
  server: { host: "127.0.0.1", port: 4173, strictPort: true },
});
