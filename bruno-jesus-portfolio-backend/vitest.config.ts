import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    testTimeout: 10000,
    coverage: {
      enabled: true,
      reporter: ["text", "text-summary"],
      thresholds: { statements: 60, branches: 50, functions: 60, lines: 60 }
    }
  }
});
