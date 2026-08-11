/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      inherit: 'inherit',
      'bg-canvas': 'var(--bg-canvas)',
      bg: {
        canvas: 'var(--bg-canvas)', subtle: 'var(--bg-subtle)', surface: 'var(--bg-surface)',
        'surface-hover': 'var(--bg-surface-hover)', inset: 'var(--bg-inset)', overlay: 'var(--bg-overlay)',
      },
      fg: {
        DEFAULT: 'var(--fg-default)', strong: 'var(--fg-strong)', muted: 'var(--fg-muted)', subtle: 'var(--fg-subtle)',
        disabled: 'var(--fg-disabled)', 'on-brand': 'var(--fg-on-brand)', 'on-accent': 'var(--fg-on-accent)',
      },
      border: {
        DEFAULT: 'var(--border-default)', subtle: 'var(--border-subtle)', interactive: 'var(--border-interactive)', strong: 'var(--border-strong)', brand: 'var(--border-brand)',
      },
      brand: {
        DEFAULT: 'var(--brand-bg)', hover: 'var(--brand-bg-hover)', active: 'var(--brand-bg-active)', subtle: 'var(--brand-bg-subtle)', 'border-subtle': 'var(--brand-border-subtle)', fg: 'var(--brand-fg)',
      },
      accent: { DEFAULT: 'var(--accent-bg)', hover: 'var(--accent-bg-hover)', subtle: 'var(--accent-bg-subtle)', fg: 'var(--accent-fg)' },
      success: { DEFAULT: 'var(--success-fg)', bg: 'var(--success-bg)' },
      warning: { DEFAULT: 'var(--warning-fg)', bg: 'var(--warning-bg)' },
      danger: { DEFAULT: 'var(--danger-fg)', bg: 'var(--danger-bg)', solid: 'var(--danger-bg-solid)', 'fg-on-solid': 'var(--danger-fg-on-solid)' },
      info: { DEFAULT: 'var(--info-fg)', bg: 'var(--info-bg)' },
      focus: 'var(--focus-ring)',

      /* Backward-compatible aliases for the admin and pages still being migrated. */
      background: 'var(--bg-canvas)', surface: 'var(--bg-surface)', 'surface-warm': 'var(--bg-surface)',
      'bg-main': 'var(--bg-canvas)', 'bg-alt': 'var(--bg-subtle)', 'text-primary': 'var(--fg-default)',
      'text-secondary': 'var(--fg-muted)', 'accent-brown': 'var(--brand-fg)', 'accent-pink': 'var(--danger-fg)',
      'accent-yellow': 'var(--warning-fg)', 'border-warm': 'var(--border-default)',
    },
    extend: {
      fontFamily: { heading: 'var(--font-heading)', body: 'var(--font-body)', mono: 'var(--font-mono)', numeric: 'var(--font-numeric)' },
      fontSize: {
        '2xs': ['var(--text-2xs)', { lineHeight: 'var(--leading-normal)' }], xs: ['var(--text-xs)', { lineHeight: 'var(--leading-normal)' }],
        sm: ['var(--text-sm)', { lineHeight: 'var(--leading-normal)' }], base: ['var(--text-base)', { lineHeight: 'var(--leading-relaxed)' }],
        lg: ['var(--text-lg)', { lineHeight: 'var(--leading-relaxed)' }], xl: ['var(--text-xl)', { lineHeight: 'var(--leading-snug)' }],
        '2xl': ['var(--text-2xl)', { lineHeight: 'var(--leading-snug)' }], '3xl': ['var(--text-3xl)', { lineHeight: 'var(--leading-snug)' }],
        '4xl': ['var(--text-4xl)', { lineHeight: 'var(--leading-tight)' }], h1: ['var(--text-h1)', { lineHeight: 'var(--leading-tight)', letterSpacing: 'var(--tracking-tight)' }],
        h2: ['var(--text-h2)', { lineHeight: 'var(--leading-snug)', letterSpacing: 'var(--tracking-tight)' }], display: ['var(--text-display)', { lineHeight: 'var(--leading-tight)', letterSpacing: 'var(--tracking-tighter)' }],
      },
      fontWeight: { normal: 'var(--weight-normal)', medium: 'var(--weight-medium)', semibold: 'var(--weight-semibold)', bold: 'var(--weight-bold)' },
      letterSpacing: { tighter: 'var(--tracking-tighter)', tight: 'var(--tracking-tight)', normal: 'var(--tracking-normal)', wide: 'var(--tracking-wide)', caps: 'var(--tracking-caps)' },
      lineHeight: { none: 'var(--leading-none)', tight: 'var(--leading-tight)', snug: 'var(--leading-snug)', normal: 'var(--leading-normal)', relaxed: 'var(--leading-relaxed)' },
      spacing: {
        1: 'var(--space-1)', 2: 'var(--space-2)', 3: 'var(--space-3)', 4: 'var(--space-4)', 5: 'var(--space-5)', 6: 'var(--space-6)',
        8: 'var(--space-8)', 10: 'var(--space-10)', 12: 'var(--space-12)', 16: 'var(--space-16)', 20: 'var(--space-20)', 24: 'var(--space-24)',
      },
      borderRadius: { xs: 'var(--radius-xs)', sm: 'var(--radius-sm)', md: 'var(--radius-md)', lg: 'var(--radius-lg)', xl: 'var(--radius-xl)', full: 'var(--radius-full)', card: 'var(--radius-lg)', button: 'var(--radius-md)', input: 'var(--radius-md)' },
      boxShadow: { xs: 'var(--shadow-xs)', sm: 'var(--shadow-sm)', md: 'var(--shadow-md)', lg: 'var(--shadow-lg)', xl: 'var(--shadow-xl)' },
      zIndex: { base: 'var(--z-base)', raised: 'var(--z-raised)', sticky: 'var(--z-sticky)', header: 'var(--z-header)', dropdown: 'var(--z-dropdown)', overlay: 'var(--z-overlay)', modal: 'var(--z-modal)', toast: 'var(--z-toast)', tooltip: 'var(--z-tooltip)' },
      transitionDuration: { instant: 'var(--duration-instant)', fast: 'var(--duration-fast)', normal: 'var(--duration-normal)', slow: 'var(--duration-slow)', slower: 'var(--duration-slower)' },
      transitionTimingFunction: { out: 'var(--ease-out)', 'in-out': 'var(--ease-in-out)', spring: 'var(--ease-spring)' },
      aspectRatio: { product: '4 / 5', hero: '16 / 9' },
      maxWidth: { container: 'var(--container-max)', prose: 'var(--container-prose)', form: 'var(--container-form)' },
      minHeight: { screen: '100svh' },
    },
  },
  plugins: [],
}
