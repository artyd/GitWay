import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Рушій — чистий TS без DOM, тож достатньо node-середовища.
// fileURLToPath коректно декодує кирилицю у шляху (напр. «Артем»).
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/lib/git-engine/**/*.spec.ts", "src/components/gitway/**/*.spec.tsx"],
    globals: false,
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
