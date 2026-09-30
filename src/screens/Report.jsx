import { useState } from 'react'
import {
  Modal,
  PrimaryButton,
  SecondaryButton,
  Stepper,
} from '../components/ui.jsx'
import { CheckCircle, Shield } from '../components/Icons.jsx'
import {
  estimateWaitMin,
  pairsOf,
  partiesLabel,
  peopleOf,
  playersLabel,
  withParty,
  withoutParty,
} from '../lib/queue.js'

/* SCREEN 4B - Report.

   Two steppers and Submit, as sketched. Three details are load-bearing:

   - Pairs and solo players are reported separately, because a pair queues as
     one party but holds the machine longer than a solo player
   - the wait recalculates live as you step, so the reporter can see their
     report is worth making
   - it is anonymous and needs no conversation, for the interviewee who
     described themselves as "very introverted"

   The two steppers ask for the same two things the arcade page displays. They
   used to ask for total parties and a solo subset while the arcade page showed
   pairs and solo, which is the same line described two ways - and since a solo
   player is a party but not a pair, the numbers looked like they disagreed.

   It is also the optional check after joining by QR or NFC (Update count
   on the queue screen). Opened on the queue you are in, `you` says whether you
   joined solo or as a pair: the steppers then count everyone else, and your
   own party is added back on submit, so a correction can never drop you out
   of the count or add you twice. */
export default function Report({ arcade, you = null, onCancel, onSubmit }) {
  const others = you ? withoutParty(arcade, you) : { queue: arcade.queue, solo: arcade.solo }
  const [pairs, setPairs] = useState(pairsOf(others))
  const [solo, setSolo] = useState(others.solo)
  const [done, setDone] = useState(false)

  const queue = pairs + solo
  const next = { ...arcade, ...(you ? withParty({ queue, solo }, you) : { queue, solo }) }
  const preview = estimateWaitMin(next)
  const previewText = preview === null ? 'no working machines' : `~${preview} min`

  if (done) {
    return (
      <Modal title="Thank you">
        <div className="flex items-center gap-3">
          <span className="text-fresh">
            <CheckCircle size={28} />
          </span>
          <div>
            <p className="text-sm font-semibold text-ink">Queue updated</p>
            <p className="text-xs tabular-nums text-ink-muted">
              {partiesLabel(next.queue)} &middot; {previewText}
            </p>
          </div>
        </div>
        <div className="mt-4">
          <PrimaryButton onClick={onCancel}>Done</PrimaryButton>
        </div>
      </Modal>
    )
  }

  return (
    <Modal title={`Update count, ${arcade.short}`}>
      {you && (
        <p className="text-xs text-ink-muted">
          Don&rsquo;t count yourself{you === 'pair' ? ' or your partner' : ''}.
        </p>
      )}
      <Stepper label="Pairs" hint="2 players" value={pairs} onChange={(v) => setPairs(Math.max(0, v))} />
      <Stepper label="Solo" hint="1 player" value={solo} onChange={(v) => setSolo(Math.max(0, v))} />

      <div className="mt-3 flex items-baseline justify-between rounded-xl bg-sunken px-4 py-3">
        <p
          className={`font-display text-2xl font-bold tabular-nums ${preview === null ? 'text-live' : 'text-ink'}`}
        >
          {preview === null ? 'Unavailable' : `${previewText} wait`}
        </p>
        <p className="text-xs tabular-nums text-ink-muted">
          {partiesLabel(next.queue)} &middot; {playersLabel(peopleOf(next))}
        </p>
      </div>

      <p className="mt-3 flex items-center gap-1.5 text-xs text-ink-muted">
        <Shield size={14} />
        Anonymous
      </p>

      <div className="mt-4 space-y-2">
        <PrimaryButton
          onClick={() => {
            onSubmit({ queue, solo })
            setDone(true)
          }}
        >
          Submit
        </PrimaryButton>
        <SecondaryButton onClick={onCancel}>Cancel</SecondaryButton>
      </div>
    </Modal>
  )
}
