import { useState } from 'react'
import { queryLibrary, useLibrary, usePagedQuery } from '../../spotify/library'
import type { PlaylistSummary } from '../../spotify/types'
import { NotReady } from './NotReady'
import { PlaylistList } from './PlaylistList'
import { PlaylistScreen } from './PlaylistScreen'
import { ScreenHeader } from './ScreenHeader'
import { ScrollList } from './ScrollList'
import { TrackList } from './TrackList'

type Selection = { kind: 'liked' } | { kind: 'playlist'; playlist: PlaylistSummary }

export function LibraryView() {
  const { ready } = useLibrary()
  const [selection, setSelection] = useState<Selection | null>(null)
  // Stays loaded while a playlist is open so "back" is instant.
  const playlists = usePagedQuery(ready ? 'my-playlists' : null, (offset) => queryLibrary({ type: 'playlists', offset }))

  if (!ready) return <NotReady title="Library" />

  if (selection?.kind === 'liked') {
    return (
      <TrackList
        listKey="liked"
        title="Liked Songs"
        onBack={() => setSelection(null)}
        fetchPage={(offset) => queryLibrary({ type: 'liked', offset })}
      />
    )
  }

  if (selection?.kind === 'playlist') {
    return <PlaylistScreen playlist={selection.playlist} onBack={() => setSelection(null)} />
  }

  return (
    <>
      <ScreenHeader title="Library" subtitle={playlists.total ? `${playlists.total} playlists` : undefined} />
      <ScrollList
        loading={playlists.loading}
        error={playlists.error}
        empty={false}
        emptyText=""
        onRetry={playlists.retry}
        onNearEnd={playlists.loadMore}
      >
        <button type="button" role="listitem" className="lcd-row lcd-row--playlist" onClick={() => setSelection({ kind: 'liked' })}>
          <span className="lcd-row__icon" aria-hidden>
            ♥
          </span>
          <span className="lcd-row__main">Liked Songs</span>
          <span className="lcd-row__meta">your favourites</span>
        </button>
        <PlaylistList playlists={playlists.items} onOpen={(playlist) => setSelection({ kind: 'playlist', playlist })} />
      </ScrollList>
    </>
  )
}
