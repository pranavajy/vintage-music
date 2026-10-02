import { safeStorage, shell } from 'electron'
import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import http from 'node:http'
import { REDIRECT_PORT, REDIRECT_URI, SCOPES } from './config.mjs'

const TOKEN_URL = 'https://accounts.spotify.com/api/token'
const AUTHORIZE_URL = 'https://accounts.spotify.com/authorize'
const SIGN_IN_TIMEOUT_MS = 5 * 60 * 1000

/** Authorization Code + PKCE flow with a loopback redirect. */
export class SpotifyAuth {
  #clientId
  #storePath
  #refreshToken = null
  #scope = ''
  #accessToken = null
  #expiresAt = 0
  #refreshing = null
  #cancelPendingSignIn = null

  constructor({ clientId, storePath }) {
    this.#clientId = clientId
    this.#storePath = storePath
  }

  /** Signed in with every scope the app currently needs (new scopes need a fresh sign-in). */
  get isSignedIn() {
    if (this.#refreshToken === null) return false
    const granted = new Set(this.#scope.split(' '))
    return SCOPES.every((s) => granted.has(s))
  }

  async load() {
    try {
      const raw = await fs.readFile(this.#storePath)
      const json = safeStorage.isEncryptionAvailable() ? safeStorage.decryptString(raw) : raw.toString('utf8')
      const stored = JSON.parse(json)
      this.#refreshToken = stored.refreshToken ?? null
      this.#scope = stored.scope ?? ''
    } catch {
      this.#refreshToken = null
      this.#scope = ''
    }
  }

  async signOut() {
    this.#refreshToken = null
    this.#accessToken = null
    this.#expiresAt = 0
    await fs.rm(this.#storePath, { force: true })
  }

  async getAccessToken({ forceRefresh = false } = {}) {
    if (!this.#refreshToken) throw new Error('Not signed in to Spotify')
    if (!forceRefresh && this.#accessToken && Date.now() < this.#expiresAt - 60_000) {
      return this.#accessToken
    }
    // Collapse concurrent refreshes into one request.
    this.#refreshing ??= this.#requestToken({
      grant_type: 'refresh_token',
      refresh_token: this.#refreshToken,
    }).finally(() => {
      this.#refreshing = null
    })
    await this.#refreshing
    return this.#accessToken
  }

  async signIn() {
    const verifier = base64url(crypto.randomBytes(64))
    const challenge = base64url(crypto.createHash('sha256').update(verifier).digest())
    const state = base64url(crypto.randomBytes(16))

    const code = await this.#waitForRedirect(state, () => {
      const url = new URL(AUTHORIZE_URL)
      url.search = new URLSearchParams({
        client_id: this.#clientId,
        response_type: 'code',
        redirect_uri: REDIRECT_URI,
        code_challenge_method: 'S256',
        code_challenge: challenge,
        scope: SCOPES.join(' '),
        state,
      }).toString()
      shell.openExternal(url.toString())
    })

    await this.#requestToken({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      code_verifier: verifier,
    })
  }

  #waitForRedirect(expectedState, openBrowser) {
    // A new attempt replaces any earlier one still waiting on the port.
    this.#cancelPendingSignIn?.()
    return new Promise((resolve, reject) => {
      const server = http.createServer((req, res) => {
        const url = new URL(req.url ?? '/', REDIRECT_URI)
        if (url.pathname !== '/callback') {
          res.writeHead(404).end()
          return
        }
        const error = url.searchParams.get('error')
        const code = url.searchParams.get('code')
        const ok = !error && code && url.searchParams.get('state') === expectedState

        res.writeHead(ok ? 200 : 400, { 'Content-Type': 'text/html' })
        res.end(
          `<body style="font:14px Tahoma,sans-serif;padding:40px">${
            ok ? 'Signed in to Spotify. You can close this tab and return to Vintage Media Player.' : `Sign-in failed: ${error ?? 'state mismatch'}`
          }</body>`,
        )
        finish(ok ? null : new Error(`Spotify sign-in failed: ${error ?? 'state mismatch'}`), code)
      })

      const timer = setTimeout(() => finish(new Error('Spotify sign-in timed out')), SIGN_IN_TIMEOUT_MS)
      const finish = (err, code) => {
        clearTimeout(timer)
        this.#cancelPendingSignIn = null
        server.closeAllConnections()
        server.close()
        if (err) reject(err)
        else resolve(code)
      }
      this.#cancelPendingSignIn = () => finish(new Error('Spotify sign-in restarted'))

      server.on('error', (err) => finish(err))
      server.listen(REDIRECT_PORT, '127.0.0.1', openBrowser)
    })
  }

  async #requestToken(params) {
    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: this.#clientId, ...params }),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      if (body.error === 'invalid_grant') await this.signOut()
      throw new Error(`Spotify token request failed: ${body.error_description ?? body.error ?? res.status}`)
    }

    this.#accessToken = body.access_token
    this.#expiresAt = Date.now() + body.expires_in * 1000
    const scope = body.scope ?? this.#scope
    if ((body.refresh_token && body.refresh_token !== this.#refreshToken) || scope !== this.#scope) {
      this.#refreshToken = body.refresh_token ?? this.#refreshToken
      this.#scope = scope
      await this.#persist()
    }
  }

  async #persist() {
    const json = JSON.stringify({ refreshToken: this.#refreshToken, scope: this.#scope })
    const data = safeStorage.isEncryptionAvailable() ? safeStorage.encryptString(json) : json
    await fs.writeFile(this.#storePath, data, { mode: 0o600 })
  }
}

function base64url(buf) {
  return buf.toString('base64url')
}
