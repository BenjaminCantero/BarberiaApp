/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#fdf8f0',
          100: '#faefd9',
          200: '#f4d9a8',
          300: '#ecbe6d',
          400: '#e3a03a',
          500: '#d4891f',
          600: '#b56c16',
          700: '#925115',
          800: '#774119',
          900: '#633619',
        },
      },
    },
  },
  plugins: [],
};
