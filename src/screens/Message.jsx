import { useEffect, useRef, useState } from 'react'
import { Screen, Avatar, PrimaryButton, SecondaryButton, QuietAction } from '../components/ui.jsx'
import { Send, ArrowLeft, Close } from '../components/Icons.jsx'
import { formatMessageTime } from '../lib/time.js'

/* A conversation.

   An earlier version deliberately had no contact action at all, on the team's
   own finding that "the app can't force our users to just go up to someone
   they haven't met". That was about strangers, and the shape of it still
   holds: a stranger gets one message, which arrives as a request, and the
   other person decides whether it becomes a conversation. Between people
   who follow each other it is an ordinary thread from the first word.

   The messages are real. This screen does not know or care where they come
   from - it is handed a list, a mode that says what belongs at the bottom,
   and a line to show under the name - so the same screen shows a live
   thread with another account and a closed one with a seeded sample player.
   Nothing here claims a status the database has not recorded.

   The bottom of the screen is the mode:

     chat              the composer
     request-compose   the composer, and a line saying the first message
                       goes as a request
     request-sent      what you sent, and that it is waiting on them
     request-received  their message, and Accept / Decline / Block
     blocked           you blocked them; the way back is on their profile
     closed            no composer, for a reason given in `closedNote`

   It is a thread rather than a send box because the first version replaced
   the composer with "Sent" and a Done button, and then forgot the message.

   It is a screen rather than a sheet because a conversation is a place you
   go to, not a panel that covers where you were: it can be long, and the
   keyboard needs the room. The inbox is the sheet; this is what it opens.

   Two controls out, one destination: the tab this trail started from. The
   arrow is where Back always lives; the cross is there because a
   conversation is something people reach to close. Earlier versions sent
   one or both back to the inbox sheet, and someone who had finished
   talking found themselves looking at a list they had not asked for. */
const OPENERS = [
  'How long is the wait really?',
  'Save me a spot, on my way',
  'Nice score, what did you change?',
  'Are you around later this week?',
]

const STATUS_LABEL = { sent: 'Sent', read: 'Read' }

