/* Sound.

   Feedback from the Week 6 review listed sound alongside colour, motion and
   type as something this stage should carry, so the prototype has a small
   sound set rather than none.

   Everything is synthesised with the Web Audio API. That keeps the repo free
   of audio files, matches the no-assets rule the rest of the prototype
   follows, and suits a rhythm game app: the cues are short musical intervals
   rather than system beeps.

   The set is deliberately small. An earlier version played a click on every
   button, which is not how apps behave: system interfaces are silent on a
   plain tap. Sound is kept for the two moments that carry information you may
   not be looking at the screen for, plus a confirmation when you switch it
   back on.

   Browsers refuse to start audio before a gesture, so the context is created
   lazily on the first sound and resumed if the browser suspended it. Muting is
   remembered per device. */

const STORAGE_KEY = 'arcade-circle:muted'

let ctx = null
let muted = read()

function read() {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

export function isMuted() {
  return muted
}

export function setMuted(value) {
  muted = value
  try {
    localStorage.setItem(STORAGE_KEY, value ? '1' : '0')
  } catch {
    /* Private browsing can refuse storage. The setting still applies for the
       rest of the session. */
  }
}

function audio() {
  if (typeof window === 'undefined') return null
  const Ctor = window.AudioContext || window.webkitAudioContext
  if (!Ctor) return null
  if (!ctx) ctx = new Ctor()
  /* A queue joined from a check-in link plays its cue as the page opens,
     before anything has been tapped, and some browsers refuse to resume
     then. That is a silent join, not an error. */
  if (ctx.state === 'suspended') ctx.resume()?.catch?.(() => {})
  return ctx
}

/* One short note. Sine keeps it soft enough to sit under a conversation in a
   critique room. */
function note(at, freq, start, length, peak) {
  const osc = at.createOscillator()
  const gain = at.createGain()
  osc.type = 'triangle'
  osc.frequency.setValueAtTime(freq, at.currentTime + start)

  /* A tiny attack and a smooth tail, so nothing clicks. */
  gain.gain.setValueAtTime(0, at.currentTime + start)
  gain.gain.linearRampToValueAtTime(peak, at.currentTime + start + 0.012)
  gain.gain.exponentialRampToValueAtTime(0.0001, at.currentTime + start + length)

  osc.connect(gain).connect(at.destination)
  osc.start(at.currentTime + start)
  osc.stop(at.currentTime + start + length + 0.02)
}

/* Frequencies are a pentatonic run, so any two cues played close together
   still sound like they belong to the same app. */
const CUES = {
  /* You have finished checking in. */
  success: [[523, 0, 0.11, 0.22], [659, 0.085, 0.11, 0.22], [988, 0.17, 0.26, 0.24]],
  /* Your turn, and you are probably looking at something else. */
  alert: [[880, 0, 0.14, 0.26], [660, 0.16, 0.14, 0.24], [880, 0.32, 0.28, 0.26]],
  /* Someone wrote to you. Two notes, quieter than being called up. */
  message: [[659, 0, 0.09, 0.16], [988, 0.09, 0.16, 0.16]],
}

export function playSound(name) {
  if (muted) return
  const cue = CUES[name]
  if (!cue) return
  const at = audio()
  if (!at) return
  try {
    cue.forEach(([freq, start, length, peak]) => note(at, freq, start, length, peak))
  } catch {
    /* Audio is a nicety. It must never break a screen. */
  }
}
