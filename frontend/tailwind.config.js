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
        'border-christmas': 'var(--color-border-christmas)',
        'text-primary': 'var(--color-text-primary)',
        'text-secondary': 'var(--color-text-secondary)',
        'accent-yellow': 'var(--color-accent-yellow)',
        'accent-pink': 'var(--color-accent-pink)',
        'accent-brown': 'var(--color-accent-brown)',
        'christmas-red': 'var(--color-christmas-red)',
        'christmas-green': 'var(--color-christmas-green)',
        'christmas-gold': 'var(--color-christmas-gold)',
        'christmas-gold-light': 'var(--color-christmas-gold-light)',
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
        'fast': '200ms',
        'default': '300ms',
        'smooth': '400ms',
        'slow': '500ms',
      },
      transitionTimingFunction: {
        'soft': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'smooth': 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        'bounce': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      },
    },
  },
  plugins: [],
}

