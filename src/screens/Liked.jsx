import { Screen, TopBar, Body, Info, clipArt } from '../components/ui.jsx'
import { Heart } from '../components/Icons.jsx'
import { CLIPS } from '../social.js'

/* Liked clips.

   This lives under Me rather than under Watch, on purpose.

   Watch is a lean-back surface: one clip at a time, served to you, in order.
   Finding something you saved is the opposite task - you have a specific thing
   in mind and you are going to retrieve it. Those two want different shapes,
   and folding the saved list into Watch's segmented control would have mixed
   two content SOURCES with one saved STATE in the same control.

   Me is already the tab for things that belong to you: your sessions, your
   reports, who you follow, your songs. Liked clips fit that model without
   changing what the tab means. It is also where Instagram and TikTok both put
   theirs, so it is where people look first.

   A grid, because these are videos. It was a text list - a small grey block
   with the handle, the song, the achievement and a grade chip beside it -
   which is the shape you give to records, not to things you watch. Retrieval
   here is visual: you remember the run, not its percentage. Three to a row is
   what every video library people already use does, and a tile at that size
   still carries the song, its length and how it went down. */
export default function Liked({ likedIds, onBack, onOpenClip }) {
  const clips = CLIPS.filter((c) => likedIds.includes(c.id))

  return (
    <Screen>
      <TopBar
        title="Liked clips"
        onBack={onBack}
        right={
          <Info>
            Liking a clip is the one reply that needs no words, which matters
            for players who would rather not start a conversation. Your likes
            are visible to the person who posted.
          </Info>
        }
      />

      <Body>
        {clips.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-8 text-center">
            <p className="font-display text-base font-semibold text-ink">
              Nothing liked yet
            </p>
            <p className="mt-1 text-sm text-ink-muted">
              Tap the heart on a clip, from Activity or while you wait in a
              queue, and it lands here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-0.5 p-0.5">
            {clips.map((clip, i) => (
              <button
                key={clip.id}
                type="button"
                onClick={() => onOpenClip(clip.id)}
                aria-label={`${clip.song} by ${clip.handle}, ${clip.seconds} seconds`}
                className="anim-row group relative aspect-[9/16] overflow-hidden bg-[#100d28] text-left transition-transform duration-150 ease-soft active:scale-[0.97]"
                style={{ animationDelay: `${Math.min(i, 8) * 35}ms` }}
              >
                <span
                  aria-hidden="true"
                  className="absolute inset-0"
                  style={{ backgroundImage: clipArt(clip) }}
                />

                <span className="absolute right-1 top-1 rounded bg-black/40 px-1 py-0.5 text-[9px] font-bold tabular-nums text-white/90 backdrop-blur">
                  {clip.seconds}s
                </span>

                {/* Enough to pick the right one out of a wall of them: what the
                    run was, and how it landed with people. */}
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent px-1.5 pb-1.5 pt-5">
                  <span className="block truncate text-[10px] font-semibold leading-tight text-white">
                    {clip.song}
                  </span>
                  <span className="mt-0.5 flex items-center gap-1 text-[10px] font-medium text-white/85">
                    <Heart size={10} filled />
                    <span className="tabular-nums">{clip.likes}</span>
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}
      </Body>
    </Screen>
  )
}
