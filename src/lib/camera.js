/* The camera, for the two places the app reads a code: adding a person,
   and checking in at a machine.

   The camera is asked for directly, before the scanning library gets it.
   The library folds every failure into one "camera not found", which would
   tell someone who has just refused permission that they have no camera.
   Asking first keeps the real reason; the stream is released at once and
   the scanner opens its own, which no longer prompts. */

/* Whether this page can have a camera at all. Browsers only offer one to
   a secure page - https, or localhost while developing. */
export function cameraAvailable() {
  return (
    typeof window !== 'undefined' &&
    window.isSecureContext &&
    Boolean(navigator.mediaDevices?.getUserMedia)
  )
}

/* Asks for the back camera, or any camera when there is no back one, and
   lets it go again. Resolves when permission is there; rejects with the
   browser's own error otherwise, for cameraProblem() to name. */
export async function askForCamera() {
  const stream = await navigator.mediaDevices
    .getUserMedia({ video: { facingMode: 'environment' }, audio: false })
    .catch((e) => {
      if (e?.name === 'OverconstrainedError' || e?.name === 'NotFoundError') {
        return navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      }
      throw e
    })
  for (const track of stream.getTracks()) track.stop()
}

/* Which sentence to show when the camera never appears. The library
   reports a refused permission and a missing camera differently across
   browsers, so both the DOMException name and the message are checked.

     denied        permission refused, now or earlier
     unavailable   no camera on this device
     error         there is one, but it would not start (in use elsewhere) */
export function cameraProblem(e) {
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
