/* ---------------------------------------------------------------------------
   Machine condition.

   Asked what they wanted before travelling, nearly every participant named
   the machines themselves: whether they work, and what state they are in
   (finding B). What they asked for was short - "one to two comments about
   it", not "datas" - so condition is a status per report and an optional
   line of text, never a star rating or a score.

   A report is anonymous and lives on the game's queue record, beside the
   queue count it qualifies:

     { id, type, cabinet, note, minsAgo }

   `cabinet` is an optional label such as "Cab 2", `note` an optional short
   comment, `minsAgo` its age. Only "Out of order" takes a machine away; the
   other types are warnings that inform the choice without changing
   capacity. "Working normally" is the positive case - a cabinet that had a
   problem and is fine again - and clears what was reported against it.

   The working count is stored on the record as `workingCabinets` and kept
   in step here, so queue.js can read capacity without knowing about
   reports at all.
--------------------------------------------------------------------------- */

export const ISSUE_TYPES = [
  { id: 'out', label: 'Out of order' },
  { id: 'controls', label: 'Controls (buttons/touch)' },
  { id: 'screen', label: 'Screen' },
  { id: 'audio', label: 'Audio' },
  { id: 'version', label: 'Not on latest update' },
  { id: 'online', label: 'Online/login down' },
  { id: 'other', label: 'Other' },
]

/* Not an issue type: the confirmation that a cabinet is fine again. */
export const WORKING = 'ok'

export const NOTE_MAX = 80

export function issueLabel(type) {
  if (type === WORKING) return 'Working normally'
  return ISSUE_TYPES.find((t) => t.id === type)?.label ?? 'Other'
}

export function cabinetLabels(total) {
  return Array.from({ length: Math.max(0, total) }, (_, i) => `Cab ${i + 1}`)
}

export function issuesOf(a) {
  return a.issues ?? []
}

/* Problems, as opposed to "working normally" notes. */
export function openIssues(a) {
  return issuesOf(a).filter((i) => i.type !== WORKING)
}

/* Each out-of-order cabinet counts once, however many people reported it.
   A report that names no cabinet stands for one machine of its own. */
export function workingFromIssues(cabinets, issues) {
  const down = new Set(
    issues.filter((i) => i.type === 'out').map((i) => i.cabinet ?? `unnamed:${i.id}`)
  )
  return Math.max(0, cabinets - down.size)
}

let counter = 0
function nextId() {
  counter += 1
  return `m${Date.now().toString(36)}${counter}`
}

const sameCabinet = (a, b) => (a ?? null) === (b ?? null)

/* A new report replaces an older one of the same type on the same cabinet,
   and any "working normally" note on that cabinet, since it is no longer
   true. Returns the patch for the queue record. */
export function reportIssue(a, { type, cabinet = null, note = '' }, id = nextId()) {
  const cab = cabinet || null
  const text = String(note ?? '').trim().slice(0, NOTE_MAX)
  const kept = issuesOf(a).filter(
    (i) =>
      !(sameCabinet(i.cabinet, cab) && i.type === type) &&
      !(cab !== null && i.type === WORKING && i.cabinet === cab)
  )
  const issues = [{ id, type, cabinet: cab, note: text || null, minsAgo: 0 }, ...kept]
  return { issues, workingCabinets: workingFromIssues(a.cabinets, issues) }
}

/* Someone at the cabinet says it is fine now. That clears the report it was
   raised against and, when the report named a cabinet, everything else
   reported on that cabinet too; the confirmation then stands as a note of
   its own, because "it feels really fine" is also worth knowing. */
export function markWorking(a, issueId, id = nextId()) {
  const target = issuesOf(a).find((i) => i.id === issueId)
  if (!target) return { issues: issuesOf(a), workingCabinets: workingFromIssues(a.cabinets, issuesOf(a)) }
  const kept = issuesOf(a).filter((i) =>
    target.cabinet ? i.cabinet !== target.cabinet : i.id !== target.id
  )
  const issues = [
    { id, type: WORKING, cabinet: target.cabinet ?? null, note: null, minsAgo: 0 },
    ...kept,
  ]
  return { issues, workingCabinets: workingFromIssues(a.cabinets, issues) }
}

const SEVERITY = { out: 0, [WORKING]: 2 }

/* What to show first: machines that are down, then warnings, then
   confirmations; newest first within each. */
export function conditionNotes(a) {
  return [...issuesOf(a)].sort(
    (x, y) => (SEVERITY[x.type] ?? 1) - (SEVERITY[y.type] ?? 1) || x.minsAgo - y.minsAgo
  )
}

export function ageLabel(min) {
  if (min <= 0) return 'just now'
  if (min < 60) return `${min} min ago`
  const hours = Math.round(min / 60)
  return `${hours} h ago`
}

/* "Cab 3 · Controls (buttons/touch)", the one line a row has room for. */
export function noteTitle(issue) {
  const label = issueLabel(issue.type)
  return issue.cabinet ? `${issue.cabinet} · ${label}` : label
}

/* The warning a comparison row carries, or null: the most severe open
   problem, plus how many more there are. */
export function issueHeadline(a) {
  const open = conditionNotes(a).filter((i) => i.type !== WORKING)
  if (open.length === 0) return null
  const first = open[0]
  const more = open.length - 1
  return `${noteTitle(first)}${more > 0 ? ` +${more} more` : ''}`
}
