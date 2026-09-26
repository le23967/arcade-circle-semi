import {
  Screen,
  TopBar,
  Body,
  PrimaryButton,
  SecondaryButton,
  Placeholder,
  Info,
} from '../components/ui.jsx'

/* SCREEN 5 - Scan target.

   The sketch draws the cabinet with a QR sticker and NFC tag on it and the
   phone reaching towards it. In a mid-fi build the cabinet is a gray block:
   no photography, no illustration. The "simulate" button stands in for the
   camera so the flow stays clickable.

   A successful read joins the queue there and then - there is no count to
   confirm first - so the screen says that before the person scans. */
export default function Scan({ arcade, method, party = 'solo', onBack, onSuccess }) {
  const qr = method === 'qr'

  return (
    <Screen>
      <TopBar
        title={qr ? 'Scan QR' : 'Tap NFC'}
        onBack={onBack}
        right={
          <Info >
            Scanning at the cabinet is what ties you to this venue. No precise
            location is read or stored &middot; the app only knows which arcade
            you tapped.
          </Info>
        }
      />

      <Body className="p-4">
        <Placeholder className="h-56 w-full" label="Cabinet, placeholder">
          <div className="flex w-full flex-col items-center gap-2 px-6">
            <div className="w-full rounded-md border border-line-strong bg-line-strong py-1 text-center text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
              {arcade.game}
            </div>
            <div className="h-20 w-full rounded-md border border-line-strong bg-sunken" />
            <div className="flex w-full items-center justify-center gap-2">
              <div className="h-8 w-8 rounded-md border border-line-strong bg-surface" />
              <div className="h-8 flex-1 rounded-md border border-line-strong bg-line-strong" />
              <div className="h-8 w-8 rounded-md border border-line-strong bg-surface" />
            </div>
            <span className="text-[11px] uppercase tracking-wide text-ink-muted">
              {qr ? 'QR sticker on the panel' : 'NFC reader on the panel'}
            </span>
          </div>
        </Placeholder>

        <p className="mt-4 text-sm text-ink">
          {qr
            ? 'Point your camera at the sticker on the cabinet.'
            : 'Hold the top of your phone against the reader.'}
        </p>
        <p className="mt-1 text-xs text-ink-muted">
          You join the {arcade.game} queue as soon as it reads,{' '}
          {party === 'pair' ? 'with your partner' : 'as a solo player'}.
        </p>

      </Body>

      <div className="space-y-2 border-t border-line p-4">
        <PrimaryButton onClick={onSuccess}>
          Simulate {qr ? 'scan' : 'tap'} &middot; join queue
        </PrimaryButton>
        <SecondaryButton onClick={onBack}>Cancel</SecondaryButton>
      </div>
    </Screen>
  )
}
