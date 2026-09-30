import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Close } from './Icons.jsx'

/* Shared primitives.

   Colour carries meaning here rather than decoration: brand indigo for the
   primary action, a hue per game, and semantic tokens for fresh / stale /
   live. Elevation separates sheets and bars from the page. Motion is short
   and always opt-out via prefers-reduced-motion (see index.css). */

const TOOLTIP_WIDTH = 224
const EDGE_GUTTER = 8

export function Screen({ children }) {
  return <div className="anim-screen flex h-full flex-col bg-surface">{children}</div>
}

/* `backLabel` names where the arrow lands when that is not simply the
   previous screen; `onClose` adds a cross at the far right with `closeLabel`
   as its accessible name. */
export function TopBar({
  title,
  subtitle,
  onBack,
  backLabel = 'Back',
  right,
  onClose,
  closeLabel = 'Close',
}) {
  return (
    <div className="flex items-center gap-2 border-b border-line bg-surface/95 px-4 py-3 backdrop-blur">
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          aria-label={backLabel}
          className="-my-1.5 -ml-3 flex h-11 w-11 flex-none items-center justify-center rounded-full text-ink transition-colors duration-150 hover:bg-sunken active:bg-line"
        >
          <BackGlyph />
        </button>
      ) : (
        <span className="w-1" />
      )}
      <div className="min-w-0 flex-1">
        <h1 className="truncate font-display text-[17px] font-semibold tracking-tight text-ink">
          {title}
        </h1>
        {subtitle && (
          <p className="truncate text-[11px] leading-tight text-ink-muted">{subtitle}</p>
        )}
      </div>
      {right}
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label={closeLabel}
          className="-mr-2 flex h-11 w-11 flex-none items-center justify-center rounded-full text-ink-muted transition-colors duration-150 hover:bg-sunken hover:text-ink active:bg-line"
        >
          <Close size={20} />
        </button>
      )}
    </div>
  )
}

function BackGlyph() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M15 5l-7 7 7 7" />
      <path d="M8 12h11" />
    </svg>
  )
}

export function Body({ children, className = '' }) {
  return <div className={`flex-1 overflow-y-auto ${className}`}>{children}</div>
}

/* `tone="danger"` is for the one kind of primary action that destroys
   something; it keeps the shape and drops the brand colour for the one the
   app reserves for things that cannot be taken back. */
