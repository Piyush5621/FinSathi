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
        'brand-navy': '#1E293B',
        'brand-blue': '#3B82F6',
        'bg-page': '#F8FAFC',
        'bg-card': '#FFFFFF',
        'text-heading': '#0F172A',
        'text-body': '#334155',
        'text-label': '#64748B',
        'text-main': '#0F172A', // Legacy support linking to heading
        'text-muted': '#64748B', // Legacy support linking to label
        'text-disabled': '#94A3B8',
        'border-color': '#E2E8F0',
        status: {
          success: { bg: '#DCFCE7', text: '#15803D' },
          warning: { bg: '#FEF3C7', text: '#B45309' },
          danger: { bg: '#FEE2E2', text: '#B91C1C' },
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
