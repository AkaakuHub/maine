import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";
import { defineConfig } from "eslint/config";
import { rules } from "eslint-plugin-react";

export default defineConfig([
    {
        files: ["**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
        plugins: { js },
        extends: ["js/recommended"],
    },
    {
        files: ["**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
        languageOptions: { globals: { ...globals.browser, ...globals.node } },
    },
    tseslint.configs.recommended,
    pluginReact.configs.flat.recommended,
    {
        rules: {
            "no-unused-vars": ["error"], // 未使用の変数をエラーとして検出
            "no-undef": ["error"], // 未定義の変数をエラーとして検出
            eqeqeq: ["error", "always"], // 厳密な等価演算子を強制
            "no-console": ["warn"], // console.log の使用を警告
            indent: ["error", 4], // インデントを4スペースで強制
            quotes: ["error", "single"], // シングルクォートを強制
            semi: ["error", "always"], // セミコロンを必須に
            "brace-style": ["error", "1tbs"], // ブレースのスタイルを "1tbs" に強制
            camelcase: ["error", { properties: "always" }], // キャメルケースを強制
            "no-magic-numbers": ["warn", { ignore: [0, 1] }], // マジックナンバーの使用を警告
            "consistent-return": ["error"], // 一貫した return を強制
            "no-var": ["error"], // var の使用を禁止
            complexity: ["warn", { max: 10 }], // 関数の複雑さを制限
            "prefer-const": ["error"], // 再代入されない変数に const を推奨
        },
    },
]);
