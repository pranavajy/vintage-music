import { useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent } from 'react'

interface SliderProps {
  label: string
  /** 0..1 */
  value: number
  /** Called once when the user releases the thumb (or presses an arrow key). */
  onChange?: (value: number) => void
  disabled?: boolean
  className?: string
}

const KEY_STEP = 0.05

/** Track + green thumb. Shows the drag position locally until committed. */
export function Slider({ label, value, onChange, disabled = false, className = '' }: SliderProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [dragValue, setDragValue] = useState<number | null>(null)
  const shown = clamp01(dragValue ?? value)
  const interactive = Boolean(onChange) && !disabled

  const fractionAt = (clientX: number) => {
    const rect = trackRef.current!.getBoundingClientRect()
    return clamp01((clientX - rect.left) / rect.width)
  }

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (!interactive || e.button !== 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    setDragValue(fractionAt(e.clientX))
  }

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (dragValue !== null) setDragValue(fractionAt(e.clientX))
  }

  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    if (dragValue === null) return
    onChange?.(fractionAt(e.clientX))
    setDragValue(null)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!interactive) return
    const delta = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? KEY_STEP : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -KEY_STEP : 0
    if (!delta) return
    e.preventDefault()
    onChange?.(clamp01(value + delta))
  }

  return (
    <div
      ref={trackRef}
      className={`slider ${interactive ? '' : 'slider--disabled'} ${className}`.replace(/\s+/g, ' ').trim()}
      role="slider"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(shown * 100)}
      aria-disabled={!interactive}
      tabIndex={interactive ? 0 : -1}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => setDragValue(null)}
      onKeyDown={onKeyDown}
    >
      <div className="slider__track" />
      <div className="slider__thumb" style={{ left: `${shown * 100}%` }} />
    </div>
  )
}

function clamp01(v: number) {
  return Math.min(1, Math.max(0, v))
}
