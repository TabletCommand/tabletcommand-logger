module.exports = {
  env: {
    node: true,
    mocha: true
  },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking"
  ],
  plugins: [
    "standard",
    "security",
    "@typescript-eslint"
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: "./src/tsconfig.json",
    tsconfigRootDir: __dirname,
  },
  rules: {
    quotes: [2, "double"],
    semi: [2, "always"],
    "space-before-function-paren": [0],
    "@typescript-eslint/explicit-module-boundary-types": 0,
    "@typescript-eslint/no-empty-interface": 0,
    "@typescript-eslint/require-await": 0,
    "@typescript-eslint/restrict-template-expressions": 0,
    "@typescript-eslint/no-misused-promises": [
      "error",
      {
        "checksVoidReturn": false
      }
    ]
  }
};
