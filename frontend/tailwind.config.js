/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      screens: {
        'xs': '475px',   // Teléfonos muy pequeños
        // sm: 640px, md: 768px, lg: 1024px, xl: 1280px (Tailwind defaults)
      },
      colors: {
        celeste: {
          50:  '#e0f7ff',
          100: '#b3ecff',
          200: '#80dfff',
          300: '#4dd2ff',
          400: '#26c7ff',
          500: '#00AEEF',
          600: '#0097d4',
          700: '#0080b8',
          800: '#006a9d',
          900: '#005480',
        },
        amarillo: {
          400: '#FFE033',
          500: '#FFD600',
          600: '#E6C000',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 8px 32px rgba(0, 174, 239, 0.12), 0 2px 8px rgba(0,0,0,0.08)',
        'card-hover': '0 16px 48px rgba(0, 174, 239, 0.2), 0 4px 16px rgba(0,0,0,0.12)',
      },
    },
  },
  plugins: [],
}
