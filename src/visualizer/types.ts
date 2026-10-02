// Contract every visualizer implements. The <Visualizer> component owns the
// canvas and lifecycle; renderers only draw. A WebGL / Three.js shader
// renderer can be dropped in later without touching the player UI.

export interface VisualizerFrame {
  time: number // seconds since mount
  /** Frequency data from an AnalyserNode, once audio is wired up. */
  frequencyData?: Uint8Array
}

export interface VisualizerRenderer {
  readonly id: string
  readonly name: string
  /** Whether the renderer needs a requestAnimationFrame loop. */
  readonly animated: boolean
  mount(canvas: HTMLCanvasElement): void
  resize(width: number, height: number, dpr: number): void
  render(frame: VisualizerFrame): void
  dispose(): void
}
