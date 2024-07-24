/* eslint-env node */

module.exports = {
  root: true,
  env: {
    browser: true,
    es2020: true,
    node: true, // Add Node.js environment
  },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
    "plugin:import/typescript", // Add import plugin for TypeScript
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    project: true,
    tsconfigRootDir: __dirname,
  },
  plugins: ["import"], // Add import plugin
  rules: {
    "@typescript-eslint/no-non-null-assertion": "off",
    "import/no-extraneous-dependencies": [
      "error",
      { devDependencies: ["**/*.test.ts", "**/*.spec.ts"] },
    ],
    "@typescript-eslint/explicit-module-boundary-types": "error",
    "no-console": ["warn", { allow: ["warn", "error"] }],
  },
  settings: {
    "import/resolver": {
      typescript: {}, // Add TypeScript import resolver
    },
  },
};
