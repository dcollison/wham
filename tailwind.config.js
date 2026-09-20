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
          bg: '#0B0F19',
          card: '#151D2F',
          surface: '#222F49',
          accent: '#E2A336',
          yellow: '#E5B83B',
          green: '#32A378',
          blue: '#4682D7',
          red: '#D85454',
          purple: '#8B6BD6',
          pink: '#D45C8E',
        }
      },
      fontFamily: {
        sans: [
          '"Plus Jakarta Sans"',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif'
        ],
        mono: [
          '"Space Mono"',
          'ui-monospace',
          'SFMono-Regular',
          'monospace'
        ],
        heading: [
          '"Space Mono"',
          'ui-monospace',
          'SFMono-Regular',
          'monospace'
        ],
        display: [
          '"Space Mono"',
          'ui-monospace',
          'SFMono-Regular',
          'monospace'
        ]
      }
    },
  },
  plugins: [],
}
