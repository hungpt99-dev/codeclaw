import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      "@typescript-eslint/consistent-type-exports": "error",
      "no-console": "warn",
    },
  },
  {
    files: ["apps/cli/**/*.ts", "apps/local-server/**/*.ts"],
    rules: {
      "no-console": "off",
    },
  },
  {
    ignores: [
      "**/dist/**",
      "**/build/**",
      "**/coverage/**",
      "**/node_modules/**",
      "**/vitest.config.ts",
      "**/vite.config.ts",
      "**/tailwind.config.ts",
      "**/postcss.config.js",
      "eslint.config.js",
      "commitlint.config.cjs",
      ".dependency-cruiser.cjs",
    ],
  },
);
