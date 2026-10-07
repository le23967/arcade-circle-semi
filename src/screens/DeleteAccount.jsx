import { useState } from 'react'
import { Sheet, SheetBody, PrimaryButton, SecondaryButton } from '../components/ui.jsx'

/* Deleting your account.

   The one action in the app that cannot be undone, so it is the one that
   asks twice. The sheet says in plain words what goes - profile, follows,
   conversations, the account itself - and then asks for the username to be
   typed, because a confirmation that is one tap away from the thing it
   confirms gets tapped by reflex. The button stays off until the name
   matches; the match ignores case, since a username is not case-sensitive
   anywhere else in the app either.

   While the server is working the sheet cannot be dismissed, and if the
   server says no, the reason is shown here and nothing has been lost. */
export default function DeleteAccount({ handle, onConfirm, onCancel }) {
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const matches = typed.trim().toLowerCase() === handle.toLowerCase()

  async function confirm() {
    if (!matches || busy) return
    setBusy(true)
    setError(null)
    const result = await onConfirm()
    if (result?.error) {
      setError(result.error)
      setBusy(false)
    }
    /* On success the account is gone and the app has already moved on. */
  }

  return (
    <Sheet title="Delete your account?" onClose={onCancel} closeLabel="Cancel" dismissable={!busy}>
      <SheetBody>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            confirm()
          }}
          className="p-4"
        >
          <p className="text-sm font-semibold text-live">Permanent</p>

          <label
            htmlFor="delete-confirm"
            className="mb-1.5 mt-5 block text-xs font-semibold uppercase tracking-wide text-ink-muted"
          >
            Type your username to confirm
          </label>
          <input
            id="delete-confirm"
            name="confirm-username"
            type="text"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            disabled={busy}
            data-autofocus
            aria-describedby="delete-confirm-hint"
            className="min-h-[44px] w-full rounded-xl border border-line-strong px-3 py-2.5 text-sm text-ink outline-none transition-colors duration-150 focus:border-brand-500"
          />
          <p id="delete-confirm-hint" className="mt-1.5 text-xs text-ink-muted">
            {handle}
          </p>

          <div aria-live="polite">
            {error && (
              <p role="alert" className="mt-3 rounded-xl bg-live-bg px-3 py-2.5 text-xs font-medium text-live">
                {error}
              </p>
            )}
          </div>

          <div className="mt-5 space-y-2">
            <SecondaryButton onClick={onCancel} disabled={busy}>
              Cancel
            </SecondaryButton>
            <PrimaryButton type="submit" tone="danger" disabled={!matches || busy}>
              {busy ? 'Deleting account…' : 'Delete account'}
            </PrimaryButton>
          </div>
        </form>
      </SheetBody>
    </Sheet>
  )
}
