// Typed access to the Electron preload bridge. Undefined when running in a
// plain browser, so the UI still works with `npm run dev:web`.
import type { SpotifyBridge } from './spotify/types'

export interface DesktopBridge {
  platform: string
  minimize(): void
  close(): void
  spotify: SpotifyBridge
}

declare global {
  interface Window {
    desktop?: DesktopBridge
  }
}

export const desktop: DesktopBridge | undefined = window.desktop
export const isDesktop = desktop !== undefined
