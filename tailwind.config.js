/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx}", "./lib/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        vinho: "#6B1D2F",
        vinhoEsc: "#551625",
        ouro: "#D4AF37",
        ouroEsc: "#B8942A",
        fundo: "#F8F9FA",
      },
    },
  },
  plugins: [],
};
