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
      include: ["lib/**", "src/parseMermaid.js"],
    },
  },
});
