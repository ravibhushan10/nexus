/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        night: {
          50:  '#eaeaf8', 100: '#c0c0d8', 200: '#8080a8',
          400: '#50506a', 600: '#252535', 700: '#1a1a28',
          800: '#13131e', 900: '#080810',
        },
        accent:  { DEFAULT: '#00d084', hover: '#00f09a' },
        green:   { DEFAULT: '#00d084' },
        purple:  { DEFAULT: '#9d6fff' },
        blue:    { DEFAULT: '#4da6ff' },
        orange:  { DEFAULT: '#ff9f43' },
        red:     { DEFAULT: '#ff5c5c' },
      },
      fontFamily: {
        sans: ['Space Grotesk', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
