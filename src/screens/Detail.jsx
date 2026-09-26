import { useState } from 'react'
import {
  Screen,
  TopBar,
  Body,
  PrimaryButton,
  FreshBadge,
  StaleBadge,
  Info,
} from '../components/ui.jsx'
import { Users, Clock, Chevron, Pin, Bars, Cabinet, Star } from '../components/Icons.jsx'
import {
  queueRoster,
  rosterKnownCount,
  estimateWaitMin,
  isStale,
  freshnessLabel,
  sourceLabel,
  pairsOf,
  peopleOf,
  partiesLabel,
  playersLabel,
  workingCabinetsOf,
  SOLO_TURN_MIN,
  PAIR_TURN_MIN,
  STALE_AFTER_MIN,
} from '../lib/queue.js'
import { WORKING, ageLabel, conditionNotes, noteTitle } from '../lib/machines.js'

/* SCREEN 3 - Detail.

   The sketch listed Queue, Solo, Wait and Updated as four stats of the same
   size, and a heuristic evaluation found the obvious problem with that:
   "there are a lot of queue numbers; which one should I actually use?".

   Only one of them answers the question this screen exists for, so the wait
   is the only number set at display size and it comes first. The queue
   breakdown sits under it, because a player who knows how a maimai line works
   still wants the pairs and the solo count. Solo lost its own row: the
   breakdown already says it, and the same number twice is what made the
   screen look like it held more measures than it does.

   Freshness moved with the wait. A queue number is worth nothing without its
   age - the whole reason the group chat fails is that its answer arrives
   "thirty or forty five minutes" later - so the report age carries a Fresh or
   Stale badge and sits against the number it qualifies, rather than a row
   below as a timestamp of its own.

   A second pass cut what was left. Anything another screen or the phone
   itself already holds is gone: the street address, because tapping the row
   hands off to a maps app that has it; the clock time beside the report age,
   because the age is the part you judge; and the venue name inside the
   friends label, because it is in the title bar two rows up. The cabinet
   count moved rather than went - it is a fact about the venue, so it shares
   the venue row with the distance instead of sitting under the wait looking
   like a second measure of it. Other games at the venue are one row until
   asked for.

   The field study moved the machines back (finding A). Participants judged
   a queue by the cabinets behind it - "11th in queue can mean different
   things if there's five cabinets or two" - and one looked for the count
   exactly here: "this should be over here, how many machines there are". So
   the working machines sit under the wait again, as the thing the wait is
   divided by, and machine condition follows as its own short section,
   because whether the machines work was the most repeated thing people
   wanted to know before travelling (finding B).

   The button says Check in & join queue because the two happen together:
   you check in at the cabinet, and that is what puts you in this game's
   running order. "Join queue" on its own led straight to three options, and
   a participant could not tell whether they were already in. */
