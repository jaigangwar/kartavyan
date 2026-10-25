/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        carbon: '#08080A',
        gunmetal: '#111115',
        titanium: '#18181E',
        bevel: '#262630',
        signal: '#FF4F00',
        amber: '#FFB000',
        telemetry: '#00E676',
        alabaster: '#F4F4F6',
      },
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        sans: ['Plus Jakarta Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      }
    },
  },
  plugins: [],
};
