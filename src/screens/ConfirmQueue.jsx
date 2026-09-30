import { useState } from 'react'
import {
  Screen,
  TopBar,
  Body,
  PrimaryButton,
  Stepper,
  Stat,
  GameDot,
} from '../components/ui.jsx'
import { Refresh } from '../components/Icons.jsx'
import { ageShort, estimateWaitMin, isStale, pairsOf, withParty } from '../lib/queue.js'

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

   This is the moment they are. They are standing at the machine, so they
   are standing in front of the line and can count it. The steppers arrive
   pre-filled with the last report, so if it is already right this stays a
   single tap, which is the bar check-in has to clear: the arcade's paper queue
   board failed because anything slower than one tap gets skipped.

   The payoff is that every check-in now carries a verified count rather than a
   blind +1 on top of a number nobody has confirmed.

   It asks for pairs and solo players because that is what the arcade page
   shows, and what a person standing at the machine can actually count. Asking
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
  const stale = isStale(arcade)

  return (
    <Screen>
      <TopBar title="Manual check-in" onBack={onBack} />

      <Body>
        <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
          <p className="flex min-w-0 items-center gap-2 text-sm font-semibold text-ink">
            <GameDot color={arcade.gameColor} className="h-2.5 w-2.5" />
            <span className="truncate">
              {arcade.short} &middot; {arcade.game}
            </span>
          </p>
          <Stat pill tone={stale ? 'stale' : 'fresh'} label="Last count" icon={<Refresh size={13} />}>
            {ageShort(arcade)}
          </Stat>
        </div>

        {/* The question is the one piece of text here that has to be read,
            because counting yourself in is the easy mistake. */}
        <div className="px-4">
          <p className="pt-4 text-sm font-semibold text-ink">
            Waiting now, not counting you{party === 'pair' ? ' or your partner' : ''}
          </p>
          <Stepper label="Pairs" hint="2 players" value={pairs} onChange={(v) => setPairs(Math.max(0, v))} />
          <Stepper label="Solo" hint="1 player" value={solo} onChange={(v) => setSolo(Math.max(0, v))} />
        </div>

        <div className="mx-4 mt-3 flex items-baseline justify-between rounded-xl bg-sunken px-4 py-3">
          <p className="font-display text-2xl font-bold tabular-nums text-ink">
            You&rsquo;d be #{queue + 1}
          </p>
          <p className={`text-sm font-semibold tabular-nums ${wait === null ? 'text-live' : 'text-ink-muted'}`}>
            {wait === null ? 'No working machines' : `~${wait} min`}
          </p>
        </div>

      </Body>

      <div className="border-t border-line p-4">
        <PrimaryButton onClick={() => onConfirm({ queue, solo })}>
          Join queue
        </PrimaryButton>
      </div>
    </Screen>
  )
}
