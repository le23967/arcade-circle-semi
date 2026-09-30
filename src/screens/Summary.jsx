import { Screen, TopBar, Body, PrimaryButton } from '../components/ui.jsx'
import { CheckCircle } from '../components/Icons.jsx'

/* SCREEN 8 - Session summary. Checked out says the machine is free; the
   note that used to explain why checking out promptly matters went with
   the Week 9 cut, since it is read after the fact it argues for. */
export default function Summary({ arcade, sessionMin, waitedMin, onDone }) {
  return (
    <Screen>
      <TopBar title="Session" />

      <Body>
        <div className="flex items-center gap-3 border-b border-line px-4 py-6">
          <span className="text-fresh">
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
