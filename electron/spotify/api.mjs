const API = 'https://api.spotify.com/v1'

export class SpotifyApiError extends Error {
  constructor(status, message, reason) {
    super(message)
    this.status = status
    this.reason = reason
  }
}

/** Thin wrapper over the Spotify Web API player endpoints. */
export class SpotifyApi {
  #auth

  constructor(auth) {
    this.#auth = auth
  }

  getPlayback() {
    return this.#request('GET', '/me/player', { query: { additional_types: 'episode' } })
  }

  async getDevices() {
    const body = await this.#request('GET', '/me/player/devices')
    return body?.devices ?? []
  }

  play(deviceId) {
    return this.#request('PUT', '/me/player/play', { query: { device_id: deviceId } })
  }

  pause() {
    return this.#request('PUT', '/me/player/pause')
  }

  next() {
    return this.#request('POST', '/me/player/next')
  }

  previous() {
    return this.#request('POST', '/me/player/previous')
  }

  seek(positionMs) {
    return this.#request('PUT', '/me/player/seek', { query: { position_ms: Math.round(positionMs) } })
  }

  setVolume(percent) {
    return this.#request('PUT', '/me/player/volume', { query: { volume_percent: Math.round(percent) } })
  }

  transfer(deviceId, play) {
    return this.#request('PUT', '/me/player', { body: { device_ids: [deviceId], play } })
  }

  /** Start a playlist/album (`contextUri`) or an explicit list of `uris`. */
  playItems({ deviceId, contextUri, uris, offsetUri }) {
    const body = contextUri ? { context_uri: contextUri } : { uris }
    if (offsetUri) body.offset = { uri: offsetUri }
    return this.#request('PUT', '/me/player/play', { query: { device_id: deviceId }, body })
  }

  // ---- Library ----

  getMe() {
    return this.#request('GET', '/me')
  }

  getMyPlaylists(offset = 0, limit = 50) {
    return this.#request('GET', '/me/playlists', { query: { offset, limit } })
  }

  getLikedTracks(offset = 0, limit = 50) {
    return this.#request('GET', '/me/tracks', { query: { offset, limit } })
  }

  async getPlaylistTracks(id, offset = 0, limit = 50) {
    const path = `/playlists/${encodeURIComponent(id)}`
    try {
      return await this.#request('GET', `${path}/items`, { query: { offset, limit } })
    } catch (err) {
      // Older API surface only has /tracks.
      if (err instanceof SpotifyApiError && err.status === 404) {
        return this.#request('GET', `${path}/tracks`, { query: { offset, limit } })
      }
      throw err
    }
  }

  searchPlaylists(q, offset = 0, limit = 10) {
    return this.#request('GET', '/search', { query: { q, type: 'playlist', offset, limit } })
  }

  async #request(method, path, { query, body } = {}, retried = false) {
    const url = new URL(API + path)
    for (const [k, v] of Object.entries(query ?? {})) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v))
    }

    const token = await this.#auth.getAccessToken({ forceRefresh: retried })
    const res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    if (res.status === 401 && !retried) return this.#request(method, path, { query, body }, true)
    if (res.status === 204) return null

    const text = await res.text()
    const json = text ? safeJson(text) : null
    if (!res.ok) {
      if (res.status === 429) {
        throw new SpotifyApiError(429, `Rate limited, retry in ${res.headers.get('retry-after') ?? '?'}s`)
      }
      throw new SpotifyApiError(res.status, json?.error?.message ?? `Spotify API ${res.status}`, json?.error?.reason)
    }
    return json
  }
}

function safeJson(text) {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}
