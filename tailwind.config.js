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
        // Nexflow design tokens
        base:    '#0a0d14',
        surface: '#111827',
        panel:   '#1a2235',
        border:  '#1e2d45',
        accent:  '#00d4ff',
        success: '#00e676',
        failure: '#ff4444',
        warning: '#ffab00',
        muted:   '#4a5568',
        text:    '#e2e8f0',
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
