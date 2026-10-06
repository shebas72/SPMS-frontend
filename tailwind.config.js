/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"IBM Plex Sans"', '"IBM Plex Sans Arabic"', 'system-ui', 'sans-serif'],
      },
      colors: {
        ink: '#14232B',
        muted: '#5C6B73',
        paper: '#F4F7F8',
        line: '#D8E0E4',
        brand: { DEFAULT: '#0F4C5C', dark: '#0A3641', soft: '#E3EEF1' },
        // KPI status colours (used from the dashboard phase onward)
        status: { behind: '#C0392B', atrisk: '#D99A1E', ontrack: '#2E8B57' },
      },
    },
  },
  plugins: [],
}
