import { useState } from 'react'
import {
  Avatar,
  BestBadge,
  Body,
  GameDot,
  Info,
  Screen,
  StaleBadge,
  Stat,
  TopBar,
  ViewSwitch,
  gameTint,
} from '../components/ui.jsx'
import {
  Alert,
  Cabinet,
  Chevron,
  Pin,
  Refresh,
  Search,
  Star,
  Users,
} from '../components/Icons.jsx'
import { GAMES, gameLabel } from '../data.js'
import {
  ageShort,
  bestArcadeId,
  estimateWaitMin,
  isStale,
  isUnavailable,
  sortArcades,
  workingCabinetsOf,
  workingLabel,
  PAIR_TURN_MIN,
  SOLO_TURN_MIN,
  STALE_AFTER_MIN,
} from '../lib/queue.js'
import { WORKING, openIssues } from '../lib/machines.js'
import { presentAt } from '../lib/social.js'

/* Arcades is a decision screen. It brings the quickest option, travel cost
   and familiar players into one place, then lets the user compare the rest.

   The field study decided what a venue has to show before anyone opens it
   (findings A, B, E): the wait as the one big number, then how old the
   report is, how many machines are working out of how many, the distance,
   and any machine problem. Who you know there is last and smallest - it
   matters to some people, but queue, distance and machines are what the
   choice usually turns on.

   The Week 9 critique kept all of that and asked for less reading to get
   it. Each fact is now an icon and a few characters in the same order on
   every card - age, machines, distance, issues, people - so the eye learns
   the row once and then only reads the numbers. The two views are named for
   the job, Best now and Compare all, instead of Discover, which said
   nothing about what was behind it. And the distances no longer name the
   fixed origin the prototype measures from: to a player they are simply
   how far away the arcade is. */
export default function Arcades({
  arcades,
  /* Every venue, whatever game it runs, for search. */
  allArcades = [],
  game,
  onGame,
  view,
  onView,
  onOpen,
  following,
  favourites = [],
}) {
  const [searching, setSearching] = useState(false)
  const [query, setQuery] = useState('')
  const q = query.trim()
  const ctx = { onOpen, following, favourites }
  /* Venues that do not run this game, named once at the foot of the list
     rather than as a banner over it. */
  const without = allArcades.filter((a) => !arcades.some((row) => row.id === a.id))

  return (
    <Screen>
      <TopBar
        title="Arcades"
        right={
          <span className="flex items-center gap-0.5">
            <button
              type="button"
              aria-label={searching ? 'Close search' : 'Search arcades'}
              aria-expanded={searching}
              onClick={() => {
                setSearching((s) => !s)
                setQuery('')
              }}
              className={`flex h-11 w-11 items-center justify-center rounded-full transition-colors duration-150 hover:bg-sunken ${
                searching ? 'text-brand-600' : 'text-ink-muted'
              }`}
            >
              <Search size={20} />
            </button>
            <Info>
              Wait = queue &divide; working machines. Solo about {SOLO_TURN_MIN} min,
              pair about {PAIR_TURN_MIN}. Stale after {STALE_AFTER_MIN} min.
            </Info>
          </span>
        }
      />

      {searching && (
        <div className="border-b border-line bg-surface px-4 py-2">
          <label htmlFor="arcade-search" className="sr-only">
            Search arcades by name or suburb
          </label>
          <input
            id="arcade-search"
            type="search"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Arcade or suburb"
            className="min-h-11 w-full rounded-xl border border-line-strong bg-surface px-3 text-sm text-ink outline-none placeholder:text-ink-subtle focus:border-brand-500"
          />
        </div>
      )}

      <GamePicker game={game} onGame={onGame} />

      <div className="border-b border-line bg-surface px-4 py-2">
        <ViewSwitch
          label="View"
          value={view}
          onChange={onView}
          options={[
            { id: 'list', label: 'Best now' },
            { id: 'compare', label: 'Compare all' },
          ]}
        />
      </div>

      {q ? (
        <SearchResults query={q} arcades={arcades} allArcades={allArcades} game={game} {...ctx} />
      ) : view === 'list' ? (
        <BestNowView arcades={arcades} game={game} without={without} {...ctx} />
      ) : (
        <CompareView arcades={arcades} game={game} without={without} {...ctx} />
      )}
    </Screen>
  )
}

/* The game is the filter everything else answers to, so the selected chip
   is the one place its hue fills more than a dot. */
