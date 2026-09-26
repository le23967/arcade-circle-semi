import { Screen, TopBar, Body, PrimaryButton, Info } from '../components/ui.jsx'
import { CheckCircle } from '../components/Icons.jsx'

/* SCREEN 8 - Session summary. */
export default function Summary({ arcade, sessionMin, waitedMin, onDone }) {
  return (
    <Screen>
      <TopBar title="Session" />

      <Body>
        <div className="flex items-center gap-3 border-b border-line px-4 py-6">
          <span className="text-ink">
            <CheckCircle size={40} />
          </span>
          <div>
            <p className="text-lg font-semibold text-ink">Checked out</p>
            <p className="text-sm text-ink-muted">{arcade.name}</p>
          </div>
        </div>

        <dl>
          <Line label="Session time" value={`${sessionMin} min`} />
          <Line label="Time queued" value={waitedMin === null ? 'Not estimated' : `${waitedMin} min`} />
          <Line label="Arcade" value={arcade.short} />
        </dl>

        <p className="flex items-center gap-1.5 px-4 py-4 text-xs text-ink-muted">
          Your slot has been freed
          <Info above>
            Checking out immediately is what keeps the running order honest for
            everyone still waiting. Session times also feed this venue&rsquo;s
            wait estimate.
          </Info>
        </p>
      </Body>

      <div className="border-t border-line p-4">
        <PrimaryButton onClick={onDone}>Back to Arcades</PrimaryButton>
      </div>
    </Screen>
  )
}

function Line({ label, value }) {
  return (
    <div className="flex items-baseline justify-between border-b border-line px-4 py-3">
      <dt className="text-sm text-ink-muted">{label}</dt>
      <dd className="text-lg font-semibold tabular-nums text-ink">
        {value}
      </dd>
    </div>
  )
}
