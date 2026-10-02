import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

const base = (props: IconProps) => ({
  width: 12,
  height: 12,
  viewBox: '0 0 12 12',
  fill: 'currentColor',
  'aria-hidden': true,
  ...props,
})

export const PlayIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M3 1.5v9l7.5-4.5z" /></svg>
)

export const PauseIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M2.5 1.5h2.6v9H2.5zM6.9 1.5h2.6v9H6.9z" /></svg>
)

export const StopIcon = (p: IconProps) => (
  <svg {...base(p)}><rect x="2.5" y="2.5" width="7" height="7" rx="0.5" /></svg>
)

export const PrevIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M2 2h1.6v8H2zM10 2v8L4 6z" /></svg>
)

export const NextIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M8.4 2H10v8H8.4zM2 2v8l6-4z" /></svg>
)

export const MuteIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M1 4.2h2.3L6.2 1.5v9L3.3 7.8H1z" />
    <path d="M7.6 3.6a3.2 3.2 0 0 1 0 4.8M9 2.3a5 5 0 0 1 0 7.4" fill="none" stroke="currentColor" strokeWidth="1.1" />
  </svg>
)

export const RewindIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M6 3v6L1.5 6zM10.5 3v6L6 6z" /></svg>
)

export const FastForwardIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M1.5 3v6L6 6zM6 3v6l4.5-3z" /></svg>
)

export const LibraryIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="1.5" y="1.5" width="9" height="9" rx="1" fill="none" stroke="currentColor" strokeWidth="1.2" />
    <rect x="3.5" y="3.5" width="5" height="5" />
  </svg>
)

export const PlaylistIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="6" cy="6" r="4.6" fill="none" stroke="currentColor" strokeWidth="1.1" />
    <path d="M4 4.2h4M4 6h4M4 7.8h4" stroke="currentColor" strokeWidth="1" />
  </svg>
)

export const EffectsIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path
      d="M6 .8 7 4.4 10.6 3 8 6l2.6 3L7 7.6 6 11.2 5 7.6 1.4 9 4 6 1.4 3 5 4.4z"
    />
  </svg>
)

export const EqualizerIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M1.5 7h2v3.5h-2zM5 2.5h2v8H5zM8.5 5h2v5.5h-2z" /></svg>
)

export const MinimizeIcon = (p: IconProps) => (
  <svg {...base(p)}><rect x="2" y="8" width="7" height="2" /></svg>
)

export const CloseIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
  </svg>
)

export const FullModeIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="1" y="2" width="10" height="8" rx="1" fill="none" stroke="currentColor" strokeWidth="1.2" />
    <path d="M3.5 4.5h5v3h-5z" />
  </svg>
)

export const SkinModeIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="1" y="1" width="7" height="6" rx="1" fill="none" stroke="currentColor" strokeWidth="1.1" />
    <path d="M5 6.5l5.5 2.2-2.2.6 1.7 1.7-.8.8-1.7-1.7-.6 2.2z" />
  </svg>
)

