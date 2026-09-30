import {
  Screen,
  TopBar,
  Body,
  PrimaryButton,
  SecondaryButton,
  Toggle,
  Stat,
  GameDot,
  LiveBadge,
} from '../components/ui.jsx'
import {
  Cabinet,
  CheckCircle,
  Chevron,
  Clock,
  Play,
  Shield,
  User,
  Users,
} from '../components/Icons.jsx'
import { turnState, workingCabinetsOf } from '../lib/queue.js'

/* SCREEN 6 - In the queue.

   The sketch has the tick, the venue name and a Check Out button. The running
   order in the middle is the addition that does the real work.

   Two findings converge on it. First, nobody can tell whose turn it is:
   "people, like, just come up and they're like, who's next?" ... "they weren't
   sure" ... "it's very messy, especially when it gets busy." Second, players
   do not stand and watch - they are "scrolling phones and they're not paying
   attention", or they walk off to another machine entirely: "if they're about
   to have a queue, they'll go and play Mame ... while they wait."

   An explicit position plus a one-turn warning answers both: the order is
   readable without asking anyone, and you can leave the machine and still get
   back in time. The field study validated exactly that part (finding D), so
   it is unchanged.

   What it did not validate was the way out. A participant read Check Out as
   the way to leave the queue - "Ah, so that's how you leave the queue" - so
   the screen now offers one exit at a time. While you wait, the exit is
   Leave queue. Once a working machine is yours, or the turn alert has
   called you, it is Check out, which records that you played. The title
   says what this is, being in a queue, rather than "Checked In!". */
export default function CheckedIn({
  arcade,
  position,
  total,
  queueAhead,
  aheadMin,
  /* 'solo' or 'pair' when you joined on this phone; null when the check-in
     came back from another one. */
  party = null,
  shared = true,
  audienceLabel = null,
  turnUp = false,
  notify,
  onNotify,
  onWatch,
  onUpdateCount,
  /* Both leave for Circle, where the queue banner keeps the way back in.
     Neither leaves the queue - that is the button at the foot. */
  onBack,
  onClose = null,
  onCheckOut,
  onLeaveQueue,
}) {
  /* Nothing has been played until a working machine is free for you, so up
     to that point checking out is the wrong exit: it would record a session
     that never happened. */
  const working = workingCabinetsOf(arcade)
  const playing = turnUp || position <= working
  const youState = turnUp && position > working ? 'Your turn' : turnState(position, working)

  return (
    <Screen>
      <TopBar
        title="Your queue"
        onBack={onBack}
        backLabel="Back to Circle"
        onClose={onClose}
        closeLabel="Close"
      />

      <Body>
        {/* The position is the answer; everything else on this block is a
            chip that qualifies it. The explanations it used to carry - what
            the estimate is across, what the exits do - are either on the
            chips or on the sheet each exit opens. */}
        <section aria-label="Your place" className="border-b border-line px-4 py-5">
          <div className="flex items-center justify-between gap-2">
            <p className="flex min-w-0 items-center gap-2 text-sm font-semibold text-ink">
              <GameDot color={arcade.gameColor} className="h-2.5 w-2.5" />
              <span className="truncate">
                {arcade.short} &middot; {arcade.game}
              </span>
            </p>
            {playing ? (
              <LiveBadge label="Your turn" />
            ) : (
              <span className="inline-flex flex-none items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-700">
                <CheckCircle size={12} />
                In queue
              </span>
            )}
          </div>

          <p className="mt-4 font-display leading-none text-ink">
            <span className="sr-only">Position </span>
            <span className="text-6xl font-bold tabular-nums tracking-tight">#{position}</span>
            <span className="ml-2 text-xl font-semibold tabular-nums text-ink-muted">
              of {total}
            </span>
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-1.5">
            {!playing && (
              <Stat
                pill
                tone={working === 0 ? 'live' : 'ink'}
                label="Time to your turn"
                icon={<Clock size={13} />}
              >
                {working === 0 ? 'No estimate' : `~${aheadMin} min`}
              </Stat>
            )}
            <Stat pill tone={working === 0 ? 'live' : 'default'} label="Machines" icon={<Cabinet size={14} />}>
              {working}/{arcade.cabinets} working
            </Stat>
            {party && (
              <Stat pill label="Playing" icon={party === 'pair' ? <Users size={13} /> : <User size={13} />}>
                {party === 'pair' ? 'Pair' : 'Solo'}
              </Stat>
            )}
            {audienceLabel && (
              <Stat pill label="Check-in" icon={<Shield size={13} />}>
                {shared ? 'Shared' : 'Not shared'}
              </Stat>
            )}
          </div>

          {/* The count a scan joined on is whatever was last reported, so
              checking it is offered here - after you are in, never before. */}
          {onUpdateCount && (
            <button
              type="button"
              onClick={onUpdateCount}
              className="-ml-1 mt-2 min-h-11 rounded-md px-1 text-xs font-semibold text-brand-600"
            >
              Update count
            </button>
          )}
        </section>

        <div className="border-b border-line">
          <p className="px-4 pt-3 text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Running order
          </p>
          {/* State comes from the venue's working machines, not from a fixed
              label: at a two-machine venue only the first two are playing,
              whatever your position happens to be. */}
          <ol className="mt-2">
            {queueAhead.map((p, i) => {
              const n = position - queueAhead.length + i
              if (n < 1) return null
              return <Row key={p.handle} n={n} name={p.handle} state={turnState(n, working)} />
            })}
            <Row n={position} name="You" state={youState} you />
            {total > position && (
              <Row
                n={position + 1}
                name="mkr_"
                state={turnState(position + 1, working)}
              />
            )}
          </ol>
        </div>

        <div className="space-y-2 p-4">
          <Toggle checked={notify} onChange={onNotify} label="Alert me one turn before" />
          {/* Waiting is phone time for most players, so the clips live here,
              where the turn alert can still pull you back to this screen. */}
          {!playing && onWatch && (
            <button
              type="button"
              onClick={onWatch}
              className="flex min-h-11 w-full items-center gap-3 rounded-xl border border-line bg-surface p-3 text-left transition-colors duration-150 hover:bg-sunken"
            >
              <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-sunken text-ink-muted">
                <Play size={16} />
              </span>
              <span className="min-w-0 flex-1 text-sm font-medium text-ink">
                Watch clips while you wait
              </span>
              <Chevron size={16} />
            </button>
          )}
        </div>
      </Body>

      {/* One exit at a time, and each asks first on a sheet that says what
          it does, so the button needs no caption. */}
      <div className="border-t border-line p-4">
        {playing ? (
          <PrimaryButton onClick={onCheckOut}>Check out</PrimaryButton>
        ) : (
          <SecondaryButton onClick={onLeaveQueue}>Leave queue</SecondaryButton>
        )}
      </div>
    </Screen>
  )
}

function Row({ n, name, state, you }) {
  return (
    <li
      className={`flex items-center gap-3 border-t border-line px-4 py-2 ${
        you ? 'bg-brand-50' : ''
      }`}
    >
      <span className="w-5 text-xs tabular-nums text-ink-muted">{n}</span>
      <span
        className={`flex-1 text-sm ${
          you ? 'font-semibold text-ink' : 'text-ink'
        }`}
      >
        {name}
      </span>
      <span className="text-xs text-ink-muted">{state}</span>
    </li>
  )
}
