import { useState } from 'react'
import { Modal, PrimaryButton, SecondaryButton } from '../components/ui.jsx'
import { CheckCircle, Shield } from '../components/Icons.jsx'
import { estimateWaitMin, workingCabinetsOf } from '../lib/queue.js'
import {
  ISSUE_TYPES,
  NOTE_MAX,
  ageLabel,
  cabinetLabels,
  noteTitle,
  openIssues,
} from '../lib/machines.js'

/* Machine report.

   Not the queue-count report (that is Report.jsx): this one says what state
   the machines are in. Participants asked for exactly this - "like a form
   ... player can report the status of the machine ... so be careful" - and
   for a short status and a comment rather than a score, so it is a type,
   an optional machine and an optional line of text.

   Problems already reported are listed first, each with a way to say it is
   working again, because a stale "broken" warning sends people away from a
   machine that is fine just as surely as a missing one sends them to a
   machine that is not.

   Anonymous like the count report: no handle is attached or shown, and the
   report is not linked to your check-in, so nothing here says which machine
   you are playing on. It applies at once - the working count, the wait, the
   list order and Fastest now all follow it. */
export default function MachineReport({ arcade, onCancel, onReport, onWorking }) {
  const [type, setType] = useState(null)
  const [cabinet, setCabinet] = useState(null)
  const [note, setNote] = useState('')
  const [done, setDone] = useState(null)

  const labels = cabinetLabels(arcade.cabinets)
  const multi = arcade.cabinets > 1
  const problems = openIssues(arcade)
  /* Out of order changes capacity, so on a venue with several machines it
     has to say which one, or two reports of the same machine would count
     twice. */
  const needsCabinet = type === 'out' && multi && !cabinet

  function summary() {
    const working = workingCabinetsOf(arcade)
    const wait = estimateWaitMin(arcade)
    return `Now ${working}/${arcade.cabinets} working · ${wait === null ? 'unavailable' : `~${wait} min`}`
  }

  if (done) {
    return (
      <Modal title="Thank you">
        <div className="flex items-center gap-3">
          <span className="text-fresh">
            <CheckCircle size={28} />
          </span>
          <div>
            <p className="text-sm font-semibold text-ink">{done}</p>
            <p className="text-xs tabular-nums text-ink-muted">{summary()}</p>
          </div>
        </div>
        <div className="mt-4">
          <PrimaryButton onClick={onCancel}>Done</PrimaryButton>
        </div>
      </Modal>
    )
  }

  return (
    <Modal title={`Machines, ${arcade.short}`}>
      <p className="text-xs tabular-nums text-ink-muted">
        {arcade.game} &middot; {workingCabinetsOf(arcade)}/{arcade.cabinets} working
      </p>

      {problems.length > 0 && (
        <section className="mt-3" aria-labelledby="reported-heading">
          <h3 id="reported-heading" className="text-xs uppercase tracking-wide text-ink-muted">
            Reported
          </h3>
          <ul className="mt-1">
            {problems.map((issue) => (
              <li key={issue.id} className="flex items-center gap-2 border-b border-line py-1.5 last:border-b-0">
                <span className="min-w-0 flex-1">
                  <span className="block text-sm text-ink">{noteTitle(issue)}</span>
                  <span className="block truncate text-xs text-ink-muted">
                    {issue.note ? `“${issue.note}” · ` : ''}
                    {ageLabel(issue.minsAgo)}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    onWorking(issue.id)
                    setDone(`${issue.cabinet ?? 'Machine'} marked working`)
                  }}
                  className="min-h-11 flex-none rounded-xl border border-line-strong px-3 text-xs font-semibold text-ink transition-colors duration-150 hover:bg-sunken"
                >
                  Working now
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-3" aria-labelledby="new-issue-heading">
        <h3 id="new-issue-heading" className="text-xs uppercase tracking-wide text-ink-muted">
          What&rsquo;s wrong?
        </h3>
        <div className="mt-1.5 grid grid-cols-2 gap-1.5" role="radiogroup" aria-label="What is wrong">
          {ISSUE_TYPES.map((t) => (
            <Choice key={t.id} on={type === t.id} onClick={() => setType(t.id)}>
              {t.label}
            </Choice>
          ))}
        </div>

        {multi && (
          <>
            <p className="mt-3 text-xs font-medium text-ink">
              Which machine?{' '}
              <span className="font-normal text-ink-muted">
                {type === 'out' ? 'Required' : 'Optional'}
              </span>
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5" role="radiogroup" aria-label="Which machine">
              <Choice compact on={cabinet === null} onClick={() => setCabinet(null)}>
                Not sure
              </Choice>
              {labels.map((label) => (
                <Choice compact key={label} on={cabinet === label} onClick={() => setCabinet(label)}>
                  {label}
                </Choice>
              ))}
            </div>
          </>
        )}

        <label className="mt-3 block text-xs font-medium text-ink" htmlFor="machine-note">
          Note <span className="font-normal text-ink-muted">Optional</span>
        </label>
        <input
          id="machine-note"
          type="text"
          value={note}
          maxLength={NOTE_MAX}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. sticky button"
          className="mt-1 min-h-11 w-full rounded-xl border border-line-strong bg-surface px-3 text-sm text-ink outline-none placeholder:text-ink-subtle focus:border-brand-500"
        />
      </section>

      <p className="mt-3 flex items-center gap-1.5 text-xs text-ink-muted">
        <Shield size={14} />
        Anonymous
      </p>

      <div className="mt-3 space-y-2">
        <PrimaryButton
          disabled={!type || needsCabinet}
          onClick={() => {
            onReport({ type, cabinet: multi ? cabinet : null, note })
            setDone(`${noteTitle({ type, cabinet: multi ? cabinet : null })} reported`)
          }}
        >
          {needsCabinet ? 'Pick a machine' : 'Submit'}
        </PrimaryButton>
        <SecondaryButton onClick={onCancel}>Cancel</SecondaryButton>
      </div>
    </Modal>
  )
}

function Choice({ on, onClick, compact = false, children }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={on}
      onClick={onClick}
      className={`min-h-11 rounded-xl border text-left text-xs font-semibold transition-all duration-150 ease-soft active:scale-[0.98] ${
        compact ? 'px-3' : 'px-2.5'
      } ${
        on
          ? 'border-transparent bg-ink text-white'
          : 'border-line-strong bg-surface text-ink-muted hover:text-ink'
      }`}
    >
      {children}
    </button>
  )
}
