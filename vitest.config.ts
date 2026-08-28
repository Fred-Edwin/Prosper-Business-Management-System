import "dotenv/config";
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    // Default: Node, for the ledger/domain math (fast, no DOM). Screen-level
    // component specs opt into jsdom per-file with `// @vitest-environment jsdom`
    // (they are named `*.screen.test.tsx`).
    environment: "node",
    include: ["**/*.test.ts", "**/*.test.tsx"],
    exclude: ["node_modules/**", "tests/e2e/**"],
    setupFiles: ["./vitest.setup.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
