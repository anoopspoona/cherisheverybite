import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        cream: '#F7F4ED',
        ivory: '#FFFDF7',
        forest: '#102D1A',
        sage: '#7D8B72',
        olive: '#4F5F3B',
        charcoal: '#1F2721',
        muted: '#8A8F83',
        line: '#D8D2C6',
        accentRed: '#B91C1C'
      },
      fontFamily: {
        serif: ['var(--font-serif)', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'Inter', 'sans-serif'],
        mono: ['var(--font-mono)', 'IBM Plex Mono', 'monospace']
      },
      letterSpacing: {
        editorial: '0.34em'
      },
      boxShadow: {
        soft: '0 18px 60px rgba(16, 45, 26, 0.08)'
      }
    }
  },
  plugins: []
};

export default config;
