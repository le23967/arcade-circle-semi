import { useMemo } from 'react'
import QRCode from 'qrcode'

/* A QR code, drawn.

   One SVG path for every dark module, so the code is a single shape that
   stays sharp at any size: on a phone held out to the person beside you, or
   printed five centimetres wide on a sticker for a machine. Each unbroken
   run of dark modules along a row is one rectangle, which keeps the path
   short and leaves no seam between neighbours for a renderer to blur into a
   grey hairline. Crisp edges does the same job on screen, where a module
   rarely lands on a whole pixel and a soft edge is the first thing a cheap
   camera misreads.

   The quiet zone - the empty margin a scanner needs to find the code at all
   - is drawn as part of the image, in white, rather than left to whatever
   happens to surround it. A tinted panel, a dark card or a sticker trimmed
   too close then cannot eat into it. ISO 18004 asks for four modules, and
   that is the default; a code on a screen that already sits in a white card
   can manage with fewer, which is why it is a prop.

   Error correction is a prop for the same reason. Medium suits a screen,
   which is clean, flat and lit from behind. A printed code that will be
   rubbed by sleeves and bags wants more, and says so where it is printed.

   Size comes from the class or style the caller passes - pixels in the app,
   millimetres on the print sheet - so the drawing never fixes one, and the
   dark colour defaults to pure black, the strongest contrast a printer can
   put on paper. On screen the app can pass its own ink instead.

   Text that cannot be encoded at all, empty or too long for the largest
   code, draws nothing rather than a white square that looks scannable. */
export function QrCode({ value, label, level = 'M', quiet = 4, fill = '#000', className = '', style }) {
  const drawn = useMemo(() => draw(value, level, quiet), [value, level, quiet])
  if (!drawn) return null

  return (
    <svg
      role={label ? 'img' : undefined}
      aria-label={label || undefined}
      aria-hidden={label ? undefined : true}
      viewBox={`0 0 ${drawn.total} ${drawn.total}`}
      shapeRendering="crispEdges"
      className={className}
      style={style}
    >
      <rect width={drawn.total} height={drawn.total} fill="#fff" />
      <path d={drawn.d} fill={fill} />
    </svg>
  )
}

/* Rows are read left to right, and each run of dark modules becomes one
   rectangle, shifted in by the quiet zone. The result is the same picture
   as one square per module, in a fraction of the path. */
function draw(value, level, quiet) {
  let code
  try {
    code = QRCode.create(String(value ?? ''), { errorCorrectionLevel: level })
  } catch {
    return null
  }

  const { modules } = code
  const size = modules.size
  let d = ''
  for (let row = 0; row < size; row += 1) {
    let col = 0
    while (col < size) {
      if (!modules.get(row, col)) {
        col += 1
        continue
      }
      const start = col
      while (col < size && modules.get(row, col)) col += 1
      const run = col - start
      d += `M${start + quiet} ${row + quiet}h${run}v1h-${run}z`
    }
  }
  return { d, total: size + quiet * 2 }
}
