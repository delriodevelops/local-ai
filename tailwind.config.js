/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      keyframes: {
        pulse: {
          "0%, 100%": { opacity: 1 },
          "50%": { opacity: 0.7 },
        }
      }
    },
  },
  plugins: [require('@tailwindcss/typography')],
  safelist: [
    "bg-red-500",
    "bg-amber-500",
    "bg-emerald-500",
    "bg-lime-500",
    "bg-blue-500",
    "bg-indigo-500",
    "bg-purple-500",
    "bg-pink-500",
    "bg-rose-500",
    "bg-cyan-500",
    "bg-teal-500",
    "bg-green-500",
    "bg-yellow-500",
    "bg-orange-500",
  ]
};
