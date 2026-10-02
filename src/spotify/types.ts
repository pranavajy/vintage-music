// Mirrors the snapshot emitted by electron/spotify/service.mjs.

export type SpotifyConnection = 'no-client-id' | 'signed-out' | 'signing-in' | 'ready'
export type ConnectDeviceStatus = 'missing' | 'starting' | 'needs-auth' | 'online' | 'stopped'

export interface SpotifyTrack {
  id: string
  uri: string
  title: string
  artist?: string
  album?: string
  durationMs: number
  imageUrl: string | null
}

export interface SpotifyPlayback {
  isPlaying: boolean
  progressMs: number
  /** Local Date.now() when progressMs was valid; used to interpolate. */
  fetchedAt: number
  volumePercent: number
  deviceId: string | null
  deviceName: string | null
  shuffle: boolean
  repeat: 'off' | 'track' | 'context'
  /** Playlist/album being played, if any. */
  contextUri: string | null
  track: SpotifyTrack | null
}

export interface SpotifyState {
  connection: SpotifyConnection
  deviceStatus: ConnectDeviceStatus
  /** This app's Connect device id, once Spotify lists it. */
  deviceId: string | null
  error: { message: string; at: number } | null
  playback: SpotifyPlayback | null
}

export type SpotifyCommand =
  | { type: 'signIn' }
  | { type: 'connectDevice' }
  | { type: 'togglePlay' }
  | { type: 'stop' }
  | { type: 'next' }
  | { type: 'previous' }
  | { type: 'rewind' }
  | { type: 'fastForward' }
  | { type: 'seek'; positionMs: number }
  | { type: 'volume'; percent: number }
  | { type: 'toggleMute' }
  | { type: 'transferHere' }
  | { type: 'playItems'; contextUri?: string; uris?: string[]; offsetUri?: string }

// ---- Library / discovery (mirrors electron/spotify/library.mjs) ----

export interface PlaylistSummary {
  id: string
  uri: string
  name: string
  owner: string
  /** False for playlists Spotify won't list for dev-mode apps (not yours); they still play. */
  tracksReadable: boolean
  description: string
  trackCount: number
  imageUrl: string | null
}

export interface TrackRow {
  id: string
  uri: string
  title: string
  artist: string
  album: string
  durationMs: number
  playable: boolean
}

export interface Page<T> {
  items: T[]
  total: number
  nextOffset: number | null
}

export type LibraryQuery =
  | { type: 'playlists'; offset: number }
  | { type: 'liked'; offset: number }
  | { type: 'playlistTracks'; id: string; offset: number }
  | { type: 'searchPlaylists'; q: string; offset: number }

export interface LibraryResults {
  playlists: Page<PlaylistSummary>
  liked: Page<TrackRow>
  playlistTracks: Page<TrackRow>
  searchPlaylists: Page<PlaylistSummary>
}

export interface SpotifyBridge {
  getState(): Promise<SpotifyState>
  command(cmd: SpotifyCommand): Promise<void>
  query<Q extends LibraryQuery>(q: Q): Promise<LibraryResults[Q['type']]>
  onState(listener: (state: SpotifyState) => void): () => void
}
