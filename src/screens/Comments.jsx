import { useState } from 'react'
import { Avatar } from '../components/ui.jsx'
import { Heart, Send } from '../components/Icons.jsx'
import { ago } from '../lib/social.js'
import { ME } from '../social.js'

/* Comments on a clip.

   A bottom sheet rather than a screen, so the clip stays visible behind it and
   you keep your place in the feed.

   It is shaped like the comment sheets people already use, because Jakob's Law
   applies hardest to a pattern this well worn: a fixed sheet over the paused
   clip, the count centred at the top with a close on the right, a round face
   beside every comment, the like on the right of the row, and a single round
   field along the bottom. The earlier version had a square grey placeholder
   for a face and two full width buttons stacked under the input, which read as
   a form rather than a conversation - and cost most of the sheet's height to
   say Post and Close.

   Being a sheet, it dismisses like one. The clip is visible through the scrim
   and people reach for it, so a tap on the dark area closes it. The sheet
   itself stops the click, or typing a comment would close the thread you are
   writing in. */
export default function Comments({ clip, comments, onPost, onClose }) {
  const [text, setText] = useState('')
  /* Likes on individual comments live and die with the sheet. The prototype
     has no store for them, and a heart that does nothing at all would be worse
     than one that forgets. */
  const [liked, setLiked] = useState([])
  const canPost = text.trim().length > 0

  function post() {
    if (!canPost) return
    onPost(text.trim())
    setText('')
  }

  function toggleLike(id) {
    setLiked((ids) =>
      ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]
    )
  }

  return (
    <div
      onClick={onClose}
      className="absolute inset-0 z-10 flex items-end bg-ink/40"
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="anim-sheet flex h-[68%] w-full flex-col rounded-t-2xl border-t border-line bg-surface"
      >
        <div className="flex justify-center pt-2">
          <span className="h-1 w-9 rounded-full bg-line-strong" />
        </div>

        <div className="relative flex items-center justify-center border-b border-line px-4 py-2.5">
          <h2 className="text-sm font-semibold text-ink">
            <span className="tabular-nums">{comments.length}</span>{' '}
            {comments.length === 1 ? 'comment' : 'comments'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close comments"
            className="absolute right-2 rounded-full p-2 text-xl leading-none text-ink-subtle transition-colors duration-150 hover:bg-sunken hover:text-ink"
          >
            &times;
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {comments.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center px-6 text-center">
              <p className="text-sm font-semibold text-ink">No comments yet</p>
            </div>
          ) : (
            <ul className="py-1">
              {comments.map((c) => (
                <li key={c.id} className="flex items-start gap-2.5 px-4 py-2.5">
                  <Avatar handle={c.handle} size={32} />

                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-ink-muted">{c.handle}</p>
                    <p className="text-sm leading-snug text-ink">{c.text}</p>
                    <p className="mt-0.5 text-[11px] tabular-nums text-ink-subtle">
                      {ago(c.minsAgo)}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleLike(c.id)}
                    aria-label={
                      liked.includes(c.id)
                        ? `Unlike ${c.handle}'s comment`
                        : `Like ${c.handle}'s comment`
                    }
                    aria-pressed={liked.includes(c.id)}
                    className={`flex min-w-10 flex-none flex-col items-center gap-0.5 rounded-lg px-1.5 py-1.5 transition-colors duration-150 ${
                      liked.includes(c.id) ? 'text-live' : 'text-ink-subtle hover:text-ink-muted'
                    }`}
                  >
                    <span className={liked.includes(c.id) ? 'anim-pop' : ''}>
                      <Heart size={18} filled={liked.includes(c.id)} />
                    </span>
                    <span className="text-[11px] tabular-nums">
                      {likeCount(c) + (liked.includes(c.id) ? 1 : 0)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex items-center gap-2 border-t border-line px-3 py-2.5">
          <Avatar handle={ME.handle} hue={ME.hue} size={28} />
          <input
            id="comment"
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && post()}
            placeholder={`Add comment for @${clip.handle}`}
            aria-label="Add a comment"
            className="min-w-0 flex-1 rounded-full bg-sunken px-3.5 py-2 text-sm text-ink outline-none placeholder:text-ink-subtle focus-visible:ring-2 focus-visible:ring-brand-200"
          />
          <button
            type="button"
            onClick={post}
            disabled={!canPost}
            aria-label="Post comment"
            className={`flex h-9 w-9 flex-none items-center justify-center rounded-full transition-all duration-150 ease-soft ${
              canPost
                ? 'bg-brand-600 text-white shadow-md shadow-brand-600/25 active:scale-90'
                : 'bg-sunken text-ink-subtle'
            }`}
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}

/* Seed comments carry no like count, and the prototype has no server to ask.
   Deriving one from the id keeps it stable between openings, the same way
   avatar colours are derived from a handle rather than stored. */
function likeCount(comment) {
  let n = 0
  for (let i = 0; i < comment.id.length; i += 1) {
    n = (n * 31 + comment.id.charCodeAt(i)) >>> 0
  }
  return n % 48
}
