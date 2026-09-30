import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  PAIR_TURN_MIN,
  SOLO_TURN_MIN,
  ageShort,
  bestArcadeId,
  estimateWaitMin,
  isEligibleForBest,
  isUnavailable,
  machinesLabel,
  queueRoster,
  sortArcades,
  venuesForGame,
  withParty,
  withoutParty,
  workingCabinetsOf,
  workingLabel,
} from './queue.js'
import { ARCADES } from '../data.js'

/* A venue-game record in the shape venueGame() returns. */
const venue = (id, over = {}) => ({
  id,
  distanceKm: 1,
  cabinets: 2,
  queue: 4,
  solo: 2,
  updatedMinsAgo: 2,
  roster: [],
  ...over,
})

test('turn lengths are the field-study figures', () => {
  assert.equal(SOLO_TURN_MIN, 15)
  assert.equal(PAIR_TURN_MIN, 20)
})

test('a record without workingCabinets runs at its installed size', () => {
  assert.equal(workingCabinetsOf(venue('a', { cabinets: 5 })), 5)
  assert.equal(workingCabinetsOf(venue('a', { cabinets: 5, workingCabinets: 3 })), 3)
  /* Out of range values are clamped rather than trusted. */
  assert.equal(workingCabinetsOf(venue('a', { cabinets: 2, workingCabinets: 9 })), 2)
  assert.equal(workingCabinetsOf(venue('a', { cabinets: 2, workingCabinets: -1 })), 0)
})

test('solo and pair load divided by machines, with the calibrated turns', () => {
  /* 2 solo x 15 + 2 pairs x 20 = 70 minutes of play over 2 machines. */
  assert.equal(estimateWaitMin(venue('a')), 35)
  /* A pair holds the machine longer than a solo player. */
  assert.ok(
    estimateWaitMin(venue('a', { queue: 1, solo: 0 })) >
      estimateWaitMin(venue('a', { queue: 1, solo: 1 }))
  )
  assert.equal(estimateWaitMin(venue('a', { queue: 0, solo: 0 })), 0)
})

test('one machine out of order increases the wait', () => {
  const full = venue('a', { cabinets: 5, queue: 10, solo: 4 })
  const down = { ...full, workingCabinets: 4 }
  assert.equal(estimateWaitMin(full), 36)
  assert.equal(estimateWaitMin(down), 45)
  assert.ok(estimateWaitMin(down) > estimateWaitMin(full))
})

test('nothing working means no finite wait, no best, and last place', () => {
  const broken = venue('broken', { cabinets: 1, workingCabinets: 0, queue: 0, solo: 0 })
  const stale = venue('stale', { updatedMinsAgo: 40, queue: 9, solo: 1 })
  const fresh = venue('fresh', { queue: 6, solo: 2 })

  assert.equal(isUnavailable(broken), true)
  assert.equal(estimateWaitMin(broken), null)
  assert.equal(isEligibleForBest(broken), false)

  const sorted = sortArcades([broken, stale, fresh], 'wait').map((a) => a.id)
  assert.deepEqual(sorted, ['fresh', 'stale', 'broken'])
  /* Sorting by distance still keeps it at the bottom. */
  const near = { ...broken, distanceKm: 0.1 }
  assert.equal(sortArcades([near, fresh], 'distance').at(-1).id, 'broken')
})

test('the best arcade is never one with zero working machines', () => {
  /* The broken one would win on wait if it counted. */
  const broken = venue('broken', { cabinets: 1, workingCabinets: 0, queue: 0, solo: 0 })
  const slow = venue('slow', { queue: 8, solo: 2 })
  assert.equal(bestArcadeId([broken, slow]), 'slow')
})

test('with nothing eligible there is no best at all', () => {
  const stale = venue('stale', { updatedMinsAgo: 31 })
  const broken = venue('broken', { cabinets: 2, workingCabinets: 0 })
  assert.equal(bestArcadeId([stale, broken]), null)
  assert.equal(bestArcadeId([]), null)
})

test('Playing now follows the working machines, not the installed ones', () => {
  const a = venue('a', { cabinets: 3, queue: 5, solo: 5 })
  const playing = (v) => queueRoster(v).filter((r) => r.state === 'Playing now').length
  assert.equal(playing(a), 3)
  assert.equal(playing({ ...a, workingCabinets: 2 }), 2)
  assert.equal(queueRoster({ ...a, workingCabinets: 2 })[2].state, 'Next')
  assert.equal(playing({ ...a, workingCabinets: 0 }), 0)
})

test('machine labels say when some are not working', () => {
  assert.equal(machinesLabel(venue('a', { cabinets: 5 })), '5/5 machines')
  assert.equal(machinesLabel(venue('a', { cabinets: 5, workingCabinets: 4 })), '4/5 machines working')
  assert.equal(machinesLabel(venue('a', { cabinets: 1 })), '1/1 machine')
})

test('chip labels are short and still say what they count', () => {
  assert.equal(workingLabel(venue('a', { cabinets: 5 })), '5/5 working')
  assert.equal(workingLabel(venue('a', { cabinets: 2, workingCabinets: 0 })), '0/2 working')
  assert.equal(ageShort(venue('a', { updatedMinsAgo: 0 })), 'just now')
  assert.equal(ageShort(venue('a', { updatedMinsAgo: 6 })), '6m ago')
  assert.equal(ageShort(venue('a', { updatedMinsAgo: 95 })), '2h ago')
})

test('joining and leaving restore the counts exactly, solo or pair', () => {
  const start = { queue: 10, solo: 4 }
  let counts = start
  for (const party of ['solo', 'pair', 'pair', 'solo', 'pair']) {
    const joined = withParty(counts, party)
    assert.equal(joined.queue, counts.queue + 1)
    assert.equal(joined.solo, counts.solo + (party === 'solo' ? 1 : 0))
    counts = withoutParty(joined, party)
    assert.deepEqual(counts, start)
  }
})

test('the Sound Voltex demo: one broken cabinet moves Fastest now', () => {
  const sdvx = venuesForGame(ARCADES, 'sdvx')
  assert.equal(bestArcadeId(sdvx), 'market-city')
  const broken = sdvx.map((a) =>
    a.id === 'market-city' ? { ...a, workingCabinets: 0 } : a
  )
  assert.equal(bestArcadeId(broken), 'central-park')
  assert.equal(sortArcades(broken, 'wait').at(-1).id, 'market-city')
})

test('DDR has only stale reports in the seed, so nothing is crowned', () => {
  assert.equal(bestArcadeId(venuesForGame(ARCADES, 'ddr')), null)
})
