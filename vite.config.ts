import { defineConfig } from "vite-plus";

export default defineConfig({
  staged: {
    "*": "vp check --fix",
  },
  lint: {
    plugins: ["typescript"],
    options: {
      typeAware: true,
      typeCheck: true,
    },
    overrides: [
      {
        files: ["apps/website/**"],
        plugins: ["typescript"],
        rules: {
          "no-console": "off",
        },
      },
      {
        files: ["packages/**/src/**/*.test.ts"],
        plugins: ["typescript", "vitest"],
        rules: {
          "@typescript-eslint/no-explicit-any": "off",
        },
      },
    ],
  },

  fmt: {
    overrides: [
      {
        files: ["**/*.md"],
        options: {
          lineWidth: 100,
        },
      },
    ],
  },
});
