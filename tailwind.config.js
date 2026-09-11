/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Primary coral/salmon pink
        brand: {
          50:  '#fdf2ef',
          100: '#fbe0d9',
          200: '#f6bfb2',
          300: '#f09884',
          400: '#F08070',  // light salmon
          500: '#E8735A',  // main coral
          600: '#d45a3f',
          700: '#b04330',
          800: '#8f3526',
          900: '#752c20',
          950: '#3f140e',
        },
        // Teal-green accent
        teal: {
          50:  '#edf7f5',
          100: '#ccece7',
          200: '#9dd9d0',
          300: '#6ac2b8',
          400: '#4A9E8E',  // main teal
          500: '#3a8a7b',
          600: '#2f7063',
          700: '#275c52',
          800: '#224b43',
          900: '#1d3e38',
        },
        // Background muted teal
        surface: {
          DEFAULT: '#4A9B8E',
          dark:    '#3d8278',
          light:   '#5aada0',
        },
      },
      fontFamily: {
        sans: ['Montserrat', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'monospace'],
      },
      fontWeight: {
        normal: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
        extrabold: '800',
      },
      borderRadius: {
        'xl':  '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        'card':       '0 1px 4px 0 rgba(74,155,142,0.10), 0 1px 2px -1px rgba(74,155,142,0.06)',
        'card-hover': '0 6px 20px 0 rgba(74,155,142,0.16), 0 2px 6px -1px rgba(74,155,142,0.10)',
        'modal':      '0 24px 64px -12px rgba(0,0,0,0.28)',
        'coral':      '0 4px 14px 0 rgba(232,115,90,0.30)',
        'teal':       '0 4px 14px 0 rgba(74,158,142,0.30)',
      },
      backgroundImage: {
        'coral-gradient': 'linear-gradient(135deg, #E8735A 0%, #F08070 100%)',
        'teal-gradient':  'linear-gradient(135deg, #3a8a7b 0%, #4A9E8E 100%)',
        'hero-gradient':  'linear-gradient(135deg, #4A9B8E 0%, #3a8a7b 60%, #2f7063 100%)',
        'card-gradient':  'linear-gradient(145deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%)',
      },
      animation: {
        'fade-in':    'fadeIn 0.35s ease-out',
        'slide-in':   'slideIn 0.35s ease-out',
        'slide-up':   'slideUp 0.35s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-sm':  'bounceSm 1s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%':   { opacity: '0', transform: 'translateX(-10px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideUp: {
          '0%':   { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        bounceSm: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':      { transform: 'translateY(-3px)' },
        },
      },
    },
  },
  plugins: [],
}