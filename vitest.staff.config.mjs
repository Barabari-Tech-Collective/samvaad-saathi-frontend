import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Cross-product acceptance: run with the sibling dashboard checkout present.
export default defineConfig({
  oxc: { jsx: { runtime: "automatic" } },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("../sampark-saathi frontend/src", import.meta.url)),
      react: fileURLToPath(new URL("../sampark-saathi frontend/node_modules/react", import.meta.url)),
      "react-dom": fileURLToPath(new URL("../sampark-saathi frontend/node_modules/react-dom", import.meta.url)),
    },
    dedupe: ["react", "react-dom"],
  },
  test: { server: { deps: { inline: [/radix-ui/, /react-remove-scroll/, /react-style-singleton/, /use-callback-ref/, /use-sidecar/] } }, environment: "jsdom", include: ["tests/staff-integration/*.spec.jsx"] },
});