export default function Detail({
  arcade,
  otherGames,
  onBack,
  onCheckIn,
  onReport,
  onReportMachine,
  favourite = false,
  onToggleFavourite,
  onFriends,
  onPickGame,
  onDirections,
  queueOpen,
  onToggleQueue,
  mePosition,
  /* Who is out, scoped to people you follow both ways. */
  present = [],
  openCount = 0,
  onOpenSessions,
}) {
  const stale = isStale(arcade)
  const unavailable = workingCabinetsOf(arcade) === 0
  const friendsHere = present.filter((p) => p.at === arcade.id)

  return (
    <Screen>
      {/* The badge used to sit up here as well. One state, stated once, next
          to the number it applies to. */}
      <TopBar
        title={`${arcade.short} · ${arcade.game}`}
        onBack={onBack}
        right={
          onToggleFavourite && (
            <button
              type="button"
              aria-pressed={favourite}
              aria-label={favourite ? `Remove ${arcade.short} from favourites` : `Save ${arcade.short} as a favourite`}
              onClick={onToggleFavourite}
              className={`-mr-2 flex h-11 w-11 flex-none items-center justify-center rounded-full transition-colors duration-150 hover:bg-sunken ${
                favourite ? 'text-brand-600' : 'text-ink-muted'
              }`}
            >
              <Star size={20} filled={favourite} />
            </button>
          )
        }
      />

      <Body>
        <WaitStat arcade={arcade} stale={stale} mePosition={mePosition} />

        <MachineCondition arcade={arcade} onReport={onReportMachine} />

        {/* Tapping the address hands off to the phone's own maps app. We say
            which arcade to go to; routing, transit and traffic are not ours to
            rebuild. */}
        <button
          type="button"
          onClick={onDirections}
          className="flex w-full items-center gap-3 border-b border-line px-4 py-3 text-left"
        >
          <span className="text-ink-muted">
            <Pin size={18} />
          </span>
          <span className="flex-1">
            <span className="block text-sm text-ink">{arcade.name}</span>
            {/* The distance is from a fixed demo origin, so it says which. */}
            <span className="block text-xs tabular-nums text-ink-muted">
              {arcade.distanceKm.toFixed(1)} km from UTS Broadway (demo)
            </span>
          </span>
          <Chevron size={16} />
        </button>

        {/* The count on its own says how long the line is but not who is in
            it. Expanding names the parties that checked in through the app
            and leaves the rest as guests, which is the honest split. */}
        <QueueStat
          arcade={arcade}
          open={queueOpen}
          onToggle={onToggleQueue}
          mePosition={mePosition}
          onReport={onReport}
        />

        {friendsHere.length > 0 && (
          <button
            type="button"
            onClick={onFriends}
            className="flex w-full items-center gap-3 border-b border-line px-4 py-3 text-left"
          >
            <span className="text-ink-muted">
              <Users size={18} />
            </span>
            <span className="flex-1">
              <span className="block text-xs uppercase tracking-wide text-ink-muted">
                People you follow
              </span>
              <span className="block text-sm font-semibold text-ink">
                {friendsHere.map((p) => p.handle).join(', ')} here now
              </span>
            </span>
            <Chevron size={16} />
          </button>
        )}

        {/* Who you know there is mutual-only, so for a new player the row
            above never renders. This one does: a session somebody posted
            for anyone at this venue is a reason to come that needs no
            circle at all. */}
        {openCount > 0 && (
          <button
            type="button"
            onClick={onOpenSessions}
            className="flex w-full items-center gap-3 border-b border-line px-4 py-3 text-left"
          >
            <span className="text-ink-muted">
              <Users size={18} />
            </span>
            <span className="flex-1">
              <span className="block text-xs uppercase tracking-wide text-ink-muted">
                Open to anyone
              </span>
              <span className="block text-sm font-semibold text-ink">
                {openCount} {openCount === 1 ? 'session' : 'sessions'} posted
                here
              </span>
            </span>
            <Chevron size={16} />
          </button>
        )}

        {otherGames.length > 0 && (
          <OtherGames games={otherGames} onPick={onPickGame} />
        )}

        {/* One primary action. Correcting the count is an occasional,
            secondary job, so it lives inside the queue list where the wrong
            number is actually visible, and inside check-in where you are
            looking at the line anyway.

            It sits at the end of the content rather than pinned to the floor,
            so a short screen does not open with a band of empty white between
            the last row and the button. `sticky` keeps it on the bottom edge
            once the queue is expanded and the page actually scrolls, so the
            action is never scrolled away. */}
        <div className="sticky bottom-0 border-t border-line bg-surface p-4">
          {/* Nothing to queue for while no machine runs; the way back is
              marking it working again under Machine condition. */}
          {unavailable && (
            <p className="mb-2 text-xs text-live">
              No working {arcade.game} machine here right now. If it is running
              again, mark it working under Machine condition.
            </p>
          )}
          <PrimaryButton onClick={onCheckIn} disabled={unavailable}>
            Check in &amp; join queue
          </PrimaryButton>
        </div>
      </Body>
    </Screen>
  )
}

/* The decision value.

   Everything else on this screen either explains this number or acts on it,
   so nothing else is set at this size. The badge answers the second half of
   the question - how old the number is allowed to get before it stops being
   worth anything - using the same 15 minute threshold the ranking already
   applies, so a stale venue reads the same here as it does on Arcades. */
