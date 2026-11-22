import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'Geist', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        ink: '#111827',
        canvas: '#FFFFFF',
        warm: '#F9FAFB',
        line: '#E5E7EB',
      },
      letterSpacing: { tightest: '-0.03em' },
      borderRadius: { attio: '10px' },
    },
  },
  plugins: [],
};

export default config;
