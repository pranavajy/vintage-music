// Spotify integration settings. The client ID comes from your own Spotify
// developer app (https://developer.spotify.com/dashboard) via .env.

export const DEVICE_NAME = 'Vintage Media Player'

export const REDIRECT_PORT = 8898
export const REDIRECT_URI = `http://127.0.0.1:${REDIRECT_PORT}/callback`

export const SCOPES = [
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
  'user-library-read',
  'playlist-read-private',
  'playlist-read-collaborative',
]

export function getClientId() {
  return process.env.SPOTIFY_CLIENT_ID?.trim() || null
}
