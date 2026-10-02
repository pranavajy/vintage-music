import type { PlayerActions } from '../../types/player'
import { ChromeButton } from './ChromeButton'
import { FastForwardIcon, RewindIcon } from './icons'
import { Slider } from './Slider'

interface SeekBarProps {
  /** 0..1 */
  progress: number
  canSeek: boolean
  actions: PlayerActions
}

export function SeekBar({ progress, canSeek, actions }: SeekBarProps) {
  return (
    <div className="seekbar">
      <ChromeButton variant="pill" label="Rewind" onClick={actions.rewind} disabled={!canSeek}>
        <RewindIcon />
      </ChromeButton>
      <Slider label="Seek" value={progress} onChange={actions.seek} disabled={!canSeek} className="slider--seek" />
      <ChromeButton variant="pill" label="Fast forward" onClick={actions.fastForward} disabled={!canSeek}>
        <FastForwardIcon />
      </ChromeButton>
    </div>
  )
}
