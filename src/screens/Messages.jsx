import { useState } from 'react'
import { Avatar, Sheet, SheetBody } from '../components/ui.jsx'
import { hueFromProfile } from '../lib/accounts.js'
import { formatMessageStamp } from '../lib/time.js'

/* Conversations.

   The evaluation asked where the chat history was, and the first fix only
   answered half of it: messages survived, but the only ways back to one were
   the map card and the profile. Both need the other person to be findable -
   and the map card disappears the moment they check out. So a conversation you
   had an hour ago could only be reached by remembering who it was with and
   going to look for them in your follows, which is recall, not recognition.

   This is the list that was missing. Every conversation is here, newest
   first, whether or not the person is at an arcade right now.

   It is a sheet over the tab it was opened from rather than a screen of its
   own. An inbox is a glance - who has written, is anything waiting - and a
   glance should not take the whole phone and leave only Back. The sheet
   takes as much height as the list needs, up to most of the screen, and
   closes back to exactly where you were. A conversation is the opposite: a
   place you go to, with a keyboard in it, so tapping a row pushes the full
   thread, and leaving that thread - by its arrow or its cross - lands on
   the tab rather than back on this list.

   Two lists. Chats are conversations you can write in - with people you
   follow both ways, or that either of you accepted - plus any request you
   have sent, marked as such. Requests are messages from people you do not
   follow both ways, waiting on you; the count is on the tab so it can be
   seen without opening it. Nothing here claims delivery. A row is marked
   unread when the last message is theirs and you have not opened it. */
export default function Messages({
  chats = [],
  requests = [],
  loading = false,
  error = null,
  signedIn = true,
  onOpen,
  onClose,
}) {
  const [tab, setTab] = useState(requests.length > 0 && chats.length === 0 ? 'requests' : 'chats')
  const rows = tab === 'requests' ? requests : chats

  return (
    <Sheet
      title="Messages"
      onClose={onClose}
      closeLabel="Close messages"
      size="tall"
      returnFocusTo="[data-messages-opener]"
    >
      {signedIn && (
        <div role="tablist" aria-label="Message lists" className="flex gap-1.5 border-b border-line px-4 py-2">
          <ListTab on={tab === 'chats'} onClick={() => setTab('chats')} id="chats">
            Chats
          </ListTab>
          <ListTab on={tab === 'requests'} onClick={() => setTab('requests')} id="requests">
            Requests
            {requests.length > 0 && (
              <span
                className={`ml-1.5 inline-flex min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold tabular-nums ${
                  tab === 'requests' ? 'bg-white/20 text-white' : 'bg-brand-600 text-white'
                }`}
              >
                {requests.length}
              </span>
            )}
          </ListTab>
        </div>
      )}

      <SheetBody>
        <div role="tabpanel" aria-labelledby={`messages-tab-${tab}`} id={`messages-panel-${tab}`}>
          {!signedIn ? (
            <Empty title="Sign in to message" />
          ) : error ? (
            <p role="alert" className="px-6 py-10 text-center text-xs font-medium text-live">
              {error}
            </p>
          ) : loading && rows.length === 0 ? (
            <p role="status" className="px-6 py-10 text-center text-xs text-ink-subtle">
              Loading messages…
            </p>
          ) : rows.length === 0 ? (
            tab === 'requests' ? (
              <Empty title="No requests" />
            ) : (
              <Empty title="No conversations yet" />
            )
          ) : (
            <ul>
              {rows.map((thread) => (
                <ThreadRow key={thread.id} thread={thread} onOpen={() => onOpen(thread)} />
              ))}
            </ul>
          )}
        </div>
      </SheetBody>
    </Sheet>
  )
}

function ListTab({ on, onClick, id, children }) {
  return (
    <button
      type="button"
      role="tab"
      id={`messages-tab-${id}`}
      aria-selected={on}
      aria-controls={`messages-panel-${id}`}
      onClick={onClick}
      className={`inline-flex min-h-[36px] items-center whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors duration-150 ease-soft active:scale-95 ${
        on
          ? 'border-transparent bg-ink text-white'
          : 'border-line-strong bg-surface text-ink-muted hover:border-ink-subtle hover:text-ink'
      }`}
    >
      {children}
    </button>
  )
}

function Empty({ title }) {
  return (
    <div className="px-6 py-10 text-center">
      <p className="font-display text-sm font-semibold text-ink">{title}</p>
    </div>
  )
}

/* One row: who, what they last said, when. Unread is a heavier name and a
   dot, nothing more; a request you sent says so in place of a preview it
   would not have. */
function ThreadRow({ thread, onOpen }) {
  const { partner, last, kind } = thread
  const unread = kind !== 'sent' && last?.sender === 'them' && last.status !== 'read'
  const preview =
    kind === 'sent' ? `Request sent · ${last?.text ?? ''}` : last ? last.text : 'No messages yet'

  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        aria-label={`${partner.handle}${unread ? ', unread' : ''}${kind === 'request' ? ', message request' : ''}`}
        className="flex w-full items-center gap-3 border-b border-line px-4 py-3 text-left transition-colors duration-150 hover:bg-sunken"
      >
        <Avatar handle={partner.handle} hue={hueFromProfile(partner)} size={40} />
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-2">
            <span
              className={`min-w-0 flex-1 truncate text-sm text-ink ${
                unread ? 'font-bold' : 'font-semibold'
              }`}
            >
              {partner.handle}
            </span>
            {last && (
              <span
                className={`flex-none text-[11px] tabular-nums ${
                  unread ? 'font-semibold text-brand-600' : 'text-ink-subtle'
                }`}
              >
                {formatMessageStamp(last.timestamp)}
              </span>
            )}
          </span>
          <span
            className={`mt-0.5 block truncate text-xs ${
              unread ? 'font-medium text-ink' : 'text-ink-muted'
            }`}
          >
            {last?.sender === 'me' && kind !== 'sent' ? `You: ${last.text}` : preview}
          </span>
        </span>
        {unread && (
          <span aria-hidden="true" className="h-2 w-2 flex-none rounded-full bg-brand-600" />
        )}
      </button>
    </li>
  )
}
