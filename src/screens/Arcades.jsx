import { useState } from 'react'
import {
  Avatar,
  BestBadge,
  Body,
  GameDot,
  Info,
  Screen,
  StaleBadge,
  TopBar,
} from '../components/ui.jsx'
import { Chevron, Clock, Search, Star } from '../components/Icons.jsx'
import { GAMES, gameLabel } from '../data.js'
import {
  bestArcadeId,
  estimateWaitMin,
  freshnessLabel,
  isStale,
  isUnavailable,
  machinesLabel,
  sortArcades,
  sourceLabel,
  PAIR_TURN_MIN,
  SOLO_TURN_MIN,
  STALE_AFTER_MIN,
} from '../lib/queue.js'
import { issueHeadline } from '../lib/machines.js'
import { presentAt } from '../lib/social.js'

/* Arcades is a decision screen. It brings the quickest option, travel cost
   and familiar players into one place, then lets the user compare the rest.

   The field study decided what a venue has to show before anyone opens it
   (findings A, B, E). The wait stays the one big number. Beside it: the
   distance, from an origin the screen names; how many machines are working
   out of how many there are, because a queue means different things over
   five cabinets or two; how old the report is and where it came from,
   always, including when friends are there; and any machine problem. Who
   you know there is last and smallest - it matters to some people, but
   queue, distance and machines are what the choice usually turns on. */
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
  /* Your own place in a queue, if any, so you count among the app
     check-ins. */
  mine = null,
}) {
  const [searching, setSearching] = useState(false)
  const [query, setQuery] = useState('')
  const q = query.trim()
  const ctx = { onOpen, following, favourites, mine }

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
              Queue counts groups, not individual players. A solo turn is
              about {SOLO_TURN_MIN} minutes (three songs) and a pair about{' '}
              {PAIR_TURN_MIN}, then the total is shared across the working
              machines. A machine reported out of order does not count.
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
            placeholder="Arcade name or suburb"
            className="min-h-11 w-full rounded-xl border border-line-strong bg-surface px-3 text-sm text-ink outline-none placeholder:text-ink-subtle focus:border-brand-500"
          />
        </div>
      )}

      <GamePicker game={game} onGame={onGame} />

      <div className="flex items-center gap-2 border-b border-line bg-surface px-4 py-2">
        <div className="flex flex-none rounded-full bg-sunken p-0.5">
          <ModeButton on={view === 'list'} onClick={() => onView('list')}>
            Discover
          </ModeButton>
          <ModeButton on={view === 'compare'} onClick={() => onView('compare')}>
            Compare
          </ModeButton>
        </div>
        {/* Said once for every distance on the screen. */}
        <p className="ml-auto text-right text-[11px] leading-tight text-ink-subtle">
          Distances from UTS Broadway (demo)
        </p>
      </div>

      {arcades.length < allArcades.length && (
        <p className="border-b border-line bg-stale-bg px-4 py-2 text-xs text-ink-muted">
          {arcades.length} of {allArcades.length} arcades have {gameLabel(game)}.
        </p>
      )}

      {q ? (
        <SearchResults query={q} arcades={arcades} allArcades={allArcades} game={game} {...ctx} />
      ) : view === 'list' ? (
        <DiscoverView arcades={arcades} game={game} {...ctx} />
      ) : (
        <CompareView arcades={arcades} {...ctx} />
      )}
    </Screen>
  )
}

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
              className={`flex flex-none snap-start items-center gap-2 rounded-xl border px-3 py-2 text-left transition-all duration-150 active:scale-95 ${
                active
                  ? 'border-brand-200 bg-brand-50 shadow-sm'
                  : 'border-line bg-surface hover:border-line-strong hover:bg-sunken'
              }`}
            >
              <span
                className="flex h-7 w-7 items-center justify-center rounded-lg text-[10px] font-bold text-white shadow-sm"
                style={{ backgroundColor: item.color }}
              >
                {item.label.slice(0, 2).toUpperCase()}
              </span>
              <span
                className={`whitespace-nowrap text-xs font-semibold ${
                  active ? 'text-brand-700' : 'text-ink-muted'
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

function ModeButton({ on, children, onClick }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-150 ${
        on ? 'bg-surface text-ink shadow-sm' : 'text-ink-muted hover:text-ink'
      }`}
    >
      {children}
    </button>
  )
}

