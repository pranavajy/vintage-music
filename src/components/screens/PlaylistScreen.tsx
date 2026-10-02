import { queryLibrary, useLibrary } from '../../spotify/library'
import type { PlaylistSummary } from '../../spotify/types'
import { ScreenHeader } from './ScreenHeader'
import { TrackList } from './TrackList'

interface PlaylistScreenProps {
  playlist: PlaylistSummary
  onBack(): void
}

/** Track list for your own playlists; an info card (still playable) for others. */
export function PlaylistScreen({ playlist, onBack }: PlaylistScreenProps) {
  if (playlist.tracksReadable) {
    return (
      <TrackList
        listKey={`playlist:${playlist.id}`}
        title={playlist.name}
        contextUri={playlist.uri}
        onBack={onBack}
        fetchPage={(offset) => queryLibrary({ type: 'playlistTracks', id: playlist.id, offset })}
      />
    )
  }
  return <PlaylistCard playlist={playlist} onBack={onBack} />
}

function PlaylistCard({ playlist, onBack }: PlaylistScreenProps) {
  const { play, nowPlayingContextUri } = useLibrary()
  const isPlaying = nowPlayingContextUri === playlist.uri

  return (
    <>
      <ScreenHeader title={playlist.name} onBack={onBack} />
      <div className="playlist-card">
        <div className="playlist-card__cover">
          {playlist.imageUrl ? <img src={playlist.imageUrl} alt="" draggable={false} /> : <span aria-hidden>▤</span>}
        </div>
        <div className="playlist-card__info">
          <div className="playlist-card__name">{playlist.name}</div>
          {playlist.owner && <div className="playlist-card__meta">by {playlist.owner}</div>}
          <div className="playlist-card__meta">{playlist.trackCount} tracks</div>
          {playlist.description && <p className="playlist-card__desc">{playlist.description}</p>}
          <button type="button" className="screen-btn playlist-card__play" onClick={() => play({ contextUri: playlist.uri })}>
            {isPlaying ? '♪ Playing, restart' : '▶ Play playlist'}
          </button>
        </div>
      </div>
      <div className="playlist-card__note">Spotify only lets this app list tracks of playlists you made. This one still plays fine.</div>
    </>
  )
}