export function PrimaryButton({ children, className = '', disabled, tone = 'brand', ...rest }) {
  const live =
    tone === 'danger'
      ? 'bg-live text-white shadow-lg shadow-live/25 hover:brightness-95 active:scale-[0.98]'
      : 'bg-brand-600 text-white shadow-lg shadow-brand-600/25 hover:bg-brand-700 active:scale-[0.98]'
  return (
    <button
      type="button"
      disabled={disabled}
      className={`w-full rounded-xl px-4 py-3.5 font-display text-sm font-semibold transition-all duration-150 ease-soft ${
        disabled ? 'bg-line text-ink-subtle' : live
      } ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}

export function SecondaryButton({ children, className = '', disabled, ...rest }) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={`w-full rounded-xl border px-4 py-3.5 font-display text-sm font-semibold transition-all duration-150 ease-soft ${
        disabled
          ? 'border-line bg-sunken text-ink-subtle'
          : 'border-line-strong bg-surface text-ink hover:bg-sunken active:scale-[0.98]'
      } ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}

/* A compact action for short, contextual tasks. */
export function ActionButton({ children, className = '', icon, ...rest }) {
  return (
    <button
      type="button"
      className={`inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 transition-all duration-150 ease-soft hover:bg-brand-100 active:scale-95 ${className}`}
      {...rest}
    >
      {icon}
      {children}
    </button>
  )
}

/* The second action on a row.

   Same tap target as ActionButton, a fraction of the weight. A row that ends
   in two identical buttons reads as a choice between equals, which is what
   made the activity feed feel busy; a row that ends in a button and a text
   action reads as one next step with an option behind it. */
export function QuietAction({ children, className = '', ...rest }) {
  return (
    <button
      type="button"
      className={`inline-flex items-center rounded-md px-1 py-1.5 text-xs font-medium text-ink-muted underline decoration-line-strong underline-offset-2 transition-colors duration-150 hover:text-ink hover:decoration-ink-subtle ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}

export function BestBadge() {
  return (
    <span className="inline-flex items-center rounded-full bg-brand-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
      Best
    </span>
  )
}

export function StaleBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-stale-bg px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-stale">
      <span className="h-1.5 w-1.5 rounded-full bg-stale" />
      Stale
    </span>
  )
}

/* The other half of StaleBadge, so age reads as a state rather than as a
   number the user has to hold a threshold against. Same shape, semantic
   colour, static dot - LiveBadge pulses because presence is happening now,
   while a report only sits there getting older. */
export function FreshBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-fresh-bg px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-fresh">
      <span className="h-1.5 w-1.5 rounded-full bg-fresh" />
      Fresh
    </span>
  )
}

export function LiveBadge({ label = 'Live' }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-fresh-bg px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-fresh">
      <span className="relative flex h-1.5 w-1.5">
        <span className="anim-ring absolute inline-flex h-full w-full rounded-full bg-fresh" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-fresh" />
      </span>
      {label}
    </span>
  )
}

/* Clip artwork.

   There are no video files in this prototype, so a clip has to look like
   something. Each one gets its own two hues seeded off its id, which means the
   art is deterministic: the tile in a grid is the same picture as the clip it
   opens, and it stays the same between runs. Same three layer recipe the feed
   already used, with the colours pulled out of the hardcode. */
export function clipArt(clip) {
  const seed = `${clip.id}-${clip.song ?? ''}`
  let n = 0
  for (let i = 0; i < seed.length; i += 1) n = (n * 31 + seed.charCodeAt(i)) >>> 0
  const a = n % 360
  const b = (a + 120 + (n % 90)) % 360

  return [
    `radial-gradient(circle at 16% 14%, hsl(${a} 78% 60% / 0.72), transparent 34%)`,
    `radial-gradient(circle at 88% 45%, hsl(${b} 74% 55% / 0.46), transparent 32%)`,
    `linear-gradient(155deg, hsl(${a} 52% 24%) 0%, #100d28 72%)`,
  ].join(', ')
}

/* One fact at a glance: an icon, a number or two words, and a name for
   assistive technology, since "5/5 working" beside a drawing of a machine is
   obvious to the eye and not to a screen reader. Tone carries the state, and
   the words always say it too, so nothing rests on colour alone. */
const STAT_TONES = {
  default: ['text-ink-muted', 'bg-sunken'],
  ink: ['text-ink', 'bg-sunken'],
  fresh: ['text-fresh', 'bg-fresh-bg'],
  stale: ['text-stale', 'bg-stale-bg'],
  live: ['text-live', 'bg-live-bg'],
  /* On the brand hero, where the semantic hues would lose contrast. */
  onBrand: ['text-white/90', 'bg-white/15'],
}

export function Stat({ icon, label, tone = 'default', pill = false, className = '', children }) {
  const [fg, bg] = STAT_TONES[tone] ?? STAT_TONES.default
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap text-xs font-medium tabular-nums ${fg} ${
        pill ? `rounded-full px-2.5 py-1 ${bg}` : ''
      } ${className}`}
    >
      {icon}
      {label && <span className="sr-only">{label}: </span>}
      {children}
    </span>
  )
}

/* A game's hue mixed into the surface, for the few places it is allowed to
   be more than a dot: the selected game chip and the accent on a hero. */
export function gameTint(color, percent = 10) {
  return `color-mix(in srgb, ${color} ${percent}%, var(--surface))`
}

/* A dot in the game's hue. Cheap, and it makes a list of venues scannable
   before any label is read. */
export function GameDot({ color, className = '' }) {
  return (
    <span
      className={`inline-block h-2 w-2 flex-none rounded-full ${className}`}
      style={{ backgroundColor: color }}
    />
  )
}

/* Avatar colours are deterministic, so a player stays recognisable across
   screens without adding image files to the prototype. */
const AVATAR_HUES = [
  ['#eef2ff', '#4338ca'],
  ['#fff1f2', '#be123c'],
  ['#ecfdf5', '#047857'],
  ['#fff7ed', '#c2410c'],
  ['#f5f3ff', '#6d28d9'],
  ['#ecfeff', '#0e7490'],
  ['#fefce8', '#a16207'],
]

function hueFor(handle) {
  let n = 0
  for (let i = 0; i < handle.length; i += 1) n = (n * 31 + handle.charCodeAt(i)) >>> 0
  return AVATAR_HUES[n % AVATAR_HUES.length]
}

export const AVATAR_HUE_COUNT = AVATAR_HUES.length

/* The colour is derived from the handle so a player is recognisable across
   screens without the prototype shipping image files. `hue` overrides that for
   the one person who gets to choose: you. */
export function Avatar({ handle = '?', size = 36, live = false, hue = null, className = '' }) {
  const [bg, fg] =
    hue === null || hue === undefined ? hueFor(handle) : AVATAR_HUES[hue % AVATAR_HUES.length]
  const initials = handle.replace(/[^a-z0-9]/gi, '').slice(0, 2).toUpperCase() || '?'

  return (
    <span className={`relative inline-flex flex-none ${className}`}>
      <span
        className="inline-flex items-center justify-center rounded-full font-display font-bold"
        style={{
          width: size,
          height: size,
          backgroundColor: bg,
          color: fg,
          fontSize: Math.round(size * 0.36),
        }}
      >
        {initials}
      </span>
      {live && (
        <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-surface bg-fresh" />
      )}
    </span>
  )
}

export function Info({ children, label = 'More information', above = false }) {
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState(null)
  const ref = useRef(null)
  const popupRef = useRef(null)
  const closeTimer = useRef(null)
  const tooltipId = useId()

  function cancelClose() {
    if (closeTimer.current) window.clearTimeout(closeTimer.current)
    closeTimer.current = null
  }

  function show() {
    cancelClose()
    setOpen(true)
  }

  function hideSoon() {
    cancelClose()
    closeTimer.current = window.setTimeout(() => setOpen(false), 100)
  }

  /* Place the tooltip inside the phone frame but above its scroll areas. */
  useLayoutEffect(() => {
    if (!open || !ref.current || !popupRef.current) return undefined
    const frame = ref.current.closest('[data-frame]')
    if (!frame) return undefined

    function place() {
      const trigger = ref.current?.getBoundingClientRect()
      const popup = popupRef.current?.getBoundingClientRect()
      const bounds = frame.getBoundingClientRect()
      if (!trigger || !popup) return

      const useAbove = above || trigger.bottom + popup.height + 12 > bounds.bottom
      const left = Math.min(
        Math.max(trigger.left, bounds.left + EDGE_GUTTER),
        bounds.right - TOOLTIP_WIDTH - EDGE_GUTTER
      )
      const rawTop = useAbove ? trigger.top - popup.height - 8 : trigger.bottom + 8
      const top = Math.min(
        Math.max(rawTop, bounds.top + EDGE_GUTTER),
        bounds.bottom - popup.height - EDGE_GUTTER
      )
      const arrowLeft = Math.min(
        Math.max(trigger.left + trigger.width / 2 - left - 5, 8),
        TOOLTIP_WIDTH - 18
      )

      setPosition({ left, top, above: useAbove, arrowLeft })
    }

    place()
    window.addEventListener('resize', place)
    document.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      document.removeEventListener('scroll', place, true)
    }
  }, [above, open])

  const tooltip = open
    ? createPortal(
        <span
          ref={popupRef}
          id={tooltipId}
          role="tooltip"
          onMouseEnter={show}
          onMouseLeave={hideSoon}
          style={{
            width: TOOLTIP_WIDTH,
            left: position?.left ?? 0,
            top: position?.top ?? 0,
            visibility: position ? 'visible' : 'hidden',
          }}
          className="anim-row fixed z-[100] rounded-xl border border-line bg-surface p-2.5 text-xs font-normal leading-relaxed text-ink-muted shadow-xl"
        >
          <span
            style={{ left: position?.arrowLeft ?? 8 }}
            className={`absolute h-2.5 w-2.5 rotate-45 border-line bg-surface ${
              position?.above
                ? '-bottom-[5px] border-b border-r'
                : '-top-[5px] border-l border-t'
            }`}
          />
          {children}
        </span>,
        document.body
      )
    : null

  return (
    <span
      ref={ref}
      onMouseEnter={show}
      onMouseLeave={hideSoon}
      className="relative inline-flex align-middle"
    >
      <button
        type="button"
        aria-label={label}
        aria-describedby={open ? tooltipId : undefined}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onFocus={show}
        onBlur={hideSoon}
        /* Drawn at 17px so it stays quiet, pressed at 44: the pseudo
           element widens the hit area without moving anything. */
        className={`relative flex h-[17px] w-[17px] flex-none items-center justify-center rounded-full border text-[10px] font-bold leading-none transition-colors duration-150 before:absolute before:-inset-[13px] before:content-[''] ${
          open
            ? 'border-brand-600 bg-brand-600 text-white'
            : 'border-line-strong bg-surface text-ink-muted hover:border-brand-400 hover:text-brand-600'
        }`}
      >
        ?
      </button>
      {tooltip}
    </span>
  )
}

/* Two views of the same thing, as one control: the main switch on a tab.
   Equal widths, so neither option reads as the default by being bigger. */
export function ViewSwitch({ label, options, value, onChange, className = '' }) {
  return (
    <div
      role="group"
      aria-label={label}
      className={`grid rounded-full bg-sunken p-0.5 ${className}`}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((option) => {
        const on = option.id === value
        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(option.id)}
            className={`min-h-10 whitespace-nowrap rounded-full px-3 text-xs font-semibold transition-all duration-150 ease-soft ${
              on ? 'bg-surface text-ink shadow-sm' : 'text-ink-muted hover:text-ink'
            }`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

export function Seg({ on, children, className = '', accent, ...rest }) {
  return (
    <button
      type="button"
      className={`inline-flex flex-none items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold transition-all duration-150 ease-soft active:scale-95 ${
        on
          ? 'border-transparent bg-ink text-white'
          : 'border-line-strong bg-surface text-ink-muted hover:border-ink-subtle hover:text-ink'
      } ${className}`}
      {...rest}
    >
      {accent && <GameDot color={accent} className={on ? 'ring-2 ring-white/40' : ''} />}
      {children}
    </button>
  )
}

export function Chip({ children, className = '', tone = 'default' }) {
  const tones = {
    default: 'border-line-strong text-ink-muted bg-surface',
    brand: 'border-brand-200 text-brand-700 bg-brand-50',
    quiet: 'border-transparent text-ink-muted bg-sunken',
  }
  return (
    <span
      className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold tabular-nums ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  )
}

/* A section that stays shut until asked for.

   Progressive disclosure: the screen shows who you are and where to go next,
   and everything else waits behind a row. Nothing is removed, so the content
   is still one tap away, but the default view carries far less at once. */
export function Disclosure({ title, hint, icon, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen)
  const id = useId()

  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 p-4 text-left transition-colors duration-150 hover:bg-sunken"
      >
        {icon && (
          <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-brand-50 text-brand-700">
            {icon}
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block font-display text-sm font-semibold text-ink">{title}</span>
          {hint && <span className="block truncate text-xs text-ink-muted">{hint}</span>}
        </span>
        <span
          className={`flex-none text-ink-subtle transition-transform duration-200 ease-soft ${
            open ? 'rotate-90' : ''
          }`}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M9 5l7 7-7 7" />
          </svg>
        </span>
      </button>

      {open && (
        <div id={id} className="anim-row border-t border-line p-4">
          {children}
        </div>
      )}
    </section>
  )
}

export function Placeholder({ label, className = '', children }) {
  return (
    <div
      className={`flex items-center justify-center rounded-xl border border-line bg-sunken ${className}`}
    >
      {children || (
        <span className="text-xs font-medium uppercase tracking-wide text-ink-subtle">
          {label}
        </span>
      )}
    </div>
  )
}

/* A sheet that behaves like a dialog.

   The existing sheets each drew their own scrim and handled their own
   closing, and none of them was reachable from a keyboard once open. This
   is the one they share from now on: it names itself for assistive
   technology, moves focus inside when it opens and puts it back when it
   closes, keeps Tab inside, closes on Escape and on a tap on the scrim, and
   stops a scroll at its edge from moving the screen behind it.

   Height is the content's, between a floor and a ceiling of the frame, so a
   short list is a short sheet and a long one scrolls inside. Anything that
   must scroll passes `scroll` and gets the contained scroll area. */
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function Sheet({
  title,
  onClose,
  closeLabel = 'Close',
  children,
  /* tall: a list that wants most of the screen; short: a confirmation */
  size = 'short',
  /* Whether the scrim and Escape close it. A sheet mid-request says no. */
  dismissable = true,
  /* Where focus goes when the sheet closes, if the control that opened it
     is no longer on the page - a sheet reopened by Back from a screen it
     opened has no opener to return to, so the app names one. */
  returnFocusTo = null,
}) {
  const panelRef = useRef(null)
  const titleId = useId()
  /* The latest close handler, so the key listener below is attached once
     and never re-runs the focus work when a parent re-renders. */
  const closeRef = useRef(onClose)
  const dismissRef = useRef(dismissable)
  const returnRef = useRef(returnFocusTo)
  useEffect(() => {
    closeRef.current = onClose
    dismissRef.current = dismissable
    returnRef.current = returnFocusTo
  }, [onClose, dismissable, returnFocusTo])

  useEffect(() => {
    const previous = document.activeElement
    const panel = panelRef.current
    /* The first field if there is one, otherwise the close control, so a
       keyboard user lands on the thing the sheet is for. */
    const first =
      panel?.querySelector('[data-autofocus]') ?? panel?.querySelector('[data-close]') ?? panel
    first?.focus?.({ preventScroll: true })

    function onKey(event) {
      if (event.key === 'Escape') {
        if (!dismissRef.current) return
        event.stopPropagation()
        closeRef.current?.()
        return
      }
      if (event.key !== 'Tab' || !panel) return
      const items = Array.from(panel.querySelectorAll(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null
      )
      if (items.length === 0) {
        event.preventDefault()
        return
      }
      const start = items[0]
      const end = items[items.length - 1]
      if (event.shiftKey && (document.activeElement === start || document.activeElement === panel)) {
        event.preventDefault()
        end.focus()
      } else if (!event.shiftKey && document.activeElement === end) {
        event.preventDefault()
        start.focus()
      }
    }

    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      const target =
        previous && previous !== document.body && previous.isConnected
          ? previous
          : returnRef.current
            ? document.querySelector(returnRef.current)
            : null
      target?.focus?.({ preventScroll: true })
    }
  }, [])

  return (
    <div
      className="anim-scrim absolute inset-0 z-30 flex items-end bg-ink/40"
      onClick={dismissable ? onClose : undefined}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        className={`anim-sheet flex w-full flex-col rounded-t-2xl border-t border-line bg-surface shadow-2xl outline-none ${
          size === 'tall' ? 'min-h-[55%] max-h-[85%]' : 'max-h-[85%]'
        }`}
      >
        <div className="flex justify-center pt-2" aria-hidden="true">
          <span className="h-1 w-9 rounded-full bg-line-strong" />
        </div>
        <div className="flex items-center gap-2 border-b border-line py-1 pl-4 pr-1.5">
          <h2 id={titleId} className="min-w-0 flex-1 truncate font-display text-base font-semibold text-ink">
            {title}
          </h2>
          <button
            type="button"
            data-close
            onClick={onClose}
            aria-label={closeLabel}
            className="flex h-11 w-11 flex-none items-center justify-center rounded-full text-ink-muted transition-colors duration-150 hover:bg-sunken hover:text-ink"
          >
            <Close size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

/* The scrolling middle of a Sheet. Contained, so reaching the end of the
   list does not start scrolling whatever is behind the scrim. */
export function SheetBody({ children, className = '' }) {
  return (
    <div className={`min-h-0 flex-1 overflow-y-auto overscroll-contain ${className}`}>
      {children}
    </div>
  )
}

/* A line at the top of the screen about something that just happened
   somewhere else in the app - a message arriving while you are on the
   map. It is a status for assistive technology, a button for everyone
   else, and it goes away on its own so it never has to be managed. */
export function AlertBanner({ avatar, title, text, onOpen, onClose, openLabel }) {
  return (
    <div className="anim-row pointer-events-none absolute inset-x-0 top-0 z-40 flex justify-center px-3 pt-2">
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-auto flex w-full max-w-[360px] items-center gap-2 rounded-2xl border border-line bg-surface/95 p-2 pl-3 shadow-2xl backdrop-blur"
      >
        <button
          type="button"
          onClick={onOpen}
          aria-label={openLabel}
          className="flex min-h-[44px] min-w-0 flex-1 items-center gap-2.5 rounded-xl text-left"
        >
          {avatar}
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-ink">{title}</span>
            <span className="block truncate text-xs text-ink-muted">{text}</span>
          </span>
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label="Dismiss"
          className="flex h-11 w-11 flex-none items-center justify-center rounded-full text-ink-muted transition-colors duration-150 hover:bg-sunken hover:text-ink"
        >
          <Close size={18} />
        </button>
      </div>
    </div>
  )
}

/* A sheet taller than the frame scrolls under its title rather than being
   cut off at the top. */
export function Modal({ title, children }) {
  return (
    <div className="anim-scrim absolute inset-0 z-20 flex items-end bg-ink/40">
      <div className="anim-sheet flex max-h-full w-full flex-col rounded-t-2xl border-t border-line bg-surface shadow-2xl">
        <div className="flex flex-none justify-center pt-2">
          <span className="h-1 w-9 rounded-full bg-line-strong" />
        </div>
        <div className="flex-none border-b border-line px-4 py-3">
          <h2 className="font-display text-base font-semibold text-ink">{title}</h2>
        </div>
        <div className="min-h-0 overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  )
}

export function Stepper({ label, hint, value, min = 0, onChange }) {
  return (
    <div className="flex items-center justify-between border-b border-line py-3 last:border-b-0">
      <div>
        <div className="text-sm font-medium text-ink">{label}</div>
        {hint && <div className="text-xs text-ink-muted">{hint}</div>}
      </div>
      <div className="flex items-center gap-2">
        <StepButton
          label={`Decrease ${label}`}
          disabled={value <= min}
          onClick={() => onChange(value - 1)}
        >
          &minus;
        </StepButton>
        <span className="w-9 text-center font-display text-xl font-semibold tabular-nums text-ink">
          {value}
        </span>
        <StepButton label={`Increase ${label}`} onClick={() => onChange(value + 1)}>
          +
        </StepButton>
      </div>
    </div>
  )
}

function StepButton({ children, label, disabled, onClick }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`h-9 w-9 rounded-full border text-lg font-semibold leading-none transition-all duration-150 ease-soft ${
        disabled
          ? 'border-line bg-sunken text-ink-subtle'
          : 'border-line-strong bg-surface text-ink hover:border-brand-400 hover:text-brand-600 active:scale-90'
      }`}
    >
      {children}
    </button>
  )
}

export function Toggle({ label, hint, checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors duration-150 ${
        checked ? 'border-brand-200 bg-brand-50' : 'border-line bg-surface hover:bg-sunken'
      }`}
    >
      <span
        className={`mt-0.5 flex h-5 w-9 flex-none items-center rounded-full p-0.5 transition-colors duration-200 ease-soft ${
          checked ? 'bg-brand-600' : 'bg-line-strong'
        }`}
      >
        <span
          className={`h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ease-soft ${
            checked ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </span>
      <span>
        <span className="block text-sm font-medium text-ink">{label}</span>
        {hint && <span className="block text-xs text-ink-muted">{hint}</span>}
      </span>
    </button>
  )
}
