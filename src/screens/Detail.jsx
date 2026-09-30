import { useId, useState } from 'react'
import {
  Screen,
  TopBar,
  Body,
  PrimaryButton,
  StaleBadge,
  Info,
  Stat,
  GameDot,
  Avatar,
  gameTint,
} from '../components/ui.jsx'
import {
  Users,
  Chevron,
  Pin,
  Bars,
  Cabinet,
  Star,
  Refresh,
  Calendar,
} from '../components/Icons.jsx'
import {
  queueRoster,
  rosterKnownCount,
  estimateWaitMin,
  isStale,
  ageShort,
  pairsOf,
  peopleOf,
  partiesLabel,
  playersLabel,
  workingCabinetsOf,
  workingLabel,
  SOLO_TURN_MIN,
  PAIR_TURN_MIN,
} from '../lib/queue.js'
import { WORKING, ageLabel, conditionNotes, noteTitle, openIssues } from '../lib/machines.js'

/* SCREEN 3 - Detail.

   The sketch listed Queue, Solo, Wait and Updated as four stats of the same
   size, and a heuristic evaluation found the obvious problem with that:
   "there are a lot of queue numbers; which one should I actually use?". Only
   one of them answers the question this screen exists for, so the wait is
   the only number set at display size and it comes first.

   The field study added two things a player needs before the trip (findings
   A and B): how many machines are working, because a queue means different
   things over five machines or two, and what state they are in. Freshness
   has always travelled with the wait - a queue number is worth nothing
   without its age.

   The Week 9 critique then said the screen asked for too much reading before
   anyone could act: six labelled sections stood between the wait and the
   button. So the screen is now split in two. Above the button is the
   decision, and nothing else: the game, the wait, and three short chips for
   the report's age, the working machines and the distance - which also opens
   directions, so the address row is gone. Below it is everything a player
   may want to check afterwards - the running order, machine reports, who is
   here, open sessions, other games - each one row, shut until asked for, so
   none of it is read on the way to the button.

   The button says Check in & join queue because the two happen together:
   you check in at the machine, and that is what puts you in this game's
   running order (finding C). With no machine working it says so instead,
   and machine reports open by themselves, since marking one working again
   is the way back. */
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
      <TopBar
        title={arcade.short}
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
        <Decision arcade={arcade} stale={stale} onDirections={onDirections} />

        <div className="px-4 pb-5">
          <PrimaryButton onClick={onCheckIn} disabled={unavailable}>
            {unavailable ? 'No working machines' : 'Check in & join queue'}
          </PrimaryButton>
        </div>

        {/* Everything below the button is for checking, not deciding. The
            band says so before a single row is read. */}
        <div className="border-t-8 border-page">
          <QueueSection
            arcade={arcade}
            open={queueOpen}
            onToggle={onToggleQueue}
            mePosition={mePosition}
            onReport={onReport}
          />

          <MachineSection
            key={`${arcade.id}-${arcade.gameId}`}
            arcade={arcade}
            defaultOpen={unavailable}
            onReport={onReportMachine}
          />

          {/* Mutual-only, so for a new player this row never renders. The
              next one does: a session posted for anyone here is a reason to
              come that needs no circle at all. */}
          {friendsHere.length > 0 && (
            <div className="border-b border-line">
              <SectionRow
                icon={
                  <span className="flex -space-x-1.5">
                    {friendsHere.slice(0, 2).map((p) => (
                      <Avatar key={p.handle} handle={p.handle} size={20} className="ring-2 ring-surface" />
                    ))}
                  </span>
                }
                title={friendsHere.map((p) => p.handle).join(', ')}
                value="Here now"
                onClick={onFriends}
              />
            </div>
          )}

          {openCount > 0 && (
            <div className="border-b border-line">
              <SectionRow
                icon={<Calendar size={18} />}
                title="Open sessions"
                value={openCount}
                onClick={onOpenSessions}
              />
            </div>
          )}

          {otherGames.length > 0 && <OtherGames games={otherGames} onPick={onPickGame} />}
        </div>
      </Body>
    </Screen>
  )
}

/* The decision, in the order it is made: which game, how long, and then
   the three things that decide whether to trust the number and make the
   trip. Each chip is an icon and a few characters; its name is there for
   assistive technology. */
