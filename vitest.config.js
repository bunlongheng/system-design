import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  esbuild: { jsx: "automatic" },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.{js,jsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text"],
      include: ["lib/**", "src/**"],
      // Ratchet: set just below current (lines ~59%, branches ~75%) so coverage
      // can only go up. Raise these as more of App.jsx/views gets covered.
      thresholds: { lines: 55, statements: 55, branches: 65, functions: 28 },
    },
  },
});
