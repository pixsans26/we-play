/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        love: {
          50: "#fff0f3",
          100: "#ffe0e8",
          200: "#ffc6d6",
          300: "#ff9db6",
          400: "#ff6490",
          500: "#ff2d6b",
          600: "#f20d55",
          700: "#cc0044",
          800: "#a9003b",
          900: "#8c0036",
        },
        passion: {
          50: "#faf0ff",
          100: "#f3e0ff",
          200: "#e8c6ff",
          300: "#d69dff",
          400: "#bf64ff",
          500: "#a82dff",
          600: "#8f0df2",
          700: "#7700cc",
          800: "#6300a9",
          900: "#52008c",
        },
        night: {
          50: "#f0f0fa",
          100: "#e0e0f5",
          200: "#c6c6eb",
          300: "#9d9dd6",
          400: "#6464bf",
          500: "#2d2da8",
          600: "#0d0d8f",
          700: "#000077",
          800: "#000063",
          900: "#000052",
        },
      },
      fontFamily: {
        heading: ["PlayfairDisplay_400Regular", "serif"],
        "heading-bold": ["PlayfairDisplay_700Bold", "serif"],
        body: ["Nunito_400Regular", "sans-serif"],
        "body-semibold": ["Nunito_600SemiBold", "sans-serif"],
        "body-bold": ["Nunito_700Bold", "sans-serif"],
      },
      borderRadius: {
        card: "24px",
        "card-lg": "32px",
        "card-xl": "40px",
      },
    },
  },
  plugins: [],
};
