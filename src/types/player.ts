// Source-agnostic player types. The skin renders these; a source (Spotify
// today, a local library later) produces them.

export type PlaybackStatus = 'stopped' | 'playing' | 'paused'

/** What the black screen shows (switched by the title-bar tab buttons). */
export type ScreenView = 'visualizer' | 'library' | 'discover'

export interface Track {
  id: string
  title: string
  artist?: string
  album?: string
  durationSec: number
  src?: string
}

export interface PlayerViewState {
  status: PlaybackStatus
  currentTrack: Track | null
  positionSec: number
  volume: number // 0..1
  muted: boolean
}

/** Text in the black strip under the visualizer. */
export interface StatusLine {
  text: string
  /** Right-aligned elapsed time, e.g. "01:23". */
  time?: string
  /** Makes the strip clickable (sign in, play here, ...). */
  action?: { label: string; run: () => void }
}

export interface PlayerActions {
  playPause(): void
  stop(): void
  previous(): void
  next(): void
  rewind(): void
  fastForward(): void
  toggleMute(): void
  /** fraction 0..1 of the track */
  seek(fraction: number): void
  /** 0..1 */
  setVolume(volume: number): void
}

export const initialPlayerViewState: PlayerViewState = {
  status: 'stopped',
  currentTrack: null,
  positionSec: 0,
  volume: 0.6,
  muted: false,
}
