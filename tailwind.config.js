/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // Grafito con un punto de oliva: el fondo del "laboratorio" sobre el que brilla la señal lima
      colors: {
        neutral: {
          50: '#f4f5ee',
          100: '#e6e8dc',
          200: '#cdd0c0',
          300: '#a9ad9a',
          400: '#868a78',
          500: '#646857',
          600: '#3a3d33',
          700: '#26281f',
          800: '#1a1c16',
          900: '#121410',
          950: '#0b0c09',
        },
        signal: '#c8f560',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'Georgia', 'serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      transitionTimingFunction: {
        snap: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        pulse: {
          "0%, 100%": { opacity: 1 },
          "50%": { opacity: 0.7 },
        },
        rise: {
          from: { opacity: 0, transform: 'translateY(12px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
      },
      animation: {
        rise: 'rise 700ms cubic-bezier(0.16, 1, 0.3, 1) both',
      },
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
