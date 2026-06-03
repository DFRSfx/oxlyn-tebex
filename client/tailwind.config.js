/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Global brand palette — vivid rose-red. Bumped saturation up from
        // the previous dusty-rose run (a4364a → bd2e44) so the brand feels
        // a touch more energetic. Still leans pink to stay away from the
        // "console error red" look.
        'primary-orange': '#d4253b',
        orange: {
          50:  '#fce7eb',
          100: '#fbcad1',
          200: '#f59ba6',
          300: '#ec6a7a',
          400: '#df4356',
          500: '#d4253b',
          600: '#b41a30',
          700: '#921525',
          800: '#6f101c',
          900: '#4a0a13',
          950: '#2a050a',
        },
        amber: {
          50:  '#fce7eb',
          100: '#fbcad1',
          200: '#f59ba6',
          300: '#ec6a7a',
          400: '#df4356',
          500: '#d4253b',
          600: '#b41a30',
          700: '#921525',
          800: '#6f101c',
          900: '#4a0a13',
          950: '#2a050a',
        },
        red: {
          50:  '#fce7eb',
          100: '#fbcad1',
          200: '#f59ba6',
          300: '#ec6a7a',
          400: '#df4356',
          500: '#d4253b',
          600: '#b41a30',
          700: '#921525',
          800: '#6f101c',
          900: '#4a0a13',
          950: '#2a050a',
        },
      },
      keyframes: {
        slideInRight: {
          from: { transform: 'translateX(100%)' },
          to: { transform: 'translateX(0)' },
        },
        slideOutRight: {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(100%)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        fadeOut: {
          from: { opacity: '1' },
          to: { opacity: '0' },
        },
      },
      animation: {
        slideInRight: 'slideInRight 0.3s cubic-bezier(0.32, 0.72, 0, 1) forwards',
        slideOutRight: 'slideOutRight 0.3s cubic-bezier(0.32, 0.72, 0, 1) forwards',
        fadeIn: 'fadeIn 0.3s ease forwards',
        fadeOut: 'fadeOut 0.3s ease forwards',
      },
    },
  },
  plugins: [],
};
