/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Professional Palette: Indigo Focus, Slate Neutrals
        primary: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5', // Brand Color
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          950: '#1e1b4b',
        },
        gray: {
          50: '#f8fafc',  // Slate-50
          100: '#f1f5f9', // Slate-100
          200: '#e2e8f0', // Slate-200
          300: '#cbd5e1', // Slate-300
          400: '#94a3b8', // Slate-400
          500: '#64748b', // Slate-500
          600: '#475569', // Slate-600
          700: '#334155', // Slate-700
          800: '#1e293b', // Slate-800
          900: '#0f172a', // Slate-900
          950: '#020617', // Slate-950
        },
        // Semantic aliases
        background: {
          light: '#f8fafc', // Light gray background mostly
          dark: '#0f172a',  // Deep slate background
          surface: {
            light: '#ffffff',
            dark: '#1e293b',
          }
        },
        text: {
          light: '#0f172a',
          dark: '#f1f5f9',
          muted: {
            light: '#64748b',
            dark: '#94a3b8'
          }
        },
        border: {
          light: '#e2e8f0',
          dark: '#334155',
        },
        card: {
          light: '#ffffff',
          dark: '#1e293b', // Slate-800
        },
      },
      animation: {
        'gradient-x': 'gradient-x 15s ease infinite',
        'gradient-y': 'gradient-y 15s ease infinite',
        'gradient-xy': 'gradient-xy 15s ease infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        'gradient-y': {
          '0%, 100%': {
            'background-size': '400% 400%',
            'background-position': 'center top'
          },
          '50%': {
            'background-size': '200% 200%',
            'background-position': 'center center'
          }
        },
        'gradient-x': {
          '0%, 100%': {
            'background-size': '200% 200%',
            'background-position': 'left center'
          },
          '50%': {
            'background-size': '200% 200%',
            'background-position': 'right center'
          }
        },
        'gradient-xy': {
          '0%, 100%': {
            'background-size': '400% 400%',
            'background-position': 'left center'
          },
          '50%': {
            'background-size': '200% 200%',
            'background-position': 'right center'
          }
        }
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [
    function ({ addUtilities }) {
      const newUtilities = {
        '.glass-light': {
          background: 'rgba(255, 255, 255, 0.05)',
          'backdrop-filter': 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        },
        '.glass-dark': {
          background: 'rgba(0, 0, 0, 0.05)',
          'backdrop-filter': 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
        },
        '.neo-light': {
          'box-shadow': '20px 20px 60px #bebebe, -20px -20px 60px #ffffff',
        },
        '.neo-dark': {
          'box-shadow': '5px 5px 10px rgba(0, 0, 0, 0.2), -5px -5px 10px rgba(255, 255, 255, 0.05)',
        }
      }
      addUtilities(newUtilities)
    }
  ],
};
