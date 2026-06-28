/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
    "./index.html",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Plus Jakarta Sans", "sans-serif"],
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "monospace",
        ],
      },
      colors: {
        "tf-black": "#0A0A0A",
        "tf-gray-900": "#1A1A1A",
        "tf-gray-700": "#3D3D3D",
        "tf-gray-500": "#6B6B65",
        "tf-gray-400": "#9B9B93",
        "tf-gray-200": "#D4D4CE",
        "tf-gray-100": "#E8E8E4",
        "tf-gray-50": "#F7F7F5",
        "tf-white": "#FFFFFF",
        "tf-blue-700": "#185FA5",
        "tf-blue-500": "#378ADD",
        "tf-blue-50": "#E6F1FB",
        "tf-green-700": "#1D9E75",
        "tf-green-50": "#E1F5EE",
        "tf-amber-700": "#BA7517",
        "tf-amber-50": "#FAEEDA",
        "tf-red-700": "#C0392B",
        "tf-red-50": "#FCEBEB",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
