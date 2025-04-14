import { defineConfig } from "eslint/config";
import standard from "eslint-plugin-standard";
import security from "eslint-plugin-security";
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import globals from "globals";
import tsParser from "@typescript-eslint/parser";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all
});

export default defineConfig([{
  extends: compat.extends(
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
  ),

  plugins: {
    standard,
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
  },
}]);