import { useState } from 'react'
import {
  Screen,
  TopBar,
  Body,
  PrimaryButton,
  SecondaryButton,
  Avatar,
} from '../components/ui.jsx'
import { validateHandle, handleAvailable, describeError } from '../lib/accounts.js'

/* Sign in, or create an account.

   One screen with two modes rather than two screens, because the only
   difference is one field and one verb. Everything the person needs to know
   about the app has already been said on the welcome screen; this one asks
   for the least it can - a username, an email, a password - and reports
   what the server said, in the interface, when something goes wrong.

   Sign-up has to cope with a project that confirms email addresses: the
   account exists but there is no session yet, so instead of dropping into an
   app with nobody signed in it says to check the inbox and switches to Sign
   in for when they come back.

   The button sits under the last field, not in a bar at the foot of the
   screen. Two fields and a button are one short form, and putting the
   button a screen-height away from the fields made it read as belonging to
   the page rather than to what had just been typed. What went wrong is said
   in the same place, between the fields and the button that will be tried
   again. */
const INPUT =
  'w-full rounded-xl border px-3 py-2.5 text-sm text-ink outline-none transition-colors duration-150 placeholder:text-ink-subtle'

export default function Auth({
  initialMode = 'signin',
  configured,
  /* Why a stored session could not be restored, if that is how we got here. */
  restoreError = null,
  onSignIn,
  onSignUp,
  onBack,
  onGuest,
}) {
  const [mode, setMode] = useState(initialMode)
  const [handle, setHandle] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)

  const signup = mode === 'signup'
  const handleCheck = validateHandle(handle)
  const handleProblem = signup && handle !== '' && !handleCheck.ok ? handleCheck.problem : null
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  /* The button stays live until a request is in flight. What is missing is
     said on submit, next to the field, with focus moved to it - a button
     that will not press, with no word about why, is the worse of the two. */
  const ready = configured && !busy

  function switchMode(next) {
    setMode(next)
    setError(null)
    setNotice(null)
  }

  function focusField(id) {
    document.getElementById(id)?.focus()
  }

  async function submit(event) {
    event?.preventDefault()
    if (!ready) return
    setNotice(null)
    if (signup && !handleCheck.ok) {
      setError(handleCheck.problem)
      focusField('auth-handle')
      return
    }
    if (!emailOk) {
      setError(email.trim() === '' ? 'Enter your email address.' : 'That email address does not look right.')
      focusField('auth-email')
      return
    }
    if (password.length === 0) {
      setError(signup ? 'Choose a password.' : 'Enter your password.')
      focusField('auth-password')
      return
    }
    setBusy(true)
    setError(null)
    try {
      if (signup) {
        /* Checked up front so a taken handle is a sentence under the field
           rather than a placeholder username after the fact. */
        const free = await handleAvailable(handleCheck.handle)
        if (!free) {
          setError(`${handleCheck.handle} is already taken.`)
          return
        }
        const result = await onSignUp({
          email: email.trim(),
          password,
          handle: handleCheck.handle,
        })
        if (result.error) {
          setError(result.error)
          return
        }
        if (result.needsConfirmation) {
          setNotice('Confirm your email, then sign in')
          setMode('signin')
          setPassword('')
        }
        /* With confirmation off, the auth listener signs the person in and
           the gate above this screen swaps it out. */
      } else {
        const result = await onSignIn({ email: email.trim(), password })
        if (result.error) setError(result.error)
      }
    } catch (e) {
      setError(describeError(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Screen>
      <TopBar
        title={signup ? 'Create account' : 'Sign in'}
        onBack={onBack}
      />

      <Body className="bg-sunken">
        <form onSubmit={submit} noValidate aria-busy={busy}>
          {signup && (
            <div className="flex flex-col items-center gap-2 border-b border-line bg-surface px-4 py-5">
              <Avatar handle={handleCheck.handle || '?'} size={64} />
              <p className="font-display text-base font-semibold text-ink">
                {handleCheck.handle || 'Your username'}
              </p>
            </div>
          )}

          <div className="border-b border-line bg-surface px-4 py-4">
            <div className="space-y-4">
              {signup && (
                <Field
                  id="auth-handle"
                  label="Username"
                  hint={handleProblem ?? 'Letters, numbers, _'}
                  problem={Boolean(handleProblem)}
                >
                  <input
                    id="auth-handle"
                    name="username"
                    type="text"
                    value={handle}
                    onChange={(e) => setHandle(e.target.value)}
                    maxLength={16}
                    autoComplete="username"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    disabled={busy}
                    className={`${INPUT} ${
                      handleProblem ? 'border-live focus:border-live' : 'border-line-strong focus:border-brand-500'
                    }`}
                  />
                </Field>
              )}

              <Field id="auth-email" label="Email">
                <input
                  id="auth-email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  inputMode="email"
                  disabled={busy}
                  className={`${INPUT} border-line-strong focus:border-brand-500`}
                />
              </Field>

              <Field
                id="auth-password"
                label="Password"
                hint={signup ? 'At least 6 characters.' : null}
              >
                <input
                  id="auth-password"
                  name="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={signup ? 'new-password' : 'current-password'}
                  disabled={busy}
                  className={`${INPUT} border-line-strong focus:border-brand-500`}
                />
              </Field>
            </div>

            {/* Whatever happened last is said here, between the fields it
                is about and the button that will be tried again. The region
                is always present so a screen reader announces what lands in
                it; empty, it takes no room. */}
            <div aria-live="polite" className="space-y-3 [&:not(:empty)]:mt-4">
              {!configured && (
                <p className="rounded-xl border border-stale bg-stale-bg px-3 py-2.5 text-xs text-ink">
                  Accounts unavailable
                </p>
              )}
              {restoreError && !error && !notice && (
                <p role="alert" className="rounded-xl border border-stale bg-stale-bg px-3 py-2.5 text-xs leading-relaxed text-ink">
                  {restoreError}
                </p>
              )}
              {error && (
                <p role="alert" className="rounded-xl bg-live-bg px-3 py-2.5 text-xs font-medium text-live">
                  {error}
                </p>
              )}
              {notice && (
                <p role="status" className="rounded-xl bg-fresh-bg px-3 py-2.5 text-xs font-medium text-fresh">
                  {notice}
                </p>
              )}
              {busy && (
                <p role="status" className="sr-only">
                  {signup ? 'Creating your account' : 'Signing you in'}
                </p>
              )}
            </div>

            <div className="mt-5 space-y-2">
              <PrimaryButton type="submit" disabled={!ready}>
                {busy
                  ? signup
                    ? 'Creating account…'
                    : 'Signing in…'
                  : signup
                    ? 'Create account'
                    : 'Sign in'}
              </PrimaryButton>
              <SecondaryButton onClick={() => switchMode(signup ? 'signin' : 'signup')} disabled={busy}>
                {signup ? 'Already have an account? Sign in' : 'Need an account? Create one'}
              </SecondaryButton>
              {!configured && onGuest && (
                <button
                  type="button"
                  onClick={onGuest}
                  className="min-h-[44px] w-full rounded-md py-1.5 text-xs font-medium text-ink-muted underline decoration-line-strong underline-offset-2 hover:text-ink"
                >
                  Look around without an account
                </button>
              )}
            </div>
          </div>
        </form>
      </Body>
    </Screen>
  )
}

function Field({ id, label, hint, problem, children }) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-muted"
      >
        {label}
      </label>
      {children}
      {hint && (
        <p className={`mt-1.5 text-xs ${problem ? 'font-medium text-live' : 'text-ink-muted'}`}>
          {hint}
        </p>
      )}
    </div>
  )
}
