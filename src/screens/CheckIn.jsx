import { Screen, TopBar, Body, Info, GameDot } from '../components/ui.jsx'
import { Qr, Nfc, Shield, User, Users } from '../components/Icons.jsx'

/* SCREEN 4A - Check in at the machine.

   Ordered fastest-first, with Manual deliberately demoted. The venue already
   has a manual queue board and it has failed: "there's a [queue board] but no
   one uses it because it's like lazy" - and the marker was dead, "it's dry
   out, it's got no ink left". Asked what would work instead: "With a QR code
   or ... tap your phone again - it would be nice." (21 Aug, arcade)

   The field study sharpened it (finding C): a scan or a tap IS the join. It
   needs nothing typed, because the scan is the proof you are at the machine,
   and it lands straight on your place in the queue.

   Two choices ride along, each one tap and each with a default, so neither
   adds a step: whether you are playing alone or with a partner, and whether
   this check-in is shared (finding H). Choosing not to share still counts you
   in the queue, as a guest nobody can name, and leaves the Me setting alone.

   The Week 9 critique found this was the most text-heavy screen in the app,
   for an action done standing at the machine. Every line that explained a
   control is gone - what Solo means, what a scan does, where the sticker is -
   and privacy is a state with a switch rather than a paragraph. What is left
   reads choose, scan, joined: QR as the one big target, NFC beside it in
   weight below, and Manual as a line of text for when neither works. */
export default function CheckIn({
  arcade,
  party,
  onParty,
  share,
  onShare,
  /* "mutual friends" or "all followers"; null when not signed in. */
  audienceLabel = null,
  onBack,
  onScan,
  onManual,
}) {
  return (
    <Screen>
      <TopBar title="Join queue" onBack={onBack} />

      <Body className="px-4 py-4">
        <p className="flex items-center gap-2 text-sm font-semibold text-ink">
          <GameDot color={arcade.gameColor} className="h-2.5 w-2.5" />
          <span className="min-w-0 truncate">
            {arcade.short} &middot; {arcade.game}
          </span>
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Who is playing">
          <PartyOption on={party === 'solo'} onClick={() => onParty('solo')} icon={<User size={18} />}>
            Solo
          </PartyOption>
          <PartyOption on={party === 'pair'} onClick={() => onParty('pair')} icon={<Users size={18} />}>
            With a partner
          </PartyOption>
        </div>

        <ShareRow share={share} onShare={onShare} audienceLabel={audienceLabel} />

        <div className="mt-5 space-y-2">
          <button
            type="button"
            onClick={() => onScan('qr')}
            className="flex min-h-[88px] w-full items-center gap-4 rounded-2xl bg-brand-600 px-5 text-left text-white shadow-lg shadow-brand-600/25 transition-all duration-150 ease-soft hover:bg-brand-700 active:scale-[0.98]"
          >
            <span className="flex h-12 w-12 flex-none items-center justify-center rounded-xl bg-white/15">
              <Qr size={28} />
            </span>
            <span className="font-display text-lg font-semibold">Scan QR</span>
          </button>

          <button
            type="button"
            onClick={() => onScan('nfc')}
            className="flex min-h-[56px] w-full items-center gap-4 rounded-2xl border border-line-strong bg-surface px-5 text-left text-ink transition-all duration-150 ease-soft hover:bg-sunken active:scale-[0.98]"
          >
            <span className="flex w-12 flex-none justify-center text-ink-muted">
              <Nfc size={24} />
            </span>
            <span className="font-display text-base font-semibold">Tap NFC</span>
          </button>
        </div>

        <button
          type="button"
          onClick={onManual}
          className="mt-3 flex min-h-11 w-full items-center justify-center gap-1 text-xs text-ink-muted"
        >
          Can&rsquo;t scan?
          <span className="font-semibold text-ink underline decoration-line-strong underline-offset-2">
            Manual check-in
          </span>
        </button>
      </Body>
    </Screen>
  )
}

function PartyOption({ on, onClick, icon, children }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={on}
      onClick={onClick}
      className={`flex min-h-[48px] items-center justify-center gap-2 rounded-xl border px-3 text-sm font-semibold transition-all duration-150 ease-soft active:scale-[0.98] ${
        on
          ? 'border-transparent bg-ink text-white'
          : 'border-line-strong bg-surface text-ink-muted hover:text-ink'
      }`}
    >
      {icon}
      {children}
    </button>
  )
}

/* Who sees this check-in, as a state. Signed out there is nobody to share
   with, so it only says so. The finer print - only the arcade is ever
   shared, and off still counts you - waits behind the ?. */
function ShareRow({ share, onShare, audienceLabel }) {
  if (!audienceLabel) {
    return (
      <p className="mt-3 flex min-h-11 items-center gap-2 rounded-xl bg-sunken px-3 text-xs text-ink-muted">
        <Shield size={16} className="flex-none" />
        Private &middot; not signed in
      </p>
    )
  }

  const label = `Share with ${audienceLabel}`
  return (
    <div className="mt-3 flex min-h-[48px] items-center gap-2 rounded-xl bg-sunken pl-3 pr-1.5">
      <Shield size={16} className="flex-none text-ink-muted" />
      <span className="flex min-w-0 flex-1 items-center gap-1.5 text-sm text-ink">
        <span className="truncate">{label}</span>
        <Info>
          Friends see the arcade, never your machine. Off, you still count in
          the queue, as a guest.
        </Info>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={share}
        aria-label={label}
        onClick={() => onShare(!share)}
        className="flex min-h-11 flex-none items-center gap-2 rounded-lg px-1.5"
      >
        <span className={`w-6 text-right text-xs font-semibold ${share ? 'text-brand-700' : 'text-ink-muted'}`}>
          {share ? 'On' : 'Off'}
        </span>
        <span
          className={`flex h-6 w-10 items-center rounded-full p-0.5 transition-colors duration-200 ease-soft ${
            share ? 'bg-brand-600' : 'bg-line-strong'
          }`}
        >
          <span
            className={`h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ease-soft ${
              share ? 'translate-x-4' : 'translate-x-0'
            }`}
          />
        </span>
      </button>
    </div>
  )
}
