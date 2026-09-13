/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        app: {
          bg: '#F7F9FC',
          main: '#F8FAFC',
          sidebar: '#FFFFFF',
          card: '#FFFFFF',
        },
        brand: {
          navy: '#123B6D',
          blue: '#1769D2',
          active: '#2563EB',
        },
        ink: {
          primary: '#172B4D',
          secondary: '#526581',
          muted: '#718096',
        },
        borderLight: {
          DEFAULT: '#D9E2EC',
          subtle: '#E8EEF5',
        },
        opStatus: {
          critical: '#D92D20',
          high: '#EA580C',
          warning: '#D99A00',
          info: '#2563EB',
          resolved: '#16803C',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
