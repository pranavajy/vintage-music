import { desktop } from '../../desktop'
import type { ScreenView } from '../../types/player'
import { ChromeButton } from './ChromeButton'
import { CloseIcon, EffectsIcon, EqualizerIcon, LibraryIcon, MinimizeIcon, PlaylistIcon } from './icons'

interface TitleBarProps {
  view: ScreenView
  onViewChange(view: ScreenView): void
}

export function TitleBar({ view, onViewChange }: TitleBarProps) {
  const tab = (target: ScreenView) => ({
    'aria-pressed': view === target,
    className: view === target ? 'is-active' : '',
    onClick: () => onViewChange(target),
  })

  return (
    <div className="titlebar">
      <div className="titlebar__tab">
        <ChromeButton variant="tab" label="Library" {...tab('library')}>
          <LibraryIcon />
        </ChromeButton>
        <ChromeButton variant="tab" label="Discover playlists" {...tab('discover')}>
          <PlaylistIcon />
        </ChromeButton>
        <ChromeButton variant="tab" label="Visualizations" {...tab('visualizer')}>
          <EffectsIcon />
        </ChromeButton>
        <ChromeButton variant="tab" label="Equalizer (coming soon)" disabled>
          <EqualizerIcon />
        </ChromeButton>
      </div>

      <div className="titlebar__window-controls">
        <ChromeButton variant="flat" label="Minimize" onClick={() => desktop?.minimize()}>
          <MinimizeIcon />
        </ChromeButton>
        <ChromeButton variant="flat" label="Close" onClick={() => desktop?.close()}>
          <CloseIcon />
        </ChromeButton>
      </div>
    </div>
  )
}
