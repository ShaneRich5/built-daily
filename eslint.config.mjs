import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrors: "none",
        },
      ],
      "no-console": ["warn", { allow: ["warn", "error"] }],
      eqeqeq: ["error", "always", { null: "ignore" }],
      // Ratcheted to warn: 7 pre-existing violations (setState called from an
      // effect body). Raise back to error once issue #2 is fixed.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  {
    files: [
      "**/*.test.{ts,tsx}",
      "tests/**/*.{ts,tsx}",
      "scripts/**/*.ts",
      "mcp/**/*.ts",
    ],
    rules: {
      "no-console": "off",
    },
  },
  // Must stay last: disables stylistic rules that would fight Prettier.
  prettier,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
    "storybook-static/**",
    "backups/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