export default function Message({
  handle,
  hue = null,
  messages = [],
  opener = '',
  mode = 'chat',
  /* One line under the name: the relationship, or why replying is off. */
  subtitle = '',
  closedNote = '',
  loading = false,
  error = null,
  sending = false,
  sendError = null,
  answering = false,
  answerError = null,
  onSend,
  onAccept,
  onDecline,
  onBlock,
  onOpenProfile,
  /* Both leave messaging for the tab it was reached from, which
     `backLabel` names for assistive technology. */
  onBack,
  backLabel = 'Back',
  onClose,
}) {
  const [text, setText] = useState(opener)
  const endRef = useRef(null)
  const composing = mode === 'chat' || mode === 'request-compose'
  const canSend = composing && text.trim().length > 0 && !sending && !loading
  /* Openers are for opening. Once there is a conversation, or once you have
     started typing, they are just clutter above the field. */
  const showOpeners = messages.length === 0 && text === ''

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [messages.length])

  /* The box only clears once the send actually went through, so a failed
     send leaves the words where they were typed. */
  async function send() {
    if (!canSend) return
    const result = await onSend(text.trim())
    if (!result || !result.error) setText('')
  }

  return (
    <Screen>
      <div className="flex items-center gap-2.5 border-b border-line bg-surface/95 px-4 py-2.5 backdrop-blur">
        <button
          type="button"
          onClick={onBack}
          aria-label={backLabel}
          className="-ml-2 flex h-10 w-10 items-center justify-center rounded-full text-ink transition-colors duration-150 hover:bg-sunken active:bg-line"
        >
          <ArrowLeft size={20} />
        </button>
        {/* Tapping who you are talking to opens who you are talking to. That
            is what the header does in every messaging app, so leaving it inert
            reads as a broken tap rather than as a design decision. */}
        <button
          type="button"
          onClick={onOpenProfile}
          aria-label={`Open ${handle}'s profile`}
          className="-mx-1.5 flex min-w-0 flex-1 items-center gap-2.5 rounded-xl px-1.5 py-1 text-left transition-colors duration-150 hover:bg-sunken"
        >
          <Avatar handle={handle} hue={hue} size={36} />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-display text-[15px] font-semibold leading-tight text-ink">
              {handle}
            </span>
            <span className="block truncate text-[11px] leading-tight text-ink-muted">
              {subtitle}
            </span>
          </span>
        </button>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close conversation"
            className="-mr-2 flex h-11 w-11 flex-none items-center justify-center rounded-full text-ink-muted transition-colors duration-150 hover:bg-sunken hover:text-ink active:bg-line"
          >
            <Close size={20} />
          </button>
        )}
      </div>

      {/* The conversation sits on its own ground, so it reads as a place
          rather than as the middle of a form. */}
      <div className="flex-1 overflow-y-auto overscroll-contain bg-sunken px-4 py-3">
        {error ? (
          <p role="alert" className="py-6 text-center text-xs font-medium text-live">
            {error}
          </p>
        ) : loading ? (
          <p role="status" className="py-6 text-center text-xs text-ink-subtle">
            Loading messages…
          </p>
        ) : messages.length === 0 ? (
          mode === 'closed' ? null : (
            <p className="py-6 text-center text-xs text-ink-subtle">
              {mode === 'request-compose'
                ? `Your first message reaches ${handle} as a request.`
                : 'No messages yet'}
            </p>
          )
        ) : (
          <ul className="space-y-2">
            {messages.map((m) => (
              <li
                key={m.id}
                className={`flex ${m.sender === 'me' ? 'justify-end' : 'justify-start'}`}
              >
                <span className="max-w-[78%]">
                  <span
                    className={`block break-words rounded-2xl px-3 py-2 text-sm shadow-sm ${
                      m.sender === 'me'
                        ? 'rounded-br-md bg-brand-600 text-white'
                        : 'rounded-bl-md bg-surface text-ink'
                    }`}
                  >
                    {m.text}
                  </span>
                  <span
                    className={`mt-0.5 block text-[10px] tabular-nums text-ink-subtle ${
                      m.sender === 'me' ? 'text-right' : ''
                    }`}
                  >
                    {formatMessageTime(m.timestamp)}
                    {m.sender === 'me' && mode === 'chat' && ` · ${STATUS_LABEL[m.status] ?? m.status}`}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
        <div ref={endRef} />
      </div>

      {composing && (
        <div className="border-t border-line bg-surface px-3 pb-3 pt-2.5">
          {sendError && (
            <p role="alert" className="mb-2 text-xs font-medium text-live">
              {sendError}
            </p>
          )}
          {showOpeners && (
            <div className="no-scrollbar -mx-3 mb-2.5 flex gap-1.5 overflow-x-auto px-3">
              {OPENERS.map((o) => (
                <button
                  key={o}
                  type="button"
                  onClick={() => setText(o)}
                  className="flex-none whitespace-nowrap rounded-full border border-line-strong bg-surface px-3 py-1.5 text-xs text-ink-muted transition-colors duration-150 hover:border-brand-400 hover:text-brand-600"
                >
                  {o}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-end gap-2">
            <input
              id="msg"
              name="message"
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder={sending ? 'Sending…' : mode === 'request-compose' ? 'Write a request…' : 'Message'}
              disabled={loading || Boolean(error)}
              autoComplete="off"
              aria-label={mode === 'request-compose' ? `Message request to ${handle}` : `Message ${handle}`}
              className="min-w-0 flex-1 rounded-full border border-line-strong bg-surface px-4 py-2.5 text-sm text-ink outline-none transition-colors duration-150 placeholder:text-ink-subtle focus:border-brand-500"
            />
            <button
              type="button"
              onClick={send}
              disabled={!canSend}
              aria-label={mode === 'request-compose' ? 'Send request' : 'Send'}
              className={`flex h-11 w-11 flex-none items-center justify-center rounded-full transition-all duration-150 ease-soft ${
                canSend
                  ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/25 hover:bg-brand-700 active:scale-95'
                  : 'bg-sunken text-ink-subtle'
              }`}
            >
              <Send size={19} />
            </button>
          </div>
        </div>
      )}

      {mode === 'request-sent' && (
        <p
          role="status"
          className="border-t border-line bg-surface px-4 py-4 text-center text-xs leading-relaxed text-ink-muted"
        >
          Request sent. You can keep talking once {handle} accepts.
        </p>
      )}

      {mode === 'request-received' && (
        /* The three answers, next to the message they answer. Accept is the
           one that opens something, so it is the primary; Block is the one
           that closes something, so it is quiet and asks first. */
        <div className="border-t border-line bg-surface px-4 pb-3 pt-3">
          <p className="text-xs leading-relaxed text-ink-muted">
            {handle} wants to message you. You don’t follow each other. Accept to
            reply, or decline and they won’t know.
          </p>
          {answerError && (
            <p role="alert" className="mt-2 text-xs font-medium text-live">
              {answerError}
            </p>
          )}
          <div className="mt-3 flex gap-2">
            <PrimaryButton onClick={onAccept} disabled={answering} className="flex-1">
              {answering ? 'Working…' : 'Accept'}
            </PrimaryButton>
            <SecondaryButton onClick={onDecline} disabled={answering} className="flex-1">
              Decline
            </SecondaryButton>
          </div>
          <div className="mt-1 flex justify-center">
            <QuietAction onClick={onBlock} disabled={answering} className="min-h-[44px] px-3">
              Block {handle}
            </QuietAction>
          </div>
        </div>
      )}

      {mode === 'blocked' && (
        <p className="border-t border-line bg-surface px-4 py-4 text-center text-xs leading-relaxed text-ink-muted">
          You blocked {handle}. Unblock them from their profile to message again.
        </p>
      )}

      {mode === 'closed' && (
        <p className="border-t border-line bg-surface px-4 py-4 text-center text-xs leading-relaxed text-ink-muted">
          {closedNote || `You can’t message ${handle}.`}
        </p>
      )}
    </Screen>
  )
}
