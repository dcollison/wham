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
        'spring-bounce': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      boxShadow: {
        'glow-flash': '0 0 24px -2px rgba(251, 191, 36, 0.25)',
        'glow-sent': '0 0 24px -2px rgba(16, 185, 129, 0.25)',
        'glow-project': '0 0 24px -2px rgba(56, 189, 248, 0.25)',
        'sheet-elevated': '0 -12px 36px -4px rgba(0, 0, 0, 0.65)',
        'card-elevated': '0 4px 20px -2px rgba(0, 0, 0, 0.35)',
      },
      colors: {
        carbon: {
          DEFAULT: '#080A0F',
          surface: '#11141D',
          elevated: '#171B26',
          high: '#202534',
        },
        surface: {
          DEFAULT: '#11141D',
          elevated: '#171B26',
          high: '#202534',
          higher: '#283042',
        },
        slate: {
          950: '#080A0F',
          900: '#11141D',
          850: '#171B26',
          800: '#202534',
          750: '#283042',
          700: '#343E54',
          600: '#475569',
        },
        wham: {
          bg: '#080A0F',
          card: '#11141D',
          surface: '#171B26',
          accent: '#F59E0B',
          flash: '#FBBF24',
          sent: '#10B981',
          project: '#38BDF8',
          yellow: '#EAA838',
          green: '#10B981',
          blue: '#38BDF8',
          red: '#DC2626',
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
