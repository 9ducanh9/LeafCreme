/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#FAFAF7',
        surface: '#FFFFFF',
        border: '#E8E5DD',
        'text-primary': '#473C2F',
        'text-secondary': '#7A6F63',
        'accent-yellow': '#F5C96A',
        'accent-pink': '#F7B4B8',
        'accent-brown': '#C59B72',
      },
      fontFamily: {
        heading: ['Playfair Display', 'serif'],
        body: ['Inter', 'Be Vietnam Pro', 'sans-serif'],
      },
      borderRadius: {
        'card': '16px',
        'button': '12px',
        'input': '8px',
      },
      spacing: {
        '8': '8px',
        '12': '12px',
        '16': '16px',
        '24': '24px',
        '32': '32px',
        '48': '48px',
      },
      transitionDuration: {
        'default': '150ms',
        'slow': '200ms',
      },
    },
  },
  plugins: [],
}

