import { useState } from 'react'
import type { FormEvent } from 'react'
import { queryLibrary, useLibrary, usePagedQuery } from '../../spotify/library'
import type { PlaylistSummary } from '../../spotify/types'
import { NotReady } from './NotReady'
import { PlaylistList } from './PlaylistList'
import { PlaylistScreen } from './PlaylistScreen'
import { ScreenHeader } from './ScreenHeader'
import { ScrollList } from './ScrollList'

const QUICK_PICKS = ['Synthwave', 'Lo-fi', '2000s Hits', 'Jazz', 'Indie', 'Hip Hop', 'Chill', 'Workout', 'Classical', 'Retro Gaming']

export function DiscoverView() {
  const { ready } = useLibrary()
  const [draft, setDraft] = useState('')
  const [query, setQuery] = useState(QUICK_PICKS[0])
  const [open, setOpen] = useState<PlaylistSummary | null>(null)

  const results = usePagedQuery(ready && query ? `search:${query}` : null, (offset) =>
    queryLibrary({ type: 'searchPlaylists', q: query, offset }),
  )

  if (!ready) return <NotReady title="Discover" />

  if (open) return <PlaylistScreen playlist={open} onBack={() => setOpen(null)} />

  const search = (q: string) => {
    const trimmed = q.trim()
    if (trimmed) setQuery(trimmed)
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    search(draft)
  }

  return (
    <>
      <ScreenHeader title="Discover playlists" subtitle={query ? `“${query}”` : undefined} />
      <form className="discover-search" onSubmit={onSubmit} role="search">
        <input
          className="retro-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Search playlists…"
          aria-label="Search playlists"
          spellCheck={false}
        />
        <button type="submit" className="screen-btn">
          Find
        </button>
      </form>
      <div className="discover-picks" role="group" aria-label="Quick picks">
        {QUICK_PICKS.map((pick) => (
          <button
            key={pick}
            type="button"
            className={`pick-chip ${pick === query ? 'is-active' : ''}`}
            onClick={() => {
              setDraft('')
              search(pick)
            }}
          >
            {pick}
          </button>
        ))}
      </div>
      <ScrollList
        loading={results.loading}
        error={results.error}
        empty={results.items.length === 0}
        emptyText="No playlists found."
        onRetry={results.retry}
        onNearEnd={results.loadMore}
      >
        <PlaylistList playlists={results.items} onOpen={setOpen} />
      </ScrollList>
    </>
  )
}
