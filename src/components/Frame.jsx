import { Users, Bars, User, Chevron } from './Icons.jsx'

/* Shell.

   On a phone this is the app: it fills the screen, there is no title above it
   and no caption below it, and once it has been added to a home screen it runs
   without browser chrome. Safe area insets keep it clear of the notch and the
   home bar.

   On a desktop the same markup is centred in a device outline, which is only a
   presentation frame for reviewing the work on a large screen. The simulated
   status bar belongs to that frame, so it is hidden on a real phone where the
   operating system draws the real one. */
export function Frame({ children }) {
  return (
    <div className="flex min-h-[100dvh] justify-center bg-page sm:items-center sm:p-6">
      <div
        data-frame
        className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-surface sm:h-[760px] sm:max-h-[calc(100dvh-3rem)] sm:w-[390px] sm:rounded-[30px] sm:border sm:border-line-strong sm:shadow-2xl"
        style={{
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <StatusBar />
        <div className="min-h-0 flex-1">{children}</div>
      </div>
    </div>
  )
}

function StatusBar() {
  return (
    <div className="hidden h-7 flex-none items-center justify-between bg-surface px-5 sm:flex">
      <span className="font-display text-[11px] font-semibold tabular-nums text-ink">
        12:38
      </span>
      <span className="flex items-end gap-[2px]" aria-hidden="true">
        <i className="block h-1.5 w-[3px] rounded-sm bg-ink" />
        <i className="block h-2 w-[3px] rounded-sm bg-ink" />
        <i className="block h-2.5 w-[3px] rounded-sm bg-ink" />
        <i className="ml-1 block h-2.5 w-4 rounded-[3px] border border-ink" />
      </span>
    </div>
  )
}

/* Three tabs, one per core job: who is out, where to play, and you. Watch
   was a fourth and is no longer a tab - clips are a way to pass the time in
   a queue, not a reason to open the app - so it opens from the queue screen,
   Liked clips and Activity instead. */
const TABS = [
  { id: 'friends', label: 'Circle', Icon: Users },
  { id: 'arcades', label: 'Arcades', Icon: Bars },
  { id: 'me', label: 'Me', Icon: User },
]

export const TAB_IDS = TABS.map((t) => t.id)

/* The word on the tab, for screens that name where Back will land. */
export function tabLabel(id) {
  return TABS.find((t) => t.id === id)?.label ?? TABS[0].label
}

export function TabBar({ active, onSelect, banner }) {
  return (
    <div className="border-t border-line bg-surface/95 backdrop-blur">
      {banner}
      <nav className="grid grid-cols-3 px-1 pb-1 pt-1">
        {TABS.map(({ id, label, Icon }) => {
          const on = active === id
          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelect(id)}
              aria-current={on ? 'page' : undefined}
              className={`flex flex-col items-center gap-0.5 rounded-xl py-1.5 text-[11px] transition-all duration-150 ease-soft active:scale-95 ${
                on ? 'font-semibold text-brand-600' : 'text-ink-subtle hover:text-ink-muted'
              }`}
            >
              <Icon size={21} />
              {label}
            </button>
          )
        })}
      </nav>
    </div>
  )
}

export function SessionBanner({ arcadeName, position, total, onOpen }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex min-h-11 w-full items-center justify-between border-b border-line bg-brand-50 px-4 py-2 text-left transition-colors duration-150 hover:bg-brand-100"
    >
      <span className="flex items-center gap-2 text-xs text-ink">
        <span className="relative flex h-2 w-2">
          <span className="anim-ring absolute inline-flex h-full w-full rounded-full bg-brand-500" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-600" />
        </span>
        In queue &middot; <span className="font-semibold">{arcadeName}</span>
        <span className="tabular-nums text-ink-muted">
          #{position}/{total}
        </span>
      </span>
      <span className="text-brand-600" aria-hidden="true">
        <Chevron size={16} />
      </span>
    </button>
  )
}
