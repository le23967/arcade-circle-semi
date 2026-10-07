import { useCallback, useEffect, useRef, useState } from 'react'
import QrScanner from 'qr-scanner'
import {
  Screen,
  TopBar,
  Body,
  PrimaryButton,
  SecondaryButton,
  Info,
  Stat,
  GameDot,
  Sheet,
} from '../components/ui.jsx'
import { Qr, Nfc, User, Users } from '../components/Icons.jsx'
import DevCodeInput from '../components/DevCodeInput.jsx'
import { ARCADES, gameColor, gameLabel } from '../data.js'
import { cameraAvailable, askForCamera, cameraProblem } from '../lib/camera.js'
import { readCheckInCode, resolveCheckIn } from '../lib/checkinLink.js'

/* SCREEN 5 - Scan target.

   The sketch draws the machine with a QR sticker and NFC tag on it and the
   phone reaching towards it. Both reads are real now. Scan QR opens the
   back camera the moment the screen opens - the tap that led here was the
   request - and Tap NFC listens for the tag through Web NFC where the
   browser has it, which today is Chrome on Android. The sticker and the
   tag hold the same link the phone's own camera and NFC reader open with
   the app closed (lib/checkinLink.js), so the code read here is the same
   one, checked the same way.

   A read that names this queue joins it there and then - there is no count
   to confirm first - and the two choices made on the last screen ride
   along as chips rather than as a sentence. A read that names a different
   queue is where the person is actually standing, which beats the screen
   they came from, but two games often stand side by side, so it asks once
   before joining that one instead. Anything else is not a check-in code,
   and the camera keeps looking.

   iPhones, and browsers without Web NFC, read the tag themselves: the
   system opens its link, and the app arrives on it already joining. So the
   NFC screen there says only where to hold the phone. Manual check-in is
   at the foot of both, for a scuffed sticker, a blocked camera or a phone
   without NFC. */
export default function Scan({ arcade, method, party = 'solo', onBack, onJoin, onManual }) {
  const qr = method === 'qr'
  /* A valid code for another queue, waiting for an answer. */
  const [other, setOther] = useState(null)
  /* Something was read that is not a check-in code. */
  const [notCode, setNotCode] = useState(false)
  /* A code once declined is not offered again until a different one is
     read, or the camera, still pointed at it, would reopen the sheet. */
  const declinedRef = useRef(null)
  const joinedRef = useRef(false)

  function read(text) {
    if (joinedRef.current || other) return
    const code = resolveCheckIn(readCheckInCode(text))
    if (code.status !== 'ok') {
      setNotCode(true)
      return
    }
    setNotCode(false)
    if (code.venueId === arcade.id && code.gameId === arcade.gameId) {
      join(code)
      return
    }
    if (declinedRef.current === text) return
    declinedRef.current = null
    setOther({ ...code, text })
  }

  function join(code) {
    if (joinedRef.current) return
    joinedRef.current = true
    onJoin({ venueId: code.venueId, gameId: code.gameId })
  }

  function rescan() {
    declinedRef.current = other?.text ?? null
    setOther(null)
  }

  /* The readers below call the latest version of `read`, without being
     restarted every time this screen renders. */
  const readRef = useRef(read)
  useEffect(() => {
    readRef.current = read
  })
  const onRead = useCallback((text) => readRef.current(text), [])

  const otherVenue = other ? ARCADES.find((a) => a.id === other.venueId) : null

  return (
    <Screen>
      <TopBar
        title={qr ? 'Scan QR' : 'Tap NFC'}
        onBack={onBack}
        right={<Info>Only the arcade is recorded, never your location.</Info>}
      />

      {qr ? (
        <QrReader onRead={onRead} notCode={notCode} onManual={onManual} chips={<Chips arcade={arcade} party={party} />} />
      ) : (
        <NfcReader onRead={onRead} notCode={notCode} onManual={onManual} chips={<Chips arcade={arcade} party={party} />} />
      )}

      {other && (
        <Sheet title="Join this queue?" onClose={rescan}>
          <div className="p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-ink">
              <GameDot color={gameColor(other.gameId)} className="h-2.5 w-2.5" />
              <span className="min-w-0 truncate">
                {otherVenue?.short ?? other.venueId} &middot; {gameLabel(other.gameId)}
              </span>
            </p>
            <div className="mt-4 space-y-2">
              <PrimaryButton onClick={() => join(other)}>Join this queue</PrimaryButton>
              <SecondaryButton onClick={rescan}>{qr ? 'Scan again' : 'Tap again'}</SecondaryButton>
            </div>
          </div>
        </Sheet>
      )}
    </Screen>
  )
}

/* The two choices made on the last screen, as chips. */
function Chips({ arcade, party }) {
  return (
    <div className="mt-6 flex flex-wrap justify-center gap-1.5">
      <Stat pill tone="ink" icon={<GameDot color={arcade.gameColor} />}>
        {arcade.game}
      </Stat>
      <Stat pill tone="ink" icon={party === 'pair' ? <Users size={13} /> : <User size={13} />}>
        {party === 'pair' ? 'With a partner' : 'Solo'}
      </Stat>
    </div>
  )
}