function WaitStat({ arcade, stale, mePosition }) {
  const pairs = pairsOf(arcade)
  const working = workingCabinetsOf(arcade)
  const wait = estimateWaitMin(arcade)
  const machines = `${working} working ${working === 1 ? 'machine' : 'machines'}`

  return (
    <div className="flex items-start gap-3 border-b border-line px-4 py-4">
      <span className="mt-1 text-ink-muted">
        <Clock size={18} />
      </span>
      <div className="flex-1">
        <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-ink-muted">
          Estimated wait
          <Info>
            {arcade.solo} solo &times; {SOLO_TURN_MIN} min + {pairs} pair
            {pairs === 1 ? '' : 's'} &times; {PAIR_TURN_MIN} min, divided by{' '}
            {machines}. A solo set is about three songs; a pair holds one queue
            position like a solo player, but holds the machine longer, because
            pairing buys an extra song. Machines reported out of order are
            left out. Reports older than {STALE_AFTER_MIN} min are marked
            stale: still here, but not ranked as fastest.
          </Info>
        </p>
        {wait === null ? (
          <>
            <p className="font-display text-3xl font-bold leading-tight text-live">
              Unavailable
            </p>
            <p className="text-xs text-live">
              No machine is working, so there is no wait to estimate.
            </p>
          </>
        ) : (
          <>
            <p className="font-display text-3xl font-bold leading-tight tabular-nums text-ink">
              About {wait} min
            </p>
            <p className="text-xs tabular-nums text-ink-muted">
              {working === arcade.cabinets
                ? `across ${arcade.cabinets} ${arcade.cabinets === 1 ? 'machine' : 'machines'}`
                : `across ${working} of ${arcade.cabinets} machines, the rest out of order`}
            </p>
          </>
        )}

        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
          {stale ? <StaleBadge /> : <FreshBadge />}
          <span className="text-xs tabular-nums text-ink-muted">
            {freshnessLabel(arcade)} &middot; {sourceLabel(arcade, mePosition)}
          </span>
        </div>
        {stale && (
          <p className="mt-1 text-xs text-stale">
            Left out of Fastest now until someone updates it.
          </p>
        )}
      </div>
    </div>
  )
}

/* Machine condition.

   How many of this game's machines run, and the one or two most useful
   things people have reported about them, each with its age - "one to two
   comments", as a participant put it, not a rating. Reporting is one tap
   away and anonymous. */
const NOTE_DOT = { out: 'bg-live', [WORKING]: 'bg-fresh' }