/* Where you are in this venue's queue, if you are in it. */
function mePositionAt(arcade, mine) {
  return mine && mine.arcadeId === arcade.id && mine.gameId === arcade.gameId
    ? mine.position
    : null
}

function waitText(arcade) {
  if (isUnavailable(arcade)) return 'unavailable'
  return `${isStale(arcade) ? '~' : ''}${estimateWaitMin(arcade)} min`
}

function DiscoverView({ arcades, game, onOpen, following, favourites, mine }) {
  if (arcades.length === 0) {
    return (
      <Body className="flex items-center justify-center p-6 text-center">
        <div>
          <p className="font-display text-base font-semibold text-ink">No local cabinets yet</p>
          <p className="mt-1 text-xs text-ink-muted">Try another game to see nearby arcades.</p>
        </div>
      </Body>
    )
  }

  const bestId = bestArcadeId(arcades)
  const best = arcades.find((a) => a.id === bestId) ?? null
  /* The hero is the fastest, so the rest read as next fastest downward;
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
          <BestVenue
            arcade={best}
            onOpen={onOpen}
            following={following}
            mePosition={mePositionAt(best, mine)}
          />
        ) : (
          <NoBest game={game} />
        )}

        {others.length > 0 && (
          <section className="mt-4" aria-labelledby="other-options">
            <div className="mb-2 flex items-end justify-between px-0.5">
              <div>
                <h2 id="other-options" className="font-display text-sm font-semibold text-ink">
                  {best ? 'Other options' : 'All options'}
                </h2>
                <p className="text-[11px] text-ink-muted">
                  Swipe across, then open one to check the full queue.
                </p>
              </div>
            </div>

            <div className="no-scrollbar -mx-3 flex snap-x gap-2.5 overflow-x-auto px-3 pb-1">
              {others.map((arcade) => (
                <VenueCard
                  key={arcade.id}
                  arcade={arcade}
                  onOpen={onOpen}
                  following={following}
                  favourite={favourites.includes(arcade.id)}
                  mePosition={mePositionAt(arcade, mine)}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </Body>
  )
}

/* Nothing qualifies: every report is stale, or the one current venue has no
   working machine. Crowning one of them anyway would put "Fastest now" on
   a number nobody can vouch for. */
function NoBest({ game }) {
  return (
    <div role="status" className="rounded-3xl border border-line bg-surface p-4 shadow-sm">
      <p className="font-display text-base font-semibold text-ink">
        No confirmed fastest option right now
      </p>
      <p className="mt-1 text-xs leading-relaxed text-ink-muted">
        Every {gameLabel(game)} report here is older than {STALE_AFTER_MIN} minutes
        or has no working machine. The venues are still listed below; check one
        before you travel.
      </p>
    </div>
  )
}

function BestVenue({ arcade, onOpen, following, mePosition }) {
  const wait = estimateWaitMin(arcade)
  const friends = presentAt(arcade.id, following)
  const issue = issueHeadline(arcade)

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
          <span className="mt-1 block text-xs text-white/80">
            {arcade.game} &middot;{' '}
            <span className="tabular-nums">
              {arcade.distanceKm.toFixed(1)} km &middot; {machinesLabel(arcade)}
            </span>
          </span>
          {issue && (
            <span className="mt-1 flex items-center gap-1.5 text-[11px] text-white/85">
              <span className="h-1.5 w-1.5 flex-none rounded-full bg-amber-300" />
              <span className="truncate">{issue}</span>
            </span>
          )}
          {friends.length > 0 && (
            <span className="mt-1.5 flex items-center gap-1.5">
              <span className="flex -space-x-1">
                {friends.slice(0, 3).map((friend) => (
                  <Avatar
                    key={friend.handle}
                    handle={friend.handle}
                    size={20}
                    className="ring-2 ring-brand-600"
                  />
                ))}
              </span>
              <span className="truncate text-[11px] text-white/75">
                {friends.map((friend) => friend.handle).join(', ')} here now
              </span>
            </span>
          )}
        </span>

        <span className="flex h-20 w-20 flex-none flex-col items-center justify-center rounded-full border border-white/20 bg-white/10 shadow-inner backdrop-blur">
          <span className="font-display text-2xl font-bold tabular-nums">{wait}</span>
          <span className="text-[10px] font-semibold uppercase tracking-wide text-white/75">
            min wait
          </span>
        </span>
      </span>

      {/* The report's age stays on the hero whoever is there; it used to give
          way to friends' names, which hid it exactly when it mattered. */}
      <span className="relative mt-4 flex items-center justify-between rounded-2xl bg-white/10 px-3 py-2.5">
        <span className="flex min-w-0 items-center gap-2">
          <Clock size={16} />
          <span className="truncate text-xs font-medium text-white/90">
            {freshnessLabel(arcade)} &middot; {sourceLabel(arcade, mePosition)}
          </span>
        </span>
        <span className="ml-2 inline-flex flex-none items-center gap-1 text-xs font-bold">
          Open <Chevron size={14} />
        </span>
      </span>
    </button>
  )
}

