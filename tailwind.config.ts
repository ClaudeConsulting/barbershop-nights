import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        tenor: '#f4b942',
        lead: '#e94b3c',
        bari: '#4a9b8e',
        bass: '#2c4a7c',
        cream: '#f5ecd7',
        ink: '#1a1410',
      },
      fontFamily: {
        display: ['Georgia', 'serif'],
      },
    },
  },
  plugins: [],
};

export default config;
