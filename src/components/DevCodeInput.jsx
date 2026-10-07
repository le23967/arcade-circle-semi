import { useState } from 'react'

/* Development only. A second phone, a printed sticker or an NFC tag is not
   always to hand, and a code can be pasted as text here to exercise the
   same path a scan or a tap takes. Every caller renders it behind
   import.meta.env.DEV, so Vite drops it from a production build and
   nobody sees it who should not. */
export default function DevCodeInput({ onCode, label = 'Development only: paste a code' }) {
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
        aria-label={label}
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
