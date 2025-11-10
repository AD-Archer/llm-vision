/** @type {import('tailwindcss').Config} */
import typography from "@tailwindcss/typography";

export const content = [
  "./pages/**/*.{js,ts,jsx,tsx,mdx}",
  "./components/**/*.{js,ts,jsx,tsx,mdx}",
  "./app/**/*.{js,ts,jsx,tsx,mdx}",
];
export const plugins = [typography];
