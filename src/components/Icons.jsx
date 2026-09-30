/* Generic line icons, drawn inline so the prototype pulls in no icon library
   and ships no image assets. Single weight, currentColor, no fill. */

const base = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

const Svg = ({ children, size = 20, ...rest }) => (
  <svg {...base} width={size} height={size} aria-hidden="true" {...rest}>
    {children}
  </svg>
)

export const Pin = (p) => (
  <Svg {...p}>
    <path d="M12 21s7-5.2 7-11a7 7 0 1 0-14 0c0 5.8 7 11 7 11Z" />
    <circle cx="12" cy="10" r="2.5" />
  </Svg>
)

export const Users = (p) => (
  <Svg {...p}>
    <circle cx="9" cy="8" r="3" />
    <path d="M3 20a6 6 0 0 1 12 0" />
    <path d="M16 5.5a3 3 0 0 1 0 5.6" />
    <path d="M17.5 14.4A6 6 0 0 1 21 20" />
  </Svg>
)

export const User = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="8" r="3.2" />
    <path d="M5 20a7 7 0 0 1 14 0" />
  </Svg>
)

export const UserPlus = (p) => (
  <Svg {...p}>
    <circle cx="10" cy="8" r="3.2" />
    <path d="M3.5 20a6.5 6.5 0 0 1 13 0" />
    <path d="M19 8v6M16 11h6" />
  </Svg>
)

export const Clock = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 1.8" />
  </Svg>
)

export const Refresh = (p) => (
  <Svg {...p}>
    <path d="M20 12a8 8 0 1 1-2.3-5.6" />
    <path d="M20 4v4.5h-4.5" />
  </Svg>
)

export const Chevron = (p) => (
  <Svg {...p}>
    <path d="M9 5l7 7-7 7" />
  </Svg>
)

export const ArrowLeft = (p) => (
  <Svg {...p}>
    <path d="M15 5l-7 7 7 7" />
    <path d="M8 12h11" />
  </Svg>
)

export const Close = (p) => (
  <Svg {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Svg>
)

export const Check = (p) => (
  <Svg {...p}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </Svg>
)

export const CheckCircle = (p) => (
  <Svg {...p} strokeWidth={1.4}>
    <circle cx="12" cy="12" r="9.5" />
    <path d="M7.5 12.4l3.1 3.1L16.6 9.4" />
  </Svg>
)

export const Qr = (p) => (
  <Svg {...p}>
    <rect x="3.5" y="3.5" width="6.5" height="6.5" rx="1" />
    <rect x="14" y="3.5" width="6.5" height="6.5" rx="1" />
    <rect x="3.5" y="14" width="6.5" height="6.5" rx="1" />
    <path d="M14 14h3v3h-3zM20.5 14v3M17.5 20.5h3" />
  </Svg>
)

export const Nfc = (p) => (
  <Svg {...p}>
    <path d="M8.5 15.5a5 5 0 0 1 0-7" />
    <path d="M5.6 18.4a9 9 0 0 1 0-12.8" />
    <path d="M15.5 8.5a5 5 0 0 1 0 7" />
    <path d="M18.4 5.6a9 9 0 0 1 0 12.8" />
  </Svg>
)

export const Hand = (p) => (
  <Svg {...p}>
    <path d="M9 11V5.5a1.5 1.5 0 0 1 3 0V11" />
    <path d="M12 11V4.5a1.5 1.5 0 0 1 3 0V11" />
    <path d="M15 11V6.5a1.5 1.5 0 0 1 3 0V15a6 6 0 0 1-6 6h-1a6 6 0 0 1-5.2-3l-2-3.4a1.5 1.5 0 0 1 2.4-1.8L9 15" />
  </Svg>
)

export const Bell = (p) => (
  <Svg {...p}>
    <path d="M18 15V10a6 6 0 1 0-12 0v5l-1.5 2.5h15Z" />
    <path d="M10 20.5a2.2 2.2 0 0 0 4 0" />
  </Svg>
)

export const Minus = (p) => (
  <Svg {...p} strokeWidth={2}>
    <path d="M5 12h14" />
  </Svg>
)

export const Plus = (p) => (
  <Svg {...p} strokeWidth={2}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
)

export const HomeIcon = (p) => (
  <Svg {...p}>
    <path d="M4 10.5 12 4l8 6.5V20H4Z" />
  </Svg>
)

export const Bars = (p) => (
  <Svg {...p}>
    <path d="M5 20V12M12 20V5M19 20v-6" strokeWidth={2} />
  </Svg>
)

export const Play = (p) => (
  <Svg {...p}>
    <rect x="3.5" y="5" width="17" height="14" rx="2" />
    <path d="M10.5 9.5l4.5 2.5-4.5 2.5Z" />
  </Svg>
)

export const Heart = ({ filled, ...p }) => (
  <Svg {...p} fill={filled ? 'currentColor' : 'none'}>
    <path d="M12 20.2S4.5 15.6 4.5 10.3A3.8 3.8 0 0 1 12 8.2a3.8 3.8 0 0 1 7.5 2.1c0 5.3-7.5 9.9-7.5 9.9Z" />
  </Svg>
)

export const Comment = (p) => (
  <Svg {...p}>
    <path d="M20 15.5A2.5 2.5 0 0 1 17.5 18H8.5L4.5 21V6.5A2.5 2.5 0 0 1 7 4h10.5A2.5 2.5 0 0 1 20 6.5Z" />
  </Svg>
)

export const Pulse = (p) => (
  <Svg {...p}>
    <path d="M3 12h3.5l2.5-6 4.5 13 2.5-7H21" />
  </Svg>
)

export const Crosshair = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="7" />
    <circle cx="12" cy="12" r="2.2" />
    <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
  </Svg>
)

export const Send = (p) => (
  <Svg {...p}>
    <path d="M4 11.6 20 4l-7.4 16-2.2-6.4-6.4-2Z" />
  </Svg>
)

export const Shield = (p) => (
  <Svg {...p}>
    <path d="M12 3.5 19 6v5.5c0 4.5-3 7.6-7 9-4-1.4-7-4.5-7-9V6Z" />
  </Svg>
)

export const Star = ({ filled, ...p }) => (
  <Svg {...p} fill={filled ? 'currentColor' : 'none'}>
    <path d="m12 4 2.4 5 5.4.7-4 3.7 1 5.4L12 16.2l-4.8 2.6 1-5.4-4-3.7 5.4-.7Z" />
  </Svg>
)

export const Search = (p) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="6" />
    <path d="m20 20-4.5-4.5" />
  </Svg>
)

/* An arcade cabinet: screen above, a button and a stick below. */
export const Cabinet = (p) => (
  <Svg {...p}>
    <rect x="6" y="3" width="12" height="18" rx="2" />
    <rect x="8.5" y="6" width="7" height="5" rx="1" />
    <circle cx="10" cy="15" r="1" />
    <path d="M13.5 15h2" />
  </Svg>
)

export const Calendar = (p) => (
  <Svg {...p}>
    <rect x="4" y="5" width="16" height="15" rx="2" />
    <path d="M4 10h16M9 3v4M15 3v4" />
  </Svg>
)

/* A warning: something reported, not something broken. */
export const Alert = (p) => (
  <Svg {...p}>
    <path d="M12 4 21 19.5H3Z" />
    <path d="M12 10v4" />
    <path d="M12 17h.01" />
  </Svg>
)
