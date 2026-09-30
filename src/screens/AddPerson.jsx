import { useEffect, useMemo, useRef, useState } from 'react'
import QRCode from 'qrcode'
import QrScanner from 'qr-scanner'
import {
  Screen,
  TopBar,
  Body,
  Seg,
  Avatar,
  Chip,
  PrimaryButton,
  SecondaryButton,
} from '../components/ui.jsx'
import PersonRow from '../components/PersonRow.jsx'
import {
  searchProfiles,
  fetchProfile,
  hueFromProfile,
  encodeProfileCode,
  decodeProfileCode,
  describeError,
} from '../lib/accounts.js'

/* Adding somebody.

   Three ways in, and the order is the order people actually use them.
   Search first: most of the time you know a name, or half of one, and a
   field you can type into is the whole task. The earlier version led with
   a camera frame that was a drawing of a camera and hid the search behind
   a link at the foot of the screen, which is the wrong way round even
   before you notice the camera did not work.

   The other two are for the moment the venue flow was built around: you
   are standing next to the person who just handed you the cabinet. Show
   them your code, or scan theirs. Both are real now. Your code is your
   account id and nothing else - it still works after a rename and carries
   nothing private - and scanning uses the camera, asked for only when you
   tap Start camera, with plain words for when it is refused or missing and
   Search a tab away as the fallback.

   Everyone found here is a real account, and Follow writes a real row.
   The seeded players on the map are prototype data and stay out of it. */
export default function AddPerson({ me, myId, configured, follows, onBack, onOpenProfile }) {
  const [tab, setTab] = useState('search')
  const signedIn = Boolean(myId)

  return (
    <Screen>
      <TopBar title="Add someone" onBack={onBack} />

      <div role="tablist" aria-label="Ways to add someone" className="flex gap-1.5 border-b border-line px-4 py-2">
        <Tab id="search" on={tab === 'search'} onClick={() => setTab('search')}>
          Search
        </Tab>
        <Tab id="scan" on={tab === 'scan'} onClick={() => setTab('scan')}>
          Scan QR
        </Tab>
        <Tab id="mine" on={tab === 'mine'} onClick={() => setTab('mine')}>
          My QR
        </Tab>
      </div>

      <div role="tabpanel" id={`add-panel-${tab}`} aria-labelledby={`add-tab-${tab}`} className="flex min-h-0 flex-1 flex-col">
        {tab === 'search' && (
          <SearchTab
            myId={myId}
            configured={configured}
            follows={follows}
            onOpenProfile={onOpenProfile}
          />
        )}
        {tab === 'scan' && (
          <ScanTab
            myId={myId}
            signedIn={signedIn}
            follows={follows}
            onOpenProfile={onOpenProfile}
            onSearchInstead={() => setTab('search')}
          />
        )}
        {tab === 'mine' && <MyCodeTab me={me} signedIn={signedIn} />}
      </div>
    </Screen>
  )
}

function Tab({ id, on, onClick, children }) {
  return (
    <Seg
      on={on}
      onClick={onClick}
      role="tab"
      id={`add-tab-${id}`}
      aria-selected={on}
      aria-controls={`add-panel-${id}`}
      className="min-h-[36px]"
    >
      {children}
    </Seg>
  )
}

/* --- Search ---------------------------------------------------------------- */

