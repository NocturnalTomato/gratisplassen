import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        rose: {
          50: "#fff5f7",
          100: "#ffe4ea",
          500: "#e94f79",
          600: "#d63868",
          700: "#b32657",
        },
      },
    },
  },
  plugins: [],
};

export default config;
