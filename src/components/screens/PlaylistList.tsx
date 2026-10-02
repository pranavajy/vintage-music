import type { PlaylistSummary } from '../../spotify/types'
import { useLibrary } from '../../spotify/library'

interface PlaylistListProps {
  playlists: PlaylistSummary[]
  onOpen(playlist: PlaylistSummary): void
}

export function PlaylistList({ playlists, onOpen }: PlaylistListProps) {
  const { nowPlayingContextUri } = useLibrary()

  return (
    <>
      {playlists.map((p) => (
        <button
          key={p.id}
          type="button"
          role="listitem"
          className={`lcd-row lcd-row--playlist ${p.uri === nowPlayingContextUri ? 'is-playing' : ''}`}
          onClick={() => onOpen(p)}
          title={`${p.description || p.name}${p.tracksReadable ? '' : '\n(play-only: Spotify hides its track list from this app)'}`}
        >
          <span className="lcd-row__icon" aria-hidden>
            {p.uri === nowPlayingContextUri ? '♪' : p.tracksReadable ? '▤' : '▷'}
          </span>
          <span className="lcd-row__main">{p.name}</span>
          <span className="lcd-row__meta">
            {p.owner && `${p.owner} · `}
            {p.trackCount}
          </span>
        </button>
      ))}
    </>
  )
}
