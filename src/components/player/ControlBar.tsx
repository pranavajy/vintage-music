import type { PlayerActions } from '../../types/player'
import { ChromeButton } from './ChromeButton'
import {
  FullModeIcon,
  MuteIcon,
  NextIcon,
  PauseIcon,
  PlayIcon,
  PrevIcon,
  SkinModeIcon,
  StopIcon,
} from './icons'
import { Slider } from './Slider'

interface ControlBarProps {
  isPlaying: boolean
  volume: number
  muted: boolean
  actions: PlayerActions
}

export function ControlBar({ isPlaying, volume, muted, actions }: ControlBarProps) {
  return (
    <div className="controlbar">
      <div className="controlbar__transport">
        <ChromeButton variant="round-lg" label={isPlaying ? 'Pause' : 'Play'} onClick={actions.playPause}>
          {isPlaying ? <PauseIcon width={15} height={15} className="icon-pause" /> : <PlayIcon width={16} height={16} />}
        </ChromeButton>
        <ChromeButton label="Stop" onClick={actions.stop}>
          <StopIcon />
        </ChromeButton>
        <ChromeButton label="Previous" onClick={actions.previous}>
          <PrevIcon />
        </ChromeButton>
        <ChromeButton label="Next" onClick={actions.next}>
          <NextIcon />
        </ChromeButton>
        <ChromeButton label={muted ? 'Sound' : 'Mute'} onClick={actions.toggleMute} aria-pressed={muted}>
          <MuteIcon />
        </ChromeButton>
        <Slider label="Volume" value={volume} onChange={actions.setVolume} className="slider--volume" />
      </div>

      <div className="controlbar__corner">
        <ChromeButton variant="flat" label="Switch to full mode">
          <FullModeIcon />
        </ChromeButton>
        <ChromeButton variant="flat" label="Return to skin mode">
          <SkinModeIcon />
        </ChromeButton>
      </div>
    </div>
  )
}
