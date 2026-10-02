import type { ButterchurnVisualizer } from 'butterchurn'
import { getAudioContext } from '../audio/systemAudio'
import type { VisualizerRenderer } from './types'

export interface MilkdropRenderer extends VisualizerRenderer {
  /** Feed audio (the visualizer reacts to it). Safe to call before mount. */
  attachAudio(node: AudioNode): void
  nextPreset(): void
  previousPreset(): void
  randomPreset(): void
  selectPreset(name: string): void
  setAutoCycle(on: boolean): void
}

interface Options {
  /** Auto-advance interval; 0 disables. */
  cycleSec?: number
  blendSec?: number
  /** Preset to start with (e.g. the last one used); random otherwise. */
  initialPreset?: string | null
  onPresetChange?(name: string): void
  /** All preset names, once the packs have loaded. */
  onPresetsLoaded?(names: string[]): void
}

type PresetPack = { getPresets(): Record<string, object> }

/**
 * MilkDrop via butterchurn (WebGL port of the MilkDrop 2 engine; runs the
 * same .milk presets the MilkDrop family uses). Presets are lazy-loaded.
 */
export function createMilkdropRenderer({
  cycleSec = 25,
  blendSec = 2.7,
  initialPreset = null,
  onPresetChange,
  onPresetsLoaded,
}: Options = {}): MilkdropRenderer {
  let autoCycle = cycleSec > 0
  let canvas: HTMLCanvasElement | null = null
  let viz: ButterchurnVisualizer | null = null
  let audio: AudioNode | null = null
  let presets: [string, object][] = []
  let index = 0
  let lastSwitch = 0
  let clock = 0
  let size = { w: 1, h: 1 }

  const show = (i: number, blend: number) => {
    if (!viz || presets.length === 0) return
    index = (i + presets.length) % presets.length
    const [name, preset] = presets[index]
    viz.loadPreset(preset, blend)
    lastSwitch = clock
    onPresetChange?.(name)
  }

  return {
    id: 'milkdrop',
    name: 'MilkDrop',
    animated: true,

    mount(el) {
      canvas = el
      void loadButterchurn().then((bc) => {
        if (canvas !== el) return // unmounted meanwhile
        viz = bc.createVisualizer(getAudioContext(), el, { width: size.w, height: size.h, pixelRatio: 1 })
        if (audio) viz.connectAudio(audio)
        return loadPresets().then((list) => {
          if (canvas !== el) return
          presets = list
          onPresetsLoaded?.(list.map(([name]) => name))
          const start = initialPreset ? list.findIndex(([name]) => name === initialPreset) : -1
          show(start >= 0 ? start : Math.floor(Math.random() * presets.length), 0)
        })
      })
    },

    resize(width, height, dpr) {
      if (!canvas) return
      size = { w: Math.round(width * dpr), h: Math.round(height * dpr) }
      canvas.width = size.w
      canvas.height = size.h
      viz?.setRendererSize(size.w, size.h)
    },

    render({ time }) {
      clock = time
      if (!viz) return
      if (autoCycle && presets.length > 1 && time - lastSwitch > cycleSec) show(Math.floor(Math.random() * presets.length), blendSec)
      viz.render()
    },

    dispose() {
      if (viz && audio) viz.disconnectAudio(audio)
      viz = null
      canvas = null
    },

    attachAudio(node) {
      if (viz && audio) viz.disconnectAudio(audio)
      audio = node
      viz?.connectAudio(node)
    },

    nextPreset: () => show(index + 1, blendSec),
    previousPreset: () => show(index - 1, blendSec),
    randomPreset: () => show(Math.floor(Math.random() * presets.length), blendSec),
    selectPreset: (name) => {
      const i = presets.findIndex(([n]) => n === name)
      if (i >= 0) show(i, blendSec)
    },
    setAutoCycle: (on) => {
      autoCycle = on && cycleSec > 0
      lastSwitch = clock // restart the countdown
    },
  }
}

async function loadButterchurn() {
  const mod = (await import('butterchurn')).default
  return 'default' in mod ? mod.default : mod
}

let presetCache: Promise<[string, object][]> | null = null

function loadPresets() {
  presetCache ??= Promise.all([
    import('butterchurn-presets/lib/butterchurnPresets.min.js'),
    import('butterchurn-presets/lib/butterchurnPresetsExtra.min.js'),
  ]).then((mods) => {
    const all: Record<string, object> = {}
    for (const m of mods) Object.assign(all, unwrap(m.default).getPresets())
    return Object.entries(all).sort(([a], [b]) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
  })
  return presetCache
}

function unwrap(pack: PresetPack | { default: PresetPack }): PresetPack {
  return 'default' in pack ? pack.default : pack
}
