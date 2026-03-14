/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        mono: ['Space Mono', 'monospace'],
      },
      colors: {
        bg: '#0a0a0f',
        surface: '#13131a',
        border: '#1e1e2e',
        accent: '#7c6aff',
        accent2: '#ff6a6a',
        accent3: '#6affb8',
        muted: '#55556a',
      },
    },
  },
  plugins: [],
}


