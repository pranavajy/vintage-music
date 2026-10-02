import { spawn } from 'node:child_process'
import { EventEmitter } from 'node:events'
import fs from 'node:fs'
import path from 'node:path'
import { DEVICE_NAME } from './config.mjs'

const CANDIDATE_PATHS = ['/opt/homebrew/bin/librespot', '/usr/local/bin/librespot', '/usr/bin/librespot']
const MAX_RESTARTS = 5
const OAUTH_PORT = 5588
const CREDENTIALS_FAILURE = /could not initialize spirc|INVALID_CREDENTIALS|Bad credentials/i

/**
 * Runs librespot as a sidecar so this app shows up as a Spotify Connect
 * device (same engine spotify-player uses).
 *
 * Without cached credentials librespot runs its own OAuth sign-in (as
 * spotify-player does) and exposes the URL via `authUrl`; once approved the
 * device is registered on the account and shows up on every Spotify client,
 * even on networks that block zeroconf. Zeroconf discovery stays on as well.
 * Credentials are cached, so this is a one-time step. (Web API tokens from a
 * third-party client ID are rejected for Connect sessions, so we can't reuse
 * the app's own sign-in here.)
 *
 * Events: 'status' (status: 'missing' | 'starting' | 'needs-auth' | 'online' | 'stopped')
 */
export class ConnectDevice extends EventEmitter {
  #cacheDir
  #proc = null
  #status = 'stopped'
  #restarts = 0
  #stopping = false
  #authUrl = null

  constructor({ cacheDir }) {
    super()
    this.#cacheDir = cacheDir
  }

  get status() {
    return this.#status
  }

  /** Sign-in URL while librespot waits for the one-time account OAuth. */
  get authUrl() {
    return this.#authUrl
  }

  get #credentialsPath() {
    return path.join(this.#cacheDir, 'credentials.json')
  }

  /** True once a Spotify app has signed the device in (credentials cached). */
  get hasCachedCredentials() {
    return fs.existsSync(this.#credentialsPath)
  }

  start() {
    this.#stopping = false
    if (!this.#proc) this.#spawn()
  }

  stop() {
    this.#stopping = true
    this.#proc?.kill('SIGTERM')
    this.#proc = null
    this.#setStatus('stopped')
  }

  #spawn() {
    const bin = findBinary()
    if (!bin) {
      this.#setStatus('missing')
      return
    }

    fs.mkdirSync(this.#cacheDir, { recursive: true })
    const needsAuth = !this.hasCachedCredentials
    const args = [
      '--name', DEVICE_NAME,
      '--device-type', 'computer',
      '--bitrate', '320',
      '--cache', this.#cacheDir,
      '--initial-volume', '60',
      ...(needsAuth ? ['--enable-oauth', '--oauth-port', String(OAUTH_PORT)] : []),
    ]

    this.#setStatus('starting')
    const proc = spawn(bin, args, { stdio: ['ignore', 'pipe', 'pipe'] })
    this.#proc = proc
    let credentialsRejected = false

    const onLine = (line) => {
      const authUrl = line.match(/Browse to: (\S+)/)?.[1]
      if (authUrl) {
        console.log('[librespot] waiting for account sign-in')
        this.#authUrl = authUrl
        this.#setStatus('needs-auth', true)
        return
      }
      console.log(`[librespot] ${line}`)
      if (/Authenticated as/i.test(line)) {
        this.#restarts = 0
        this.#authUrl = null
        this.#setStatus('online')
      } else if (/Using audio device/i.test(line) && !this.#authUrl) {
        this.#setStatus('online')
      }
      if (CREDENTIALS_FAILURE.test(line)) credentialsRejected = true
    }
    pipeLines(proc.stdout, onLine)
    pipeLines(proc.stderr, onLine)

    proc.on('exit', (code) => {
      if (this.#proc === proc) this.#proc = null
      this.#authUrl = null
      if (this.#stopping) return

      // Stale or unusable cached credentials: drop them and go back to
      // zeroconf so the device can be picked (and re-authorized) again.
      if (credentialsRejected && this.hasCachedCredentials) {
        console.warn('[librespot] cached credentials rejected, clearing them')
        fs.rmSync(this.#credentialsPath, { force: true })
      }

      if (this.#restarts++ < MAX_RESTARTS) {
        console.warn(`[librespot] exited (${code}), restarting`)
        setTimeout(() => this.#spawn(), 1000 * this.#restarts)
      } else {
        this.#setStatus('stopped')
      }
    })
    proc.on('error', (err) => {
      console.error('[librespot] failed to start', err)
      this.#setStatus('missing')
    })
  }

  #setStatus(status, force = false) {
    if (status === this.#status && !force) return
    this.#status = status
    this.emit('status', status)
  }
}

function findBinary() {
  const fromEnv = process.env.LIBRESPOT_PATH
  if (fromEnv && fs.existsSync(fromEnv)) return fromEnv
  for (const p of CANDIDATE_PATHS) if (fs.existsSync(p)) return p
  for (const dir of (process.env.PATH ?? '').split(path.delimiter)) {
    const p = path.join(dir, 'librespot')
    if (dir && fs.existsSync(p)) return p
  }
  return null
}

function pipeLines(stream, onLine) {
  let buf = ''
  stream.setEncoding('utf8')
  stream.on('data', (chunk) => {
    buf += chunk
    const lines = buf.split('\n')
    buf = lines.pop() ?? ''
    for (const l of lines) if (l.trim()) onLine(l.trim())
  })
}
