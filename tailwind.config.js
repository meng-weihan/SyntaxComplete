/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        circuit: {
          bg: '#0a0f1a',
          panel: '#111a2c',
          grid: '#1a2236',
          neon: '#22d3ee',
          accent: '#a855f7',
          wire: '#38bdf8',
          muted: '#64748b',
        },
      },
      boxShadow: {
        neon: '0 0 12px rgba(34, 211, 238, 0.55)',
        chip: '0 0 16px rgba(168, 85, 247, 0.45)',
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
}
