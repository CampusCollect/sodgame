import js from "@eslint/js";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";

const browserGlobals = {
  window: "readonly",
  document: "readonly",
  performance: "readonly",
  requestAnimationFrame: "readonly",
  cancelAnimationFrame: "readonly",
  HTMLCanvasElement: "readonly",
  CanvasRenderingContext2D: "readonly",
  HTMLDivElement: "readonly",
  HTMLSpanElement: "readonly",
  HTMLHeadingElement: "readonly",
  HTMLSelectElement: "readonly",
  HTMLParagraphElement: "readonly",
  HTMLButtonElement: "readonly",
  HTMLUListElement: "readonly",
  HTMLElement: "readonly",
  KeyboardEvent: "readonly",
  MouseEvent: "readonly",
  console: "readonly"
};

export default [
  {
    files: ["**/*.ts"],
    ignores: ["dist/**"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module"
      },
      globals: browserGlobals
    },
    plugins: {
      "@typescript-eslint": tsPlugin
    },
    rules: {
      ...js.configs.recommended.rules,
      ...tsPlugin.configs.recommended.rules,
      "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }]
    }
  }
];
