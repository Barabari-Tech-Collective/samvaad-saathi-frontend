import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  // A cold CI run compiles the fixture on first navigation, which exhausted the
  // default 5s assertion budget before recording could start. The budget also has
  // to exceed the hook's own microphone acquisition timeout to report real stalls.
  expect: { timeout: 25_000 },
  use: {
    baseURL: "http://127.0.0.1:4173",
    permissions: ["microphone"],
    trace: "retain-on-failure",
    launchOptions: {
      args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"],
    },
  },
  webServer: {
    command: "npx vite --config tests/browser/vite.config.mts",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env.CI,
  },
});
