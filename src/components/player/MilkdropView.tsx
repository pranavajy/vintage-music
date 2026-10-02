import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { connectSystemAudio, getSystemAudioStatus, onSystemAudioStatus } from '../../audio/systemAudio'
import type { SystemAudioStatus } from '../../audio/systemAudio'
import { createMilkdropRenderer } from '../../visualizer/milkdropRenderer'
import { Visualizer } from './Visualizer'

const PRESET_KEY = 'vmp.milkdrop.preset'
const AUTO_KEY = 'vmp.milkdrop.autoCycle'

/**
 * The main screen: MilkDrop presets reacting to whatever the Mac is playing.
 * Hover for the visualization toolbar; click the picture for the next preset.
 */
export function MilkdropView() {
  // `seq` re-keys the label so its CSS fade animation replays on every change.
  const [preset, setPreset] = useState<{ name: string; seq: number } | null>(null)
  const [presetNames, setPresetNames] = useState<string[]>([])
  const [autoCycle, setAutoCycle] = useState(() => readPref(AUTO_KEY) !== 'off')
  const [browsing, setBrowsing] = useState(false)
  const [audioStatus, setAudioStatus] = useState<SystemAudioStatus>(getSystemAudioStatus)
  const [audioError, setAudioError] = useState<string | null>(null)

  const renderer = useMemo(
    () =>
      createMilkdropRenderer({
        initialPreset: readPref(PRESET_KEY),
        onPresetChange: (name) => {
          writePref(PRESET_KEY, name)
          setPreset((p) => ({ name, seq: (p?.seq ?? 0) + 1 }))
        },
        onPresetsLoaded: setPresetNames,
      }),
    [],
  )

  useEffect(() => {
    renderer.setAutoCycle(autoCycle)
    writePref(AUTO_KEY, autoCycle ? 'on' : 'off')
  }, [renderer, autoCycle])

  const syncAudio = useCallback(
    () =>
      connectSystemAudio().then(
        ({ node }) => {
          setAudioError(null)
          renderer.attachAudio(node)
        },
        (err: unknown) => setAudioError(err instanceof Error ? err.message : String(err)),
      ),
    [renderer],
  )

  useEffect(() => onSystemAudioStatus(setAudioStatus), [])
  useEffect(() => {
    void syncAudio()
  }, [syncAudio])

  const onKeyDown = (e: KeyboardEvent) => {
    if (browsing) return
    if (e.key === 'ArrowRight' || e.key === ' ') renderer.nextPreset()
    else if (e.key === 'ArrowLeft') renderer.previousPreset()
    else if (e.key.toLowerCase() === 'r') renderer.randomPreset()
    else return
    e.preventDefault()
  }

  return (
    <div
      className="milkdrop"
      tabIndex={0}
      role="img"
      aria-label={`MilkDrop visualization${preset ? `: ${preset.name}` : ''}`}
      onClick={() => renderer.nextPreset()}
      onContextMenu={(e) => {
        e.preventDefault()
        renderer.previousPreset()
      }}
      onKeyDown={onKeyDown}
    >
      <Visualizer renderer={renderer} />

      {preset && !browsing && (
        <div key={preset.seq} className="milkdrop__preset" aria-live="polite">
          {preset.name}
        </div>
      )}

      {browsing && (
        <PresetBrowser
          names={presetNames}
          current={preset?.name ?? null}
          onSelect={(name) => renderer.selectPreset(name)}
          onClose={() => setBrowsing(false)}
        />
      )}

      {audioStatus !== 'live' && !browsing && (
        <button
          type="button"
          className="milkdrop__audio"
          onClick={(e) => {
            e.stopPropagation()
            void syncAudio()
          }}
          title={audioError ?? undefined}
        >
          {audioStatus === 'connecting' ? '◌ Connecting to system audio…' : '♪ Click to sync visuals to your music'}
        </button>
      )}

      {/* WMP-style visualization toolbar, shown on hover */}
      <div className="viz-toolbar" onClick={(e) => e.stopPropagation()} onContextMenu={(e) => e.stopPropagation()}>
        <button type="button" className="viz-btn" onClick={() => renderer.previousPreset()} title="Previous visualization (←)">
          ◂
        </button>
        <button type="button" className="viz-btn" onClick={() => renderer.nextPreset()} title="Next visualization (→)">
          ▸
        </button>
        <button type="button" className="viz-btn" onClick={() => renderer.randomPreset()} title="Random visualization (R)">
          ⤮ Random
        </button>
        <button
          type="button"
          className={`viz-btn ${browsing ? 'is-on' : ''}`}
          onClick={() => setBrowsing((b) => !b)}
          disabled={presetNames.length === 0}
          title="Browse all visualizations"
        >
          ☰ Presets
        </button>
        <button
          type="button"
          className={`viz-btn ${autoCycle ? 'is-on' : ''}`}
          onClick={() => setAutoCycle((a) => !a)}
          aria-pressed={autoCycle}
          title="Change visualization automatically"
        >
          ⟳ Auto {autoCycle ? 'on' : 'off'}
        </button>
        <span className={`viz-audio-dot ${audioStatus === 'live' ? 'is-live' : ''}`} title={audioStatus === 'live' ? 'Listening to system audio' : 'Not listening'} />
      </div>
    </div>
  )
}

interface PresetBrowserProps {
  names: string[]
  current: string | null
  onSelect(name: string): void
  onClose(): void
}

/** Searchable preset list; click to audition (the picture stays visible beside it). */
function PresetBrowser({ names, current, onSelect, onClose }: PresetBrowserProps) {
  const [filter, setFilter] = useState('')
  const listRef = useRef<HTMLDivElement>(null)
  const shown = useMemo(() => {
    const q = filter.trim().toLowerCase()
    return q ? names.filter((n) => n.toLowerCase().includes(q)) : names
  }, [names, filter])

  // Start scrolled to the current preset.
  useEffect(() => {
    listRef.current?.querySelector('.is-playing')?.scrollIntoView({ block: 'center' })
  }, [])

  return (
    <div
      className="preset-browser"
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        e.stopPropagation()
        if (e.key === 'Escape') onClose()
      }}
    >
      <div className="screen-header">
        <div className="screen-header__titles">
          <span className="screen-header__title">Visualizations</span>
          <span className="screen-header__subtitle">{shown.length}</span>
        </div>
        <button type="button" className="screen-btn" onClick={onClose}>
          ✕
        </button>
      </div>
      <div className="discover-search">
        <input
          className="retro-input"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter presets…"
          aria-label="Filter presets"
          spellCheck={false}
          autoFocus
        />
      </div>
      <div className="lcd-list" ref={listRef} role="list">
        {shown.map((name) => (
          <button
            key={name}
            type="button"
            role="listitem"
            className={`lcd-row lcd-row--playlist ${name === current ? 'is-playing' : ''}`}
            onClick={() => onSelect(name)}
            title={name}
          >
            <span className="lcd-row__icon" aria-hidden>
              {name === current ? '♪' : '✶'}
            </span>
            <span className="lcd-row__main">{name}</span>
          </button>
        ))}
        {shown.length === 0 && <div className="lcd-list__note">No presets match.</div>}
      </div>
    </div>
  )
}

function readPref(key: string) {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function writePref(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // preferences are best-effort
  }
}
