import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import tseslint from "typescript-eslint";

const eslintConfig = defineConfig([
  // ── Base: Next.js core-web-vitals + TypeScript recommended ────────────────
  ...nextVitals,
  ...nextTs,

  // ── TypeScript-aware rules (requires type information) ────────────────────
  ...tseslint.configs.recommendedTypeChecked.map((config) => ({
    ...config,
    files: ["**/*.ts", "**/*.tsx"],
  })),

  // ── Project-wide TypeScript parser config ─────────────────────────────────
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  // ── Strict custom rules (manifest §3 — Dead Code & Type Safety) ───────────
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      // § Forbid `any` — surfaces hidden type errors before production
      "@typescript-eslint/no-explicit-any": "error",

      // § Forbid unsafe operations that flow from `any`
      "@typescript-eslint/no-unsafe-argument": "error",
      "@typescript-eslint/no-unsafe-assignment": "error",
      "@typescript-eslint/no-unsafe-call": "error",
      "@typescript-eslint/no-unsafe-member-access": "error",
      "@typescript-eslint/no-unsafe-return": "error",

      // § Dead code: unused variables must be prefixed with _ to be intentional
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          vars: "all",
          args: "after-used",
          ignoreRestSiblings: true,
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],

      // § Prefer typed imports/exports for clarity
      "@typescript-eslint/consistent-type-imports": [
        "warn",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],

      // § Require explicit return types on exported functions
      "@typescript-eslint/explicit-module-boundary-types": "off", // too noisy for JSX
      
      // § Prevent accidental floating promises (async calls without await)
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": [
        "error",
        {
          "checksVoidReturn": {
            "attributes": false
          }
        }
      ],

      // § Prefer nullish coalescing over || for nullable values
      "@typescript-eslint/prefer-nullish-coalescing": "warn",

      // § Prefer optional chaining
      "@typescript-eslint/prefer-optional-chain": "warn",
    },
  },

  // ── Ignores ────────────────────────────────────────────────────────────────
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Exclude one-off fix/seed scripts at root — not part of typed project
    "*.js",
    "fix*.js",
    "seed*.js",
    "prisma/**",
  ]),
]);

export default eslintConfig;
