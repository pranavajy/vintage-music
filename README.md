# Vintage Media Player

A WMP 10/11-style skin built with Vite, React and TypeScript. It shows up as a Spotify Connect device and controls Spotify playback.

Runs as a frameless Electron desktop app; the skin is the window.

```
npm install
npm run dev       # desktop app with hot reload (Vite + Electron)
npm start         # production build in Electron
npm run dev:web   # browser only
```

## Spotify setup

Requires Spotify Premium.

1. `brew install librespot` (the Connect engine, the same one spotify-player uses).
2. Create an app at https://developer.spotify.com/dashboard
   - Redirect URI: `http://127.0.0.1:8898/callback`
   - APIs used: Web API
3. `cp .env.example .env` and set `SPOTIFY_CLIENT_ID`.
4. `npm run dev`, then click the status strip to sign in.

"Vintage Media Player" then appears in every Spotify app's device list. The skin's
buttons control whatever device is currently playing. If playback is on another device,
click the status strip to move it here.

## Screens

The title-bar tab buttons switch the black screen:

- **Library**: Liked Songs and your playlists. Open one and double-click a track to play it.
- **Discover**: search playlists or use the quick-pick genres.
- **Visualizations**: the visualizer (placeholder for future shaders).

Playback goes to the active Spotify device, or else to the best available one (desktop app first).

## Layout

```
src/
  components/player/   presentational skin parts (TitleBar, Visualizer, SeekBar, ControlBar, Slider, icons)
  visualizer/          VisualizerRenderer contract + static placeholder renderer
  types/player.ts      Track / PlayerViewState: the shape the audio engine will drive
  styles/global.css    skin palette tokens + desktop backdrop
  desktop.ts           typed access to the Electron preload bridge
  components/screens/  Library / Discover panels (LCD lists, retro VT323 + Pixelify Sans fonts)
  spotify/             renderer types, useSpotifyPlayer, library context + paged queries
electron/
  main.mjs             frameless transparent BrowserWindow + IPC
  preload.cjs          contextBridge API exposed as window.desktop
  spotify/
    auth.mjs           PKCE OAuth (loopback redirect, refresh token in safeStorage)
    api.mjs            Web API player endpoints
    connectDevice.mjs  librespot sidecar (zeroconf + cached credentials)
    library.mjs        library / search queries -> small serializable shapes
    service.mjs        polling, commands, queries, state snapshots
```

## Extension points

- **Audio / library:** add an engine (e.g. `src/audio/`) that produces `PlayerViewState` and pass it to `<PlayerWindow state={...} />`. Wire `onClick` handlers through `ChromeButton`.
- **Shader visualizers:** implement `VisualizerRenderer` (WebGL / Three.js) with `animated: true` and pass it to `<Visualizer renderer={...} />`. Feed `frequencyData` from an `AnalyserNode`.
- **Local music library:** add file-system / dialog IPC handlers in `electron/main.mjs` and expose them as named methods in `preload.cjs`.