function SearchTab({ myId, configured, follows, onOpenProfile }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState(null)
  const [actionError, setActionError] = useState(null)
  const trimmed = query.trim()
  const signedIn = Boolean(myId)

  /* A short pause after the last keystroke, so a handle typed at speed is one
     query rather than one per letter. Stale responses are dropped. */
  useEffect(() => {
    if (!signedIn || trimmed === '') return undefined
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
  }, [trimmed, myId, signedIn])

  async function toggle(profile) {
    setActionError(null)
    const result = await follows.toggle(profile.id)
    if (result?.error) setActionError(result.error)
  }

  const shown = trimmed === '' ? [] : results

  return (
    <>
      <div className="border-b border-line px-4 py-3">
        <label htmlFor="add-search" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-muted">
          Search by username
        </label>
        <input
          id="add-search"
          name="username"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. kenta_13"
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          disabled={!signedIn}
          className="min-h-[44px] w-full rounded-xl border border-line-strong px-3 py-2.5 text-sm text-ink outline-none transition-colors duration-150 placeholder:text-ink-subtle focus:border-brand-500 disabled:bg-sunken"
        />
      </div>

      <Body>
        {!signedIn ? (
          <p className="px-6 py-10 text-center text-xs leading-relaxed text-ink-muted">
            {configured ? 'Sign in to add people' : 'Accounts unavailable'}
          </p>
        ) : trimmed === '' ? null : (
          <>
            <p role="status" className="border-b border-line bg-sunken px-4 py-2 text-xs text-ink-muted">
              {searchError
                ? searchError
                : searching
                  ? 'Searching…'
                  : shown.length === 0
                    ? `No match for “${trimmed}”`
                    : `${shown.length} ${shown.length === 1 ? 'match' : 'matches'}`}
            </p>
            {actionError && (
              <p role="alert" className="border-b border-line bg-live-bg px-4 py-2 text-xs font-medium text-live">
                {actionError}
              </p>
            )}
            <ul>
              {shown.map((p) => (
                <PersonRow
                  key={p.id}
                  person={p}
                  relationship={follows.relationship(p.id)}
                  onOpen={() => onOpenProfile(p)}
                  onToggleFollow={() => toggle(p)}
                />
              ))}
            </ul>
          </>
        )}
      </Body>
    </>
  )
}

/* --- Scan ------------------------------------------------------------------ */

/* The camera is asked for when Start camera is tapped and not before, so the
   permission prompt arrives with a reason on screen. Every way the camera can
   fail to appear gets its own sentence and the same way out: search instead.
   One code is read and the camera stops, so holding a phone up for a second
   too long does not follow the same person twice - and Follow itself is a
   no-op on an edge that already exists. */
