import { Screen, TopBar, Body, PrimaryButton, Info, Stat, GameDot } from '../components/ui.jsx'
import { Qr, Nfc, User, Users } from '../components/Icons.jsx'

/* SCREEN 5 - Scan target.

   The sketch draws the machine with a QR sticker and NFC tag on it and the
   phone reaching towards it. There is no camera or NFC read in this build, so
   the button at the foot stands in for the read and the flow stays
   clickable; the screen itself looks like what the real one would be, a
   viewfinder or a reader prompt, with one line saying where to point.

   A successful read joins the queue there and then - there is no count to
   confirm first - so the button says so, and the two choices made on the
   last screen ride along as chips rather than as a sentence. */
export default function Scan({ arcade, method, party = 'solo', onBack, onSuccess }) {
  const qr = method === 'qr'

  return (
    <Screen>
      <TopBar
        title={qr ? 'Scan QR' : 'Tap NFC'}
        onBack={onBack}
        right={<Info>Only the arcade is recorded, never your location.</Info>}
      />

      <Body className="flex flex-col items-center px-6 pt-8">
        {qr ? <Viewfinder /> : <Reader />}

        <div className="mt-6 flex flex-wrap justify-center gap-1.5">
          <Stat pill tone="ink" icon={<GameDot color={arcade.gameColor} />}>
            {arcade.game}
          </Stat>
          <Stat pill tone="ink" icon={party === 'pair' ? <Users size={13} /> : <User size={13} />}>
            {party === 'pair' ? 'With a partner' : 'Solo'}
          </Stat>
        </div>
      </Body>

      <div className="border-t border-line p-4">
        <PrimaryButton onClick={onSuccess}>
          {qr ? 'Scan' : 'Tap'} &amp; join queue
        </PrimaryButton>
      </div>
    </Screen>
  )
}

/* A camera frame: dark ground, four corners, a line that sweeps. The sweep
   is motion, so reduced-motion stops it with everything else. */
function Viewfinder() {
  return (
    <div className="relative flex aspect-square w-60 items-center justify-center overflow-hidden rounded-3xl bg-ink">
      {['left-4 top-4 border-l-4 border-t-4 rounded-tl-xl', 'right-4 top-4 border-r-4 border-t-4 rounded-tr-xl', 'bottom-4 left-4 border-b-4 border-l-4 rounded-bl-xl', 'bottom-4 right-4 border-b-4 border-r-4 rounded-br-xl'].map((c) => (
        <span key={c} className={`absolute h-10 w-10 border-white ${c}`} aria-hidden="true" />
      ))}
      <span className="text-white/25" aria-hidden="true">
        <Qr size={96} />
      </span>
      <span className="anim-sweep absolute inset-x-8 h-0.5 rounded-full bg-brand-400 shadow-[0_0_12px_2px_rgba(129,140,248,0.7)]" aria-hidden="true" />
    </div>
  )
}

function Reader() {
  return (
    <div className="relative flex h-60 w-60 items-center justify-center" aria-hidden="true">
      <span className="anim-ring absolute h-32 w-32 rounded-full bg-brand-200" />
      <span className="relative flex h-32 w-32 items-center justify-center rounded-full bg-brand-600 text-white shadow-xl shadow-brand-600/30">
        <Nfc size={56} />
      </span>
    </div>
  )
}
