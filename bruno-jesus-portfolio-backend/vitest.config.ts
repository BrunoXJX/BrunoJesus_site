import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    testTimeout: 20000,
    coverage: {
      enabled: true,
      include: ["src/**/*.ts"],
      exclude: [
        "src/server.ts",
        "src/services/email.service.ts",
        "src/services/gmail.service.ts",
        "src/controllers/workflow.controller.ts",
        "src/types/**"
      ],
      reporter: ["text", "text-summary"],
      thresholds: { statements: 60, branches: 50, functions: 60, lines: 60 }
    }
  }
});
