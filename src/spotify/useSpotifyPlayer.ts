import { useEffect, useMemo, useState } from 'react'
import { desktop } from '../desktop'
import type { LibraryContextValue } from './library'
import type { PlayerActions, PlayerViewState, StatusLine } from '../types/player'
import { initialPlayerViewState } from '../types/player'
import type { SpotifyCommand, SpotifyPlayback, SpotifyState } from './types'

const DEVICE_NAME = 'Vintage Media Player'
const bridge = desktop?.spotify

/** Adapts the Spotify service snapshot to the skin's view model + actions. */
export function useSpotifyPlayer(): {
  view: PlayerViewState
  status: StatusLine
  actions: PlayerActions
  library: LibraryContextValue
} {
  const [state, setState] = useState<SpotifyState | null>(null)
  const now = useTicker(Boolean(state?.playback?.isPlaying))

  useEffect(() => {
    if (!bridge) return
    let alive = true
    bridge.getState().then((s) => alive && setState(s))
    const off = bridge.onState(setState)
    return () => {
      alive = false
      off()
    }
  }, [])

  const pb = state?.playback ?? null
  const durationMs = pb?.track?.durationMs ?? 0

  const actions = useMemo<PlayerActions>(() => {
    const send = (cmd: SpotifyCommand) => void bridge?.command(cmd)
    return {
      playPause: () => send({ type: 'togglePlay' }),
      stop: () => send({ type: 'stop' }),
      previous: () => send({ type: 'previous' }),
      next: () => send({ type: 'next' }),
      rewind: () => send({ type: 'rewind' }),
      fastForward: () => send({ type: 'fastForward' }),
      toggleMute: () => send({ type: 'toggleMute' }),
      seek: (f) => durationMs > 0 && send({ type: 'seek', positionMs: f * durationMs }),
      setVolume: (v) => send({ type: 'volume', percent: v * 100 }),
    }
  }, [durationMs])

  const progressMs = pb ? interpolate(pb, now) : 0

  const ready = state?.connection === 'ready'
  const nowPlayingUri = pb?.track?.uri ?? null
  const nowPlayingContextUri = pb?.contextUri ?? null
  const library = useMemo<LibraryContextValue>(
    () => ({
      ready,
      nowPlayingUri,
      nowPlayingContextUri,
      play: (target) => void bridge?.command({ type: 'playItems', ...target }),
    }),
    [ready, nowPlayingUri, nowPlayingContextUri],
  )

  const view: PlayerViewState = pb
    ? {
        status: pb.isPlaying ? 'playing' : progressMs > 0 ? 'paused' : 'stopped',
        currentTrack: pb.track
          ? {
              id: pb.track.id,
              title: pb.track.title,
              artist: pb.track.artist,
              album: pb.track.album,
              durationSec: pb.track.durationMs / 1000,
            }
          : null,
        positionSec: progressMs / 1000,
        volume: pb.volumePercent / 100,
        muted: pb.volumePercent === 0,
      }
    : initialPlayerViewState

  return { view, status: statusLine(state, progressMs), actions, library }
}

function statusLine(state: SpotifyState | null, progressMs: number): StatusLine {
  const send = (cmd: SpotifyCommand) => () => void bridge?.command(cmd)

  if (!bridge) return { text: 'Run as desktop app (npm run dev) to connect Spotify' }
  if (!state) return { text: 'Connecting…' }
  if (state.error) return { text: state.error.message }

  switch (state.connection) {
    case 'no-client-id':
      return { text: 'Add SPOTIFY_CLIENT_ID to .env and restart' }
    case 'signed-out':
      return { text: 'Click here to sign in to Spotify', action: { label: 'Sign in to Spotify', run: send({ type: 'signIn' }) } }
    case 'signing-in':
      return {
        text: 'Finish signing in to Spotify in your browser… (click to retry)',
        action: { label: 'Restart Spotify sign-in', run: send({ type: 'signIn' }) },
      }
  }

  if (state.deviceStatus === 'missing') return { text: 'librespot not found: brew install librespot' }
  if (state.deviceStatus === 'needs-auth') {
    return {
      text: `Click here to connect ${DEVICE_NAME} to your Spotify account`,
      action: { label: 'Connect device to Spotify', run: send({ type: 'connectDevice' }) },
    }
  }

  const pb = state.playback
  if (!pb?.track) {
    return state.deviceId
      ? { text: `Ready on ${DEVICE_NAME}: press Play` }
      : { text: `Select "${DEVICE_NAME}" in Spotify's device list` }
  }

  const label = [pb.track.title, pb.track.artist].filter(Boolean).join(' - ')
  const elsewhere = pb.deviceId !== state.deviceId && pb.deviceName
  return {
    text: `${pb.isPlaying ? '' : 'Paused: '}${label}${elsewhere ? `  (on ${pb.deviceName})` : ''}`,
    time: formatTime(progressMs),
  }
}

function interpolate(pb: SpotifyPlayback, now: number) {
  const elapsed = pb.isPlaying ? now - pb.fetchedAt : 0
  return Math.min(pb.progressMs + Math.max(0, elapsed), pb.track?.durationMs ?? Infinity)
}

function formatTime(ms: number) {
  const s = Math.floor(ms / 1000)
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

/** Re-renders periodically while active so progress moves between polls. */
function useTicker(active: boolean, intervalMs = 250) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [active, intervalMs])
  return now
}
