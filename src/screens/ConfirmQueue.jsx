import { useState } from 'react'
import {
  Screen,
  TopBar,
  Body,
  PrimaryButton,
  Stepper,
  Info,
} from '../components/ui.jsx'
import {
  estimateWaitMin,
  freshnessLabel,
  isStale,
  pairsOf,
  partiesLabel,
  withParty,
} from '../lib/queue.js'

/* Manual check-in: confirm what you can see.

   This used to be step two of every check-in. The field study moved it
   (finding C): a scan or a tap now joins on its own, because people wanted
   "a single QR scan or NFC tap" and nothing to type, and a count is offered
   afterwards as an optional correction. Manual check-in is the one path
   left that comes through here, because without a scan the confirmed count
   is what the check-in has to show for itself. What follows is why the
   screen is built the way it is.

   Reporting used to be a second button sitting next to Check In at the same
   visual weight, which is wrong twice over - it competes with the primary
   action, and it asks for a report at a moment when the person is not
   necessarily looking at the queue.

   This is the moment they are. They have just scanned at the cabinet, so they
   are standing in front of the line and can count it. The steppers arrive
   pre-filled with the last report, so if it is already right this stays a
   single tap, which is the bar check-in has to clear: the arcade's paper queue
   board failed because anything slower than one tap gets skipped.

   The payoff is that every check-in now carries a verified count rather than a
   blind +1 on top of a number nobody has confirmed.

   It asks for pairs and solo players because that is what the arcade page
   shows, and what a person standing at the cabinet can actually count. Asking
   for "parties" here and displaying "pairs" there described the same line two
   different ways - and a solo player is a party but not a pair, so the two
   readings did not even line up. The party total is derived rather than
   entered. */
export default function ConfirmQueue({ arcade, party = 'solo', onBack, onConfirm }) {
  const [pairs, setPairs] = useState(pairsOf(arcade))
  const [solo, setSolo] = useState(arcade.solo)

  const queue = pairs + solo
  const withYou = { ...arcade, ...withParty({ queue, solo }, party) }
  const wait = estimateWaitMin(withYou)
  const changed = pairs !== pairsOf(arcade) || solo !== arcade.solo

  return (
    <Screen>
      <TopBar
        title="Manual check-in"
        onBack={onBack}
        right={
          <Info>
            You are at the cabinet, so you can see the line. Confirming it here
            means the next person reads a number somebody actually checked,
            instead of one that has been drifting since the last report.
          </Info>
        }
      />

      <Body>
        <div className="border-b border-line px-4 py-3">
          <p className="text-sm text-ink">
            {arcade.name} &middot; {arcade.game}
          </p>
          <p className="text-xs text-ink-muted">
            {freshnessLabel(arcade)}
            {isStale(arcade) && ', worth a second look'}
          </p>
        </div>

        <div className="px-4">
          <p className="pt-3 text-sm font-semibold text-ink">
            How many are waiting, not counting you
            {party === 'pair' ? ' and your partner' : ''}?
          </p>
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
        </div>

        <div className="mx-4 mt-3 rounded-md border border-line bg-sunken px-3 py-2">
          <p className="text-xs text-ink-muted">
            That is {partiesLabel(queue)} waiting
          </p>
          <p className="text-lg font-semibold tabular-nums text-ink">
            You&rsquo;d be #{queue + 1} &middot;{' '}
            {wait === null ? 'no working machines' : `~${wait} min`}
          </p>
        </div>

        <p className="px-4 py-3 text-xs text-ink-muted">
          {changed
            ? 'Your correction replaces the current count for everyone.'
            : 'Leave it as is if the count looks right.'}
        </p>
      </Body>

      <div className="border-t border-line p-4">
        <PrimaryButton onClick={() => onConfirm({ queue, solo })}>
          Join queue
        </PrimaryButton>
      </div>
    </Screen>
  )
}
