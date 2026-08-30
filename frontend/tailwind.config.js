/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Civic trust palette - deep teal (health + government), saffron accent (call to action),
        // paper background. Deliberately not the AI-cream/terracotta or dark-neon defaults.
        ink: "#132226",
        paper: "#F6F7F5",
        surface: "#FFFFFF",
        teal: {
          50: "#EAF2F3",
          100: "#CFE3E6",
          200: "#9FC7CD",
          300: "#6FABB4",
          400: "#3F8F9B",
          500: "#0B4F6C", // primary
          600: "#093F57",
          700: "#073042",
          800: "#04202D",
          900: "#021017",
        },
        saffron: {
          50: "#FDF2E5",
          100: "#FCE3C4",
          400: "#EE9C3F",
          500: "#E8871E", // accent / CTA
          600: "#C46E12",
        },
        ok: { 500: "#1B7A43", 100: "#DFF2E7" },
        warn: { 500: "#B8860B", 100: "#FBF0D3" },
        danger: { 500: "#B3261E", 100: "#F8DCDA" },
      },
      fontFamily: {
        display: ["'IBM Plex Serif'", "serif"],
        sans: ["'IBM Plex Sans'", "system-ui", "sans-serif"],
        mono: ["'IBM Plex Mono'", "monospace"],
      },
      borderRadius: {
        DEFAULT: "3px",
        sm: "2px",
        md: "4px",
        lg: "6px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(19,34,38,0.06), 0 1px 0 rgba(19,34,38,0.04)",
      },
    },
  },
  plugins: [],
};
