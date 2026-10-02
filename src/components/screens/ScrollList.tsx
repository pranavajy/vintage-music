import { useEffect, useRef } from 'react'
import type { ReactNode, UIEvent } from 'react'

interface ScrollListProps {
  loading: boolean
  error: string | null
  empty: boolean
  emptyText: string
  onRetry(): void
  onNearEnd(): void
  children: ReactNode
}

/** Scrolling LCD list body with loading / error / empty states and infinite scroll. */
export function ScrollList({ loading, error, empty, emptyText, onRetry, onNearEnd, children }: ScrollListProps) {
  const ref = useRef<HTMLDivElement>(null)
  const nearEnd = (el: HTMLDivElement) => el.scrollHeight - el.scrollTop - el.clientHeight < 48

  // Short pages may not fill the screen (nothing to scroll): keep loading.
  useEffect(() => {
    if (!loading && !error && ref.current && nearEnd(ref.current)) onNearEnd()
  })

  const onScroll = (e: UIEvent<HTMLDivElement>) => {
    if (nearEnd(e.currentTarget)) onNearEnd()
  }

  return (
    <div ref={ref} className="lcd-list" role="list" onScroll={onScroll}>
      {children}
      {loading && <div className="lcd-list__note lcd-blink">Loading…</div>}
      {error && (
        <div className="lcd-list__note lcd-list__note--error">
          {error}{' '}
          <button type="button" className="lcd-link" onClick={onRetry}>
            [retry]
          </button>
        </div>
      )}
      {!loading && !error && empty && <div className="lcd-list__note">{emptyText}</div>}
    </div>
  )
}
