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
        // App Theme Semantic Tokens
        app: {
          bg: 'var(--bg-app)',
          surface: 'var(--surface-app)',
          'surface-secondary': 'var(--surface-secondary)',
          'surface-elevated': 'var(--surface-elevated)',
          border: 'var(--border-app)',
          'border-subtle': 'var(--border-subtle)',
          text: 'var(--text-primary)',
          'text-secondary': 'var(--text-secondary)',
          'text-muted': 'var(--text-muted)',
          primary: 'var(--primary-app)',
          'primary-hover': 'var(--primary-hover)',
          'primary-subtle': 'var(--primary-subtle)',
          success: 'var(--success-app)',
          'success-subtle': 'var(--success-subtle)',
          warning: 'var(--warning-app)',
          'warning-subtle': 'var(--warning-subtle)',
          danger: 'var(--danger-app)',
          'danger-subtle': 'var(--danger-subtle)',
          info: 'var(--info-app)',
          'info-subtle': 'var(--info-subtle)',
        },
        // Backward-compatible Brand definitions
        'brand-navy': '#0F1E3A',
        'brand-blue': '#3157D5',
        'bg-page': 'var(--bg-app)',
        'bg-card': 'var(--surface-app)',
        'text-heading': 'var(--text-primary)',
        'text-body': 'var(--text-secondary)',
        'text-label': 'var(--text-muted)',
        'text-main': 'var(--text-primary)',
        'text-muted': 'var(--text-muted)',
        'text-disabled': 'var(--text-muted)',
        'border-color': 'var(--border-app)',
      },
      borderRadius: {
        'control': '6px',
        'btn': '8px',
        'input': '8px',
        'card': '10px',
        'panel': '12px',
        'modal': '14px',
      },
      boxShadow: {
        'card': 'var(--shadow-card)',
        'elevated': 'var(--shadow-elevated)',
        'modal': 'var(--shadow-modal)',
      },
      fontSize: {
        'page-title': ['28px', { lineHeight: '32px', fontWeight: '600' }],
        'section-heading': ['20px', { lineHeight: '28px', fontWeight: '600' }],
        'card-heading': ['16px', { lineHeight: '24px', fontWeight: '600' }],
        'body': ['14px', { lineHeight: '20px', fontWeight: '400' }],
        'small': ['13px', { lineHeight: '18px', fontWeight: '400' }],
        'caption': ['12px', { lineHeight: '16px', fontWeight: '400' }],
        'micro': ['11px', { lineHeight: '14px', fontWeight: '500' }],
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-up': 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px) scale(0.98)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
      },
    },
  },
  plugins: [],
};
