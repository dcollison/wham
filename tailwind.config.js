/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        wham: {
          bg: '#0F172A',
          card: '#1E293B',
          surface: '#334155',
          accent: '#F59E0B',
          yellow: '#FACC15',
          green: '#10B981',
          blue: '#3B82F6',
          red: '#EF4444',
          purple: '#8B5CF6',
          pink: '#EC4899',
        }
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif'
        ],
        mono: [
          'JetBrains Mono',
          'ui-monospace',
          'SFMono-Regular',
          'monospace'
        ]
      }
    },
  },
  plugins: [],
}
