/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        space: ["'Space Grotesk'", "sans-serif"], // font-space
        inter: ["'Inter'",         "sans-serif"], // font-inter
      },
    },
  },
  plugins: [],
};

