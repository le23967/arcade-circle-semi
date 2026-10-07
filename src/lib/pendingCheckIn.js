import {
  VENUE_PARAM,
  readCheckInCode,
  resolveCheckIn,
  withoutCheckInParams,
} from './checkinLink.js'

/* The check-in link this page was opened with, held until it is used.

   A scan with the phone's own camera, or a tap on an NFC tag, opens the
   app on a link that names a queue. The person may not be signed in yet,
   and signing in can mean leaving the tab - for a password manager, for
   the mail app - which on a phone can reload the page on the way back. So
   the link is read once, taken out of the address bar, and kept in this
   tab's session storage for a few minutes: long enough to sign in, short
   enough that opening the app much later never joins a queue nobody just
   scanned for. Session storage belongs to the tab, so closing it is the
   end of the link too.

   Only links that name something real are kept. One that names nothing
   is still reported once, so the screen can say the code was not
   recognised rather than silently ignoring the tap. */
const STORAGE_KEY = 'arcade-circle:check-in-link'
const KEEP_MS = 10 * 60_000

/* Read at most once per page load: the first reader takes the link out of
   the address bar, and every later one is answered from here. */
let taken

export function takeCheckInLink() {
  if (taken === undefined) taken = fromAddress() ?? fromStorage()
  return taken
}

/* Used, or turned down: either way it is gone, here and in storage. */
export function clearCheckInLink() {
  taken = null
  try {
    window.sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    /* Nothing was kept, then. */
  }
}

function fromAddress() {
  if (typeof window === 'undefined') return null
  const params = new URLSearchParams(window.location.search)
  if (!params.has(VENUE_PARAM)) return null

  const link = { ...resolveCheckIn(readCheckInCode(window.location.href)), at: Date.now() }
  try {
    window.history.replaceState(window.history.state, '', withoutCheckInParams(window.location.href))
  } catch {
    /* An address that cannot be rewritten still works; a reload would
       just read it again. */
  }
  if (link.status !== 'unknown') keep(link)
  return link
}

function fromStorage() {
  try {
    const link = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) ?? 'null')
    const fresh = link && typeof link.at === 'number' && Date.now() - link.at < KEEP_MS
    if (!fresh) {
      window.sessionStorage.removeItem(STORAGE_KEY)
      return null
    }
    /* Checked again rather than trusted: the venue list may have changed
       under a kept link. */
    const again = resolveCheckIn({ venueId: link.venueId, gameId: link.gameId ?? null })
    return again.status === 'unknown' ? null : { ...again, at: link.at }
  } catch {
    return null
  }
}

function keep(link) {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(link))
  } catch {
    /* Private browsing can refuse storage; the link still works for this
       load. */
  }
}
