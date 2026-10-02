import { shell } from 'electron'
import { EventEmitter } from 'node:events'
import path from 'node:path'
import { SpotifyApi, SpotifyApiError } from './api.mjs'
import { SpotifyAuth } from './auth.mjs'
import { DEVICE_NAME, getClientId } from './config.mjs'
import { ConnectDevice } from './connectDevice.mjs'
import { runLibraryQuery } from './library.mjs'

const POLL_MS = 1000
const DEVICE_LOOKUP_EVERY = 5 // polls
const SEEK_STEP_MS = 15_000
const ERROR_TTL_MS = 6000

/**
 * Owns the Spotify session for the app: auth, the librespot Connect device,
 * playback polling and commands. Emits 'state' with a serializable snapshot
 * (mirrored by src/spotify/types.ts).
 */
export class SpotifyService extends EventEmitter {
  #auth = null
  #api = null
  #device
  #timer = null
  #polls = 0
  #volumeBeforeMute = null
  #signInAttempt = 0
  #state = {
    connection: 'signed-out', // 'no-client-id' | 'signed-out' | 'signing-in' | 'ready'
    deviceStatus: 'stopped',
    deviceId: null,
    error: null,
    playback: null,
  }

  constructor({ userDataDir }) {
    super()
    this.#device = new ConnectDevice({ cacheDir: path.join(userDataDir, 'librespot') })
    this.#device.on('status', (deviceStatus) => {
      this.#update({ deviceStatus })
      // librespot just came up: look for it in the device list soon.
      if (deviceStatus === 'online') this.#polls = DEVICE_LOOKUP_EVERY - 1
    })

    const clientId = getClientId()
    if (clientId) {
      this.#auth = new SpotifyAuth({ clientId, storePath: path.join(userDataDir, 'spotify-auth.bin') })
      this.#api = new SpotifyApi(this.#auth)
    } else {
      this.#state.connection = 'no-client-id'
    }
  }

  get state() {
    return this.#state
  }

  async start() {
    // The Connect device runs regardless of Web API sign-in, so it is always
    // discoverable from Spotify apps on the same network.
    this.#device.start()
    if (!this.#auth) return

    await this.#auth.load()
    if (this.#auth.isSignedIn) await this.#onSignedIn()
  }

  stop() {
    clearTimeout(this.#timer)
    this.#timer = null
    this.#device.stop()
  }

  /** Library / discovery reads. Errors propagate to the caller (the view shows them). */
  async query(q) {
    if (!this.#api || this.#state.connection !== 'ready') throw new Error('Sign in to Spotify first')
    try {
      return await runLibraryQuery(this.#api, q)
    } catch (err) {
      if (err instanceof SpotifyApiError && err.status === 403) {
        throw new Error('Spotify does not let this app read that (403)')
      }
      throw err
    }
  }

  async command(cmd) {
    try {
      if (cmd.type === 'signIn') return await this.#signIn()
      if (cmd.type === 'connectDevice') {
        if (this.#device.authUrl) await shell.openExternal(this.#device.authUrl)
        return
      }
      if (!this.#api || this.#state.connection !== 'ready') return
      await this.#run(cmd)
      this.#update({ error: null })
    } catch (err) {
      this.#handleError(err)
    }
    this.#schedulePoll(250)
  }

  async #run(cmd) {
    const pb = this.#state.playback
    switch (cmd.type) {
      case 'togglePlay':
        if (pb?.isPlaying) {
          this.#patchPlayback({ isPlaying: false })
          return this.#api.pause()
        }
        if (!pb || !pb.deviceId) return this.#api.transfer(await this.#pickPlaybackDevice(), true)
        this.#patchPlayback({ isPlaying: true })
        return this.#api.play()
      case 'stop':
        if (!pb) return
        this.#patchPlayback({ isPlaying: false, progressMs: 0 })
        if (pb.isPlaying) await this.#api.pause()
        return this.#api.seek(0)
      case 'next':
        return this.#api.next()
      case 'previous':
        return this.#api.previous()
      case 'seek':
        this.#patchPlayback({ progressMs: cmd.positionMs })
        return this.#api.seek(cmd.positionMs)
      case 'seekBy': {
        if (!pb?.track) return
        const target = clamp(currentProgress(pb) + cmd.deltaMs, 0, pb.track.durationMs)
        this.#patchPlayback({ progressMs: target })
        return this.#api.seek(target)
      }
      case 'rewind':
        return this.#run({ type: 'seekBy', deltaMs: -SEEK_STEP_MS })
      case 'fastForward':
        return this.#run({ type: 'seekBy', deltaMs: SEEK_STEP_MS })
      case 'volume':
        this.#volumeBeforeMute = null
        this.#patchPlayback({ volumePercent: cmd.percent })
        return this.#api.setVolume(cmd.percent)
      case 'toggleMute': {
        if (!pb) return
        const muted = pb.volumePercent === 0 && this.#volumeBeforeMute !== null
        const next = muted ? this.#volumeBeforeMute : 0
        this.#volumeBeforeMute = muted ? null : pb.volumePercent
        this.#patchPlayback({ volumePercent: next })
        return this.#api.setVolume(next)
      }
      case 'transferHere':
        return this.#transferHere()
      case 'playItems': {
        const deviceId = pb?.deviceId ?? (await this.#pickPlaybackDevice())
        return this.#api.playItems({ deviceId, contextUri: cmd.contextUri, uris: cmd.uris, offsetUri: cmd.offsetUri })
      }
    }
  }

  /**
   * Where to start playback when nothing is active: the last active device,
   * else a real Spotify app (desktop first), else this app's Connect device.
   */
  async #pickPlaybackDevice() {
    const devices = await this.#api.getDevices()
    const rank = (d) =>
      (d.is_active ? 0 : 10) + (d.name === DEVICE_NAME ? 5 : 0) + (d.type === 'Computer' ? 0 : 1) + (d.is_restricted ? 50 : 0)
    const best = [...devices].sort((a, b) => rank(a) - rank(b))[0]
    if (!best) throw new Error('No Spotify devices found: open Spotify on any device')
    return best.id
  }

  async #transferHere() {
    const id = this.#state.deviceId ?? (await this.#lookupDevice())
    if (!id) {
      throw new Error(
        this.#device.hasCachedCredentials
          ? `${DEVICE_NAME} isn't online yet, try again in a moment`
          : `Pick "${DEVICE_NAME}" once in your Spotify app's device list`,
      )
    }
    await this.#api.transfer(id, true)
  }

  async #signIn() {
    if (!this.#auth) return
    const attempt = ++this.#signInAttempt
    this.#update({ connection: 'signing-in', error: null })
    try {
      await this.#auth.signIn()
      await this.#onSignedIn()
    } catch (err) {
      if (attempt !== this.#signInAttempt) return // superseded by a retry
      this.#update({ connection: 'signed-out' })
      this.#handleError(err)
    }
  }

  async #onSignedIn() {
    this.#update({ connection: 'ready', error: null })
    this.#polls = DEVICE_LOOKUP_EVERY - 1
    this.#schedulePoll(0)
  }

  #schedulePoll(delay = POLL_MS) {
    clearTimeout(this.#timer)
    this.#timer = setTimeout(() => this.#poll(), delay)
  }

  async #poll() {
    if (this.#state.connection !== 'ready') return
    let delay = POLL_MS
    try {
      if (++this.#polls % DEVICE_LOOKUP_EVERY === 0) await this.#lookupDevice()
      const raw = await this.#api.getPlayback()
      this.#update({ playback: mapPlayback(raw) })
      if (this.#state.error && Date.now() - this.#state.error.at > ERROR_TTL_MS) this.#update({ error: null })
    } catch (err) {
      this.#handleError(err)
      if (err instanceof SpotifyApiError && err.status === 429) delay = 5000
    }
    if (this.#state.connection === 'ready') this.#schedulePoll(delay)
  }

  async #lookupDevice() {
    const devices = await this.#api.getDevices()
    const ours = devices.find((d) => d.name === DEVICE_NAME)
    this.#update({ deviceId: ours?.id ?? null })
    return ours?.id ?? null
  }

  #handleError(err) {
    console.error('[spotify]', err)
    if (/Not signed in/.test(err.message)) {
      this.#update({ connection: 'signed-out', playback: null })
    }
    let message = err.message
    if (err instanceof SpotifyApiError) {
      if (err.reason === 'PREMIUM_REQUIRED') message = 'Spotify Premium is required to control playback'
      else if (err.reason === 'NO_ACTIVE_DEVICE') message = 'No active device: press Play to start here'
    }
    this.#update({ error: { message, at: Date.now() } })
  }

  #patchPlayback(patch) {
    const pb = this.#state.playback
    if (!pb) return
    const next = { ...pb, ...patch }
    // Re-anchor interpolation whenever progress or play state changes.
    if ('progressMs' in patch || 'isPlaying' in patch) {
      next.progressMs = patch.progressMs ?? currentProgress(pb)
      next.fetchedAt = Date.now()
    }
    this.#update({ playback: next })
  }

  #update(patch) {
    this.#state = { ...this.#state, ...patch }
    this.emit('state', this.#state)
  }
}

function mapPlayback(raw) {
  if (!raw) return null
  const item = raw.item
  const isEpisode = item?.type === 'episode'
  return {
    isPlaying: Boolean(raw.is_playing),
    progressMs: raw.progress_ms ?? 0,
    fetchedAt: Date.now(),
    volumePercent: raw.device?.volume_percent ?? 0,
    deviceId: raw.device?.id ?? null,
    deviceName: raw.device?.name ?? null,
    shuffle: Boolean(raw.shuffle_state),
    repeat: raw.repeat_state ?? 'off',
    contextUri: raw.context?.uri ?? null,
    track: item
      ? {
          id: item.id,
          uri: item.uri,
          title: item.name,
          artist: isEpisode ? item.show?.name : item.artists?.map((a) => a.name).join(', '),
          album: isEpisode ? item.show?.name : item.album?.name,
          durationMs: item.duration_ms,
          imageUrl: (isEpisode ? item.images : item.album?.images)?.[0]?.url ?? null,
        }
      : null,
  }
}

function currentProgress(pb) {
  const elapsed = pb.isPlaying ? Date.now() - pb.fetchedAt : 0
  return Math.min(pb.progressMs + elapsed, pb.track?.durationMs ?? Infinity)
}

function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v))
}