/* The foot both readers share: a retry when the device would not start,
   manual check-in always, and in development a field to paste a code. */
function Foot({ retry, onRetry, onManual, onRead }) {
  return (
    <div className="space-y-1 border-t border-line p-4">
      {retry && <PrimaryButton onClick={onRetry}>Try again</PrimaryButton>}
      <button
        type="button"
        onClick={onManual}
        className="flex min-h-11 w-full items-center justify-center gap-1 text-xs text-ink-muted"
      >
        Can&rsquo;t scan?
        <span className="font-semibold text-ink underline decoration-line-strong underline-offset-2">
          Manual check-in
        </span>
      </button>
      {import.meta.env.DEV && (
        <DevCodeInput label="Development only: paste a check-in code" onCode={onRead} />
      )}
    </div>
  )
}

/* --- QR -------------------------------------------------------------------- */

const CAMERA_WORDS = {
  starting: 'Starting camera…',
  scanning: 'Looking for a code…',
  denied: 'Camera blocked',
  unavailable: 'No camera',
  error: 'Camera unavailable',
}

/* The camera runs until the screen closes. Reads arrive several times a
   second while a code is in view; deciding what they mean is the screen's
   job, so this only passes the text on. */
function QrReader({ onRead, notCode, onManual, chips }) {
  const videoRef = useRef(null)
  const [phase, setPhase] = useState('starting')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    let scanner = null

    async function run() {
      /* Asked for directly first, so a refusal is named as one; see
         lib/camera.js. */
      await Promise.resolve()
      if (cancelled) return
      if (!cameraAvailable()) {
        setPhase('unavailable')
        return
      }
      try {
        await askForCamera()
      } catch (e) {
        if (!cancelled) setPhase(cameraProblem(e))
        return
      }
      if (cancelled || !videoRef.current) return
      scanner = new QrScanner(videoRef.current, (result) => onRead(result.data), {
        returnDetailedScanResult: true,
        preferredCamera: 'environment',
        highlightScanRegion: false,
        highlightCodeOutline: false,
        maxScansPerSecond: 8,
      })
      try {
        await scanner.start()
        if (!cancelled) setPhase('scanning')
      } catch (e) {
        if (!cancelled) setPhase(cameraProblem(e))
      }
    }

    run()
    return () => {
      cancelled = true
      scanner?.destroy()
    }
    /* `onRead` never changes; `attempt` is what restarts the camera. */
  }, [onRead, attempt])

  const scanning = phase === 'scanning'
  const failed = phase === 'denied' || phase === 'unavailable' || phase === 'error'

  return (
    <>
      <Body className="flex flex-col items-center px-6 pt-8">
        <div className="relative aspect-square w-60 overflow-hidden rounded-3xl bg-ink">
          <video
            ref={videoRef}
            muted
            playsInline
            aria-label="Camera preview"
            className={`h-full w-full object-cover ${scanning ? '' : 'invisible'}`}
          />
          {!scanning && (
            <span className="absolute inset-0 flex items-center justify-center text-white/25" aria-hidden="true">
              <Qr size={96} />
            </span>
          )}
          {[
            'left-4 top-4 border-l-4 border-t-4 rounded-tl-xl',
            'right-4 top-4 border-r-4 border-t-4 rounded-tr-xl',
            'bottom-4 left-4 border-b-4 border-l-4 rounded-bl-xl',
            'bottom-4 right-4 border-b-4 border-r-4 rounded-br-xl',
          ].map((c) => (
            <span key={c} className={`absolute h-10 w-10 border-white ${c}`} aria-hidden="true" />
          ))}
          {scanning && (
            <span
              className="anim-sweep absolute inset-x-8 h-0.5 rounded-full bg-brand-400 shadow-[0_0_12px_2px_rgba(129,140,248,0.7)]"
              aria-hidden="true"
            />
          )}
        </div>

        <p
          role="status"
          className={`mt-4 min-h-5 text-sm font-medium ${failed || (scanning && notCode) ? 'text-live' : 'text-ink'}`}
        >
          {scanning && notCode ? 'Not a check-in code' : CAMERA_WORDS[phase]}
        </p>

        {chips}
      </Body>

      <Foot
        retry={failed && phase !== 'unavailable'}
        onRetry={() => {
          setPhase('starting')
          setAttempt((n) => n + 1)
        }}
        onManual={onManual}
        onRead={onRead}
      />
    </>
  )
}

/* --- NFC ------------------------------------------------------------------- */

const NFC_WORDS = {
  starting: 'Starting NFC…',
  scanning: 'Hold your phone to the tag',
  system: 'Hold your phone to the tag',
  denied: 'NFC blocked',
  off: 'NFC is off',
  unsupported: 'No NFC on this phone',
  error: 'NFC unavailable',
  unreadable: 'Couldn’t read that tag',
}

/* Web NFC, where the browser has it. Listening starts as the screen
   opens, still inside the tap on Tap NFC that the browser asks for the
   first time, and stops when the screen closes. A tag carries one or more
   records; the first that holds a check-in link is the one that counts. */
