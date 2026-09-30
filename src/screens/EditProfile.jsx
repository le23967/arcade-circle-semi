import { useState } from 'react'
import {
  Screen,
  TopBar,
  Body,
  Avatar,
  PrimaryButton,
  SecondaryButton,
  AVATAR_HUE_COUNT,
} from '../components/ui.jsx'
import { Check } from '../components/Icons.jsx'
import { validateHandle, HANDLE_MAX } from '../lib/accounts.js'

/* Editing your own profile.

   Everyone else in this app has a handle and a colour, and the Me tab showed
   yours as though it had been assigned rather than chosen. It is the one
   identity in here the person actually owns, so it has to be theirs to change.

   The colour is a choice rather than a photo upload for a reason the rest of
   the prototype already follows: no image files ship with it, and avatars are
   drawn from initials and a hue. A picker over that palette is the honest
   version of "change your avatar" here, and it still does the job a picture
   does - it makes you findable at a glance in a list of thirty people.

   Saving writes to your real profile. Whether a username is taken is the
   database's call - it is unique there, case-insensitively - so the answer
   comes back from the save rather than from a list held on the phone. */
const MAX_HANDLE = HANDLE_MAX

export default function EditProfile({ me, onSave, onBack }) {
  const [handle, setHandle] = useState(me.handle)
  const [hue, setHue] = useState(me.hue)
  const [saving, setSaving] = useState(false)
  const [serverError, setServerError] = useState(null)

  const check = validateHandle(handle)
  const trimmed = check.handle
  const problem = check.ok ? serverError : check.problem

  const changed = trimmed !== me.handle || hue !== me.hue

  /* onSave may be asynchronous and may come back with a reason it failed,
     which belongs under the field the person can fix. */
  async function save() {
    setSaving(true)
    setServerError(null)
    const result = await onSave({ handle: trimmed, hue })
    setSaving(false)
    if (result?.error) setServerError(result.error)
  }

  return (
    <Screen>
      <TopBar title="Edit profile" onBack={onBack} />

      <Body className="bg-sunken">
        <div className="flex flex-col items-center gap-2 border-b border-line bg-surface px-4 py-6">
          <Avatar handle={trimmed || '?'} size={72} hue={hue} />
          <p className="font-display text-base font-semibold text-ink">
            {trimmed || 'Your username'}
          </p>
        </div>

        <div className="border-b border-line bg-surface px-4 py-4">
          <label
            htmlFor="handle"
            className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-muted"
          >
            Username
          </label>
          <input
            id="handle"
            type="text"
            value={handle}
            maxLength={MAX_HANDLE}
            onChange={(e) => {
              setHandle(e.target.value)
              setServerError(null)
            }}
            autoComplete="off"
            spellCheck={false}
            className={`w-full rounded-xl border px-3 py-2.5 text-sm text-ink outline-none transition-colors duration-150 placeholder:text-ink-subtle ${
              problem ? 'border-live focus:border-live' : 'border-line-strong focus:border-brand-500'
            }`}
          />
          <p
            className={`mt-1.5 text-xs ${problem ? 'font-medium text-live' : 'text-ink-muted'}`}
          >
            {problem ?? `${MAX_HANDLE - trimmed.length} left`}
          </p>
        </div>

        <div className="border-b border-line bg-surface px-4 py-4">
          <p className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Colour
          </p>
          <div className="flex flex-wrap gap-2.5">
            {Array.from({ length: AVATAR_HUE_COUNT }, (_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setHue(i)}
                aria-label={`Colour ${i + 1}`}
                aria-pressed={hue === i}
                className={`relative rounded-full transition-transform duration-150 ease-soft active:scale-95 ${
                  hue === i ? 'ring-2 ring-brand-600 ring-offset-2' : ''
                }`}
              >
                <Avatar handle={trimmed || '?'} size={40} hue={i} />
                {hue === i && (
                  <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-surface bg-brand-600 text-white">
                    <Check size={9} />
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </Body>

      <div className="space-y-2 border-t border-line p-4">
        <PrimaryButton disabled={Boolean(problem) || !changed || saving} onClick={save}>
          {saving ? 'Saving…' : changed ? 'Save' : 'Nothing to save'}
        </PrimaryButton>
        <SecondaryButton onClick={onBack}>Cancel</SecondaryButton>
      </div>
    </Screen>
  )
}
