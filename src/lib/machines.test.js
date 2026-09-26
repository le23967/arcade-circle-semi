import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  WORKING,
  conditionNotes,
  issueHeadline,
  markWorking,
  openIssues,
  reportIssue,
} from './machines.js'
import { estimateWaitMin, workingCabinetsOf } from './queue.js'

const record = (over = {}) => ({ cabinets: 3, queue: 4, solo: 2, issues: [], ...over })

test('only Out of order takes a machine away', () => {
  const a = record()
  for (const type of ['controls', 'screen', 'audio', 'version', 'online', 'other']) {
    assert.equal(reportIssue(a, { type }, 'x').workingCabinets, 3, type)
  }
  assert.equal(reportIssue(a, { type: 'out', cabinet: 'Cab 1' }, 'x').workingCabinets, 2)
})

test('the same cabinet reported out twice is counted once', () => {
  let a = record()
  a = { ...a, ...reportIssue(a, { type: 'out', cabinet: 'Cab 2' }, 'r1') }
  a = { ...a, ...reportIssue(a, { type: 'out', cabinet: 'Cab 2' }, 'r2') }
  assert.equal(a.workingCabinets, 2)
  assert.equal(openIssues(a).length, 1)
})

test('a report carries no reporter, and the note is trimmed and capped', () => {
  const patch = reportIssue(record(), { type: 'other', note: `  ${'x'.repeat(200)} ` }, 'r1')
  const [issue] = patch.issues
  assert.deepEqual(Object.keys(issue).sort(), ['cabinet', 'id', 'minsAgo', 'note', 'type'])
  assert.equal(issue.note.length, 80)
})

test('working again restores capacity and leaves a positive note', () => {
  let a = record({ cabinets: 1, queue: 1, solo: 1 })
  a = { ...a, ...reportIssue(a, { type: 'out' }, 'r1') }
  assert.equal(workingCabinetsOf(a), 0)
  assert.equal(estimateWaitMin(a), null)

  a = { ...a, ...markWorking(a, 'r1', 'ok1') }
  assert.equal(workingCabinetsOf(a), 1)
  assert.equal(estimateWaitMin(a), 15)
  assert.deepEqual(a.issues.map((i) => i.type), [WORKING])
  assert.equal(issueHeadline(a), null)
})

test('working again on a named cabinet clears everything reported on it', () => {
  let a = record()
  a = { ...a, ...reportIssue(a, { type: 'out', cabinet: 'Cab 1' }, 'r1') }
  a = { ...a, ...reportIssue(a, { type: 'screen', cabinet: 'Cab 1' }, 'r2') }
  a = { ...a, ...reportIssue(a, { type: 'audio', cabinet: 'Cab 2' }, 'r3') }
  a = { ...a, ...markWorking(a, 'r2', 'ok1') }
  assert.equal(a.workingCabinets, 3)
  assert.deepEqual(openIssues(a).map((i) => i.id), ['r3'])
})

test('machines that are down are listed before warnings', () => {
  const a = record({
    issues: [
      { id: 'w', type: 'controls', cabinet: 'Cab 3', note: null, minsAgo: 2 },
      { id: 'o', type: 'out', cabinet: 'Cab 1', note: null, minsAgo: 30 },
    ],
  })
  assert.deepEqual(conditionNotes(a).map((i) => i.id), ['o', 'w'])
  assert.equal(issueHeadline(a), 'Cab 1 · Out of order +1 more')
})
