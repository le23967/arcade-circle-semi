import { useEffect, useId, useMemo, useRef, useState } from 'react'
import {
  Screen,
  TopBar,
  Body,
  PrimaryButton,
  SecondaryButton,
  Seg,
  Avatar,
  GameDot,
} from '../components/ui.jsx'
import { Check, Close } from '../components/Icons.jsx'
import { GAMES } from '../data.js'
import { ME } from '../social.js'
import { searchProfiles, hueFromProfile, describeError } from '../lib/accounts.js'
import { formatWhen } from '../lib/time.js'

/* Plan a session.

   Consultation feedback was that presence only pays off when it lets you
   arrange something: knowing where people are is not engagement until it turns
   into a time and a place. This screen is that turn.

   Venue, game, time, and who you are asking - then it lands on their Circle
   tab as an invitation.

   When used to be three hardcoded strings, which is fine for clicking through
   a demo and useless for planning anything: the screen could not express next
   Thursday. Choosing a date and time is therefore the main control: the date
   uses the platform's familiar typed/calendar field, while hour and minute can
   be typed or moved with phone-style wheels. Common times remain as clearly
   labelled shortcuts rather than being mixed with the custom choice.

   Who can come is a choice of its own. Asking the people you follow is the
   default, and it is also useless to somebody whose list is empty - which
   every player is on their first day, and which the interviews suggest the
   introverted ones stay for a long time. Opening a session to anyone on the
   app is the way round that: it is posted on Open, where people you have
   never met can see it and say they are in. The host still decides. Nothing
   about a closed session changes.

   The people here are real accounts: the ones you follow, and anyone you
   search for by username. Sessions themselves are still kept on this phone,
   so asking someone would have reached nobody - which is the kind of button
   this project has been removing. So each real person you ask gets the
   session as a message, through the same conversation their profile opens:
   an ordinary message if you follow each other, a request if not. What they
   get is the plan in one line and the question; what you get is a
   conversation to settle it in. */

