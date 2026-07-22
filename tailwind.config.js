/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        risk: {
          low: '#ff4d4d',
          mid: '#ffff00',
          high: '#00cc00',
        },
      },
    },
  },
  plugins: [],
}
