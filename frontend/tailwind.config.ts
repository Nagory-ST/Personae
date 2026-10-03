import type { Config } from 'tailwindcss'

/**
 * Tailwind ne définit AUCUNE valeur ici : il ne fait que pointer vers les
 * variables CSS de `design/tokens.css`, qui reste la source unique de vérité
 * de la Direction Artistique.
 *
 * Conséquence voulue : corriger une couleur se fait dans les tokens, à un seul
 * endroit, et non dans neuf fichiers comme dans les maquettes d'origine.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--color-bg)',
        surface: 'var(--color-surface)',
        glass: 'var(--color-surface-glass)',
        border: 'var(--color-border)',
        text: 'var(--color-text)',
        'text-secondary': 'var(--color-text-secondary)',
        'text-accent': 'var(--color-text-accent)',
        'text-soft': 'var(--color-text-soft)',
        accent: 'var(--color-accent)',
        'accent-hover': 'var(--color-accent-hover)',
        success: 'var(--color-success)',
        danger: 'var(--color-danger)',
        warning: 'var(--color-warning)',
        'decor-muted': 'var(--color-decor-muted)',
      },
      fontFamily: {
        display: 'var(--font-display)',
        ui: 'var(--font-ui)',
      },
      fontSize: {
        display: 'var(--text-display)',
        title: 'var(--text-title)',
        heading: 'var(--text-heading)',
        body: 'var(--text-body)',
        ui: 'var(--text-ui)',
        meta: 'var(--text-meta)',
        micro: 'var(--text-micro)',
      },
      spacing: {
        1: 'var(--space-1)',
        2: 'var(--space-2)',
        3: 'var(--space-3)',
        4: 'var(--space-4)',
        5: 'var(--space-5)',
        6: 'var(--space-6)',
        8: 'var(--space-8)',
        12: 'var(--space-12)',
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        full: 'var(--radius-full)',
      },
      transitionDuration: {
        fast: '120ms',
        base: '180ms',
        slow: '280ms',
      },
      maxWidth: { content: 'var(--content-max-width)' },
      width: { sidebar: 'var(--sidebar-width)' },
    },
  },
  plugins: [],
}

export default config
