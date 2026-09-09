import { defineConfig } from "@playwright/test";

// NOT 4321. That is the port `npm run dev` uses, and pointing the suite at it
// meant every test run tore down a dev server someone was using - repeatedly.
// The suite gets its own port and its own server, and leaves dev alone.
const PORT = process.env.PORT || "4399";
const BASE = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  retries: 0,
  use: { baseURL: BASE },
  projects: [
    { name: "api", testMatch: /(api|share)\.spec\.js/ },
    { name: "browser", testMatch: /(render|snap|arrange-undo|share-ui)\.spec\.js/, use: { browserName: "chromium" } },
  ],
  webServer: {
    // Prod build + prod-like server (NODE_ENV=production via `npm run start`),
    // NOT a dev server: the strict CSP has no 'unsafe-eval', which dev HMR needs,
    // and the local auth bypass is gated OFF under production - so these specs
    // exercise exactly what ships.
    command: `npm run build && PORT=${PORT} npm run start`,
    url: `${BASE}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
