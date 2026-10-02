// Shared Web Audio graph fed by the Mac's system output (loopback capture,
// see electron/main.mjs). Visualizers connect to `node`; nothing is routed to
// the speakers, so there is no echo.

export interface SystemAudio {
  context: AudioContext
  node: AudioNode
}

type Listener = (status: SystemAudioStatus) => void
export type SystemAudioStatus = 'idle' | 'connecting' | 'live' | 'unavailable'

let context: AudioContext | null = null
let current: Promise<SystemAudio> | null = null
let status: SystemAudioStatus = 'idle'
const listeners = new Set<Listener>()

/** One AudioContext for the whole app (visualizers attach to it before audio is live). */
export function getAudioContext() {
  context ??= new AudioContext()
  return context
}

export function getSystemAudioStatus() {
  return status
}

export function onSystemAudioStatus(listener: Listener) {
  listeners.add(listener)
  return () => void listeners.delete(listener)
}

/** Starts (or reuses) the loopback capture. Rejects if the OS/user denies it. */
export function connectSystemAudio(): Promise<SystemAudio> {
  current ??= capture().catch((err) => {
    current = null
    setStatus('unavailable')
    throw err
  })
  return current
}

async function capture(): Promise<SystemAudio> {
  setStatus('connecting')
  const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
  // Only the audio is needed.
  for (const track of stream.getVideoTracks()) {
    track.stop()
    stream.removeTrack(track)
  }
  const [audioTrack] = stream.getAudioTracks()
  if (!audioTrack) throw new Error('No system audio track (check Screen & System Audio Recording permission)')

  audioTrack.addEventListener('ended', () => {
    current = null
    setStatus('idle')
  })

  const ctx = getAudioContext()
  if (ctx.state === 'suspended') await ctx.resume()
  const node = ctx.createMediaStreamSource(stream)
  // TEMP-LEVEL-PROBE
  const probe = ctx.createAnalyser()
  node.connect(probe)
  const buf = new Float32Array(probe.fftSize)
  let peak = 0
  setInterval(() => {
    probe.getFloatTimeDomainData(buf)
    for (const v of buf) peak = Math.max(peak, Math.abs(v))
  }, 20)
  setInterval(() => {
    console.log(`[level] peak=${peak.toFixed(4)} ctx=${ctx.state} sr=${ctx.sampleRate}`)
    peak = 0
  }, 2000)
  setStatus('live')
  return { context: ctx, node }
}

function setStatus(next: SystemAudioStatus) {
  status = next
  for (const l of listeners) l(next)
}
