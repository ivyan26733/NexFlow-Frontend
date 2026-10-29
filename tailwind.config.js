/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './ForkJoinNodeCard.tsx',
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
  ],
  theme: {
    extend: {
      colors: {
        // "Ink & Signal" — mirror app/globals.css semantic tokens
        base:    'var(--color-base)',
        surface: 'var(--color-surface)',
        panel:   'var(--color-panel)',
        border:  'var(--color-border)',
        accent:  'var(--color-accent)',
        success: 'var(--color-success)',
        failure: 'var(--color-failure)',
        warning: 'var(--color-warning)',
        muted:   'var(--color-muted)',
        text:    'var(--color-text)',
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
