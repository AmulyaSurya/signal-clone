import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Signal's core brand + UI palette
        signal: {
          blue: "#2C6BED",
          "blue-dark": "#3A76F0",
          bg: "#FFFFFF",
          "bg-secondary": "#F6F6F6",
          "bg-dark": "#1B1C1F",
          "bg-dark-secondary": "#141414",
          "bg-dark-elevated": "#2C2C2E",
          "list-hover": "#F2F2F2",
          "list-hover-dark": "#242527",
          "list-active": "#E7EFFD",
          "list-active-dark": "#1B4DB3",
          border: "#E4E4E5",
          "border-dark": "#303032",
          text: "#0E0E0E",
          "text-dark": "#E9E9E9",
          "text-secondary": "#6B6D71",
          "text-secondary-dark": "#9A9CA0",
          bubble: {
            in: "#F0F0F0",
            "in-dark": "#2C2C2E",
            out: "#2C6BED",
          },
          online: "#4CAF50",
        },
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Helvetica Neue",
          "Roboto",
          "Arial",
          "sans-serif",
        ],
      },
      boxShadow: {
        panel: "0 1px 2px rgba(0,0,0,0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