function GamePicker({ game, onGame }) {
  return (
    <div className="border-b border-line bg-surface py-2">
      <div className="no-scrollbar flex snap-x gap-2 overflow-x-auto px-4">
        {GAMES.map((item) => {
          const active = item.id === game
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={active}
              onClick={() => onGame(item.id)}
              style={
                active
                  ? { borderColor: item.color, backgroundColor: gameTint(item.color, 10) }
                  : undefined
              }
              className={`flex min-h-11 flex-none snap-start items-center gap-2 rounded-xl border px-3 py-1.5 text-left transition-all duration-150 active:scale-95 ${
                active ? 'shadow-sm' : 'border-line bg-surface hover:border-line-strong hover:bg-sunken'
              }`}
            >
              <span
                className="flex h-7 w-7 items-center justify-center rounded-lg text-[10px] font-bold text-white shadow-sm"
                style={{ backgroundColor: item.color }}
                aria-hidden="true"
              >
                {item.label.slice(0, 2).toUpperCase()}
              </span>
              <span
                className={`whitespace-nowrap text-xs font-semibold ${
                  active ? 'text-ink' : 'text-ink-muted'
                }`}
              >
                {item.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* The facts behind a wait, in one fixed order so every card reads the same
   way: how old, how many machines, how far, any reported problem, and who
   you know there. Out of order already shows in the machine count, so only
   the other reports count as issues here. */
function VenueStats({ arcade, friends = [], onBrand = false, className = '' }) {
  const working = workingCabinetsOf(arcade)
  const warnings = openIssues(arcade).filter((i) => i.type !== 'out' && i.type !== WORKING).length
  const tone = (semantic) => (onBrand ? 'onBrand' : semantic)
  const machineTone = working === 0 ? 'live' : working < arcade.cabinets ? 'stale' : 'default'

  return (
    <span className={`flex flex-wrap items-center gap-x-3 gap-y-1 ${className}`}>
      <Stat
        label="Updated"
        tone={tone(isStale(arcade) ? 'stale' : 'default')}
        icon={<Refresh size={12} />}
      >
        {ageShort(arcade)}
      </Stat>
      <Stat label="Machines" tone={tone(machineTone)} icon={<Cabinet size={13} />}>
        {workingLabel(arcade)}
      </Stat>
      <Stat label="Distance" tone={tone('default')} icon={<Pin size={12} />}>
        {arcade.distanceKm.toFixed(1)} km
      </Stat>
      {warnings > 0 && (
        <Stat label="Reported" tone={tone('stale')} icon={<Alert size={12} />}>
          {warnings} {warnings === 1 ? 'issue' : 'issues'}
        </Stat>
      )}
      {friends.length > 0 && (
        <Stat label="People you follow" tone={tone('default')} icon={<Users size={13} />}>
          {friends.length} here
        </Stat>
      )}
    </span>
  )
}

/* Arcades that do not run this game, said once, quietly, at the end. */
function Without({ without, game }) {
  if (without.length === 0) return null
  return (
    <p className="mt-3 px-1 text-center text-xs text-ink-subtle">
      No {gameLabel(game)} at {without.map((a) => a.short).join(', ')}
    </p>
  )
}

function waitText(arcade) {
  if (isUnavailable(arcade)) return 'unavailable'
  return `${isStale(arcade) ? '~' : ''}${estimateWaitMin(arcade)} min`
}

function BestNowView({ arcades, game, without, onOpen, following, favourites }) {
  if (arcades.length === 0) {
    return (
      <Body className="flex items-center justify-center p-6 text-center">
        <div>
          <p className="font-display text-base font-semibold text-ink">
            No {gameLabel(game)} nearby
          </p>
          <p className="mt-1 text-xs text-ink-muted">Try another game.</p>
        </div>
      </Body>
    )
  }

  const bestId = bestArcadeId(arcades)
  const best = arcades.find((a) => a.id === bestId) ?? null
  /* The hero is the fastest, so the rest read as next fastest across;
     stale reports and games with nothing working sink to the end. */
  const others = sortArcades(
    arcades.filter((a) => a.id !== bestId),
    'wait'
  )
  const favs = sortArcades(
    arcades.filter((a) => favourites.includes(a.id)),
    'wait'
  )

  return (
    <Body className="bg-page/70">
      <div className="p-3">
        {/* Favourites are easier to reach, never ranked: the hero is still
            whichever venue is actually fastest. */}
        {favs.length > 0 && (
          <section aria-label="Favourites" className="mb-3">
            <div className="no-scrollbar -mx-3 flex gap-2 overflow-x-auto px-3">
              {favs.map((arcade) => (
                <button
                  key={arcade.id}
                  type="button"
                  onClick={() => onOpen(arcade.id)}
                  className="flex min-h-11 flex-none items-center gap-1.5 rounded-full border border-line bg-surface px-3 text-xs shadow-sm transition-colors duration-150 hover:border-brand-200"
                >
                  <Star size={14} filled className="text-brand-600" />
                  <span className="font-semibold text-ink">{arcade.short}</span>
                  <span
                    className={`tabular-nums ${isUnavailable(arcade) ? 'text-live' : 'text-ink-muted'}`}
                  >
                    {waitText(arcade)}
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}

        {best ? (
          <BestVenue arcade={best} onOpen={onOpen} following={following} />
        ) : (
          <NoBest />
        )}

        {others.length > 0 && (
          <section className="mt-4" aria-labelledby="other-options">
            <h2 id="other-options" className="mb-2 px-0.5 font-display text-sm font-semibold text-ink">
              {best ? 'Next fastest' : 'All arcades'}
            </h2>

            <div className="no-scrollbar -mx-3 flex snap-x gap-2.5 overflow-x-auto px-3 pb-1">
              {others.map((arcade) => (
                <VenueCard
                  key={arcade.id}
                  arcade={arcade}
                  onOpen={onOpen}
                  following={following}
                  favourite={favourites.includes(arcade.id)}
                />
              ))}
            </div>
          </section>
        )}

        <Without without={without} game={game} />
      </div>
    </Body>
  )
}

/* Nothing qualifies: every report is stale, or the one current venue has no
   working machine. Crowning one of them anyway would put "Fastest now" on
   a number nobody can vouch for. */
function NoBest() {
  return (
    <div role="status" className="flex items-start gap-3 rounded-3xl border border-line bg-surface p-4 shadow-sm">
      <span className="mt-0.5 flex-none text-stale">
        <Alert size={20} />
      </span>
      <div>
        <p className="font-display text-base font-semibold text-ink">No confirmed fastest</p>
        <p className="mt-0.5 text-xs text-ink-muted">Reports are stale or machines are down.</p>
      </div>
    </div>
  )
}

function BestVenue({ arcade, onOpen, following }) {
  const wait = estimateWaitMin(arcade)
  const friends = presentAt(arcade.id, following)

  return (
    <button
      type="button"
      onClick={() => onOpen(arcade.id)}
      className="group relative w-full overflow-hidden rounded-3xl bg-gradient-to-br from-brand-700 via-brand-600 to-[#7c3aed] p-4 text-left text-white shadow-xl shadow-brand-600/20 transition-transform duration-200 active:scale-[0.98]"
    >
      <span className="absolute -right-10 -top-12 h-36 w-36 rounded-full border-[22px] border-white/10" />
      <span className="absolute -bottom-14 left-10 h-28 w-28 rounded-full border-[18px] border-white/5" />

      <span className="relative flex items-start justify-between gap-3">
        <span className="min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em]">
            <span className="relative flex h-1.5 w-1.5">
              <span className="anim-ring absolute inline-flex h-full w-full rounded-full bg-white" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
            </span>
            Fastest now
          </span>
          <span className="mt-3 block max-w-[220px] font-display text-xl font-bold leading-tight">
            {arcade.name}
          </span>
        </span>

        {/* The one accent the game's hue gets on the hero: the ring round
            the number it is about. */}
        <span
          className="flex h-20 w-20 flex-none flex-col items-center justify-center rounded-full border-2 bg-white/10 shadow-inner backdrop-blur"
          style={{ borderColor: `color-mix(in srgb, ${arcade.gameColor} 70%, white)` }}
        >
          <span className="font-display text-3xl font-bold leading-none tabular-nums">{wait}</span>
          <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/80">
            min wait
          </span>
        </span>
      </span>

      <VenueStats arcade={arcade} onBrand className="relative mt-3" />

      <span className="relative mt-3 flex items-center justify-between gap-2">
        {friends.length > 0 ? (
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="flex -space-x-1">
              {friends.slice(0, 3).map((friend) => (
                <Avatar
                  key={friend.handle}
                  handle={friend.handle}
                  size={22}
                  className="ring-2 ring-brand-600"
                />
              ))}
            </span>
            <span className="truncate text-xs text-white/85">
              {friends.map((friend) => friend.handle).join(', ')}
            </span>
          </span>
        ) : (
          <span />
        )}
        <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-white/15" aria-hidden="true">
          <Chevron size={16} />
        </span>
      </span>
    </button>
  )
}

function VenueCard({ arcade, onOpen, following, favourite }) {
  const stale = isStale(arcade)
  const unavailable = isUnavailable(arcade)
  const friends = presentAt(arcade.id, following)

  return (
    <button
      type="button"
      onClick={() => onOpen(arcade.id)}
      className="w-[200px] flex-none snap-start rounded-2xl border border-line bg-surface p-3 text-left shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md active:translate-y-0"
    >
      <span className="flex items-center gap-2">
        <GameDot color={arcade.gameColor} className="h-2.5 w-2.5" />
        <span className="min-w-0 flex-1 truncate font-display text-sm font-semibold text-ink">
          {arcade.short}
        </span>
        {favourite && (
          <span className="flex-none text-brand-600">
            <Star size={14} filled />
            <span className="sr-only">Favourite</span>
          </span>
        )}
        {stale && !unavailable && <StaleBadge />}
      </span>

      <span className="mt-2 block">
        <WaitNumber arcade={arcade} />
      </span>

      <VenueStats arcade={arcade} friends={friends} className="mt-2" />
    </button>
  )
}

/* The wait, or the reason there is none. */
function WaitNumber({ arcade, align = 'left' }) {
  const right = align === 'right' ? 'text-right' : ''
  if (isUnavailable(arcade)) {
    return (
      <span className={`block ${right}`}>
        <span className="font-display text-xl font-bold leading-none text-live">Unavailable</span>
      </span>
    )
  }
  return (
    <span className={`block whitespace-nowrap leading-none ${right}`}>
      <span className="font-display text-3xl font-bold tabular-nums text-ink">
        {isStale(arcade) ? '~' : ''}
        {estimateWaitMin(arcade)}
      </span>
      <span className="ml-1 text-xs font-semibold text-ink-muted">min</span>
    </span>
  )
}

function CompareView({ arcades, game, without, onOpen, following, favourites }) {
  const bestId = bestArcadeId(arcades)
  const rows = sortArcades(arcades, 'wait')

  return (
    <Body className="bg-page/70 p-3">
      <div className="space-y-2">
        {rows.map((arcade) => (
          <CompareCard
            key={arcade.id}
            arcade={arcade}
            best={arcade.id === bestId}
            onOpen={onOpen}
            following={following}
            favourite={favourites.includes(arcade.id)}
          />
        ))}
      </div>
      <Without without={without} game={game} />
    </Body>
  )
}

/* Venue search: name, short name or suburb, over the venues the app
   covers. A search for anywhere else suggests the ones it has rather than
   pretending the place has no arcades. Results keep the real ranking - Best
   stays on whichever venue is fastest overall. */
function SearchResults({ query, arcades, allArcades, game, onOpen, following, favourites }) {
  const needle = query.toLowerCase()
  const matches = (a) =>
    [a.name, a.short, a.suburb].some((field) => field?.toLowerCase().includes(needle))
  const bestId = bestArcadeId(arcades)
  const rows = sortArcades(arcades.filter(matches), 'wait')
  const withoutGame = allArcades.filter(
    (a) => matches(a) && !arcades.some((row) => row.id === a.id)
  )

  return (
    <Body className="bg-page/70 p-3">
      {rows.length > 0 ? (
        <div className="space-y-2">
          {rows.map((arcade) => (
            <CompareCard
              key={arcade.id}
              arcade={arcade}
              best={arcade.id === bestId}
              onOpen={onOpen}
              following={following}
              favourite={favourites.includes(arcade.id)}
            />
          ))}
        </div>
      ) : (
        <div role="status" className="rounded-2xl border border-line bg-surface p-4 text-center shadow-sm">
          <p className="font-display text-sm font-semibold text-ink">
            No {gameLabel(game)} arcade matches &ldquo;{query}&rdquo;
          </p>
          <p className="mt-1 text-xs text-ink-muted">
            Try {allArcades.map((a) => a.short).join(', ')}
          </p>
        </div>
      )}
      <Without without={withoutGame} game={game} />
    </Body>
  )
}

/* Enough to choose without opening anything: the wait on the right, the
   facts behind it on one wrapping row of chips. */
function CompareCard({ arcade, best, onOpen, following, favourite }) {
  const stale = isStale(arcade)
  const unavailable = isUnavailable(arcade)
  const friends = presentAt(arcade.id, following)

  return (
    <button
      type="button"
      onClick={() => onOpen(arcade.id)}
      className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-all duration-150 hover:border-brand-200 active:scale-[0.99] ${
        best ? 'border-brand-200 bg-brand-50' : 'border-line bg-surface'
      }`}
    >
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <GameDot color={arcade.gameColor} className="h-2.5 w-2.5" />
          <span className="min-w-0 truncate font-display text-sm font-semibold text-ink">
            {arcade.short}
          </span>
          {favourite && (
            <span className="flex-none text-brand-600">
              <Star size={14} filled />
              <span className="sr-only">Favourite</span>
            </span>
          )}
          {best && <BestBadge />}
          {stale && !unavailable && <StaleBadge />}
        </span>
        <VenueStats arcade={arcade} friends={friends} className="mt-1.5" />
      </span>

      <WaitNumber arcade={arcade} align="right" />
      <span className="text-ink-subtle">
        <Chevron size={16} />
      </span>
    </button>
  )
}
