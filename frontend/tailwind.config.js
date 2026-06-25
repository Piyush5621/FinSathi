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
        'brand-navy': '#0F1E3A',
        'brand-blue': '#2483F5',
        'bg-page': '#F5F7FA',
        'bg-card': '#FFFFFF',
        'text-heading': '#111827',
        'text-body': '#374151',
        'text-label': '#6B7280',
        'text-main': '#111827',
        'text-muted': '#6B7280',
        'text-disabled': '#9CA3AF',
        'border-color': '#E5E7EB',
        status: {
          success: { bg: '#DEF7EC', text: '#03543F' },
          warning: { bg: '#FDF6B2', text: '#723B10' },
          danger: { bg: '#FDE8E8', text: '#9B1C1C' },
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
