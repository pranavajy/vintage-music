import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { desktop } from '../desktop'
import type { LibraryQuery, LibraryResults, Page } from './types'

const bridge = desktop?.spotify

export function queryLibrary<Q extends LibraryQuery>(q: Q): Promise<LibraryResults[Q['type']]> {
  if (!bridge) return Promise.reject(new Error('Run as desktop app to browse Spotify'))
  return bridge.query(q)
}

/** What library views need from the player: readiness, now playing, and play. */
export interface LibraryContextValue {
  ready: boolean
  nowPlayingUri: string | null
  nowPlayingContextUri: string | null
  play(target: { contextUri?: string; uris?: string[]; offsetUri?: string }): void
}

export const LibraryContext = createContext<LibraryContextValue>({
  ready: false,
  nowPlayingUri: null,
  nowPlayingContextUri: null,
  play: () => {},
})

export const useLibrary = () => useContext(LibraryContext)

interface PagedState<T> {
  items: T[]
  total: number
  nextOffset: number | null
  loading: boolean
  error: string | null
}

const EMPTY: PagedState<never> = { items: [], total: 0, nextOffset: null, loading: false, error: null }

/**
 * Offset-paged list for a library query. `key` identifies the list; null
 * disables fetching. Changing the key resets the list.
 */
export function usePagedQuery<T>(key: string | null, fetchPage: (offset: number) => Promise<Page<T>>) {
  const fetchRef = useRef(fetchPage)
  const requestId = useRef(0)
  // Layout effects run before any (child) effect may call loadMore.
  useLayoutEffect(() => {
    fetchRef.current = fetchPage
  })

  const [state, setState] = useState<PagedState<T>>({ items: [], total: 0, nextOffset: 0, loading: false, error: null })

  const load = useCallback(
    (offset: number, reset: boolean) => {
      const id = ++requestId.current
      setState((s) => ({ ...(reset ? { items: [], total: 0, nextOffset: 0 } : s), loading: true, error: null }))
      fetchRef.current(offset).then(
        (page) => {
          if (id !== requestId.current) return
          setState((s) => ({
            items: reset ? page.items : [...s.items, ...page.items],
            total: page.total,
            nextOffset: page.nextOffset,
            loading: false,
            error: null,
          }))
        },
        (err: unknown) => {
          if (id !== requestId.current) return
          setState((s) => ({ ...s, loading: false, error: err instanceof Error ? cleanError(err.message) : String(err) }))
        },
      )
    },
    [],
  )

  useEffect(() => {
    if (key === null) {
      requestId.current++ // drop any in-flight response
      return
    }
    load(0, true)
  }, [key, load])

  const stateRef = useRef(state)
  useLayoutEffect(() => {
    stateRef.current = state
  }, [state])
  const loadMore = useCallback(() => {
    const s = stateRef.current
    if (s.loading || s.error || s.nextOffset === null || s.items.length === 0) return
    stateRef.current = { ...s, loading: true } // block repeat scroll events until re-render
    load(s.nextOffset, false)
  }, [load])

  const retry = useCallback(() => load(0, true), [load])

  if (key === null) return { ...EMPTY, loadMore, retry }
  return { ...state, loadMore, retry }
}

/** Electron wraps IPC errors as "Error invoking remote method '...': Error: msg". */
function cleanError(message: string) {
  return message.replace(/^Error invoking remote method '[^']+': (Error: )?/, '')
}