export default function PlanSession({
  arcades,
  preset,
  me = ME,
  /* The signed-in account, its real follow graph, and the way to reach a
     real person. Without an account the picker can only search nobody. */
  myId = null,
  follows = null,
  onSendInvite = null,
  onPlanned,
  onBack,
  onDone,
}) {
  const [venue, setVenue] = useState(preset?.venue ?? arcades[0]?.id)
  const [gameId, setGameId] = useState(preset?.gameId ?? 'maimai')
  /* Computed once, so the options do not shift under the user mid-plan. */
  const [now] = useState(() => new Date())
  const quickPicks = useMemo(() => presetTimes(now), [now])
  const [when, setWhen] = useState(preset?.when ?? quickPicks[0])
  const [pickerOpen, setPickerOpen] = useState(false)
  const pickerTriggerRef = useRef(null)
  const [invited, setInvited] = useState(
    preset?.invited ?? (preset?.invite ? [preset.invite] : [])
  )
  /* The real accounts behind the handles in `invited`, so a person picked
     from a search stays on screen after the search is cleared, and so the
     invitation knows who to message. A handle with no profile here is a
     seeded sample player carried in from the prototype. */
  const [picked, setPicked] = useState(
    () => new Map((preset?.invitedProfiles ?? []).map((p) => [p.handle, p]))
  )
  /* Open to anyone on the app, or only to the people asked. */
  const [open, setOpen] = useState(Boolean(preset?.open))
  const [note, setNote] = useState(preset?.note ?? '')
  const [sending, setSending] = useState(false)
  const [saveError, setSaveError] = useState(null)
  /* Once sent: who was messaged, and what went wrong for anyone it did not
     reach. Null until then. */
  const [delivery, setDelivery] = useState(null)

  /* Finding people by username, the same search as Add someone. */
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState(null)
  const trimmed = query.trim()

  useEffect(() => {
    if (!myId || trimmed === '') return undefined
    let active = true
    const timer = window.setTimeout(() => {
      setSearching(true)
      searchProfiles(trimmed, myId)
        .then((list) => {
          if (!active) return
          setResults(list)
          setSearchError(null)
        })
        .catch((e) => {
          if (active) setSearchError(describeError(e, 'Search did not go through.'))
        })
        .finally(() => {
          if (active) setSearching(false)
        })
    }, 250)
    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [trimmed, myId])

  /* Reopened on a session that already exists, rather than starting a new one.
     Sending then replaces it instead of leaving two. */
  const editing = Boolean(preset?.editingId)

  const arcade = arcades.find((a) => a.id === venue) ?? arcades[0]
  /* The people you follow, as the standing list. */
  const following = follows?.following ?? []
  const allAsked =
    following.length > 0 && following.every((p) => invited.includes(p.handle))
  const shown = trimmed === '' ? following : results

  function toggle(profile) {
    const on = invited.includes(profile.handle)
    setInvited((v) => (on ? v.filter((h) => h !== profile.handle) : [...v, profile.handle]))
    setPicked((m) => {
      const next = new Map(m)
      if (on) next.delete(profile.handle)
      else next.set(profile.handle, profile)
      return next
    })
  }

  function remove(handle) {
    setInvited((v) => v.filter((h) => h !== handle))
    setPicked((m) => {
      const next = new Map(m)
      next.delete(handle)
      return next
    })
  }

  function toggleAll() {
    if (allAsked) {
      setInvited((v) => v.filter((h) => !following.some((p) => p.handle === h)))
      setPicked((m) => {
        const next = new Map(m)
        for (const p of following) next.delete(p.handle)
        return next
      })
    } else {
      setInvited((v) => [...new Set([...v, ...following.map((p) => p.handle)])])
      setPicked((m) => {
        const next = new Map(m)
        for (const p of following) next.set(p.handle, p)
        return next
      })
    }
  }

  function closePicker() {
    setPickerOpen(false)
    window.requestAnimationFrame(() => pickerTriggerRef.current?.focus())
  }

  /* An open session can be posted with nobody asked - that is the point of
     it. A closed one with nobody asked would reach no one. */
  const canSend = (open || invited.length > 0) && !sending
  const gameLabel = GAMES.find((g) => g.id === gameId)?.label ?? gameId

  /* The plan in one line, for the people it is sent to. The date is spelt
     out rather than "Tonight": it is read on someone else's phone, maybe
     tomorrow. */
  const planLine = `${arcade?.short ?? 'An arcade'}, ${INVITE_DATE.format(when)}, ${gameLabel}.${
    note.trim() ? ` ${note.trim()}` : ''
  }`
  const inviteText = `${planLine} Are you in?`
  const changeText = `Change of plan: ${planLine} Still in?`
  /* Whether a session being changed is different in a way the people on
     it need to hear about. */
  const changed =
    editing &&
    ((preset?.when && new Date(preset.when).getTime() !== when.getTime()) ||
      preset?.venue !== venue ||
      preset?.gameId !== gameId ||
      (preset?.note ?? '') !== note.trim())

  async function sendInvites() {
    if (!canSend) return
    if (when.getTime() <= Date.now()) {
      setPickerOpen(true)
      return
    }
    setSending(true)
    setSaveError(null)
    /* The session itself: stored and shared when signed in, kept on this
       phone when not. Either way it lands on Later. */
    const realInvitees = invited.map((h) => picked.get(h)).filter(Boolean)
    const saved = await onPlanned?.(
      {
        id: preset?.editingId ?? `ps-${Date.now()}`,
        mine: true,
        host: me.handle,
        venue,
        gameId,
        /* The Date is kept as well as the label, so reopening this session for a
           change can start the picker where it already is. */
        when,
        whenLabel: formatWhen(when, now),
        /* Asked is not the same as coming: nobody has answered yet. */
        going: [me.handle],
        asked: invited,
        invitedMe: false,
        open,
        note: note.trim(),
      },
      { inviteeIds: realInvitees.map((p) => p.id), editingId: preset?.editingId ?? null }
    )
    if (saved?.error) {
      setSaveError(saved.error)
      setSending(false)
      return
    }

    /* Then the people. Newly asked get the plan; anyone already on a
       session that has changed gets the change. Failures are reported per
       person; the session itself is already saved. */
    const already = new Set((preset?.invitedProfiles ?? []).map((p) => p.handle))
    const outcomes = []
    if (onSendInvite) {
      for (const profile of realInvitees) {
        const isNew = !already.has(profile.handle)
        if (!isNew && !changed) continue
        const result = await onSendInvite(profile, isNew ? inviteText : changeText)
        outcomes.push({ handle: profile.handle, error: result?.error ?? null, told: isNew ? 'asked' : 'told' })
      }
    }
    setSending(false)
    setDelivery(outcomes)
  }

  if (delivery) {
    const reached = delivery.filter((d) => !d.error)
    const failed = delivery.filter((d) => d.error)
    const samples = invited.filter((h) => !picked.has(h))
    return (
      <Screen>
        <TopBar
          title={editing ? 'Session updated' : open ? 'Session posted' : 'Session planned'}
          onBack={() => onDone(open)}
        />
        <Body className="flex flex-col items-center justify-center p-6 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-fresh-bg text-fresh">
            <Check size={32} />
          </span>
          <p className="mt-4 font-display text-xl font-semibold text-ink">
            {editing ? 'Changes sent' : open ? 'Open to anyone' : 'Invitation sent'}
          </p>
          <p className="mt-1 text-sm text-ink-muted">
            {arcade?.short} &middot; {formatWhen(when, now)}
          </p>
          <p className="mt-1 text-xs text-ink-subtle">
            {open ? 'Open to anyone · ' : ''}Change it any time in Plans
          </p>

          {/* Who it actually reached. A message is the only thing that
              leaves this phone, so that is what is reported. */}
          {(reached.length > 0 || failed.length > 0 || samples.length > 0) && (
            <div className="mt-4 w-full rounded-xl border border-line bg-sunken px-3 py-2.5 text-left text-xs leading-relaxed text-ink-muted">
              {reached.length > 0 && (
                <p className="font-semibold text-ink">
                  Sent to {reached.map((d) => d.handle).join(', ')}
                </p>
              )}
              {failed.map((d) => (
                <p key={d.handle} role="alert" className="mt-1 font-medium text-live">
                  {d.handle}: {d.error}
                </p>
              ))}
              {samples.length > 0 && (
                <p className="mt-1">Not sent to {samples.join(', ')}</p>
              )}
            </div>
          )}
          <div className="mt-6 w-full">
            <PrimaryButton onClick={() => onDone(open)}>Done</PrimaryButton>
          </div>
        </Body>
      </Screen>
    )
  }

  return (
    <Screen>
      <TopBar
        title={editing ? 'Change the session' : 'Plan a session'}
        onBack={onBack}
      />

      <Body>
        <Section title="Where">
          <div className="flex flex-wrap gap-1.5">
            {arcades.map((a) => (
              <Seg key={a.id} on={a.id === venue} onClick={() => setVenue(a.id)}>
                {a.short}
              </Seg>
            ))}
          </div>
        </Section>

        <Section title="What">
          <div className="flex flex-wrap gap-1.5">
            {GAMES.map((g) => (
              <Seg
                key={g.id}
                on={g.id === gameId}
                accent={g.color}
                onClick={() => setGameId(g.id)}
              >
                {g.label}
              </Seg>
            ))}
          </div>
        </Section>

        <Section title="When">
          <button
            ref={pickerTriggerRef}
            type="button"
            onClick={() => setPickerOpen(true)}
            aria-label={`Choose date and time. Currently ${formatWhen(when, now)}`}
            className="flex w-full items-center gap-3 rounded-2xl border border-brand-200 bg-brand-50 px-3 py-2.5 text-left transition-all duration-150 hover:border-brand-400 hover:bg-brand-100 active:scale-[0.99]"
          >
            <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-surface text-brand-600 shadow-sm">
              <CalendarGlyph />
            </span>
            {/* The row states the time it holds rather than naming the action.
                Reading "Choose your date and time" back after pressing Done
                looks like nothing was saved, since the section has nothing else
                that changes: a custom time matches none of the chips below. */}
            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">
              {formatWhen(when, now)}
            </span>
            <span className="text-brand-600" aria-hidden="true">
              <ChevronGlyph />
            </span>
          </button>

          <div className="mb-1.5 mt-3 flex items-center gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
              Quick picks
            </p>
            <span className="h-px flex-1 bg-line" />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {quickPicks.map((t) => (
              <Seg
                key={t.getTime()}
                on={t.getTime() === when.getTime()}
                onClick={() => setWhen(t)}
              >
                {formatWhen(t, now)}
              </Seg>
            ))}
          </div>
        </Section>

        <Section title="Who can come">
          <div className="flex flex-wrap gap-1.5">
            <Seg on={!open} onClick={() => setOpen(false)}>
              People I ask
            </Seg>
            <Seg on={open} onClick={() => setOpen(true)}>
              Anyone on the app
            </Seg>
          </div>
        </Section>

        <Section title="Note, optional">
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={80}
            placeholder={
              open
                ? 'e.g. Any level welcome, doubles if enough of us'
                : 'e.g. Doubles for the extra song, then dinner'
            }
            aria-label="Note for the session"
            className="w-full rounded-xl border border-line-strong bg-surface px-3 py-2.5 text-sm text-ink outline-none transition-colors duration-150 placeholder:text-ink-subtle focus:border-brand-500"
          />
        </Section>

        <Section
          title={open ? `Also ask, ${invited.length} asked` : `Who, ${invited.length} asked`}
          action={
            following.length > 0 && trimmed === '' ? (
              <button
                type="button"
                onClick={toggleAll}
                className="min-h-[32px] rounded-md px-1 text-xs font-semibold text-brand-600 transition-colors duration-150 hover:text-brand-700"
              >
                {allAsked ? 'Clear' : 'Select all'}
              </button>
            ) : null
          }
        >
          {invited.length > 0 && (
            <ul className="mb-3 flex flex-wrap gap-1.5" aria-label="Asked">
              {invited.map((h) => (
                <li key={h}>
                  <span className="inline-flex items-center gap-1 rounded-full border border-brand-200 bg-brand-50 py-0.5 pl-2 pr-0.5 text-xs font-semibold text-brand-700">
                    {h}
                    <button
                      type="button"
                      onClick={() => remove(h)}
                      aria-label={`Remove ${h}`}
                      className="flex h-6 w-6 items-center justify-center rounded-full text-brand-700 transition-colors duration-150 hover:bg-brand-100"
                    >
                      <Close size={13} />
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}

          <label htmlFor="plan-search" className="sr-only">
            Search by username
          </label>
          <input
            id="plan-search"
            name="username"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={myId ? 'Search by username…' : 'Sign in to search people'}
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            disabled={!myId}
            className="min-h-[44px] w-full rounded-xl border border-line-strong bg-surface px-3 py-2.5 text-sm text-ink outline-none transition-colors duration-150 placeholder:text-ink-subtle focus:border-brand-500 disabled:bg-sunken"
          />

          {trimmed !== '' && (
            <p role="status" className="mt-2 text-xs text-ink-muted">
              {searchError
                ? searchError
                : searching
                  ? 'Searching…'
                  : results.length === 0
                    ? `No account matches “${trimmed}”.`
                    : `${results.length} ${results.length === 1 ? 'account' : 'accounts'} matching “${trimmed}”`}
            </p>
          )}
          {trimmed === '' && myId && following.length === 0 && (
            <p className="mt-2 text-xs leading-relaxed text-ink-muted">
              Search a username to ask someone.
            </p>
          )}
          {trimmed === '' && !myId && (
            <p className="mt-2 text-xs leading-relaxed text-ink-muted">
              Asking people needs an account.
            </p>
          )}

          <ul className="-mx-1 mt-1">
            {shown.map((p) => {
              const on = invited.includes(p.handle)
              const rel = follows?.relationship(p.id)
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => toggle(p)}
                    aria-pressed={on}
                    className={`flex min-h-[48px] w-full items-center gap-3 rounded-xl px-1 py-2 text-left transition-colors duration-150 ${
                      on ? 'bg-brand-50' : 'hover:bg-sunken'
                    }`}
                  >
                    <Avatar handle={p.handle} hue={hueFromProfile(p)} size={32} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-ink">
                        {p.handle}
                      </span>
                      <span className="block truncate text-xs text-ink-muted">
                        {rel?.mutual
                          ? 'You follow each other'
                          : rel?.youFollow
                            ? 'You follow them · gets a request'
                            : 'Gets a request'}
                      </span>
                    </span>
                    <span
                      className={`flex h-5 w-5 flex-none items-center justify-center rounded-full border transition-colors duration-150 ${
                        on
                          ? 'border-brand-600 bg-brand-600 text-white'
                          : 'border-line-strong bg-surface'
                      }`}
                    >
                      {on && <Check size={13} />}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </Section>
      </Body>

      <div className="space-y-2 border-t border-line p-4">
        <div className="flex items-center gap-2 rounded-xl bg-sunken px-3 py-2">
          <GameDot color={GAMES.find((g) => g.id === gameId)?.color} />
          <p className="text-xs text-ink-muted">
            {arcade?.short} &middot; {formatWhen(when, now)}
          </p>
        </div>
        <div aria-live="polite">
          {saveError && (
            <p role="alert" className="rounded-xl bg-live-bg px-3 py-2.5 text-xs font-medium text-live">
              {saveError}
            </p>
          )}
        </div>
        <PrimaryButton disabled={!canSend} onClick={sendInvites}>
          {sending
            ? 'Sending…'
            : !canSend
            ? 'Pick who to ask'
            : editing
              ? 'Save changes'
              : open
                ? invited.length > 0
                  ? `Post it open and ask ${invited.length}`
                  : 'Post it open to anyone'
                : `Send to ${invited.length}`}
        </PrimaryButton>
        <SecondaryButton onClick={onBack}>Cancel</SecondaryButton>
      </div>

      {pickerOpen && (
        <DateTimeSheet
          initial={when}
          now={now}
          onCancel={closePicker}
          onDone={(picked) => {
            setWhen(picked)
            closePicker()
          }}
        />
      )}
    </Screen>
  )
}

/* --- time -----------------------------------------------------------------

   Real Date objects rather than labels, so a quick pick and a picked time are
   the same kind of thing and one formatter renders both. --------------------- */
/* Weekday, date and time, in the reader's own locale. */
const INVITE_DATE = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
})

function at(from, hours, minutes, addDays = 0) {
  const date = new Date(from)
  date.setDate(date.getDate() + addDays)
  date.setHours(hours, minutes, 0, 0)
  return date
}

/* Tonight, tomorrow afternoon, and the coming Saturday - the three shapes a
   session actually takes. Each one is pushed forward if it has already been
   and gone, so a quick pick is never a time in the past. */
function presetTimes(now) {
  const tonight = at(now, 18, 30)
  if (tonight <= now) tonight.setDate(tonight.getDate() + 1)

  const daysToSaturday = (6 - now.getDay() + 7) % 7 || 7

  return [tonight, at(now, 14, 0, 1), at(now, 13, 0, daysToSaturday)]
}

function dateKey(date) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function dateFromKey(key, time) {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(
    year,
    month - 1,
    day,
    time.getHours(),
    time.getMinutes(),
    0,
    0
  )
}

function withHour(date, hour12) {
  const next = new Date(date)
  const afternoon = date.getHours() >= 12
  next.setHours((hour12 % 12) + (afternoon ? 12 : 0))
  return next
}

function withMinute(date, minute) {
  const next = new Date(date)
  next.setMinutes(minute)
  return next
}

function withPeriod(date, period) {
  const next = new Date(date)
  const hour12 = date.getHours() % 12
  next.setHours(hour12 + (period === 'PM' ? 12 : 0))
  return next
}

function DateTimeSheet({ initial, now, onCancel, onDone }) {
  const titleId = useId()
  const dateInputId = useId()
  const dialogRef = useRef(null)
  /* The draft is held here rather than on the screen underneath. It used to
     live on Plan a session, so every number a wheel passed re-rendered the
     venue chips, the game chips and all eight invitee avatars as well. */
  const [value, setValue] = useState(initial)
  const [currentTime, setCurrentTime] = useState(() => new Date())
  const [dateInput, setDateInput] = useState(() => dateKey(initial))
  const [timeEntriesValid, setTimeEntriesValid] = useState({
    hour: true,
    minute: true,
  })
  const hours = useMemo(
    () => Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: i + 1 })),
    []
  )
  const minutes = useMemo(
    () =>
      Array.from({ length: 60 }, (_, i) => ({
        value: i,
        label: String(i).padStart(2, '0'),
      })),
    []
  )
  const periods = useMemo(
    () => [
      { value: 'AM', label: 'AM' },
      { value: 'PM', label: 'PM' },
    ],
    []
  )
  const dateComplete = Boolean(dateInput)
  const timeComplete = timeEntriesValid.hour && timeEntriesValid.minute
  const future = dateComplete && timeComplete && value.getTime() > currentTime.getTime()
  const error = !dateComplete
    ? 'Type or choose a date to continue.'
    : !timeComplete
      ? 'Enter an hour from 1–12 and a minute from 00–59.'
      : !future
        ? 'Choose a time in the future to continue.'
        : ''

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCancel()
        return
      }
      if (event.key !== 'Tab' || !dialogRef.current) return

      const focusable = Array.from(
        dialogRef.current.querySelectorAll(
          'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      )
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (!first || !last) return

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      } else if (!dialogRef.current.contains(document.activeElement)) {
        event.preventDefault()
        const returnTarget = event.shiftKey ? last : first
        returnTarget.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onCancel])

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(new Date()), 30_000)
    return () => window.clearInterval(timer)
  }, [])

  function finish() {
    const latest = new Date()
    setCurrentTime(latest)
    if (dateComplete && timeComplete && value.getTime() > latest.getTime()) onDone(value)
  }

  return (
    <div
      className="anim-scrim absolute inset-0 z-30 flex items-end bg-ink/40"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onCancel()
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="anim-sheet max-h-[calc(100%-1rem)] w-full overflow-y-auto overscroll-contain rounded-t-[24px] border-t border-line bg-surface pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl"
      >
        <span className="mx-auto mt-2 block h-1 w-10 rounded-full bg-line-strong" />
        <div className="grid grid-cols-[64px_1fr_64px] items-center border-b border-line px-3 pb-2 pt-1">
          <button
            type="button"
            autoFocus
            onClick={onCancel}
            className="justify-self-start rounded-lg px-1 py-2 text-sm font-medium text-brand-600"
          >
            Cancel
          </button>
          <h2 id={titleId} className="text-center font-display text-sm font-semibold text-ink">
            Choose date and time
          </h2>
          <button
            type="button"
            disabled={!future}
            onClick={finish}
            className="justify-self-end rounded-lg px-1 py-2 text-sm font-semibold text-brand-600 disabled:text-ink-subtle"
          >
            Done
          </button>
        </div>

        <p className="mx-4 mt-3 rounded-xl bg-brand-50 px-3 py-2 text-center text-sm font-semibold text-brand-700">
          {formatWhen(value, now)}
        </p>

        <div className="px-4 pt-3">
          <label
            htmlFor={dateInputId}
            className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-ink-muted"
          >
            Date
          </label>
          <input
            id={dateInputId}
            type="date"
            value={dateInput}
            min={dateKey(currentTime)}
            required
            aria-invalid={!dateComplete}
            onChange={(event) => {
              const next = event.target.value
              setDateInput(next)
              if (next) setValue(dateFromKey(next, value))
            }}
            className="h-11 w-full rounded-xl border border-line-strong bg-surface px-3 font-display text-sm font-semibold text-ink outline-none transition-colors duration-150 focus:border-brand-500"
          />
        </div>

        <div className="px-4 pt-3">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
            Time
          </p>
          <div className="grid grid-cols-[minmax(0,1fr)_12px_minmax(0,1fr)_104px] items-end gap-2">
            <WheelColumn
              label="Hour"
              options={hours}
              value={value.getHours() % 12 || 12}
              min={1}
              max={12}
              onChange={(next) => setValue((current) => withHour(current, next))}
              onValidityChange={(valid) =>
                setTimeEntriesValid((state) =>
                  state.hour === valid ? state : { ...state, hour: valid }
                )
              }
            />
            <span
              className="flex h-[120px] items-center justify-center font-display text-lg font-semibold text-ink-muted"
              aria-hidden="true"
            >
              :
            </span>
            <WheelColumn
              label="Minute"
              options={minutes}
              value={value.getMinutes()}
              min={0}
              max={59}
              onChange={(next) => setValue((current) => withMinute(current, next))}
              onValidityChange={(valid) =>
                setTimeEntriesValid((state) =>
                  state.minute === valid ? state : { ...state, minute: valid }
                )
              }
            />
            <fieldset className="min-w-0">
              <legend className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-ink-subtle">
                AM/PM
              </legend>
              <div className="flex h-[120px] items-center rounded-xl bg-sunken p-1">
                <div className="grid h-11 w-full grid-cols-2 rounded-xl bg-surface/50 p-1">
                  {periods.map((period) => {
                    const selected = value.getHours() >= 12 ? 'PM' : 'AM'
                    const on = period.value === selected
                    return (
                      <button
                        key={period.value}
                        type="button"
                        aria-pressed={on}
                        onClick={() => setValue(withPeriod(value, period.value))}
                        className={`rounded-lg text-xs font-semibold transition-colors duration-150 ${
                          on
                            ? 'bg-surface text-brand-700 shadow-sm'
                            : 'text-ink-muted hover:text-ink'
                        }`}
                      >
                        {period.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            </fieldset>
          </div>
        </div>

        {error && (
          <p
            className="px-4 pt-2 text-center text-[11px] font-medium text-live"
            role="alert"
          >
            {error}
          </p>
        )}
      </div>
    </div>
  )
}

const WHEEL_ROW_HEIGHT = 40
const formatWheelValue = (number) => String(number).padStart(2, '0')

/* A wheel where the browser owns the scroll position.

   Writing scrollTop back from an effect cancels the platform's momentum the
   moment the two disagree about where the list is, which is what made a flick
   stall. The position is sampled once a frame instead, and only written back
   for a change that did not come from this wheel.

   The centred row also paints its own number now. Drawing it from the input
   overlay instead left the digit a render behind the scroll, so it arrived
   late and read as the number itself stuttering; the input stays transparent
   until it is focused for typing. */
function WheelColumn({
  label,
  options,
  value,
  min,
  max,
  onChange,
  onValidityChange,
}) {
  const listRef = useRef(null)
  const inputRef = useRef(null)
  const frame = useRef(0)
  const settle = useRef(0)
  const holding = useRef(false)
  const reported = useRef(value)
  const [text, setText] = useState(() => formatWheelValue(value))
  const number = Number(text)
  const valid = text !== '' && Number.isInteger(number) && number >= min && number <= max
  const activeIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value)
  )

  useEffect(() => {
    reported.current = value
    if (document.activeElement !== inputRef.current) {
      setText(formatWheelValue(value))
    }
  }, [value])

  useEffect(() => {
    const list = listRef.current
    if (!list || holding.current) return
    const top = activeIndex * WHEEL_ROW_HEIGHT
    if (Math.abs(list.scrollTop - top) > 1) list.scrollTop = top
  }, [activeIndex])

  useEffect(
    () => () => {
      window.cancelAnimationFrame(frame.current)
      window.clearTimeout(settle.current)
    },
    []
  )

  function sampleScroll() {
    frame.current = 0
    const list = listRef.current
    if (!list) return
    const index = Math.min(
      Math.max(Math.round(list.scrollTop / WHEEL_ROW_HEIGHT), 0),
      options.length - 1
    )
    const next = options[index].value
    if (next === reported.current) return
    reported.current = next
    onValidityChange(true)
    onChange(next)
  }

  /* Keep the re-centring effect off for a beat after the last scroll event, so
     the snap at the end of a flick finishes on its own terms. */
  function hold(ms) {
    holding.current = true
    window.clearTimeout(settle.current)
    settle.current = window.setTimeout(() => {
      holding.current = false
    }, ms)
  }

  function handleScroll() {
    hold(160)
    if (!frame.current) frame.current = window.requestAnimationFrame(sampleScroll)
  }

  /* Anything that sets the value from outside the gesture moves the list here
     rather than leaving it to the effect, which would jump instead of glide. */
  function glideTo(next, smooth) {
    const index = Math.max(0, options.findIndex((option) => option.value === next))
    /* An explicit smooth behaviour overrides the CSS scroll-behaviour that the
       reduced-motion block sets, so the setting has to be read here. */
    const glide =
      smooth && !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    hold(glide ? 500 : 160)
    reported.current = next
    listRef.current?.scrollTo({
      top: index * WHEEL_ROW_HEIGHT,
      behavior: glide ? 'smooth' : 'auto',
    })
    setText(formatWheelValue(next))
    onValidityChange(true)
    if (next !== value) onChange(next)
  }

  function choose(index) {
    const nextIndex = Math.min(Math.max(index, 0), options.length - 1)
    glideTo(options[nextIndex].value, true)
  }

  function commit() {
    if (valid) {
      glideTo(number, false)
      return
    }
    setText(formatWheelValue(value))
    onValidityChange(true)
  }

  function step(direction) {
    const start = valid ? number : value
    glideTo(Math.min(Math.max(start + direction, min), max), false)
  }

  function beginTyping() {
    inputRef.current?.focus({ preventScroll: true })
    inputRef.current?.select()
  }

  /* The rows carry no per-row handler, so a pass over sixty minutes does not
     rebuild sixty closures. The click is read off the row that was hit. */
  const rows = useMemo(
    () =>
      options.map((option, index) => (
        <div
          key={option.value}
          data-index={index}
          className={`flex h-10 snap-center items-center justify-center truncate px-1 text-center tabular-nums ${
            index === activeIndex
              ? 'cursor-text font-display text-sm font-semibold text-ink'
              : 'cursor-pointer text-xs text-ink-muted'
          }`}
        >
          {option.label}
        </div>
      )),
    [options, activeIndex]
  )

  return (
    <div className="min-w-0">
      <p className="mb-1 truncate text-center text-[10px] font-semibold uppercase tracking-wide text-ink-subtle">
        {label}
      </p>
      <div className="relative overflow-hidden rounded-xl bg-sunken">
        <span className="pointer-events-none absolute inset-x-1 top-1/2 z-0 h-10 -translate-y-1/2 rounded-lg border-y border-brand-200 bg-brand-50" />
        <span className="pointer-events-none absolute inset-x-0 top-0 z-20 h-8 bg-gradient-to-b from-sunken to-transparent" />
        <span className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-8 bg-gradient-to-t from-sunken to-transparent" />
        <div
          ref={listRef}
          aria-hidden="true"
          onPointerDown={() => inputRef.current?.blur()}
          onWheel={() => inputRef.current?.blur()}
          onScroll={handleScroll}
          onClick={(event) => {
            const row = event.target.closest('[data-index]')
            if (!row) return
            const index = Number(row.dataset.index)
            if (index === activeIndex) beginTyping()
            else choose(index)
          }}
          className="no-scrollbar relative z-10 h-[120px] touch-pan-y snap-y snap-mandatory overflow-y-auto overscroll-contain py-10"
        >
          {rows}
        </div>
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          role="spinbutton"
          maxLength={2}
          value={text}
          required
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={valid ? number : undefined}
          aria-invalid={!valid}
          aria-label={`${label}, swipe to adjust or type a number from ${min} to ${max}`}
          onFocus={(event) => event.currentTarget.select()}
          onChange={(event) => {
            const next = event.target.value.replace(/\D/g, '').slice(0, 2)
            const nextNumber = Number(next)
            const nextValid =
              next !== '' &&
              Number.isInteger(nextNumber) &&
              nextNumber >= min &&
              nextNumber <= max

            setText(next)
            onValidityChange(nextValid)
            if (nextValid) onChange(nextNumber)
          }}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.blur()
            if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
              event.preventDefault()
              step(event.key === 'ArrowUp' ? 1 : -1)
            } else if (event.key === 'Home') {
              event.preventDefault()
              choose(0)
            } else if (event.key === 'End') {
              event.preventDefault()
              choose(options.length - 1)
            }
          }}
          className="pointer-events-none absolute left-1/2 top-1/2 z-30 h-9 w-[calc(100%-0.5rem)] max-w-20 -translate-x-1/2 -translate-y-1/2 rounded-md border border-transparent bg-transparent px-1 text-center font-display text-base font-semibold tabular-nums text-transparent caret-brand-600 outline-none focus:border-brand-500 focus:bg-surface focus:text-ink"
        />
      </div>
    </div>
  )
}

function CalendarGlyph() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M7 3v3M17 3v3M4 9h16" />
      <rect x="4" y="5" width="16" height="16" rx="3" />
      <path d="M8 13h3M13 13h3M8 17h3M13 17h3" />
    </svg>
  )
}

function ChevronGlyph() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m9 6 6 6-6 6" />
    </svg>
  )
}

function Section({ title, action, children }) {
  return (
    <div className="border-b border-line px-4 py-3">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
          {title}
        </p>
        {action}
      </div>
      {children}
    </div>
  )
}
