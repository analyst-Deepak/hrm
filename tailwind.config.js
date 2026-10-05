/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#3d1f14',
          dark: '#26120b',
        },
        chocolate: {
          50: '#fdf8f6',
          100: '#f7ede8',
          200: '#eedcd2',
          300: '#dec2b2',
          400: '#c79f8b',
          500: '#ad7c66',
          600: '#92614d',
          700: '#774c3b',
          800: '#5a382c',
          900: '#3d231a',
          950: '#22110c',
        },
        cocoa: {
          DEFAULT: '#4a2511',
          dark: '#2b1408',
          light: '#7c4323',
        },
      },
    },
  },
  plugins: [],
};