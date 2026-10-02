import { useState } from 'react'
import type { PlayerActions, PlayerViewState, ScreenView, StatusLine } from '../../types/player'
import { DiscoverView } from '../screens/DiscoverView'
import { LibraryView } from '../screens/LibraryView'
import '../screens/screens.css'
import { ControlBar } from './ControlBar'
import { SeekBar } from './SeekBar'
import { TitleBar } from './TitleBar'
import { MilkdropView } from './MilkdropView'
import './PlayerWindow.css'

interface PlayerWindowProps {
  state: PlayerViewState
  status: StatusLine
  actions: PlayerActions
}

export function PlayerWindow({ state, status, actions }: PlayerWindowProps) {
  const [view, setView] = useState<ScreenView>('visualizer')
  const duration = state.currentTrack?.durationSec ?? 0
  const progress = duration > 0 ? state.positionSec / duration : 0

  const statusContent = (
    <>
      <span className="player__status-text">{status.text}</span>
      {status.time && <span className="player__status-time">{status.time}</span>}
    </>
  )

  return (
    <section className="player" aria-label="Media player">
      <TitleBar view={view} onViewChange={setView} />

      <div className="player__screen">
        <div className={`player__viz ${view === 'visualizer' ? '' : 'player__viz--panel'}`}>
          {view === 'visualizer' && <MilkdropView />}
          {view === 'library' && <LibraryView />}
          {view === 'discover' && <DiscoverView />}
        </div>
        {status.action ? (
          <button type="button" className="player__status player__status--action" title={status.action.label} onClick={status.action.run}>
            {statusContent}
          </button>
        ) : (
          <div className="player__status" aria-live="polite">
            {statusContent}
          </div>
        )}
      </div>

      <SeekBar progress={progress} canSeek={duration > 0} actions={actions} />
      <ControlBar isPlaying={state.status === 'playing'} volume={state.volume} muted={state.muted} actions={actions} />
    </section>
  )
}
