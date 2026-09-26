import type { Config } from "tailwindcss";

// Vaskelapp design tokens. DESIGN.md in this directory explains each one.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#F3F2EC",
        raised: "#FBFAF6",
        sunk: "#E6E4DA",
        line: { DEFAULT: "#D6D3C7", 2: "#CFCBBE" },
        ink: { DEFAULT: "#1C1E18", 2: "#4A4840", 3: "#6B675C" },
        olive: { DEFAULT: "#4B5A28", press: "#3B4720", soft: "#E7E8DA" },
        clay: { DEFAULT: "#9A3F24", soft: "#F2E3DC" },
        ochre: { DEFAULT: "#7A5A12", soft: "#F1EAD8" },
        dark: "#23291A",
      },
      borderRadius: {
        sm: "2px",
        sheet: "8px",
        chat: "10px",
        circle: "9999px",
      },
      fontFamily: {
        sans: ["var(--font-archivo)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      transitionTimingFunction: {
        out: "cubic-bezier(0.2, 0.8, 0.2, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
