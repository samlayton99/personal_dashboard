import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    passWithNoTests: true,
    exclude: [
      "src/lib/__tests__/phase2.test.ts",
      "src/lib/__tests__/network.test.ts",
      "**/node_modules/**",
    ],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
