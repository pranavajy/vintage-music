import { PlayerWindow } from './components/player/PlayerWindow'
import { LibraryContext } from './spotify/library'
import { useSpotifyPlayer } from './spotify/useSpotifyPlayer'

function App() {
  const { view, status, actions, library } = useSpotifyPlayer()

  return (
    <LibraryContext.Provider value={library}>
      <main className="desktop">
        <PlayerWindow state={view} status={status} actions={actions} />
      </main>
    </LibraryContext.Provider>
  )
}

export default App
