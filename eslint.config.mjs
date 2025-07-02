import { defineConfig } from "eslint/config";
import security from "eslint-plugin-security";
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import globals from "globals";
import tsParser from "@typescript-eslint/parser";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";
import neostandard, { plugins } from "neostandard";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all
});

export default defineConfig([
  ...neostandard({
    ts: true,
  }),
  plugins.n.configs["flat/recommended"],
  {
    extends: compat.extends(
      "eslint:recommended",
      "plugin:@typescript-eslint/recommended",
      "plugin:@typescript-eslint/recommended-requiring-type-checking",
    ),

    plugins: {
      security,
      "@typescript-eslint": typescriptEslint,
    },

    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.mocha,
      },

      parser: tsParser,
      ecmaVersion: 5,
      sourceType: "commonjs",

      parserOptions: {
        project: "./src/tsconfig.json",
      },
    },

    rules: {
      quotes: [2, "double"],
      semi: [2, "always"],
      "space-before-function-paren": [0],
      "@typescript-eslint/explicit-module-boundary-types": 0,
      "@typescript-eslint/no-empty-interface": 0,
      "@typescript-eslint/require-await": 0,
      "@typescript-eslint/restrict-template-expressions": 0,

      "@typescript-eslint/no-misused-promises": ["error", {
        checksVoidReturn: false,
      }],
      //
      "@stylistic/quotes": [2, "double"],
      "@stylistic/space-before-function-paren": [0],
      "@stylistic/semi": [2, "always"],
      "import-x/first": [0],
      "camelcase": [0],
      "n/no-process-exit": [0],
      "n/no-unpublished-import": ["error", {
        "allowModules": ["chai", "mocha"]
      }],
      // this is a workaround for import of .ts files
      "n/no-missing-import": [0],
    },
  }
]);