import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'round' | 'round-lg' | 'tab' | 'pill' | 'flat'

interface ChromeButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  variant?: Variant
  children: ReactNode
}

/** Glossy skin button. `label` doubles as tooltip + accessible name. */
export function ChromeButton({ label, variant = 'round', className = '', children, ...rest }: ChromeButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`chrome-btn chrome-btn--${variant} ${className}`.trim()}
      {...rest}
    >
      {children}
    </button>
  )
}
