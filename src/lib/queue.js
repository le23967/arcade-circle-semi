import { gameLabel, gameColor } from '../data.js'

/* ---------------------------------------------------------------------------
   Wait estimation.

   The lo-fi sketch shows Queue, Solo and Wait as three separate columns but
   does not say how they relate. They relate like this:

   `queue` counts PARTIES, not people. Players who came together queue together
   and take one machine between them: "there's two cabinets that you can play
   together, so people like playing together, so they queue together"
   (Wednesday interview). `solo` is how many of those parties are one player.

   A pair holds the machine longer than a solo player, because pairing buys an
   extra song: "if you play as two people, you get like an extra song, so you
   get to play more" (21 Aug, arcade).

   So the wait is total load divided by machines - which is why a venue with a
   longer queue can still be the faster choice.

   The machines are the WORKING ones, not the installed ones. A cabinet that
   is out of order moves nobody, and the field study put machine condition at
   the top of what people want to know before they travel (finding B). With
   nothing working there is no wait to estimate at all, only a venue that is
   not an option for this game right now.

   Turn lengths come from the field study (finding I). Participants put a
   set at fifteen to twenty minutes - three songs solo, four as a pair - and
   the earlier 4 and 6 minute figures made every wait read about a third of
   what people actually stand through.
--------------------------------------------------------------------------- */

export const SOLO_TURN_MIN = 15 // one credit, single player: three songs
export const PAIR_TURN_MIN = 20 // pair: one credit plus the bonus song
export const STALE_AFTER_MIN = 15 // past this, treat a report as unreliable

/* Flatten a venue plus one of its game queues into the single object every
   screen already consumes. Returns null when the venue does not run the game,
   which is what filters the lists. */
export function venueGame(arcade, gameId) {
  const g = arcade.games[gameId]
  if (!g) return null
  return {
    id: arcade.id,
    name: arcade.name,
    short: arcade.short,
    suburb: arcade.suburb,
    address: arcade.address,
    distanceKm: arcade.distanceKm,
    map: arcade.map,
    gameId,
    game: gameLabel(gameId),
    gameColor: gameColor(gameId),
    ...g,
  }
}

export function venuesForGame(arcades, gameId) {
  return arcades.map((a) => venueGame(a, gameId)).filter(Boolean)
}

/* Other games the same venue runs, for the detail screen. */
export function otherGamesAt(arcade, gameId) {
  return Object.keys(arcade.games)
    .filter((id) => id !== gameId)
    .map((id) => venueGame(arcade, id))
}

export function pairsOf(a) {
  return Math.max(0, a.queue - a.solo)
}

/* `queue` is parties, so it is not the number of people standing there. A
   screen that shows the raw number has to say which of the two it means:
   "11 waiting" reads as eleven people when it is eleven parties, nine of them
   pairs - twenty players. Both numbers are useful, neither is optional. */
export function peopleOf(a) {
  return pairsOf(a) * 2 + a.solo
}

/* Joining adds exactly one party, and leaving takes back exactly that party.

   The party type is the joiner's own answer, remembered on their session,
   never read back off the queue: a queue that has changed since cannot say
   whether the person leaving came alone. Solo adds a party and a solo
   player; a pair adds a party and leaves the solo count alone, because
   pairs are the parties that are not solo. */
export function withParty(counts, party) {
  return {
    queue: counts.queue + 1,
    solo: counts.solo + (party === 'solo' ? 1 : 0),
  }
}

export function withoutParty(counts, party) {
  const queue = Math.max(0, counts.queue - 1)
  const solo = Math.max(0, counts.solo - (party === 'solo' ? 1 : 0))
  return { queue, solo: Math.min(solo, queue) }
}

export function partiesLabel(n) {
  return `${n} ${n === 1 ? 'party' : 'parties'}`
}

export function playersLabel(n) {
  return `${n} ${n === 1 ? 'player' : 'players'}`
}

/* Capacity, in one place. Every screen that divides by machines, decides who
   is playing, or says how many there are reads it from here, so a cabinet
   reported out of order changes all of them at once. A record without a
   working count has nothing reported against it and runs at full size. */
export function workingCabinetsOf(a) {
  const total = Math.max(0, a.cabinets ?? 0)
  const working = a.workingCabinets ?? total
  return Math.max(0, Math.min(total, working))
}

export function isUnavailable(a) {
  return workingCabinetsOf(a) === 0
}

/* "4/5 machines", the short form rows use. */
export function machinesLabel(a) {
  const working = workingCabinetsOf(a)
  const total = a.cabinets
  const noun = total === 1 ? 'machine' : 'machines'
  return working === total ? `${total}/${total} ${noun}` : `${working}/${total} ${noun} working`
}

/* "4/5 working", the form a status chip uses. The chip carries a machine
   icon and an accessible name, so the noun can go. */
export function workingLabel(a) {
  return `${workingCabinetsOf(a)}/${Math.max(0, a.cabinets ?? 0)} working`
}

/* Minutes, or null when no machine is working: there is no honest finite
   number to show then, and every caller has to say "unavailable" instead. */
export function estimateWaitMin(a) {
  const working = workingCabinetsOf(a)
  if (working === 0) return null
  const load = a.solo * SOLO_TURN_MIN + pairsOf(a) * PAIR_TURN_MIN
  return Math.round(load / working)
}

