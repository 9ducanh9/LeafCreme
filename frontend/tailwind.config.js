/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--color-bg-main)',
        'bg-main': 'var(--color-bg-main)',
        'bg-alt': 'var(--color-bg-alt)',
        surface: 'var(--color-surface)',
        'surface-warm': 'var(--color-surface-warm)',
        border: 'var(--color-border)',
        'border-warm': 'var(--color-border-warm)',
        'text-primary': 'var(--color-text-primary)',
        'text-secondary': 'var(--color-text-secondary)',
        'accent-yellow': 'var(--color-accent-yellow)',
        'accent-pink': 'var(--color-accent-pink)',
        'accent-brown': 'var(--color-accent-brown)',
      },
      fontFamily: {
        heading: 'var(--font-heading)',
        body: 'var(--font-body)',
      },
      borderRadius: {
        'card': 'var(--radius-card)',
        'button': 'var(--radius-button)',
        'input': 'var(--radius-input)',
      },
      spacing: {
        '8': 'var(--spacing-8)',
        '12': 'var(--spacing-12)',
        '16': 'var(--spacing-16)',
        '24': 'var(--spacing-24)',
        '32': 'var(--spacing-32)',
        '48': 'var(--spacing-48)',
      },
      transitionDuration: {
        'default': '150ms',
        'slow': '200ms',
      },
    },
  },
  plugins: [],
}