function VenueCard({ arcade, onOpen, following, favourite, mePosition }) {
  const stale = isStale(arcade)
  const unavailable = isUnavailable(arcade)
  const friends = presentAt(arcade.id, following)
  const issue = issueHeadline(arcade)

  return (
    <button
      type="button"
      onClick={() => onOpen(arcade.id)}
      className="w-[216px] flex-none snap-start rounded-2xl border border-line bg-surface p-3 text-left shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md active:translate-y-0"
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

      <span className="mt-2 flex items-end justify-between gap-2">
        <span className="min-w-0 text-[11px] text-ink-muted">
          <span className="block tabular-nums">{arcade.distanceKm.toFixed(1)} km</span>
          <span className={`block tabular-nums ${unavailable ? 'text-live' : ''}`}>
            {machinesLabel(arcade)}
          </span>
        </span>
        <WaitNumber arcade={arcade} />
      </span>

      <span className="mt-1.5 block text-[11px] leading-snug tabular-nums text-ink-muted">
        {freshnessLabel(arcade)} &middot; {sourceLabel(arcade, mePosition)}
      </span>

      {(issue || unavailable) && (
        <IssueLine unavailable={unavailable}>{unavailable ? 'No working machines' : issue}</IssueLine>
      )}

      {friends.length > 0 && (
        <span className="mt-1.5 flex items-center gap-1.5">
          <span className="flex -space-x-1.5">
            {friends.slice(0, 3).map((friend) => (
              <Avatar key={friend.handle} handle={friend.handle} size={16} />
            ))}
          </span>
          <span className="text-[11px] text-ink-muted">{friends.length} here</span>
        </span>
      )}
    </button>
  )
}

/* The wait, or the reason there is none. */
function WaitNumber({ arcade }) {
  if (isUnavailable(arcade)) {
    return (
      <span className="flex-none text-right">
        <span className="block font-display text-2xl font-bold leading-none text-live">&mdash;</span>
        <span className="whitespace-nowrap text-[9px] font-semibold uppercase tracking-wide text-live">
          Unavailable
        </span>
      </span>
    )
  }
  return (
    <span className="flex-none text-right">
      <span className="block font-display text-2xl font-bold leading-none tabular-nums text-ink">
        {isStale(arcade) ? '~' : ''}
        {estimateWaitMin(arcade)}
      </span>
      <span className="whitespace-nowrap text-[9px] uppercase tracking-wide text-ink-subtle">
        min wait
      </span>
    </span>
  )
}

function IssueLine({ unavailable, children }) {
  return (
    <span
      className={`mt-1 flex items-center gap-1.5 text-[11px] ${
        unavailable ? 'font-semibold text-live' : 'text-stale'
      }`}
    >
      <span
        className={`h-1.5 w-1.5 flex-none rounded-full ${unavailable ? 'bg-live' : 'bg-stale'}`}
      />
      <span className="truncate">{children}</span>
    </span>
  )
}