export function isStale(a) {
  return a.updatedMinsAgo >= STALE_AFTER_MIN
}

export function freshnessLabel(a) {
  if (a.updatedMinsAgo <= 0) return 'Updated just now'
  if (a.updatedMinsAgo === 1) return 'Updated 1 min ago'
  return `Updated ${a.updatedMinsAgo} min ago`
}

/* The report's age in the fewest characters that still read as a time:
   "6m ago", "1h ago". Used where it sits beside the wait it qualifies and
   a whole sentence would compete with the number. */
export function ageShort(a) {
  const m = a.updatedMinsAgo
  if (m <= 0) return 'just now'
  if (m < 60) return `${m}m ago`
  return `${Math.round(m / 60)}h ago`
}

/* Where the number came from, as far as the app knows it: how many of the
   parties in it checked in through the app rather than being counted by a
   reporter. Short enough to sit beside the report age. */
export function sourceLabel(a, mePosition = null) {
  const n = rosterKnownCount(a, mePosition)
  if (n === 0) return 'no app check-ins'
  return `${n} app check-in${n === 1 ? '' : 's'}`
}

/* A venue can be "Fastest now" only if its report is current and at least
   one machine is running. */
export function isEligibleForBest(a) {
  return !isStale(a) && !isUnavailable(a)
}

/* The best option is the shortest WAIT, not the shortest queue - and neither
   a report nobody has confirmed for 15 minutes nor a game with no working
   machine is allowed to win. When nothing qualifies there is no best, and
   the screen says so rather than crowning an unreliable number. */
export function bestArcadeId(list) {
  const pool = list.filter(isEligibleForBest)
  if (pool.length === 0) return null
  return pool.reduce((best, a) =>
    estimateWaitMin(a) < estimateWaitMin(best) ? a : best
  ).id
}

/* Stale rows sink below current ones, because an unverified number is not a
   ranking, and a game with nothing working sinks below both - still listed,
   so it is clear why it is not an option. */
function rankTier(a, mode) {
  if (isUnavailable(a)) return 2
  if (mode === 'wait' && isStale(a)) return 1
  return 0
}

export function sortArcades(list, mode = 'wait') {
  return [...list].sort((a, b) => {
    const tier = rankTier(a, mode) - rankTier(b, mode)
    if (tier !== 0) return tier
    if (mode === 'wait' && !isUnavailable(a)) {
      const byWait = estimateWaitMin(a) - estimateWaitMin(b)
      if (byWait !== 0) return byWait
    }
    return a.distanceKm - b.distanceKm
  })
}

/* ---------------------------------------------------------------------------
   Queue roster.

   Expands a queue count into the actual line. Named parties come from the
   venue's roster - the people who checked in through the app. Everyone else is
   a guest: counted in the number, but not identified, because they are not
   running this. Showing that split honestly is the point. A venue where nobody
   uses the app shows an all-guest line, which is also why its number goes
   stale.

   Party sizes are reconciled against `solo` so the derived guests carry the
   same solo/pair split the report described.
--------------------------------------------------------------------------- */
export function queueRoster(a, { mePosition = null } = {}) {
  const working = workingCabinetsOf(a)
  const known = (a.roster ?? []).slice(0, a.queue)
  const knownPairs = known.filter((k) => Boolean(k.plus)).length

  let guestPairs = Math.max(0, pairsOf(a) - knownPairs)
  const rows = known.map((k) => ({ ...k, app: true }))

  /* Unaccounted pairs are placed first; whatever is left over is solo by
     construction, since queue = pairs + solo. */
  while (rows.length < a.queue) {
    const isPair = guestPairs > 0
    if (isPair) guestPairs -= 1
    rows.push(isPair ? { app: false, plus: 1 } : { app: false })
  }

  return rows.map((r, i) => ({
    ...r,
    position: i + 1,
    state: turnState(i + 1, working),
    you: mePosition === i + 1,
  }))
}

/* Every working cabinet is busy, so the parties at the front are playing, not
   waiting. Shared with the queue screen so the running order there and the
   list on the arcade page can never disagree about who is on a machine. */
export function turnState(position, working) {
  if (position <= working) return 'Playing now'
  if (position === working + 1) return 'Next'
  return 'Waiting'
}

export function rosterKnownCount(a, mePosition = null) {
  const named = Math.min((a.roster ?? []).length, a.queue)
  return mePosition ? named + 1 : named
}

/* Resolve a venue for display when a specific game is not the point.

   The Circle tab is about people, not about one cabinet, so it must show every
   venue someone is at - including venues that do not run whatever game is
   selected over on Arcades. Prefer the selected game, fall back to the first
   game the venue actually runs. */
export function resolveVenue(arcade, preferredGameId) {
  return (
    venueGame(arcade, preferredGameId) ??
    venueGame(arcade, Object.keys(arcade.games)[0])
  )
}

export function resolveVenues(arcades, preferredGameId) {
  return arcades.map((a) => resolveVenue(a, preferredGameId)).filter(Boolean)
}

/* The queue a person on Circle is in: their own game when their check-in
   says which, the selected game otherwise. A position means little without
   the machines behind it, so the card that shows one needs this record. */
export function venueForPlayer(arcades, player, preferredGameId) {
  const arcade = arcades.find((a) => a.id === player.at)
  if (!arcade) return null
  return resolveVenue(arcade, player.gameId ?? preferredGameId)
}
