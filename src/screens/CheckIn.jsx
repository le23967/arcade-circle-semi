import { useState } from 'react'
import { Screen, TopBar, Body, Info } from '../components/ui.jsx'
import { Qr, Nfc, Hand, Chevron, Shield } from '../components/Icons.jsx'

/* SCREEN 4A - Check in at the cabinet.

   Ordered fastest-first, with Manual deliberately demoted. The venue already
   has a manual queue board and it has failed: "there's a [queue board] but no
   one uses it because it's like lazy" - and the marker was dead, "it's dry
   out, it's got no ink left". Asked what would work instead: "With a QR code
   or ... tap your phone again - it would be nice." (21 Aug, arcade)

   The field study sharpened it (finding C). The button used to say Join queue
   and then show three options, and a participant could not tell whether they
   were already in: "So am I already joined the queue or do I have to ... do
   one of these three options?" So the arcade page now says what happens -
   Check in & join queue - and this screen says it once more: a scan or a tap
   IS the join. It needs nothing typed, because the scan is the proof you are
   at the machine, and it lands straight on your place in the queue. Checking
   the count is offered afterwards, not demanded first.

   Two choices ride along, each one tap and each with a default, so neither
   adds a step: whether you are playing alone or with a partner (that is one
   party either way, but a pair holds the machine longer), and whether this
   check-in is shared (finding H). Choosing not to share still counts you in
   the queue, as a guest nobody can name, and leaves the Me setting alone. */
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
  const [editingShare, setEditingShare] = useState(false)

  return (
    <Screen>
      <TopBar
        title="Check in at the cabinet"
        onBack={onBack}
        right={
          <Info>
            Scanning the sticker or tapping the reader on the cabinet is what
            proves you are there, so it joins you straight away. Manual is the
            fallback for a broken sticker or a phone without NFC, and asks you
            to confirm the queue count instead.
          </Info>
        }
      />

      <Body>
        <div className="border-b border-line px-4 py-3">
          <p className="text-sm font-semibold text-ink">
            {arcade.game} &middot; {arcade.name}
          </p>
          <p className="mt-1 text-xs text-ink-muted">
            Scan or tap at the cabinet and you are in this game&rsquo;s queue
            straight away. Nothing to fill in.
          </p>
        </div>

        <div className="border-b border-line px-4 py-3">
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Who is playing">
            <PartyOption on={party === 'solo'} onClick={() => onParty('solo')}>
              Solo
            </PartyOption>
            <PartyOption on={party === 'pair'} onClick={() => onParty('pair')}>
              With a partner
            </PartyOption>
          </div>
          <p className="mt-1.5 text-xs text-ink-muted">
            {party === 'pair'
              ? 'You and your partner take one place and one machine together.'
              : 'You take one place in the queue.'}
          </p>
        </div>

        <div className="border-b border-line px-4 py-2.5">
          <div className="flex min-h-11 items-center gap-2">
            <Shield size={16} className="flex-none text-ink-muted" />
            <p className="min-w-0 flex-1 text-xs text-ink">
              {!audienceLabel
                ? 'Not signed in, so nobody can see where you are.'
                : share
                  ? `Visible to ${audienceLabel}`
                  : 'Not shared. You still count in the queue, as a guest.'}
            </p>
            {audienceLabel && (
              <button
                type="button"
                aria-expanded={editingShare}
                onClick={() => setEditingShare((v) => !v)}
                className="min-h-11 flex-none rounded-md px-2 text-xs font-semibold text-brand-600"
              >
                {editingShare ? 'Done' : 'Change'}
              </button>
            )}
          </div>
          {audienceLabel && editingShare && (
            <div className="mt-1 space-y-1.5 pb-1" role="radiogroup" aria-label="Who sees this check-in">
              <ShareOption on={share} onClick={() => onShare(true)}>
                Share this check-in with {audienceLabel}
              </ShareOption>
              <ShareOption on={!share} onClick={() => onShare(false)}>
                Join without sharing where I am
              </ShareOption>
              <p className="text-[11px] leading-relaxed text-ink-muted">
                Only the arcade is ever shared, never your machine. This
                changes this check-in only; the Me tab keeps your usual
                setting.
              </p>
            </div>
          )}
        </div>

        <Option
          Icon={Qr}
          title="Scan QR"
          hint="Fastest. Scan the sticker on the cabinet"
          primary
          onClick={() => onScan('qr')}
        />
        <Option
          Icon={Nfc}
          title="Tap NFC"
          hint="Hold your phone against the reader on the cabinet"
          onClick={() => onScan('nfc')}
        />
        <Option
          Icon={Hand}
          title="Manual check-in"
          hint="Only if QR and NFC are not working and you are at the machine. You confirm the queue count."
          muted
          onClick={onManual}
        />
      </Body>
    </Screen>
  )
}

function PartyOption({ on, onClick, children }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={on}
      onClick={onClick}
      className={`min-h-11 rounded-xl border px-3 text-sm font-semibold transition-all duration-150 ease-soft active:scale-[0.98] ${
        on
          ? 'border-transparent bg-ink text-white'
          : 'border-line-strong bg-surface text-ink-muted hover:text-ink'
      }`}
    >
      {children}
    </button>
  )
}

function ShareOption({ on, onClick, children }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={on}
      onClick={onClick}
      className={`flex min-h-11 w-full items-center gap-2.5 rounded-xl border px-3 text-left text-xs font-medium transition-colors duration-150 ${
        on ? 'border-brand-200 bg-brand-50 text-ink' : 'border-line bg-surface text-ink-muted hover:bg-sunken'
      }`}
    >
      <span
        className={`flex h-4 w-4 flex-none items-center justify-center rounded-full border ${
          on ? 'border-brand-600' : 'border-line-strong'
        }`}
      >
        {on && <span className="h-2 w-2 rounded-full bg-brand-600" />}
      </span>
      {children}
    </button>
  )
}

function Option({ Icon, title, hint, primary, muted, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 border-b border-line px-4 text-left transition-colors duration-150 ${
        muted ? 'py-3 hover:bg-sunken' : 'py-4 hover:bg-sunken'
      } ${primary ? 'bg-brand-50 hover:bg-brand-100' : ''}`}
    >
      <span
        className={
          primary
            ? 'flex h-9 w-9 flex-none items-center justify-center rounded-full bg-brand-600 text-white'
            : muted
              ? 'text-ink-subtle'
              : 'text-ink'
        }
      >
        <Icon size={primary ? 20 : 22} />
      </span>
      <span className="flex-1">
        <span
          className={`block font-semibold ${
            muted ? 'text-xs text-ink-muted' : primary ? 'text-sm text-brand-700' : 'text-sm text-ink'
          }`}
        >
          {title}
        </span>
        <span className="block text-xs text-ink-muted">{hint}</span>
      </span>
      <Chevron size={16} />
    </button>
  )
}
