import { useCallback, useEffect, useRef, useState } from 'react'
import { Screen, TopBar, Body, Avatar, PrimaryButton, clipArt } from '../components/ui.jsx'
import { ArrowLeft, Bell, Heart, Comment, Chevron } from '../components/Icons.jsx'
import { CLIPS } from '../social.js'
import { gradeOf, formatAchievement } from '../lib/social.js'

const NEARBY_LIMIT_KM = 1

/* Watch.

   A feed, so it behaves like one. There is no title bar: a caption
   explaining that these are clips from people you follow is the kind of on
   screen documentation this prototype keeps removing. Following and Nearby
   float over the clip instead, the way they do in the apps people already
   use.

   It is no longer a tab. Clips are something to do while waiting, so the
   feed opens from the queue screen - where the turn alert can still pull
   you back - and from Liked clips and Activity. That makes it a step rather
   than a place, so a Back control floats over the clip as well.

   Swipe up for the next clip and down for the previous one. Swiping down on
   the first clip refreshes. Swiping sideways changes between Following and
   Nearby. The paging buttons are gone: they were a desktop control standing in
   for a gesture everyone already knows. Arrow keys and a trackpad still work,
   so the prototype is usable without a touchscreen. */

const SWIPE = 56
const REFRESH_PULL = 96
const HINT_MS = 2800

/* Following and Nearby are on screen permanently, so sideways navigation
   announces itself. The vertical gesture had nothing: a first-time viewer sees
   one clip and no reason to think there is a second one. So the first time
   Watch opens in a session it says "Swipe up for next" once, over the clip,
   and takes itself away after a few seconds or the moment you do anything.

   Once per session rather than once per mount: the feed remounts every time
   you open it again, and a cue that returned each time would be
   an ad rather than a hint. The flag resets on reload, which is the length of
   one run through the prototype. */
let gestureHintShown = false

