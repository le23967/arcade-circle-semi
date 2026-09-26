import { useState } from 'react'
import {
  Modal,
  PrimaryButton,
  SecondaryButton,
  Stepper,
  Info,
} from '../components/ui.jsx'
import { CheckCircle } from '../components/Icons.jsx'
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

   It is also the optional check after joining by QR or NFC ("Queue count
   looks wrong?"). Opened on the queue you are in, `you` says whether you
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
        <div className="flex items-start gap-3">
          <span className="mt-0.5 text-ink">
            <CheckCircle size={28} />
          </span>
          <div>
            <p className="text-sm font-semibold text-ink">Queue updated</p>
            <p className="text-xs text-ink-muted">
              {arcade.short}: {partiesLabel(next.queue)} waiting &middot;{' '}
              {playersLabel(peopleOf(next))} &middot; {previewText}, timestamped
              now.
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
    <Modal title={`Report queue, ${arcade.short}`}>
      {you && (
        <p className="text-xs text-ink-muted">
          Count everyone in the queue except you
          {you === 'pair' ? ' and your partner' : ''}. You are added back, behind
          the people you count.
        </p>
      )}
      <Stepper
        label="Pairs waiting"
        hint="Two players sharing one queue position"
        value={pairs}
        onChange={(v) => setPairs(Math.max(0, v))}
      />
      <Stepper
        label="Solo players waiting"
        hint="One player in one queue position"
        value={solo}
        onChange={(v) => setSolo(Math.max(0, v))}
      />

      <div className="mt-3 rounded-md border border-line bg-sunken px-3 py-2">
        <p className="text-xs text-ink-muted">
          {partiesLabel(next.queue)} waiting &middot; {playersLabel(peopleOf(next))}
          {you ? ', with you' : ''}
        </p>
        <p className="text-lg font-semibold tabular-nums text-ink">
          {preview === null ? 'No working machines' : `${previewText} estimated wait`}
        </p>
      </div>

      <p className="mt-3 flex items-center gap-1.5 text-xs text-ink-muted">
        Submitted anonymously
        <Info>
          Nobody has to be asked &ldquo;who&rsquo;s next?&rdquo; and nobody has
          to answer &middot; which matters for players who would rather not talk
          to a stranger.
        </Info>
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
