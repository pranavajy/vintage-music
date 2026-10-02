// Library / discovery queries, mapped to small serializable shapes
// (mirrored by src/spotify/types.ts).

// Development-mode apps may only read the items of playlists the user owns or
// collaborates on (Spotify, March 2026); others can still be played.
let myUserId = null

/** @returns {Promise<{ items: unknown[], total: number, nextOffset: number | null }>} */
export async function runLibraryQuery(api, query) {
  myUserId ??= (await api.getMe())?.id ?? null
  const mapPlaylist = (p) => toPlaylist(p, myUserId)

  switch (query.type) {
    case 'playlists':
      return page(await api.getMyPlaylists(query.offset), mapPlaylist)
    case 'liked':
      return page(await api.getLikedTracks(query.offset), (it) => mapTrack(it.track))
    case 'playlistTracks':
      return page(await api.getPlaylistTracks(query.id, query.offset), (it) => mapTrack(it.item ?? it.track))
    case 'searchPlaylists':
      return page((await api.searchPlaylists(query.q, query.offset))?.playlists, mapPlaylist)
    default:
      throw new Error(`Unknown library query: ${query.type}`)
  }
}

function page(raw, mapItem) {
  const items = (raw?.items ?? []).map((it) => (it ? mapItem(it) : null)).filter(Boolean)
  const offset = raw?.offset ?? 0
  const limit = raw?.limit ?? items.length
  const total = raw?.total ?? items.length
  return { items, total, nextOffset: raw?.next ? offset + limit : null }
}

function toPlaylist(p, userId) {
  return {
    id: p.id,
    uri: p.uri,
    name: p.name ?? 'Untitled',
    owner: p.owner?.display_name ?? '',
    tracksReadable: Boolean(p.collaborative) || (userId !== null && p.owner?.id === userId),
    description: stripHtml(p.description ?? ''),
    trackCount: p.items?.total ?? p.tracks?.total ?? 0,
    imageUrl: p.images?.[0]?.url ?? null,
  }
}

function mapTrack(t) {
  if (!t || !t.uri) return null
  const isEpisode = t.type === 'episode'
  return {
    id: t.id ?? t.uri,
    uri: t.uri,
    title: t.name ?? 'Unknown',
    artist: isEpisode ? (t.show?.name ?? '') : (t.artists ?? []).map((a) => a.name).join(', '),
    album: isEpisode ? (t.show?.name ?? '') : (t.album?.name ?? ''),
    durationMs: t.duration_ms ?? 0,
    playable: t.is_playable !== false && !t.is_local,
  }
}

function stripHtml(s) {
  return s.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"')
}
