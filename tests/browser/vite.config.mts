import { defineConfig } from "vite";
import { acceptanceData } from "./acceptance-data";
import { fileURLToPath } from "node:url";
export default defineConfig({
  plugins: [
    {
      name: "manual-acceptance-fixtures",
      configureServer(server) {
        if (process.env.UI_ACCEPTANCE_FIXTURES !== "1") return;
        server.middlewares.use((req, res, next) => {
          const path = new URL(req.url ?? "/", "http://localhost").pathname;
          const data = acceptanceData(path);
          if (data === undefined) return next();
          res.setHeader("Content-Type", "application/json");
          res.setHeader("Cache-Control", "no-store");
          if (req.method !== "GET") {
            res.statusCode = 405;
            res.end(JSON.stringify({ detail: "Read-only synthetic acceptance fixture" }));
            return;
          }
          res.end(JSON.stringify(data));
        });
      },
    },
  ],
  oxc: { jsx: { runtime: "automatic" } },
  publicDir: fileURLToPath(new URL("../../public", import.meta.url)),
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
      "next/image": fileURLToPath(new URL("./image.tsx", import.meta.url)),
      "next/navigation": fileURLToPath(new URL("./workspace-api.tsx", import.meta.url)),
      "next/link": fileURLToPath(new URL("./workspace-api.tsx", import.meta.url)),
      "@/lib/posthog/tracking.utils": fileURLToPath(new URL("./tracking.ts", import.meta.url)),
      "@": fileURLToPath(new URL("../../src", import.meta.url)),
    },
  },
  define: { "process.env.NEXT_PUBLIC_API_BASE_URL": JSON.stringify("/api/") },
  server: { host: "127.0.0.1", port: 4173, strictPort: true },
});
