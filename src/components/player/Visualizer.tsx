import { useEffect, useRef } from 'react'
import type { VisualizerRenderer } from '../../visualizer/types'

interface VisualizerProps {
  renderer: VisualizerRenderer
}

export function Visualizer({ renderer }: VisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    renderer.mount(canvas)
    const start = performance.now()
    let raf = 0

    const draw = () => renderer.render({ time: (performance.now() - start) / 1000 })

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      renderer.resize(width, height, window.devicePixelRatio || 1)
      if (!renderer.animated) draw()
    })
    observer.observe(canvas)

    if (renderer.animated) {
      const loop = () => {
        draw()
        raf = requestAnimationFrame(loop)
      }
      raf = requestAnimationFrame(loop)
    }

    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
      renderer.dispose()
    }
  }, [renderer])

  return <canvas ref={canvasRef} className="visualizer-canvas" />
}
