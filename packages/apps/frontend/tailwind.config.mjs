/** @type {import('tailwindcss').Config} */
export const content = [
  "./app/**/*.{js,ts,jsx,tsx,mdx}",
  "./components/**/*.{js,ts,jsx,tsx,mdx}",
  // libsパッケージ内のコンポーネントもスキャン対象に追加
  "../../libs/src/**/*.{js,ts,jsx,tsx,mdx}",
];
export const theme = {
  extend: {},
};
export const plugins = [];