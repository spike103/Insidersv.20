/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: { 900: '#020b20', 800: '#05122f', 700: '#0a1a40', 600: '#122656', 500: '#1c3370' },
        fg: { 1: '#ffffff', 2: '#c8d1e6', 3: '#7b89ac', 4: '#4a587a' },
        blue: { 400: '#5b83ff', 500: '#2962ff', 600: '#1a4ee0' },
        gold: { 300: '#ffe587', 400: '#f0e080', 500: '#d4b95a' },
        win: { 400: '#40d876', 500: '#22c55e' },
        loss: { 400: '#ff6b6b', 500: '#ef4444' },
      },
      fontFamily: {
        sans: ['Poppins', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.35s ease-out',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { transform: 'translateY(20px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
      },
    },
  },
  plugins: [],
}