function ScanTab({ myId, signedIn, follows, onOpenProfile, onSearchInstead }) {
  const [phase, setPhase] = useState('idle')
  const [found, setFound] = useState(null)
  const [problem, setProblem] = useState(null)
  const [actionError, setActionError] = useState(null)
  const videoRef = useRef(null)
  const scannerRef = useRef(null)
  const foundRef = useRef(null)

  const scanning = phase === 'scanning'

  useEffect(() => {
    if (!scanning || !videoRef.current) return undefined
    let stopped = false
    const scanner = new QrScanner(
      videoRef.current,
      (result) => {
        if (stopped) return
        stopped = true
        scanner.stop()
        foundRef.current?.(result.data)
      },
      {
        returnDetailedScanResult: true,
        preferredCamera: 'environment',
        highlightScanRegion: false,
        highlightCodeOutline: false,
        maxScansPerSecond: 6,
      }
    )
    scannerRef.current = scanner
    scanner.start().catch((e) => {
      if (stopped) return
      stopped = true
      setPhase(cameraProblem(e))
    })
    return () => {
      stopped = true
      scanner.destroy()
      if (scannerRef.current === scanner) scannerRef.current = null
    }
  }, [scanning])

  /* Kept in a ref so the scanner callback above always sees the latest
     version without being recreated on every render. */
  useEffect(() => {
    foundRef.current = async (text) => {
      const id = decodeProfileCode(text)
      if (!id) {
        setProblem('Not an Arcade Circle code')
        setPhase('problem')
        return
      }
      if (id === myId) {
        setProblem('That’s your code')
        setPhase('problem')
        return
      }
      setPhase('resolving')
      try {
        const profile = await fetchProfile(id)
        if (!profile) {
          setProblem('Account not found')
          setPhase('problem')
          return
        }
        setFound(profile)
        setPhase('found')
      } catch (e) {
        setProblem(describeError(e, 'Couldn’t look them up'))
        setPhase('problem')
      }
    }
  }, [myId])

  /* The camera is asked for here, directly, before the scanner gets it.
     The scanning library folds every failure into one "camera not found",
     which would tell someone who has just refused permission that they
     have no camera. Asking first keeps the real reason; the stream is
     released at once and the scanner opens its own, which no longer
     prompts. */
  async function start() {
    setProblem(null)
    setFound(null)
    setActionError(null)
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setPhase('unavailable')
      return
    }
    setPhase('starting')
    try {
      const stream = await navigator.mediaDevices
        .getUserMedia({ video: { facingMode: 'environment' }, audio: false })
        .catch((e) => {
          if (e?.name === 'OverconstrainedError' || e?.name === 'NotFoundError') {
            return navigator.mediaDevices.getUserMedia({ video: true, audio: false })
          }
          throw e
        })
      for (const track of stream.getTracks()) track.stop()
      setPhase('scanning')
    } catch (e) {
      setPhase(cameraProblem(e))
    }
  }

  async function toggleFollow() {
    if (!found) return
    setActionError(null)
    const result = await follows.toggle(found.id)
    if (result?.error) setActionError(result.error)
  }

  if (!signedIn) {
    return (
      <Body>
        <p className="px-6 py-10 text-center text-xs leading-relaxed text-ink-muted">
          Sign in to scan
        </p>
      </Body>
    )
  }

  if (phase === 'found' && found) {
    const rel = follows.relationship(found.id)
    return (
      <>
        <Body className="p-4">
          <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <Avatar handle={found.handle} hue={hueFromProfile(found)} size={52} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-lg font-semibold text-ink">{found.handle}</p>
                <p className="truncate text-xs text-ink-muted">Account</p>
              </div>
              <Chip tone={rel.mutual ? 'brand' : 'quiet'}>{rel.label}</Chip>
            </div>
            {actionError && (
              <p role="alert" className="mt-2 text-xs font-medium text-live">
                {actionError}
              </p>
            )}
          </div>
        </Body>
        <div className="space-y-2 border-t border-line p-4">
          {rel.youFollow ? (
            <SecondaryButton onClick={() => onOpenProfile(found)}>Open profile</SecondaryButton>
          ) : (
            <>
              <PrimaryButton onClick={toggleFollow}>
                {rel.action} {found.handle}
              </PrimaryButton>
              <SecondaryButton onClick={() => onOpenProfile(found)}>Open profile</SecondaryButton>
            </>
          )}
          <button
            type="button"
            onClick={start}
            className="min-h-[44px] w-full rounded-md text-xs font-semibold text-ink-muted underline decoration-line-strong underline-offset-2 hover:text-ink"
          >
            Scan another code
          </button>
        </div>
      </>
    )
  }

  return (
    <>
      <Body className="flex flex-col items-center justify-center p-6 text-center">
        {scanning || phase === 'resolving' || phase === 'starting' ? (
          <div className="relative h-64 w-64 overflow-hidden rounded-2xl border border-line bg-ink">
            <video
              ref={videoRef}
              muted
              playsInline
              aria-label="Camera preview"
              className="h-full w-full object-cover"
            />
            <Corner className="left-3 top-3 rounded-tl-lg border-l-2 border-t-2" />
            <Corner className="right-3 top-3 rounded-tr-lg border-r-2 border-t-2" />
            <Corner className="bottom-3 left-3 rounded-bl-lg border-b-2 border-l-2" />
            <Corner className="bottom-3 right-3 rounded-br-lg border-b-2 border-r-2" />
          </div>
        ) : (
          <div className="relative flex h-40 w-40 items-center justify-center rounded-2xl border border-line bg-sunken">
            <Corner light className="left-3 top-3 rounded-tl-lg border-l-2 border-t-2" />
            <Corner light className="right-3 top-3 rounded-tr-lg border-r-2 border-t-2" />
            <Corner light className="bottom-3 left-3 rounded-bl-lg border-b-2 border-l-2" />
            <Corner light className="bottom-3 right-3 rounded-br-lg border-b-2 border-r-2" />
          </div>
        )}

        <p role="status" className="mt-4 max-w-[260px] text-sm leading-relaxed text-ink">
          {phase === 'starting' && 'Starting camera…'}
          {scanning && 'Looking for a code…'}
          {phase === 'resolving' && 'Looking them up…'}
          {phase === 'denied' && 'Camera blocked'}
          {phase === 'unavailable' && 'No camera'}
          {phase === 'error' && 'Camera unavailable'}
          {phase === 'problem' && problem}
        </p>
      </Body>

      <div className="space-y-2 border-t border-line p-4">
        {scanning ? (
          <SecondaryButton onClick={() => setPhase('idle')}>Stop camera</SecondaryButton>
        ) : phase === 'resolving' || phase === 'starting' ? null : (
          <PrimaryButton onClick={start}>
            {phase === 'idle' ? 'Start camera' : phase === 'problem' ? 'Scan again' : 'Try again'}
          </PrimaryButton>
        )}
        <button
          type="button"
          onClick={onSearchInstead}
          className="min-h-[44px] w-full rounded-md text-xs font-semibold text-brand-700 underline decoration-brand-200 underline-offset-2 hover:decoration-brand-600"
        >
          Search by username
        </button>
        {import.meta.env.DEV && phase !== 'resolving' && phase !== 'starting' && (
          <DevCodeInput onCode={(text) => foundRef.current?.(text)} />
        )}
      </div>
    </>
  )
}

