import { ScreenHeader } from './ScreenHeader'

export function NotReady({ title }: { title: string }) {
  return (
    <>
      <ScreenHeader title={title} />
      <div className="lcd-list">
        <div className="lcd-list__note">
          Not connected to Spotify.
          <br />
          Click the status bar below to sign in.
        </div>
      </div>
    </>
  )
}
