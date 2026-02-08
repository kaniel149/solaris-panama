import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        space: {
          950: '#0a0a0f',
          900: '#0f0f17',
          850: '#12121a',
          800: '#16161f',
          700: '#1a1a2e',
          600: '#22223a',
          500: '#2a2a44',
        },
        surface: {
          DEFAULT: '#12121a',
          hover: '#1a1a2e',
        },
        accent: {
          DEFAULT: '#00ffcc',
          50: 'rgba(0, 255, 204, 0.05)',
          100: 'rgba(0, 255, 204, 0.1)',
          200: 'rgba(0, 255, 204, 0.2)',
          300: 'rgba(0, 255, 204, 0.3)',
          400: '#33ffd6',
          500: '#00ffcc',
          600: '#00d4a8',
          700: '#00a885',
          800: '#007d63',
          900: '#005240',
        },
        purple: {
          DEFAULT: '#8b5cf6',
          50: 'rgba(139, 92, 246, 0.05)',
          100: 'rgba(139, 92, 246, 0.1)',
          200: 'rgba(139, 92, 246, 0.2)',
          300: '#a78bfa',
          400: '#8b5cf6',
          500: '#7c3aed',
          600: '#6d28d9',
        },
        blue: {
          DEFAULT: '#0ea5e9',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
        },
        success: '#22c55e',
        danger: '#ef4444',
        warning: '#f59e0b',
        info: '#0ea5e9',
        text: {
          primary: '#f0f0f5',
          secondary: '#8888a0',
          muted: '#555566',
        },
        glass: {
          border: 'rgba(255, 255, 255, 0.06)',
          'border-hover': 'rgba(255, 255, 255, 0.1)',
        },
      },
      fontFamily: {
        inter: ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'glass-gradient': 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
        'glass-gradient-hover': 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
        'accent-gradient': 'linear-gradient(135deg, #00ffcc 0%, #8b5cf6 100%)',
        'cyan-glow': 'radial-gradient(circle at center, rgba(0, 255, 204, 0.15) 0%, transparent 70%)',
        'purple-glow': 'radial-gradient(circle at center, rgba(139, 92, 246, 0.15) 0%, transparent 70%)',
      },
      boxShadow: {
        'glow-cyan': '0 0 20px rgba(0, 255, 204, 0.15), 0 0 60px rgba(0, 255, 204, 0.05)',
        'glow-cyan-lg': '0 0 30px rgba(0, 255, 204, 0.25), 0 0 80px rgba(0, 255, 204, 0.1)',
        'glow-purple': '0 0 20px rgba(139, 92, 246, 0.15), 0 0 60px rgba(139, 92, 246, 0.05)',
        'glow-purple-lg': '0 0 30px rgba(139, 92, 246, 0.25), 0 0 80px rgba(139, 92, 246, 0.1)',
        glass: '0 4px 30px rgba(0, 0, 0, 0.3)',
        'glass-lg': '0 8px 40px rgba(0, 0, 0, 0.4)',
      },
      borderColor: {
        glass: 'rgba(255, 255, 255, 0.06)',
        'glass-hover': 'rgba(255, 255, 255, 0.1)',
      },
      animation: {
        'glow-pulse': 'glow-pulse 3s ease-in-out infinite',
        shimmer: 'shimmer 2s ease-in-out infinite',
        float: 'float 6s ease-in-out infinite',
      },
      keyframes: {
        'glow-pulse': {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
