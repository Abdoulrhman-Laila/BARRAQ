import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
    exclude: ["node_modules/**", ".next/**"]
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "."),
      // "server-only" throws on import outside Next's RSC bundler; its own
      // package ships this no-op entry point for exactly that situation.
      "server-only": path.resolve(import.meta.dirname, "node_modules/server-only/empty.js")
    }
  }
});
