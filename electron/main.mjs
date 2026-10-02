import { app, BrowserWindow, desktopCapturer, ipcMain, session } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { SpotifyService } from './spotify/service.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DEV_URL = process.env.VITE_DEV_SERVER_URL

// SPOTIFY_CLIENT_ID etc. live in .env next to package.json.
try {
  process.loadEnvFile(path.join(__dirname, '../.env'))
} catch {
  // no .env: the UI explains what is missing
}

app.setName('Vintage Media Player')

// System-audio loopback for the MilkDrop visualizer. Spotify's audio is DRM'd
// inside its own app, so we listen to what the Mac is playing instead. These
// Chromium features route getDisplayMedia's audio through a Core Audio process
// tap on macOS 14.2+ (asks for System Audio Recording permission). The
// ScreenCaptureKit variant delivered silence here.
if (process.platform === 'darwin') {
  const existing = app.commandLine.getSwitchValue('enable-features')
  app.commandLine.appendSwitch(
    'enable-features',
    [existing, 'MacLoopbackAudioForScreenShare', 'MacCatapSystemAudioLoopbackCapture'].filter(Boolean).join(','),
  )
}

let spotify

function createWindow() {
  const win = new BrowserWindow({
    width: 460,
    height: 460,
    frame: false,
    transparent: true,
    resizable: false,
    hasShadow: false, // the skin draws its own shadow
    backgroundColor: '#00000000',
    title: 'Vintage Media Player',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  const pushState = (state) => {
    if (!win.isDestroyed()) win.webContents.send('spotify:state', state)
  }
  spotify.on('state', pushState)
  win.on('closed', () => spotify.off('state', pushState))

  if (DEV_URL) {
    // Surface renderer logs in the dev terminal.
    win.webContents.on('console-message', ({ level, message }) => {
      if (level !== 'debug') console.log(`[renderer:${level}] ${message}`)
    })
  }

  if (DEV_URL) win.loadURL(DEV_URL)
  else win.loadFile(path.join(__dirname, '../dist/index.html'))
}

ipcMain.on('window:minimize', (e) => BrowserWindow.fromWebContents(e.sender)?.minimize())
ipcMain.on('window:close', (e) => BrowserWindow.fromWebContents(e.sender)?.close())
ipcMain.handle('spotify:getState', () => spotify.state)
ipcMain.handle('spotify:command', (_e, cmd) => spotify.command(cmd))
ipcMain.handle('spotify:query', (_e, q) => spotify.query(q))

function allowSystemAudioCapture() {
  session.defaultSession.setDisplayMediaRequestHandler(async (_request, callback) => {
    try {
      // A video source is required by the API; the renderer drops the video track.
      const [screen] = await desktopCapturer.getSources({ types: ['screen'] })
      if (!screen) throw new Error('no screen source')
      callback({ video: screen, audio: 'loopback' })
    } catch (err) {
      console.error('[audio] system audio capture unavailable', err)
      callback({})
    }
  })
}

app.whenReady().then(() => {
  allowSystemAudioCapture()
  spotify = new SpotifyService({ userDataDir: app.getPath('userData') })
  createWindow()
  spotify.start()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Closing the skin quits the player (and takes the Connect device offline).
app.on('window-all-closed', () => app.quit())
app.on('before-quit', () => spotify?.stop())
