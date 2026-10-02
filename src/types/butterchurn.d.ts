// Minimal typings for the parts of butterchurn (WebGL MilkDrop) we use.

declare module 'butterchurn' {
  export interface ButterchurnVisualizer {
    connectAudio(node: AudioNode): void
    disconnectAudio(node: AudioNode): void
    loadPreset(preset: object, blendTimeSec: number): void
    setRendererSize(width: number, height: number, opts?: { pixelRatio?: number }): void
    render(): void
  }

  interface Butterchurn {
    createVisualizer(
      context: AudioContext,
      canvas: HTMLCanvasElement,
      opts: { width: number; height: number; pixelRatio?: number; textureRatio?: number },
    ): ButterchurnVisualizer
  }

  const butterchurn: Butterchurn | { default: Butterchurn }
  export default butterchurn
}

declare module 'butterchurn-presets/lib/*.min.js' {
  const pack: { getPresets(): Record<string, object> } | { default: { getPresets(): Record<string, object> } }
  export default pack
}

declare module 'butterchurn-presets' {
  const pack: { getPresets(): Record<string, object> } | { default: { getPresets(): Record<string, object> } }
  export default pack
}
