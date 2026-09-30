import { Avatar, PrimaryButton, SecondaryButton } from '../components/ui.jsx'
import { CheckCircle, Users } from '../components/Icons.jsx'

/* Telling someone you are on your way.

   "Join them" used to open the arcade page, which put a Check In button in
   front of a person who was still on the other side of the city. The two
   actions were indistinguishable, so it was not clear whether anything had
   been sent, or whether being on the arcade page already meant you had joined.

   They are now two different things at two different moments. This sheet is
   the first one: it names the person and the venue before it commits, and then
   says plainly that they were told. Join queue stays on the arcade page, for
   when you are standing at the machine. */
export default function JoinFriend({
  handle,
  arcade,
  sent,
  /* Whether the message that tells them is on its way, and what went
     wrong if it did not go. A sample player has nobody to tell, and the
     sheet says so rather than pretending. */
  busy = false,
  error = null,
  real = true,
  onConfirm,
  onUndo,
  onOpenArcade,
  onClose,
}) {
  const venue = arcade?.name ?? 'the arcade'
  const venueShort = arcade?.short ?? 'the arcade'

  return (
    <div className="anim-scrim absolute inset-0 z-20 flex items-end bg-ink/40">
      <div className="anim-sheet w-full rounded-t-2xl border-t border-line bg-surface shadow-2xl">
        <div className="flex justify-center pt-2">
          <span className="h-1 w-9 rounded-full bg-line-strong" />
        </div>

        {sent ? (
          <div className="p-4">
            <div className="flex items-start gap-3 rounded-xl bg-fresh-bg p-3">
              <span className="mt-0.5 flex-none text-fresh">
                <CheckCircle size={26} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink">
                  {real ? `${handle} knows you’re coming` : `On your way to ${venueShort}`}
                </p>
                {real && (
                  <p className="mt-0.5 text-xs text-ink-muted">Message sent</p>
                )}
              </div>
            </div>

            {/* The distinction the evaluation asked for, said out loud rather
                than left to be inferred from which screen you are on. */}
            <p className="mt-3 rounded-xl border border-line bg-sunken px-3 py-2.5 text-xs text-ink-muted">
              <span className="font-semibold text-ink">Not in the queue yet.</span>{' '}
              Check in at the machine when you arrive.
            </p>

            <div className="mt-4 space-y-2">
              <PrimaryButton onClick={onOpenArcade}>
                View {venueShort}
              </PrimaryButton>
              <SecondaryButton onClick={onClose}>Close</SecondaryButton>
              {/* Plans change on the way out of the door, so the last thing
                  said here is not final. This drops back to the unsent state
                  rather than closing, so it is clear what it undid. */}
              <button
                type="button"
                onClick={onUndo}
                className="w-full rounded-lg py-1.5 text-xs font-semibold text-ink-muted transition-colors duration-150 hover:text-ink"
              >
                Undo &mdash; not coming
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4">
            <div className="flex items-center gap-3">
              <Avatar handle={handle} size={44} live />
              <div className="min-w-0">
                <h2 className="font-display text-base font-semibold text-ink">
                  Join {handle} at {venueShort}?
                </h2>
                <p className="truncate text-xs text-ink-muted">{venue}</p>
              </div>
            </div>

            <p className="mt-3 flex items-center gap-2 rounded-xl bg-sunken px-3 py-2.5 text-xs text-ink-muted">
              <span className="flex-none text-ink-subtle">
                <Users size={15} />
              </span>
              {real ? `Tells ${handle} you’re coming. ` : ''}No queue spot is taken.
            </p>

            <div aria-live="polite">
              {error && (
                <p role="alert" className="mt-3 rounded-xl bg-live-bg px-3 py-2.5 text-xs font-medium text-live">
                  {error}
                </p>
              )}
            </div>

            <div className="mt-4 space-y-2">
              <PrimaryButton onClick={onConfirm} disabled={busy}>
                {busy ? 'Sending…' : 'Notify them'}
              </PrimaryButton>
              <SecondaryButton onClick={onClose} disabled={busy}>
                Cancel
              </SecondaryButton>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