function NfcReader({ onRead, notCode, onManual, chips }) {
  const supported = typeof window !== 'undefined' && 'NDEFReader' in window
  const [phase, setPhase] = useState(supported ? 'starting' : 'system')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!supported) return undefined
    const controller = new AbortController()
    let reader
    try {
      reader = new window.NDEFReader()
    } catch (e) {
      Promise.resolve().then(() => setPhase(nfcProblem(e)))
      return () => controller.abort()
    }
    reader.onreading = (event) => {
      setPhase('scanning')
      onRead(textOf(event.message))
    }
    reader.onreadingerror = () => setPhase('unreadable')
    reader
      .scan({ signal: controller.signal })
      .then(() => {
        if (!controller.signal.aborted) setPhase('scanning')
      })
      .catch((e) => {
        if (!controller.signal.aborted) setPhase(nfcProblem(e))
      })
    return () => controller.abort()
  }, [supported, onRead, attempt])

  const listening = phase === 'scanning' || phase === 'system' || phase === 'unreadable'
  const failed = !listening && phase !== 'starting'

  return (
    <>
      <Body className="flex flex-col items-center px-6 pt-8">
        <div className="relative flex h-60 w-60 items-center justify-center" aria-hidden="true">
          {listening && <span className="anim-ring absolute h-32 w-32 rounded-full bg-brand-200" />}
          <span
            className={`relative flex h-32 w-32 items-center justify-center rounded-full shadow-xl ${
              failed ? 'bg-line text-ink-subtle shadow-none' : 'bg-brand-600 text-white shadow-brand-600/30'
            }`}
          >
            <Nfc size={56} />
          </span>
        </div>

        <p
          role="status"
          className={`mt-4 flex min-h-5 items-center gap-1.5 text-sm font-medium ${
            failed || notCode || phase === 'unreadable' ? 'text-live' : 'text-ink'
          }`}
        >
          {phase !== 'unreadable' && notCode && listening ? 'Not a check-in code' : NFC_WORDS[phase]}
          {phase === 'system' && !notCode && (
            <Info>Your phone opens the tag&rsquo;s link itself and joins from there.</Info>
          )}
          {phase === 'denied' && (
            <Info>Allow NFC for this site in Chrome&rsquo;s site settings, then try again. In-app browsers never allow it.</Info>
          )}
        </p>

        {chips}
      </Body>

      <Foot
        retry={failed && phase !== 'unsupported'}
        onRetry={() => {
          setPhase('starting')
          setAttempt((n) => n + 1)
        }}
        onManual={onManual}
        onRead={onRead}
      />
    </>
  )
}

/* The text a tag's message carries, preferring a record that holds a
   check-in link. A tag written as a smart poster carries its link one
   level down, so that is looked inside too. */
function textOf(message) {
  const texts = textsOf(message?.records ?? [])
  return texts.find((t) => readCheckInCode(t)) ?? texts[0] ?? ''
}

function textsOf(records) {
  const texts = []
  for (const record of records) {
    try {
      if (record.recordType === 'url' || record.recordType === 'absolute-url') {
        texts.push(urlOf(record))
      } else if (record.recordType === 'text') {
        texts.push(textOfRecord(record))
      } else if (record.recordType === 'smart-poster') {
        texts.push(...textsOf(record.toRecords?.() ?? []))
      }
    } catch {
      /* A record that cannot be decoded is not the one we want. */
    }
  }
  return texts
}

function bytesOf(view) {
  return view ? new Uint8Array(view.buffer, view.byteOffset, view.byteLength) : new Uint8Array(0)
}

/* Chrome hands a URL record over with its "https://" already expanded
   from the one-byte code the tag stores. The raw form is read as well, in
   case a browser ever passes it through. */
const URI_PREFIXES = ['', 'http://www.', 'https://www.', 'http://', 'https://']

function urlOf(record) {
  const bytes = bytesOf(record.data)
  if (bytes.length === 0) return ''
  if (bytes[0] < URI_PREFIXES.length) {
    return URI_PREFIXES[bytes[0]] + new TextDecoder().decode(bytes.subarray(1))
  }
  return new TextDecoder().decode(bytes)
}

/* A text record names its own encoding, but Chrome calls big-endian
   UTF-16 "utf-16", which TextDecoder would read as little-endian. */
function textOfRecord(record) {
  const bytes = bytesOf(record.data)
  const encoding = (record.encoding || 'utf-8').toLowerCase()
  if (encoding === 'utf-8') return new TextDecoder('utf-8').decode(bytes)
  const little = encoding === 'utf-16le' || (bytes[0] === 0xff && bytes[1] === 0xfe)
  return new TextDecoder(little ? 'utf-16le' : 'utf-16be').decode(bytes)
}

/* Which sentence to show when listening never starts. Chrome reports a
   refused permission, a dismissed prompt and an in-app browser that never
   allows NFC all the same way, so "blocked" covers the three; NFC switched
   off in Android's settings has a name of its own. */
function nfcProblem(e) {
  const name = e?.name ?? ''
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'denied'
  if (name === 'NotSupportedError') return 'unsupported'
  if (name === 'NotReadableError') return 'off'
  return 'error'
}
