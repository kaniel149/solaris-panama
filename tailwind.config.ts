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
        // ── Bustan premium (light) palette — ADDITIVE, marketing site only ──
        // Mirrors bustan-energy theme. Do NOT use in CRM/dashboard (dark theme).
        // Namespaced under `bustan` + semantic aliases (grove/ink/shell/mist/...)
        // that are unique and don't collide with existing CRM tokens.
        bustan: {
          ink: '#27342f',
          grove: '#24463e',
          canopy: '#2f5d52',
          lagoon: '#006f6b',
          'lagoon-bright': '#008f8a',
          sun: '#f2b84b',
          'sun-light': '#ffd27a',
          papaya: '#ff6b4a',
          paper: '#f4ead8',
          shell: '#fff4e2',
          mist: '#d8ece8',
        },
        // Semantic aliases used by the ported Button/SectionHeader primitives.
        ink: '#27342f',
        grove: '#24463e',
        canopy: '#2f5d52',
        lagoon: '#006f6b',
        shell: '#fff4e2',
        mist: '#d8ece8',
        paper: '#f4ead8',
      },
      fontFamily: {
        inter: ['Inter', 'system-ui', 'sans-serif'],
        // ── Bustan premium fonts (marketing site) ──
        serif: ['Instrument Serif', 'Playfair Display', 'Georgia', 'serif'],
        sans: ['DM Sans', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        // ── Bustan radii (marketing) ──
        card: '1.25rem',
        button: '9999px',
      },
      fontSize: {
        // ── Bustan display type scale (marketing) ──
        'display-xl': ['4.5rem', { lineHeight: '1.05' }],
        'display-lg': ['3.5rem', { lineHeight: '1.08' }],
        'display-md': ['2.5rem', { lineHeight: '1.1' }],
        'display-sm': ['1.875rem', { lineHeight: '1.15' }],
      },
      transitionTimingFunction: {
        // ── Bustan motion standard (marketing) ──
        'out-soft': 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      backgroundImage: {
        'glass-gradient': 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
        'glass-gradient-hover': 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
        'accent-gradient': 'linear-gradient(135deg, #00ffcc 0%, #8b5cf6 100%)',
        'cyan-glow': 'radial-gradient(circle at center, rgba(0, 255, 204, 0.15) 0%, transparent 70%)',
        'purple-glow': 'radial-gradient(circle at center, rgba(139, 92, 246, 0.15) 0%, transparent 70%)',
        // ── Bustan premium gradients (marketing) ──
        'bustan-hero':
          'linear-gradient(180deg, rgba(216,236,232,0.52) 0%, transparent 18%), linear-gradient(20deg, rgba(242,184,75,0.14), transparent 36%), #f4ead8',
        'bustan-gold':
          'linear-gradient(135deg, #f2b84b 0%, #ffd27a 50%, #f2b84b 100%)',
        'bustan-grove':
          'linear-gradient(135deg, #24463e 0%, #2f5d52 100%)',
        'bustan-lagoon':
          'linear-gradient(135deg, #006f6b 0%, #008f8a 100%)',
      },
      boxShadow: {
        'glow-cyan': '0 0 20px rgba(0, 255, 204, 0.15), 0 0 60px rgba(0, 255, 204, 0.05)',
        'glow-cyan-lg': '0 0 30px rgba(0, 255, 204, 0.25), 0 0 80px rgba(0, 255, 204, 0.1)',
        'glow-purple': '0 0 20px rgba(139, 92, 246, 0.15), 0 0 60px rgba(139, 92, 246, 0.05)',
        'glow-purple-lg': '0 0 30px rgba(139, 92, 246, 0.25), 0 0 80px rgba(139, 92, 246, 0.1)',
        glass: '0 4px 30px rgba(0, 0, 0, 0.3)',
        'glass-lg': '0 8px 40px rgba(0, 0, 0, 0.4)',
        // ── Bustan warm-tinted shadow scale (marketing) ──
        soft: '0 2px 12px rgba(39, 52, 47, 0.07)',
        lift: '0 8px 28px rgba(39, 52, 47, 0.12)',
        float: '0 20px 50px rgba(39, 52, 47, 0.18)',
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
