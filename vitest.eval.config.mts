import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Konfigurasi terpisah agar `npm test` tidak ikut menjalankan eval (yang bisa berbiaya bila EVAL_USE_LLM=1).
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
      "server-only": fileURLToPath(new URL("./tests/stubs/server-only.ts", import.meta.url)),
    },
  },
  test: { include: ["evals/**/*.eval.ts"], environment: "node", testTimeout: 600_000 },
});
