/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '1.75rem',
        '5xl': '2rem',
      },
      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.2, 0, 0, 1)',
      },
      colors: {
        surface: {
          DEFAULT: '#121722',
          elevated: '#1a2130',
          high: '#232c3e',
        },
        slate: {
          950: '#090c13',
          900: '#121722',
          850: '#1a2130',
          800: '#232c3e',
          750: '#2d374d',
          700: '#38445e',
        },
        wham: {
          bg: '#090C13',
          card: '#121722',
          surface: '#1A2130',
          accent: '#E59846',
          yellow: '#EAA838',
          green: '#429C7A',
          blue: '#529DBB',
          red: '#D97086',
          purple: '#9D85D6',
          pink: '#E27B66',
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
