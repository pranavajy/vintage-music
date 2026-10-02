import { useLibrary, usePagedQuery } from '../../spotify/library'
import type { Page, TrackRow } from '../../spotify/types'
import { ScreenHeader } from './ScreenHeader'
import { ScrollList } from './ScrollList'

interface TrackListProps {
  /** Stable identity of the list (e.g. "playlist:<id>"). */
  listKey: string
  title: string
  onBack(): void
  fetchPage(offset: number): Promise<Page<TrackRow>>
  /** Play inside this context (playlist) so next/previous follow it. */
  contextUri?: string
}

/** Track listing with WMP-style columns; double-click (or Enter) plays. */
export function TrackList({ listKey, title, onBack, fetchPage, contextUri }: TrackListProps) {
  const { nowPlayingUri, play } = useLibrary()
  const list = usePagedQuery(listKey, fetchPage)

  const playFrom = (index: number) => {
    const track = list.items[index]
    if (!track?.playable) return
    if (contextUri) play({ contextUri, offsetUri: track.uri })
    else play({ uris: list.items.slice(index, index + 100).filter((t) => t.playable).map((t) => t.uri) })
  }

  const playAll = () => {
    if (contextUri) play({ contextUri })
    else playFrom(list.items.findIndex((t) => t.playable))
  }

  return (
    <>
      <ScreenHeader
        title={title}
        subtitle={list.total ? `${list.total} tracks` : undefined}
        onBack={onBack}
        actions={
          <button type="button" className="screen-btn" onClick={playAll} disabled={list.items.length === 0}>
            ▶ Play all
          </button>
        }
      />
      <div className="lcd-columns" aria-hidden>
        <span className="lcd-col-num">#</span>
        <span className="lcd-col-title">Title</span>
        <span className="lcd-col-artist">Artist</span>
        <span className="lcd-col-time">Length</span>
      </div>
      <ScrollList
        loading={list.loading}
        error={list.error}
        empty={list.items.length === 0}
        emptyText="No tracks here."
        onRetry={list.retry}
        onNearEnd={list.loadMore}
      >
        {list.items.map((t, i) => (
          <div
            key={`${t.id}-${i}`}
            role="listitem"
            tabIndex={0}
            className={`lcd-row lcd-row--track ${t.uri === nowPlayingUri ? 'is-playing' : ''} ${t.playable ? '' : 'is-disabled'}`}
            onDoubleClick={() => playFrom(i)}
            onKeyDown={(e) => e.key === 'Enter' && playFrom(i)}
            title={t.playable ? `${t.title}: double-click to play` : 'Not available'}
          >
            <span className="lcd-col-num">{t.uri === nowPlayingUri ? '♪' : i + 1}</span>
            <span className="lcd-col-title">{t.title}</span>
            <span className="lcd-col-artist">{t.artist}</span>
            <span className="lcd-col-time">{formatDuration(t.durationMs)}</span>
          </div>
        ))}
      </ScrollList>
    </>
  )
}

function formatDuration(ms: number) {
  const s = Math.round(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