function CompareView({ arcades, onOpen, following, favourites, mine }) {
  const bestId = bestArcadeId(arcades)
  const rows = sortArcades(arcades, 'wait')

  return (
    <Body className="bg-page/70 p-3">
      <section className="rounded-2xl border border-line bg-surface p-3 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-sm font-semibold text-ink">Time against travel</h2>
            <p className="mt-0.5 text-[11px] leading-snug text-ink-muted">
              A longer trip may still get you playing sooner.
            </p>
          </div>
          <Info>
            More working machines move several groups at once, so a busy
            arcade can still be the quicker choice. Reports older than{' '}
            {STALE_AFTER_MIN} minutes, and games with no working machine, stay
            visible but cannot be the best option, so check one before
            travelling.
          </Info>
        </div>

        <div className="mt-3 space-y-2.5">
          {rows.map((arcade) => (
            <CompareCard
              key={arcade.id}
              arcade={arcade}
              best={arcade.id === bestId}
              onOpen={onOpen}
              following={following}
              favourite={favourites.includes(arcade.id)}
              mePosition={mePositionAt(arcade, mine)}
            />
          ))}
        </div>
      </section>
    </Body>
  )
}

/* Venue search: name, short name or suburb, over the venues the prototype
   actually has. Three venues is all it covers, so a search for anywhere
   else says that rather than pretending the place has no arcades. Results
   keep the real ranking - Best stays on whichever venue is fastest overall. */
function SearchResults({ query, arcades, allArcades, game, onOpen, following, favourites, mine }) {
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
        <div className="space-y-2.5">
          {rows.map((arcade) => (
            <CompareCard
              key={arcade.id}
              arcade={arcade}
              best={arcade.id === bestId}
              onOpen={onOpen}
              following={following}
              favourite={favourites.includes(arcade.id)}
              mePosition={mePositionAt(arcade, mine)}
            />
          ))}
        </div>
      ) : (
        <div role="status" className="rounded-2xl border border-line bg-surface p-4 text-center shadow-sm">
          <p className="font-display text-sm font-semibold text-ink">
            No {gameLabel(game)} arcade matches &ldquo;{query}&rdquo;
          </p>
          <p className="mt-1 text-xs leading-relaxed text-ink-muted">
            This prototype covers three Sydney CBD venues: Timezone Central
            Park, Timezone Haymarket and KOKO Amusement Town Hall.
          </p>
        </div>
      )}
      {withoutGame.length > 0 && (
        <p className="mt-2.5 px-1 text-xs text-ink-muted">
          {withoutGame.map((a) => a.name).join(', ')}{' '}
          {withoutGame.length === 1 ? 'does' : 'do'} not have {gameLabel(game)}.
        </p>
      )}
    </Body>
  )
}

/* Enough to choose without opening anything. The field study reversed the
   earlier call to keep cabinet counts and report ages a level down, on the
   detail screen: people judged a queue by the machines behind it and by
   how old the number was, so both are here, on two short lines. */
function CompareCard({ arcade, best, onOpen, following, favourite, mePosition }) {
  const stale = isStale(arcade)
  const unavailable = isUnavailable(arcade)
  const friends = presentAt(arcade.id, following)
  const issue = issueHeadline(arcade)

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
        <span className="mt-1 block text-[11px] tabular-nums text-ink-muted">
          {arcade.distanceKm.toFixed(1)} km &middot;{' '}
          <span className={unavailable ? 'text-live' : ''}>{machinesLabel(arcade)}</span>
          {friends.length > 0 && (
            <>
              {' · '}
              {friends.length} {friends.length === 1 ? 'friend' : 'friends'} here
            </>
          )}
        </span>
        <span className="block truncate text-[11px] tabular-nums text-ink-muted">
          {freshnessLabel(arcade)} &middot; {sourceLabel(arcade, mePosition)}
        </span>
        {(issue || unavailable) && (
        <IssueLine unavailable={unavailable}>{unavailable ? 'No working machines' : issue}</IssueLine>
      )}
      </span>

      <WaitNumber arcade={arcade} />
      <Chevron size={16} />
    </button>
  )
}