export default function Watch({
  onBack,
  clips = CLIPS,
  index,
  onIndex,
  scope,
  onScope,
  arcades,
  session,
  sessionArcade,
  called,
  onCall,
  onGo,
  liked,
  likeCount,
  onLike,
  commentCount,
  onComments,
}) {
  const scopedIndexes = getClipIndexes(scope, clips, arcades)
  const nearbyIndexes = getClipIndexes('nearby', clips, arcades)
  const clip = clips[index]
  const venue = arcades.find((arcade) => arcade.id === clip?.venue)
  const page = scopedIndexes.indexOf(index)

  const [drag, setDrag] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const [hint, setHint] = useState(!gestureHintShown)
  const gesture = useRef(null)
  const stageRef = useRef(null)

  const dismissHint = useCallback(() => {
    gestureHintShown = true
    setHint(false)
  }, [])

  /* Entering the screen is what spends the one showing, so leaving straight
     away does not save it up for next time. */
  useEffect(() => {
    gestureHintShown = true
    if (!hint) return undefined
    const timer = window.setTimeout(() => setHint(false), HINT_MS)
    return () => window.clearTimeout(timer)
  }, [hint])

  useEffect(() => {
    const nextIndexes = getClipIndexes(scope, clips, arcades)
    if (nextIndexes.length > 0 && !nextIndexes.includes(index)) {
      onIndex(nextIndexes[0])
    }
  }, [arcades, clips, index, onIndex, scope])

  const selectScope = useCallback(
    (nextScope) => {
      const nextIndexes = getClipIndexes(nextScope, clips, arcades)
      onScope(nextScope)
      if (nextIndexes.length > 0 && !nextIndexes.includes(index)) {
        onIndex(nextIndexes[0])
      }
    },
    [arcades, clips, index, onIndex, onScope]
  )

  const step = useCallback(
    (delta) => {
      const next = page + delta
      if (next < 0 || next >= scopedIndexes.length) return false
      onIndex(scopedIndexes[next])
      return true
    },
    [onIndex, page, scopedIndexes]
  )

  const refresh = useCallback(() => {
    setRefreshing(true)
    window.setTimeout(() => setRefreshing(false), 700)
  }, [])

  /* Arrow keys and a trackpad, so the feed is not touch only.

     The handlers read through refs and the effect subscribes once. An earlier
     version listed `page` as a dependency, so every step tore the listener
     down and rebuilt it, which reset the cooldown and let one flick run the
     whole feed.

     A time based cooldown is not enough on its own either, because macOS keeps
     sending wheel events as the momentum decays. So a gesture stays locked
     until the wheel has been quiet for a moment: one flick moves one clip, no
     matter how many events it produces. */
  const stepRef = useRef(step)
  const pageRef = useRef(page)
  const refreshRef = useRef(refresh)

  useEffect(() => {
    stepRef.current = step
    pageRef.current = page
    refreshRef.current = refresh
  }, [page, refresh, step])

  useEffect(() => {
    const el = stageRef.current
    if (!el) return undefined

    let locked = false
    let settle = 0

    function onWheel(event) {
      event.preventDefault()
      dismissHint()

      window.clearTimeout(settle)
      settle = window.setTimeout(() => {
        locked = false
      }, 180)

      if (locked || Math.abs(event.deltaY) < 8) return
      locked = true

      if (event.deltaY > 0) stepRef.current(1)
      else if (!stepRef.current(-1) && pageRef.current === 0) refreshRef.current()
    }

    function onKey(event) {
      dismissHint()
      if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') stepRef.current(-1)
      if (event.key === 'ArrowDown' || event.key === 'ArrowRight') stepRef.current(1)
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('keydown', onKey)
    return () => {
      window.clearTimeout(settle)
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('keydown', onKey)
    }
  }, [dismissHint])

  if (called && session && sessionArcade) {
    return <YoureUp arcade={sessionArcade} position={session.position} onGo={onGo} />
  }

  function onPointerDown(event) {
    dismissHint()
    gesture.current = { x: event.clientX, y: event.clientY, axis: null }
  }

  function onPointerMove(event) {
    const g = gesture.current
    if (!g) return
    const dx = event.clientX - g.x
    const dy = event.clientY - g.y
    if (!g.axis && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
      g.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'
    }
    if (g.axis === 'y') setDrag(dy)
  }

  function onPointerUp(event) {
    const g = gesture.current
    gesture.current = null
    setDrag(0)
    if (!g || !g.axis) return

    const dx = event.clientX - g.x
    const dy = event.clientY - g.y

    if (g.axis === 'x') {
      if (dx <= -SWIPE && scope === 'following') selectScope('nearby')
      if (dx >= SWIPE && scope === 'nearby') selectScope('following')
      return
    }
    if (dy <= -SWIPE) step(1)
    else if (dy >= REFRESH_PULL && page === 0) refresh()
    else if (dy >= SWIPE) step(-1)
  }

  const empty = !clip || scopedIndexes.length === 0

  return (
    <Screen>
      <div
        ref={stageRef}
        tabIndex={-1}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          gesture.current = null
          setDrag(0)
        }}
        className="relative min-h-0 flex-1 touch-none overflow-hidden bg-[#0b0920] outline-none"
      >
        {empty ? (
          <div className="flex h-full items-center justify-center p-6 text-center">
            <div>
              <p className="font-display text-lg font-semibold text-white">No clips here yet</p>
              <p className="mt-1 text-sm text-white/60">
                Swipe across for clips from your circle.
              </p>
            </div>
          </div>
        ) : (
          <div
            className="h-full"
            style={{
              transform: `translateY(${drag * 0.32}px)`,
              transition: drag === 0 ? 'transform 220ms var(--ease-out)' : 'none',
            }}
          >
            <ClipStage
              key={clip.id}
              clip={clip}
              venue={venue}
              liked={liked}
              likeCount={likeCount}
              onLike={onLike}
              commentCount={commentCount}
              onComments={onComments}
            />
          </div>
        )}

        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className="absolute left-2 top-2 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur transition-colors duration-150 hover:bg-black/50"
          >
            <ArrowLeft size={20} />
          </button>
        )}

        {/* Floating over the clip, the way a feed does it. */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex justify-center pt-3">
          <div className="pointer-events-auto flex items-center gap-1">
            <ScopeTab
              active={scope === 'following'}
              label="Following"
              onClick={() => selectScope('following')}
            />
            <span className="h-3 w-px bg-white/25" />
            <ScopeTab
              active={scope === 'nearby'}
              label="Nearby"
              count={nearbyIndexes.length}
              onClick={() => selectScope('nearby')}
            />
          </div>
        </div>

        {(refreshing || drag > 24) && (
          <div className="pointer-events-none absolute inset-x-0 top-12 z-30 flex justify-center">
            <span className="rounded-full bg-black/45 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur">
              {refreshing
                ? 'Updated'
                : page === 0 && drag >= REFRESH_PULL
                  ? 'Release to refresh'
                  : page === 0
                    ? 'Pull to refresh'
                    : 'Previous clip'}
            </span>
          </div>
        )}

        {hint && !empty && (
          <div className="pointer-events-none absolute inset-x-0 bottom-28 z-30 flex justify-center">
            <span className="anim-row flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1.5 text-[11px] font-semibold text-white backdrop-blur">
              <span className="anim-nudge flex text-white/90">
                <span className="block -rotate-90">
                  <Chevron size={13} />
                </span>
              </span>
              Swipe up for next
            </span>
          </div>
        )}

        {session && sessionArcade && (
          <button
            type="button"
            onClick={onCall}
            className="absolute inset-x-3 bottom-3 z-30 flex items-center gap-2 rounded-2xl border border-white/15 bg-black/45 px-3 py-2 text-left backdrop-blur-md"
          >
            <span className="relative flex h-7 w-7 flex-none items-center justify-center rounded-full bg-brand-600 text-white">
              <span className="anim-ring absolute h-2 w-2 rounded-full bg-brand-400" />
              <Bell size={14} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-semibold text-white">
                Queue #{session.position} at {sessionArcade.short}
              </span>
              <span className="block text-[10px] text-white/60">
                Tap to preview your turn alert
              </span>
            </span>
          </button>
        )}

        {/* Where you are in the feed, without a counter taking up a row. */}
        {scopedIndexes.length > 1 && (
          <div className="pointer-events-none absolute right-1.5 top-1/2 z-20 flex -translate-y-1/2 flex-col gap-1">
            {scopedIndexes.map((clipIndex, dot) => (
              <span
                key={clipIndex}
                className={`w-1 rounded-full ${
                  dot === page ? 'h-4 bg-white/90' : 'h-1 bg-white/35'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </Screen>
  )
}

function ScopeTab({ active, label, count, onClick }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-sm transition-colors duration-150 ${
        active ? 'font-bold text-white' : 'font-medium text-white/55 hover:text-white/80'
      }`}
    >
      {label}
      {count ? <span className="ml-1 text-[10px] tabular-nums text-white/50">{count}</span> : null}
    </button>
  )
}

function ClipStage({
  clip,
  venue,
  liked,
  likeCount,
  onLike,
  commentCount,
  onComments,
}) {
  const [playing, setPlaying] = useState(true)
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!playing) return undefined

    const timer = window.setInterval(() => {
      setElapsed((time) => {
        const next = time + 0.1
        return next >= clip.seconds ? 0 : next
      })
    }, 100)

    return () => window.clearInterval(timer)
  }, [clip.seconds, playing])

  const progress = Math.min(100, (elapsed / clip.seconds) * 100)

  return (
    <div className="relative flex h-full w-full overflow-hidden bg-[#100d28] text-white">
      <button
        type="button"
        aria-label={playing ? 'Pause clip' : 'Play clip'}
        aria-pressed={playing}
        onClick={() => setPlaying((value) => !value)}
        className="absolute inset-0 z-0 cursor-pointer focus-visible:outline-offset-[-4px]"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        /* Per clip rather than one gradient for all of them, so a clip
           looks like its own thumbnail in Liked. */
        style={{ backgroundImage: clipArt(clip) }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-16 top-[22%] h-44 w-[130%] rotate-[-8deg] rounded-[50%] border border-white/10"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-12 top-[30%] h-36 w-[125%] rotate-[-8deg] rounded-[50%] border border-white/10"
      />

      <div className="pointer-events-none absolute left-3 top-14 z-10 flex items-center gap-1.5">
        <span className="rounded-full border border-white/15 bg-black/25 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white/90 backdrop-blur">
          Rhythm clip
        </span>
        <span className="rounded-full border border-white/15 bg-black/25 px-2 py-1 text-[10px] font-semibold tabular-nums text-white/80 backdrop-blur">
          {clip.seconds}s
        </span>
      </div>

      <div className="absolute bottom-28 right-1.5 z-20 flex flex-col items-center gap-1">
        <StageAction
          onClick={onLike}
          active={liked}
          label={liked ? 'Unlike clip' : 'Like clip'}
        >
          {/* Heavier than the default line weight, because a glyph this size
              drawn at 1.6 reads as thin over moving artwork. */}
          <Heart size={28} strokeWidth={1.9} filled={liked} />
          <span className="tabular-nums">{likeCount}</span>
        </StageAction>
        <StageAction onClick={onComments} label="Open comments">
          <Comment size={28} strokeWidth={1.9} />
          <span className="tabular-nums">{commentCount}</span>
        </StageAction>
      </div>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-[42%] flex h-20 w-40 -translate-x-1/2 -translate-y-1/2 items-center justify-center gap-1 opacity-75"
      >
        {Array.from({ length: 13 }, (_, bar) => (
          <span
            key={bar}
            className="w-1 rounded-full bg-white/70 transition-[height] duration-100"
            style={{ height: `${beatHeight(bar, elapsed, playing)}%` }}
          />
        ))}
      </div>

      <div className="pointer-events-none absolute left-1/2 top-[42%] z-10 -translate-x-1/2 -translate-y-1/2 text-center">
        <span
          aria-hidden="true"
          className={`absolute inset-0 rounded-full border border-brand-400/70 ${playing ? 'anim-ring' : ''}`}
        />
        <span className="flex h-14 w-14 items-center justify-center rounded-full border border-white/30 bg-white/15 shadow-xl backdrop-blur-md">
          {playing ? <PauseGlyph /> : <PlayGlyph />}
        </span>
        <span className="mt-1 block text-[10px] font-semibold text-white/75">
          {playing ? 'Tap to pause' : 'Tap to play'}
        </span>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />

      <div className="pointer-events-none absolute inset-x-3 bottom-3 z-10 rounded-2xl border border-white/10 bg-black/35 px-3 py-2.5 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Avatar handle={clip.handle} size={30} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-white">@{clip.handle}</p>
            <p className="truncate text-[10px] text-white/65">
              {venue ? `${venue.short} · ` : ''}{ago(clip.postedMin)}
            </p>
          </div>
          <div className="flex-none rounded-xl border border-white/15 bg-white/10 px-2 py-1 text-right">
            <p className="text-xs font-bold tabular-nums text-white">
              {formatAchievement(clip.achievement)}
            </p>
            <p className="text-[9px] font-bold uppercase tracking-widest text-brand-200">
              {gradeOf(clip.achievement)}
            </p>
          </div>
        </div>

        <div className="mt-1.5 flex items-center gap-2">
          <p className="min-w-0 flex-1 truncate text-xs font-medium text-white">
            {clip.song} <span className="text-white/55">· {clip.chart}</span>
          </p>
          <span className="text-[9px] tabular-nums text-white/60">
            {formatTime(elapsed)} / {formatTime(clip.seconds)}
          </span>
        </div>
        <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/20">
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand-400 to-[#fb7185] transition-[width] duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  )
}

/* The two controls the feed is driven by, so they are sized to be hit without
   aiming. They were a 15px glyph in a button with no padding, which left a
   target about 15px across on a screen where everything else is a full-width
   gesture - well under the 44pt minimum Apple's guidelines set for a touch
   control. The padding does the work, so the counts stay where they were. */
function StageAction({ children, onClick, active, label, ...rest }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      {...rest}
      className={`flex min-h-11 min-w-11 flex-col items-center justify-center gap-0.5 rounded-xl px-1.5 text-xs font-semibold transition-all duration-150 ease-soft active:scale-90 ${
        active ? 'text-rose-400' : 'text-white'
      }`}
    >
      {children}
    </button>
  )
}

function YoureUp({ arcade, position, onGo }) {
  return (
    <Screen>
      <TopBar title="Watch" subtitle="Your clip has been paused" />
      <Body className="flex flex-col items-center justify-center bg-brand-50 p-6 text-center">
        <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-brand-600 text-white shadow-xl shadow-brand-600/25">
          <span className="anim-ring absolute h-5 w-5 rounded-full bg-brand-400" />
          <Bell size={34} />
        </div>
        <p className="mt-5 font-display text-3xl font-bold tracking-tight text-ink">
          You&rsquo;re up
        </p>
        <p className="mt-2 text-sm text-ink-muted">
          Position #{position} at <span className="font-semibold text-ink">{arcade.name}</span>
        </p>
        <p className="mt-1 text-xs text-ink-muted">The clip is paused so you can take your turn.</p>
        <div className="mt-6 w-full">
          <PrimaryButton onClick={onGo}>Open my queue</PrimaryButton>
        </div>
      </Body>
    </Screen>
  )
}

function getClipIndexes(scope, clips, arcades) {
  const allIndexes = clips.map((_, clipIndex) => clipIndex)
  if (scope !== 'nearby') return allIndexes

  const distanceByVenue = new Map(
    arcades.map((arcade) => [arcade.id, arcade.distanceKm])
  )

  return allIndexes
    .filter((clipIndex) => {
      const distance = distanceByVenue.get(clips[clipIndex].venue)
      return typeof distance === 'number' && distance <= NEARBY_LIMIT_KM
    })
    .sort((left, right) => {
      const leftClip = clips[left]
      const rightClip = clips[right]
      const distanceDifference =
        distanceByVenue.get(leftClip.venue) - distanceByVenue.get(rightClip.venue)
      return distanceDifference || leftClip.postedMin - rightClip.postedMin
    })
}

function beatHeight(bar, elapsed, playing) {
  if (!playing) return 18 + (bar % 4) * 5
  const wave = (Math.sin(elapsed * 9 + bar * 0.82) + 1) / 2
  const centre = 1 - Math.abs(bar - 6) / 8
  return 20 + wave * 48 + centre * 18
}

function PlayGlyph() {
  return <span className="ml-1 h-0 w-0 border-y-[7px] border-l-[11px] border-y-transparent border-l-white" />
}

function PauseGlyph() {
  return (
    <span className="flex gap-1" aria-hidden="true">
      <span className="h-4 w-1.5 rounded-sm bg-white" />
      <span className="h-4 w-1.5 rounded-sm bg-white" />
    </span>
  )
}

function formatTime(seconds) {
  return `0:${Math.floor(seconds).toString().padStart(2, '0')}`
}

function ago(min) {
  if (min < 60) return `${min}m ago`
  const hours = Math.round(min / 60)
  return hours < 24 ? `${hours}h ago` : `${Math.round(hours / 24)}d ago`
}