function Decision({ arcade, stale, onDirections }) {
  const wait = estimateWaitMin(arcade)
  const working = workingCabinetsOf(arcade)
  const machineTone = working === 0 ? 'live' : working < arcade.cabinets ? 'stale' : 'default'
  const km = arcade.distanceKm.toFixed(1)

  return (
    <section aria-label="Current wait" className="px-4 pb-4 pt-4">
      <span
        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold text-ink"
        style={{ backgroundColor: gameTint(arcade.gameColor, 12) }}
      >
        <GameDot color={arcade.gameColor} />
        {arcade.game}
      </span>

      <p className="mt-4 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-muted">
        Estimated wait
        <Info>
          Queue &divide; working machines. Solo about {SOLO_TURN_MIN} min, pair
          about {PAIR_TURN_MIN}.
        </Info>
      </p>
      {wait === null ? (
        <p className="mt-1 font-display text-4xl font-bold leading-tight text-live">
          Unavailable
        </p>
      ) : (
        <p className="mt-1 font-display leading-none text-ink">
          <span className="text-6xl font-bold tabular-nums tracking-tight">
            {stale ? '~' : ''}
            {wait}
          </span>
          <span className="ml-1.5 text-2xl font-semibold text-ink-muted">min</span>
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        <Stat pill tone={stale ? 'stale' : 'fresh'} label="Report" icon={<Refresh size={13} />}>
          {stale ? `Stale · ${ageShort(arcade)}` : `Updated ${ageShort(arcade)}`}
        </Stat>
        <Stat pill tone={machineTone} label="Machines" icon={<Cabinet size={14} />}>
          {workingLabel(arcade)}
        </Stat>
        {/* The phone's own maps app has the address and the route; this
            only says how far, and hands off. */}
        <button
          type="button"
          onClick={onDirections}
          aria-label={`Directions, ${km} km away`}
          className="relative inline-flex items-center gap-1 rounded-full bg-sunken px-2.5 py-1 text-xs font-medium tabular-nums text-ink transition-colors duration-150 before:absolute before:inset-x-0 before:-inset-y-2 before:content-[''] hover:bg-line"
        >
          <Pin size={13} />
          {km} km
          <Chevron size={12} />
        </button>
      </div>
    </section>
  )
}

/* One secondary row: an icon, a short name, the one value worth seeing
   shut, and a chevron that says whether it opens here or goes somewhere.
   `open` is null for a link, true or false for a section. */
function SectionRow({ icon, title, value, valueTone = 'text-ink-muted', open = null, controls, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open === null ? undefined : open}
      aria-controls={open === null ? undefined : controls}
      className="flex min-h-[52px] w-full items-center gap-3 px-4 py-2.5 text-left transition-colors duration-150 hover:bg-sunken"
    >
      <span className="flex w-6 flex-none justify-center text-ink-muted">{icon}</span>
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{title}</span>
      {value !== undefined && value !== null && (
        <span className={`flex-none text-sm tabular-nums ${valueTone}`}>{value}</span>
      )}
      <span
        className={`flex-none text-ink-subtle transition-transform duration-200 ease-soft ${
          open === null ? '' : open ? '-rotate-90' : 'rotate-90'
        }`}
      >
        <Chevron size={16} />
      </span>
    </button>
  )
}

/* The running order. Shut, the count; open, who is in it - the parties
   that checked in through the app by name and the rest as guests, which is
   the honest split - and the correction for when the count is wrong, where
   the wrong number is actually visible. */
function QueueSection({ arcade, open, onToggle, mePosition, onReport }) {
  const id = useId()
  const rows = queueRoster(arcade, { mePosition })
  const known = rosterKnownCount(arcade, mePosition)
  const pairs = pairsOf(arcade)

  return (
    <div className="border-b border-line">
      <SectionRow
        icon={<Users size={18} />}
        title="Queue"
        value={partiesLabel(arcade.queue)}
        open={Boolean(open)}
        controls={id}
        onClick={onToggle}
      />

      {open && (
        <div id={id} className="anim-row pb-2">
          <p className="px-4 pb-2 pl-[52px] text-xs tabular-nums text-ink-muted">
            {pairs} {pairs === 1 ? 'pair' : 'pairs'} &middot; {arcade.solo} solo &middot;{' '}
            {playersLabel(peopleOf(arcade))}
          </p>
          <ol className="border-t border-line">
            {rows.map((r) => (
              <li
                key={r.position}
                className={`flex items-center gap-3 border-b border-line px-4 py-2 ${
                  r.you ? 'bg-brand-50' : ''
                }`}
              >
                <span className="w-6 text-center text-xs tabular-nums text-ink-subtle">
                  {r.position}
                </span>
                <span
                  className={`min-w-0 flex-1 truncate text-sm ${
                    r.app || r.you ? 'font-semibold text-ink' : 'text-ink-muted'
                  }`}
                >
                  {r.you
                    ? 'You'
                    : r.app
                      ? `${r.handle}${r.plus ? ` +${r.plus}` : ''}`
                      : `+${(r.plus ?? 0) + 1} guest${r.plus ? 's' : ''}`}
                </span>
                <span
                  className={`text-xs ${r.state === 'Playing now' ? 'text-fresh' : 'text-ink-muted'}`}
                >
                  {r.state}
                </span>
              </li>
            ))}
          </ol>

          <div className="flex items-center gap-2 px-4 pt-2">
            <p className="flex flex-1 items-center gap-1.5 text-xs tabular-nums text-ink-muted">
              {known}/{arcade.queue} via the app
              <Info>The rest come from count reports and show as guests.</Info>
            </p>
            <button
              type="button"
              onClick={onReport}
              className="min-h-11 flex-none rounded-xl border border-line-strong px-3 text-xs font-semibold text-ink transition-colors duration-150 hover:bg-sunken"
            >
              Update count
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/* Machine reports. The working count is already a chip above the button;
   this is the "one to two comments" behind it, each with its age, and the
   way to add one. Anonymous, one tap. */
const NOTE_DOT = { out: 'bg-live', [WORKING]: 'bg-fresh' }

function MachineSection({ arcade, defaultOpen, onReport }) {
  const id = useId()
  const [open, setOpen] = useState(defaultOpen)
  const notes = conditionNotes(arcade)
  const problems = openIssues(arcade).length

  return (
    <div className="border-b border-line">
      <SectionRow
        icon={<Cabinet size={18} />}
        title="Machine reports"
        value={problems > 0 ? `${problems} ${problems === 1 ? 'issue' : 'issues'}` : 'No issues'}
        valueTone={problems > 0 ? 'font-medium text-stale' : 'text-ink-muted'}
        open={open}
        controls={id}
        onClick={() => setOpen((o) => !o)}
      />

      {open && (
        <div id={id} className="anim-row px-4 pb-3 pl-[52px]">
          {notes.length > 0 && (
            <ul className="space-y-2">
              {notes.map((issue) => (
                <li key={issue.id} className="flex items-start gap-2">
                  <span
                    className={`mt-1.5 h-2 w-2 flex-none rounded-full ${NOTE_DOT[issue.type] ?? 'bg-stale'}`}
                  />
                  <span className="min-w-0 flex-1 text-sm text-ink">
                    {noteTitle(issue)}
                    {issue.note && (
                      <span className="block text-xs text-ink-muted">&ldquo;{issue.note}&rdquo;</span>
                    )}
                  </span>
                  <span className="flex-none text-xs tabular-nums text-ink-subtle">
                    {ageLabel(issue.minsAgo)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            onClick={onReport}
            className={`min-h-11 rounded-xl border border-line-strong px-3 text-xs font-semibold text-ink transition-colors duration-150 hover:bg-sunken ${
              notes.length > 0 ? 'mt-3' : ''
            }`}
          >
            Report an issue
          </button>
        </div>
      )}
    </div>
  )
}

/* Other games at this venue: one row until asked for, then each game's
   wait, so switching game here is one tap. */
function OtherGames({ games, onPick }) {
  const id = useId()
  const [open, setOpen] = useState(false)

  return (
    <div className="border-b border-line">
      <SectionRow
        icon={<Bars size={18} />}
        title="Other games here"
        value={games.length}
        open={open}
        controls={id}
        onClick={() => setOpen((o) => !o)}
      />

      {open && (
        <ul id={id} className="anim-row pb-1">
          {games.map((g) => {
            const wait = estimateWaitMin(g)
            return (
              <li key={g.gameId}>
                <button
                  type="button"
                  onClick={() => onPick(g.gameId)}
                  className="flex min-h-11 w-full items-center gap-3 px-4 text-left transition-colors duration-150 hover:bg-sunken"
                >
                  <span className="flex w-6 flex-none justify-center">
                    <GameDot color={g.gameColor} className="h-2.5 w-2.5" />
                  </span>
                  <span className="flex-1 text-sm text-ink">{g.game}</span>
                  {isStale(g) && wait !== null && <StaleBadge />}
                  <span
                    className={`w-20 text-right text-sm tabular-nums ${wait === null ? 'text-live' : 'text-ink'}`}
                  >
                    {wait === null ? 'Unavailable' : `${isStale(g) ? '~' : ''}${wait} min`}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
