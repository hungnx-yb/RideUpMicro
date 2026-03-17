/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Manrope", "Outfit", "sans-serif"],
      },
      colors: {
        brand: {
          50: "#fff7ed",
          100: "#ffedd5",
          500: "#f97316",
          600: "#ea580c",
          700: "#c2410c",
        },
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(18px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        glow: {
          "0%, 100%": { boxShadow: "0 0 0 rgba(249, 115, 22, 0)" },
          "50%": { boxShadow: "0 10px 35px rgba(249, 115, 22, 0.35)" },
        },
      },
      animation: {
        "fade-up": "fade-up 700ms ease-out both",
        float: "float 6s ease-in-out infinite",
        glow: "glow 3s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
