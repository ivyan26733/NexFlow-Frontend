/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './config/**/*.{ts,tsx}',
    './lib/**/*.ts',
    './types/**/*.ts',
    './StudioToolbar.tsx',
    './NodeSidebar.tsx',
    './NodeConfigPanel.tsx',
    './FlowNodeCard.tsx',
    './nodeConfig.ts',
    './api.ts',
    './index.ts',
    './useExecutionSocket.ts',
  ],
  theme: {
    extend: {
      colors: {
        // Cognac & Navy — mirror app/globals.css semantic tokens
        base:    '#F2E9DC',
        surface: '#F9F3EC',
        panel:   '#E8DCCF',
        border:  '#C8B9A5',
        accent:  '#9A3412',
        success: '#14532D',
        failure: '#7F1D1D',
        warning: '#78350F',
        muted:   '#6B5A45',
        text:    '#1A1008',
      },
      fontFamily: {
        sans: ['var(--font-geist)', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-in':   'slideIn 0.2s ease-out',
        'fade-in':    'fadeIn 0.15s ease-out',
      },
      keyframes: {
        slideIn: {
          from: { transform: 'translateX(100%)', opacity: '0' },
          to:   { transform: 'translateX(0)',    opacity: '1' },
        },
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
