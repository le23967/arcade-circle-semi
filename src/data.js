/* ---------------------------------------------------------------------------
   Seed data.

   VENUES AND CABINET COUNTS ARE REAL, checked August 2026 against the SEGA
   maimai DX International location finder, the Timezone venue pages, and the
   community machine lists on Zenius-i-vanisher. Sources are listed in README.
   Arcade line-ups change often, so treat the counts as a snapshot.

   Two corrections came out of that check:

   - "Timezone George St" does not exist. The Timezone at 505 George Street
     closed. The George Street rhythm arcade is KOKO Amusement Town Hall at
     614 George Street, and it is the biggest of the three by a wide margin.

   - Central Park runs neither GITADORA nor Dance Dance Revolution, so it
     genuinely drops out of those two filters.

   Queues belong to a GAME, not to a venue. Every interview is about a specific
   cabinet's queue - the Sound Voltex player queues for Sound Voltex, the
   maimai players queue for maimai - so a venue carries one queue record per
   game it runs.

   Queue counts and wait times are invented; only the venues, the games and the
   cabinet counts are real. Machine-condition reports are invented in the
   same way: the one seeded below is a demo note, not a known fault at that
   venue. Every cabinet starts working, so any machine shown as out of order
   is one somebody reported while using the prototype.
--------------------------------------------------------------------------- */

/* Order matters: this is the order the filter chips appear in.

   Each game carries its own hue. It is used for dots, bars and borders - never
   for body text - so a venue row, a filter chip and a map pin all say which
   game they are about before the label is read, and contrast never depends on
   the hue. */
export const GAMES = [
  { id: 'maimai', label: 'maimai DX', color: 'var(--game-maimai)' },
  { id: 'chunithm', label: 'CHUNITHM', color: 'var(--game-chunithm)' },
  { id: 'sdvx', label: 'Sound Voltex', color: 'var(--game-sdvx)' },
  { id: 'gitadora', label: 'GITADORA', color: 'var(--game-gitadora)' },
  { id: 'taiko', label: 'Taiko', color: 'var(--game-taiko)' },
  { id: 'ddr', label: 'DDR', color: 'var(--game-ddr)' },
]

export function gameColor(id) {
  return GAMES.find((g) => g.id === id)?.color ?? 'var(--ink-subtle)'
}

export const DEFAULT_GAME = 'maimai'

export function gameLabel(id) {
  return GAMES.find((g) => g.id === id)?.label ?? id
}

/* cabinets = real count. queue = parties waiting, solo = how many of those are
   a single player. Distances are walking distance from UTS Broadway, since the
   interviews were run by students based there; the Arcades screen names that
   origin, because a distance from nowhere was the first thing a participant
   asked about.

   `cabinets` is how many are installed. `workingCabinets` is how many of
   those run, and is absent until somebody reports one out of order (see
   lib/machines.js); `issues` holds the condition reports themselves.

   `roster` is the front of the queue in order, naming only the parties that
   checked in through the app. It is deliberately shorter than `queue`: the
   count comes from reports, and most people in a physical arcade queue are not
   running this app. The rest of the list is filled with unnamed guests, which
   is the honest picture rather than a flattering one.

   `plus: 1` marks a party of two - they hold one machine between them.

   `map` is the venue's real latitude and longitude, used to place it on the
   map. Presence is still venue level: a pin sits on the building, never on a
   person's actual position. */
const q = (cabinets, queue, solo, updatedMinsAgo, updatedAt, roster = [], issues = []) => ({
  cabinets,
  queue,
  solo,
  updatedMinsAgo,
  updatedAt,
  roster,
  issues,
})

export const ARCADES = [
  {
    id: 'central-park',
    name: 'Timezone Central Park',
    short: 'Central Park',
    suburb: 'Chippendale',
    address: 'Level 2, Central Park Mall, 28 Broadway, Chippendale NSW 2008',
    distanceKm: 0.3,
    map: { lat: -33.8836, lng: 151.1988 },
    games: {
      maimai: q(2, 7, 2, 2, '12:38 PM', [
        { handle: 'rin' },
        { handle: 'kaz', plus: 1 },
        { handle: 'nori', plus: 1 },
      ]),
      chunithm: q(1, 2, 1, 9, '12:31 PM', [{ handle: 'yuzu' }]),
      sdvx: q(1, 2, 2, 4, '12:36 PM', [{ handle: 'raven' }]),
      taiko: q(2, 0, 0, 12, '12:28 PM'),
      /* No GITADORA and no DDR here - confirmed absent. */
    },
  },
  {
    id: 'market-city',
    name: 'Timezone Haymarket',
    short: 'Haymarket',
    suburb: 'Haymarket',
    address: 'Level 3, Market City, 9-13 Hay Street, Haymarket NSW 2000',
    distanceKm: 0.7,
    map: { lat: -33.8794, lng: 151.2035 },
    games: {
      /* Nobody on the app is on the maimai queue here, which is exactly why
         that number is 41 minutes old. Sound Voltex has one player reporting,
         so that queue is current: freshness is per game, not per venue. */
      maimai: q(2, 11, 2, 41, '11:59 AM'),
      chunithm: q(2, 4, 2, 7, '12:33 PM'),
      sdvx: q(1, 1, 1, 2, '12:38 PM', [{ handle: 'cyan' }]),
      gitadora: q(2, 0, 0, 8, '12:32 PM'),
      taiko: q(1, 4, 2, 3, '12:37 PM'),
      ddr: q(2, 2, 2, 31, '12:09 PM'),
    },
  },
  {
    id: 'koko-town-hall',
    name: 'KOKO Amusement Town Hall',
    short: 'KOKO Town Hall',
    suburb: 'Sydney CBD',
    address: '614 George Street, Sydney NSW 2000',
    distanceKm: 1.4,
    map: { lat: -33.8765, lng: 151.2065 },
    games: {
      /* Demo note: a warning, so the cabinet still counts as working. */
      maimai: q(
        5,
        10,
        4,
        6,
        '12:34 PM',
        [{ handle: 'ovo_' }, { handle: 'polar', plus: 1 }, { handle: 'tsuki' }],
        [{ id: 'seed-koko-maimai-3', type: 'controls', cabinet: 'Cab 3', note: 'Sticky B button', minsAgo: 25 }]
      ),
      chunithm: q(3, 5, 3, 4, '12:36 PM', [{ handle: 'ovo_' }, { handle: 'hana' }]),
      sdvx: q(2, 4, 2, 26, '12:14 PM'),
      gitadora: q(1, 1, 1, 11, '12:29 PM'),
      taiko: q(5, 6, 3, 3, '12:37 PM'),
      ddr: q(2, 3, 3, 18, '12:22 PM'),
    },
  },
]

/* Where you are, for the map. Venue level only, as everywhere else. This is
   UTS Broadway, since that is where the interviews were run from. */
export const ME_MAP = { lat: -33.8832, lng: 151.2006 }

/* The queue ahead of you once you check in. Handles only - players report and
   queue without having to speak to anyone, which matters for the interviewee
   who described themselves as "very introverted". (Wednesday interview) */
export const QUEUE_AHEAD = [
  { handle: 'rin', state: 'Playing now' },
  { handle: 'kaz', state: 'Next' },
  { handle: 'ovo / pair', state: 'Waiting' },
]
