import {
  Screen,
  TopBar,
  Body,
  PrimaryButton,
  SecondaryButton,
  Toggle,
  Info,
} from '../components/ui.jsx'
import { CheckCircle, Chevron, Play } from '../components/Icons.jsx'
import { turnState, workingCabinetsOf } from '../lib/queue.js'

/* SCREEN 6 - In the queue.

   The sketch has the tick, the venue name and a Check Out button. The running
   order in the middle is the addition that does the real work.

   Two findings converge on it. First, nobody can tell whose turn it is:
   "people, like, just come up and they're like, who's next?" ... "they weren't
   sure" ... "it's very messy, especially when it gets busy." Second, players
   do not stand and watch - they are "scrolling phones and they're not paying
   attention", or they walk off to another cabinet entirely: "if they're about
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
  /* Nothing has been played until a working cabinet is free for you, so up
     to that point checking out is the wrong exit: it would record a session
     that never happened. */
  const working = workingCabinetsOf(arcade)
  const playing = turnUp || position <= working
  const youState = turnUp && position > working ? 'Your turn' : turnState(position, working)

  const who = [
    party === 'pair' ? 'With a partner' : party === 'solo' ? 'Solo' : null,
    !audienceLabel
      ? null
      : shared
        ? `Visible to ${audienceLabel}`
        : 'Not shared, you count as a guest',
  ]
    .filter(Boolean)
    .join(' · ')

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
        <div className="flex items-center gap-3 border-b border-line px-4 py-5">
          <span className="text-ink">
            <CheckCircle size={40} />
          </span>
          <div className="min-w-0">
            <p className="text-lg font-semibold text-ink">
              {playing ? 'It’s your turn' : 'You’re in the queue'}
            </p>
            <p className="text-sm text-ink-muted">
              {arcade.game} at {arcade.name}
            </p>
            {who && <p className="mt-0.5 text-xs text-ink-muted">{who}</p>}
          </div>
        </div>

        <div className="border-b border-line px-4 py-4">
          <p className="text-xs uppercase tracking-wide text-ink-muted">
            Your position
          </p>
          <p className="text-3xl font-semibold tabular-nums text-ink">
            #{position}{' '}
            <span className="text-base font-normal text-ink-muted">
              of {total} parties
            </span>
          </p>
          <p className="mt-1 text-xs text-ink-muted">
            {playing
              ? 'A machine is yours. Check out when you finish playing.'
              : working === 0
                ? `No ${arcade.game} machine is working here right now, so there is no estimate. You keep your place.`
                : `Roughly ${aheadMin} min out, across ${working} of ${arcade.cabinets} working ${
                    arcade.cabinets === 1 ? 'machine' : 'machines'
                  }.`}
          </p>
          {/* The count a scan joined on is whatever was last reported, so
              checking it is offered here - after you are in, never before. */}
          {onUpdateCount && (
            <div className="mt-1 flex flex-wrap items-center gap-x-1 text-xs text-ink-muted">
              Queue count looks wrong?
              <button
                type="button"
                onClick={onUpdateCount}
                className="min-h-11 rounded-md px-1 font-semibold text-brand-600"
              >
                Update count
              </button>
            </div>
          )}
        </div>

        <div className="border-b border-line">
          <p className="flex items-center gap-1.5 px-4 pt-3 text-xs uppercase tracking-wide text-ink-muted">
            Running order
            <Info>
              Updates as people check in and out, so nobody has to ask who is
              next.
            </Info>
          </p>
          {/* State comes from the venue's working cabinets, not from a fixed
              label: at a two-machine venue only the first two are playing,
              whatever your position happens to be. */}
          <ol>
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
          <Toggle
            checked={notify}
            onChange={onNotify}
            label="Notify me when I'm one turn away"
            hint="Go play something else, you'll get pulled back in time."
          />
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
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-ink">
                  Watch clips while you wait
                </span>
                <span className="block text-xs text-ink-muted">
                  The turn alert pulls you back when you&rsquo;re up.
                </span>
              </span>
              <Chevron size={16} />
            </button>
          )}
        </div>
      </Body>

      <div className="space-y-1.5 border-t border-line p-4">
        {playing ? (
          <>
            <PrimaryButton onClick={onCheckOut}>Check out</PrimaryButton>
            <p className="text-center text-[11px] text-ink-muted">
              Finished playing? Checking out frees your machine.
            </p>
          </>
        ) : (
          <>
            <SecondaryButton onClick={onLeaveQueue}>Leave queue</SecondaryButton>
            <p className="text-center text-[11px] text-ink-muted">
              Not playing after all? Your place goes to the next party.
            </p>
          </>
        )}
      </div>
    </Screen>
  )
}

function Row({ n, name, state, you }) {
  return (
    <li
      className={`flex items-center gap-3 border-t border-line px-4 py-2 ${
        you ? 'bg-sunken' : ''
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
