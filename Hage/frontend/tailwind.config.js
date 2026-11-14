/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#0E235C',
          dark: '#0E235C',
          light: '#0E235C',
        },
        gold: {
          DEFAULT: '#EBA546',
          dark: '#EBA546',
          light: '#EBA546',
        },
        white: '#FFFFFF',
        primary: {
          DEFAULT: '#EBA546',
          light: '#EBA546',
          dark: '#0E235C',
        },
        secondary: {
          DEFAULT: '#0E235C',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(235, 165, 70, 0.2)',
      }
    },
  },
  plugins: [],
}
