import type { ReactNode } from 'react'

interface ScreenHeaderProps {
  title: string
  subtitle?: string
  onBack?: () => void
  actions?: ReactNode
}

/** Blue WMP-style title strip at the top of the screen views. */
export function ScreenHeader({ title, subtitle, onBack, actions }: ScreenHeaderProps) {
  return (
    <div className="screen-header">
      {onBack && (
        <button type="button" className="screen-header__back" onClick={onBack} aria-label="Back" title="Back">
          ◂
        </button>
      )}
      <div className="screen-header__titles">
        <span className="screen-header__title">{title}</span>
        {subtitle && <span className="screen-header__subtitle">{subtitle}</span>}
      </div>
      {actions && <div className="screen-header__actions">{actions}</div>}
    </div>
  )
}