/* Which sentence to show when the camera never appears. The library
   reports a refused permission and a missing camera differently across
   browsers, so both the DOMException name and the message are checked. */
function cameraProblem(e) {
  const name = e?.name ?? ''
  const message = String(e?.message ?? e ?? '')
  if (name === 'NotAllowedError' || name === 'SecurityError' || /permission|denied|not allowed|dismissed/i.test(message))
    return 'denied'
  if (name === 'NotReadableError' || name === 'AbortError') return 'error'
  if (
    name === 'NotFoundError' ||
    name === 'OverconstrainedError' ||
    /camera not found|no camera|not found|requested device/i.test(message)
  )
    return 'unavailable'
  return 'error'
}

/* Development only. A second phone is not always to hand, and a code can be
   pasted as text here to exercise the same path a scan takes. Vite drops
   this from a production build, so nobody sees it who should not. */
function DevCodeInput({ onCode }) {
  const [text, setText] = useState('')
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (text.trim()) onCode(text)
      }}
      className="flex gap-2 rounded-xl border border-dashed border-stale bg-stale-bg p-2"
    >
      <input
        type="text"
        name="dev-code"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Development: paste a code"
        aria-label="Development only: paste a profile code"
        autoComplete="off"
        spellCheck={false}
        className="min-w-0 flex-1 rounded-lg border border-line-strong bg-surface px-2 py-1.5 text-xs text-ink outline-none focus:border-brand-500"
      />
      <button
        type="submit"
        className="rounded-lg border border-line-strong bg-surface px-3 text-xs font-semibold text-ink"
      >
        Use
      </button>
    </form>
  )
}

/* Viewfinder corners: white over the camera picture, grey over the empty
   frame that stands in for it. */
function Corner({ className, light = false }) {
  return (
    <span
      aria-hidden="true"
      className={`absolute h-6 w-6 ${light ? 'border-line-strong' : 'border-white/80'} ${className}`}
    />
  )
}

/* --- My code --------------------------------------------------------------- */

function MyCodeTab({ me, signedIn }) {
  if (!signedIn || !me.id) {
    return (
      <Body>
        <p className="px-6 py-10 text-center text-xs leading-relaxed text-ink-muted">
          Sign in to get your code
        </p>
      </Body>
    )
  }

  return (
    <Body className="flex flex-col items-center justify-center p-6 text-center">
      <QrImage value={encodeProfileCode(me.id)} label={`QR code for ${me.handle}`} />
      <p className="mt-4 font-display text-lg font-semibold text-ink">{me.handle}</p>
    </Body>
  )
}

/* A real code, drawn as one SVG path so it is crisp at any size. Medium error
   correction: enough to survive a scratched screen protector, small enough
   to stay readable at arm's length. */
function QrImage({ value, label }) {
  const quiet = 3
  const { d, total } = useMemo(() => {
    const code = QRCode.create(value, { errorCorrectionLevel: 'M' })
    const size = code.modules.size
    let path = ''
    for (let row = 0; row < size; row += 1) {
      for (let col = 0; col < size; col += 1) {
        if (code.modules.get(row, col)) path += `M${col + quiet} ${row + quiet}h1v1h-1z`
      }
    }
    return { d: path, total: size + quiet * 2 }
  }, [value])

  return (
    <div className="rounded-2xl border border-line bg-surface p-3 shadow-sm">
      <svg
        role="img"
        aria-label={label}
        viewBox={`0 0 ${total} ${total}`}
        width={232}
        height={232}
        shapeRendering="crispEdges"
        className="block"
      >
        <rect width={total} height={total} fill="#ffffff" />
        <path d={d} fill="var(--ink)" />
      </svg>
    </div>
  )
}
