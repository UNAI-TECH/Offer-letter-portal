/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        unai: {
          purple: '#4a279b',
          'purple-dark': '#2e02ae',
          'purple-light': '#6c3dd9',
          'purple-subtle': '#f6f3fc',
          charcoal: '#383535',
          dark: '#1e1b24',
          gray: {
            50: '#f9fafb',
            100: '#f3f4f6',
            200: '#e5e7eb',
            300: '#d1d5db',
            400: '#9ca3af',
            500: '#6b7280',
            600: '#4b5563',
            700: '#374151',
            800: '#1f2937',
            900: '#111827',
          }
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        serif: ['Times New Roman', 'Times', 'serif'],
      }
    },
  },
  plugins: [],
}