function MachineCondition({ arcade, onReport }) {
  const working = workingCabinetsOf(arcade)
  const total = arcade.cabinets
  const notes = conditionNotes(arcade)
  const shown = notes.slice(0, 2)
  const more = notes.length - shown.length
  const headline =
    working === 0
      ? total === 1
        ? 'Not working'
        : `None of ${total} working`
      : working === total
        ? total === 1
          ? '1 of 1 working'
          : `All ${total} working`
        : `${working} of ${total} working`

  return (
    <div className="border-b border-line px-4 py-3">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-ink-muted">
          <Cabinet size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-wide text-ink-muted">
            Machine condition
          </p>
          <p
            className={`text-sm font-semibold tabular-nums ${
              working === 0 ? 'text-live' : 'text-ink'
            }`}
          >
            {headline}
          </p>
          {shown.length === 0 ? (
            <p className="text-xs text-ink-muted">No problems reported.</p>
          ) : (
            <ul className="mt-1 space-y-1">
              {shown.map((issue) => (
                <li key={issue.id} className="flex items-start gap-1.5 text-xs">
                  <span
                    className={`mt-1.5 h-1.5 w-1.5 flex-none rounded-full ${
                      NOTE_DOT[issue.type] ?? 'bg-stale'
                    }`}
                  />
                  <span className="min-w-0 flex-1 text-ink">
                    {noteTitle(issue)}
                    {issue.note && (
                      <span className="text-ink-muted"> &middot; &ldquo;{issue.note}&rdquo;</span>
                    )}
                  </span>
                  <span className="flex-none tabular-nums text-ink-subtle">
                    {ageLabel(issue.minsAgo)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {more > 0 && (
            <p className="mt-0.5 text-[11px] text-ink-subtle">
              +{more} more, listed in the report
            </p>
          )}
          <button
            type="button"
            onClick={onReport}
            className="mt-2 min-h-11 rounded-xl border border-line-strong px-3 text-xs font-semibold text-ink transition-colors duration-150 hover:bg-sunken"
          >
            Report machine issue
          </button>
        </div>
      </div>
    </div>
  )
}

/* Other games at this venue.

   Five more rows of queue counts and waits, none of them about the game you
   opened. They are still one tap away, but they no longer sit under the
   decision as a second table competing for the same attention. */
function OtherGames({ games, onPick }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border-b border-line">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <span className="text-ink-muted">
          <Bars size={18} />
        </span>
        <span className="flex-1 text-sm text-ink">Also at this venue</span>
        <span className="text-xs tabular-nums text-ink-muted">
          {games.length} {games.length === 1 ? 'game' : 'games'}
        </span>
        <span className={`text-ink-muted ${open ? '-rotate-90' : 'rotate-90'}`}>
          <Chevron size={18} />
        </span>
      </button>

      {open && (
        <ul className="border-t border-line px-4 py-1">
          {games.map((g) => (
            <li key={g.gameId}>
              <button
                type="button"
                onClick={() => onPick(g.gameId)}
                className="flex w-full items-center gap-2 py-1.5 text-left"
              >
                <span className="flex-1 text-sm text-ink">{g.game}</span>
                <span className="text-xs tabular-nums text-ink-muted">
                  {partiesLabel(g.queue)}
                </span>
                <span className="w-20 text-right text-sm tabular-nums text-ink">
                  {estimateWaitMin(g) === null ? 'Unavailable' : `~${estimateWaitMin(g)} min`}
                </span>
                {isStale(g) && <StaleBadge />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function QueueStat({ arcade, open, onToggle, mePosition, onReport }) {
  const rows = queueRoster(arcade, { mePosition })
  const known = rosterKnownCount(arcade, mePosition)

  return (
    <div className="border-b border-line">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-start gap-3 px-4 py-3 text-left"
      >
        <span className="mt-0.5 text-ink-muted">
          <Users size={18} />
        </span>
        {/* Secondary by design: the same three facts as before, one step down
            in size, so they support the wait instead of competing with it. */}
        <span className="flex-1">
          <span className="block text-xs uppercase tracking-wide text-ink-muted">
            Queue
          </span>
          <span className="block text-sm font-semibold tabular-nums text-ink">
            {partiesLabel(arcade.queue)} waiting
          </span>
          <span className="block text-xs text-ink-muted">
            {pairsOf(arcade)} pair{pairsOf(arcade) === 1 ? '' : 's'} &middot;{' '}
            {arcade.solo} solo &middot; {playersLabel(peopleOf(arcade))} in total
          </span>
        </span>
        <span className={`mt-1 text-ink-muted ${open ? '-rotate-90' : 'rotate-90'}`}>
          <Chevron size={18} />
        </span>
      </button>

      {open && (
        <>
          <ol className="border-t border-line">
            {rows.map((r) => (
              <li
                key={r.position}
                className={`flex items-start gap-3 border-b border-line px-4 py-2 last:border-b-0 ${
                  r.you ? 'bg-sunken' : ''
                }`}
              >
                <span className="w-4 pt-0.5 text-xs tabular-nums text-ink-muted">
                  {r.position}
                </span>

                <span className="min-w-0 flex-1">
                  <span
                    className={`block text-sm ${
                      r.app || r.you
                        ? 'font-semibold text-ink'
                        : 'text-ink-muted'
                    }`}
                  >
                    {r.you
                      ? 'You'
                      : r.app
                        ? `${r.handle}${r.plus ? ` +${r.plus}` : ''}`
                        : `+${(r.plus ?? 0) + 1} guest${r.plus ? 's' : ''}`}
                  </span>
                </span>

                <span className="pt-0.5 text-xs text-ink-muted">{r.state}</span>
              </li>
            ))}
          </ol>

          <div className="flex items-center gap-2 px-4 py-2">
            <p className="flex flex-1 items-start gap-1.5 text-xs text-ink-muted">
              <span>
                <span className="tabular-nums">{known}</span> of{' '}
                <span className="tabular-nums">{arcade.queue}</span> parties
                checked in through the app.
              </span>
              <Info>
                The queue count comes from reports, so it includes people who
                are not running this app. They are held as guests rather than
                guessed at. A venue where nobody checks in is also a venue whose
                number goes stale.
              </Info>
            </p>
            <button
              type="button"
              onClick={onReport}
              className="flex-none rounded-md border border-line-strong px-2 py-1 text-xs font-medium text-ink"
            >
              Update count
            </button>
          </div>
        </>
      )}
    </div>
  )
}
