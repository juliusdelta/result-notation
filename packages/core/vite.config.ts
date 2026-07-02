import { defineConfig } from "vite-plus";

export default defineConfig({
  pack: {
    dts: { tsgo: true },
    entry: ["src/index.ts"],
    format: ["cjs", "esm"],
    exports: true,
  },
});
