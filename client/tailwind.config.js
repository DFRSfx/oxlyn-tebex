/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'primary-orange': '#FF9500',
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
