/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        lavender: "#E6E0F8",
        violet: "#7B5CFA",
        "violet-hover": "#6B4DE8",
      },
    },
  },
  plugins: [],
};
