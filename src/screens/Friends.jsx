import { useState } from 'react'
import {
  Screen,
  TopBar,
  Body,
  Info,
  Seg,
  Chip,
  Avatar,
  GameDot,
  ActionButton,
  QuietAction,
  ViewSwitch,
} from '../components/ui.jsx'
import { Plus, Comment, UserPlus, Pulse, Bars, Check } from '../components/Icons.jsx'
import { FRIENDS, SONGS, OLD_SITE_FAVOURITE_CAP, ACTIVITY } from '../social.js'
import { GAMES, gameColor, gameLabel } from '../data.js'
import { machinesLabel, resolveVenues, venueForPlayer } from '../lib/queue.js'
import {
  leaderboard,
  belowOldCap,
  relationshipOf,
  circleSessions,
  openSessions,
  gradeOf,
  formatAchievement,
  ago,
} from '../lib/social.js'
import FriendsMap from './FriendsMap.jsx'

/* Circle tab. Four views over the same community, one per question.

   The underlying request was "seeing where your friends are and all of that",
   and the temporal half of it - whether you have just missed someone - is what
   Activity answers.

   Consultation feedback drove two changes. First, every row now ends in
   something you can do: knowing where someone is only counts once it lets you
   join them, ask them about the venue, or arrange to meet. Second, the map
   view exists at all - people were only ever in a list before.

   There were six segments for a while, and the bar no longer fit the width.
   Two of them were the same question drawn twice: Map and Now both answered
   "who is out", one as pins and one as rows, and Later and Open both answered
   "what is coming up", one for your circle and one for anyone. Each pair is
   one segment now, with the second answer a step inside the first - a list
   sheet over the map, and a filter on Later. The segment bar is the first
   thing on the tab, so it is the first thing to say what the tab is for, and
   four questions is what it is for.

   Open sessions are the one thing here not scoped to the people you follow.
   Every other view is empty for a player with no mutuals, and the app was
   telling that player, in effect, to come back once they had friends - which
   is backwards, since making them is what they are here for.

   The Week 9 critique then asked why four segments of equal weight sat on
   a tab whose job is two things: who is out now, and what is planned. So
   those two are the switch - Now and Plans, the second renamed from Later
   so it says what it holds - and Activity and Scores are quiet tabs beside
   it: still one tap, no longer drawn as equals. The game control that says
   which queue the map's waits are for moved onto the map it qualifies. */
export default function Friends({
  arcades,
  game,
  onGame,
  section,
  onSection,
  hereVenueId,
  onClearVenue,
  song,
  onSong,
  me,
  following,
  /* Who is at an arcade right now - real accounts allowed to be seen by
     you when signed in, sample players when not. Everything here that
     draws people reads this. */
  present = [],
  joinsSent,
  planned,
  rsvps,
  onRsvp,
  onEditPlan,
  onCancelPlan,
  onUnsendJoin,
  onOpenPlayer,
  onOpenClip,
  onOpenArcade,
  onJoin,
  onPlan,
  onMessage,
  onOpenMessages,
  /* Unread conversations plus requests waiting, for the badge on the way
     in. Zero draws nothing. */
  messageBadge = 0,
  onAddPerson,
}) {
  /* Resolved here, once: raw venues carry their queues nested per game, so
     anything reading a wait or a game colour needs the flattened form. */
  const venues = resolveVenues(arcades, game)

  return (
    <Screen>
      <TopBar
        title="Circle"
        right={
          <span className="flex items-center gap-1.5">
            {/* Meeting someone is a thing that happens on this tab too, and it
                happens at an arcade with the person standing there - so the way
                to add them is in reach, not four steps under Me. */}
            <button
              type="button"
              onClick={onAddPerson}
              aria-label="Add someone"
              className="flex h-10 w-10 items-center justify-center rounded-full text-ink-muted transition-colors duration-150 hover:bg-sunken hover:text-ink"
            >
              <UserPlus size={20} />
            </button>
            {/* Conversations are with the people on this tab, so this is where
                the way back to them belongs. The count is what is waiting:
                unread chats and requests together. */}
            <button
              type="button"
              data-messages-opener
              onClick={onOpenMessages}
              aria-label={
                messageBadge > 0
                  ? `Messages, ${messageBadge} waiting`
                  : 'Messages'
              }
              className="relative flex h-10 w-10 items-center justify-center rounded-full text-ink-muted transition-colors duration-150 hover:bg-sunken hover:text-ink"
            >
              <Comment size={20} />
              {messageBadge > 0 && (
                <span
                  aria-hidden="true"
                  className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-surface bg-brand-600 px-1 text-[10px] font-bold leading-none tabular-nums text-white"
                >
                  {messageBadge > 9 ? '9+' : messageBadge}
                </span>
              )}
            </button>
            <Info>
              Only people who follow each other see who is at which arcade.
              Open sessions are public.
            </Info>
          </span>
        }
      />

      {/* 'open' is Later with the other filter selected. It stays a section
          id of its own so a venue page or a freshly posted session can land
          straight on it, without a second piece of state to keep in step. */}
      <div className="flex items-center gap-1 border-b border-line px-4 py-2">
        <ViewSwitch
          label="Circle view"
          className="flex-1"
          value={section === 'open' ? 'planned' : section}
          onChange={onSection}
          options={[
            { id: 'now', label: 'Now' },
            { id: 'planned', label: 'Plans' },
          ]}
        />
        <QuietTab on={section === 'activity'} onClick={() => onSection('activity')} icon={<Pulse size={15} />}>
          Activity
        </QuietTab>
        <QuietTab on={section === 'scores'} onClick={() => onSection('scores')} icon={<Bars size={15} />}>
          Scores
        </QuietTab>
      </div>

      {section === 'now' && (
        <Now
          arcades={venues}
          rawArcades={arcades}
          game={game}
          onGame={onGame}
          following={following}
          present={present}
          venueId={hereVenueId}
          joinsSent={joinsSent}
          onClearVenue={onClearVenue}
          onOpenPlayer={onOpenPlayer}
          onOpenArcade={onOpenArcade}
          onJoin={onJoin}
          onUnsendJoin={onUnsendJoin}
          onMessage={onMessage}
          onSeeOpen={() => onSection('open')}
        />
      )}
      {(section === 'planned' || section === 'open') && (
        <Later
          scope={section === 'open' ? 'open' : 'circle'}
          onScope={(next) => onSection(next === 'open' ? 'open' : 'planned')}
          sessions={
            section === 'open'
              ? openSessions(planned)
              : circleSessions(planned, following, rsvps)
          }
          arcades={venues}
          following={following}
          venueId={section === 'open' ? hereVenueId : null}
          onClearVenue={onClearVenue}
          rsvps={rsvps}
          onRsvp={onRsvp}
          onEdit={onEditPlan}
          onCancel={onCancelPlan}
          onOpenArcade={onOpenArcade}
          onOpenPlayer={onOpenPlayer}
          onMessage={onMessage}
          onPlan={onPlan}
        />
      )}
      {section === 'activity' && (
        <Activity
          arcades={venues}
          onOpenPlayer={onOpenPlayer}
          onOpenClip={onOpenClip}
          onOpenArcade={onOpenArcade}
          onJoin={onJoin}
          onPlan={onPlan}
          onMessage={onMessage}
        />
      )}
      {section === 'scores' && (
        <Scores song={song} onSong={onSong} me={me} onOpenPlayer={onOpenPlayer} />
      )}
    </Screen>
  )
}

/* A secondary destination on the tab: reachable in one tap, drawn as text
   so it does not compete with the switch beside it. */
function QuietTab({ on, onClick, icon, children }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`inline-flex min-h-11 flex-none items-center gap-1 rounded-full px-2.5 text-xs transition-colors duration-150 ${
        on ? 'bg-sunken font-semibold text-ink' : 'text-ink-muted hover:text-ink'
      }`}
    >
      {icon}
      {children}
    </button>
  )
}

/* Now.

   The map, with the list as a sheet over it. Opened from an arcade page the
   sheet is already up and filtered to that arcade, because a person who
   tapped "People you follow" on KOKO was asking about KOKO, not about the
   city. Anything that brings you here on its own terms starts on the map. */
function Now({ venueId, onClearVenue, onSeeOpen, ...rest }) {
  /* Null until the person has opened or closed the sheet themselves; until
     then a venue filter is what decides, so arriving from an arcade page
     lands on the list. */
  const [toggled, setToggled] = useState(null)
  const listOpen = toggled ?? Boolean(venueId)
  const venue = venueId ? rest.arcades.find((a) => a.id === venueId) : null
  const count = rest.present.filter((p) => p.at === venueId).length

  return (
    <FriendsMap
      {...rest}
      listOpen={listOpen}
      listTitle={
        venue
          ? `${count} ${count === 1 ? 'friend' : 'friends'} at ${venue.short}`
          : null
      }
      onOpenList={() => setToggled(true)}
      onCloseList={() => {
        setToggled(false)
        onClearVenue()
      }}
      list={
        <HereNow
          {...rest}
          venueId={venueId}
          /* Widening the list from one arcade to all of them is still the
             list, so the sheet stays up once the filter it was opened on is
             gone. */
          onClearVenue={() => {
            setToggled(true)
            onClearVenue()
          }}
          onSeeOpen={onSeeOpen}
        />
      }
    />
  )
}

/* Here now.

   Planned sessions - a time in the future - used to render first, above the
   live presence list, inside this same view. Under a tab called "Here now" a
   host who was not at any arcade read as somebody standing in one. They are
   on Later now, so this view contains exactly what its name says: people who
   are at an arcade right now, and nothing else.

   Each row also carries one line about the player. Knowing that somebody is
   at KOKO and plays maimai does not tell you whether you would want to queue
   next to them, which is the question the list is really being read for. One
   line is the whole budget: what they just played, or their best grade if the
   feed has nothing recent on them. */
function HereNow({
  arcades,
  rawArcades = [],
  game,
  present,
  venueId,
  joinsSent,
  onClearVenue,
  onOpenPlayer,
  onOpenArcade,
  onJoin,
  onUnsendJoin,
  onSeeOpen,
}) {
  const here = present.filter((p) => !venueId || p.at === venueId)
  const venue = venueId ? arcades.find((a) => a.id === venueId) : null
  const venues = arcades
    .filter((a) => !venueId || a.id === venueId)
    .map((a) => ({ arcade: a, players: here.filter((p) => p.at === a.id) }))
    .filter((v) => v.players.length > 0)

  return (
    <Body>
      {venue && (
        <div className="flex items-center gap-2 border-b border-line bg-brand-50 px-4 py-2.5">
          <span className="min-w-0 flex-1 truncate font-display text-sm font-semibold text-ink">
            {venue.short}
          </span>
          <button
            type="button"
            onClick={onClearVenue}
            className="min-h-11 flex-none rounded-full px-3 text-xs font-semibold text-brand-700 transition-colors duration-150 hover:bg-brand-100"
          >
            All arcades
          </button>
        </div>
      )}

      {/* An empty list is where a new player lands every time, so it has to
          point somewhere rather than just report the absence. */}
      {venues.length === 0 && (
        <div className="px-4 py-6 text-center">
          <p className="text-sm font-medium text-ink">
            Nobody out {venue ? `at ${venue.short}` : ''} right now
          </p>
          <QuietAction className="mt-2" onClick={onSeeOpen}>
            See open sessions
          </QuietAction>
        </div>
      )}

      {venues.map(({ arcade, players }) => (
        <div key={arcade.id}>
          {/* The banner above already names the venue when the list is
              filtered to one, so the group header only earns its row when
              there is more than one group. */}
          {!venue && (
          <button
            type="button"
            onClick={() => onOpenArcade(arcade.id)}
            className="flex w-full items-center gap-2 border-b border-line bg-sunken px-4 py-2 text-left transition-colors duration-150 hover:bg-line/40"
          >
            <GameDot color={arcade.gameColor} />
            <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
              {arcade.short}
            </span>
            <span className="flex-1 text-xs tabular-nums text-ink-subtle">
              {players.length} here
            </span>
            <span className="text-xs font-semibold text-brand-600">Open</span>
          </button>
          )}

          {players.map((p, i) => {
            /* A place in a queue is read against the machines behind it. */
            const queueVenue = p.position ? venueForPlayer(rawArcades, p, game) : null
            return (
              <div
                key={p.handle}
                className="anim-row flex items-center gap-3 border-b border-line px-4 py-3"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <button
                  type="button"
                  onClick={() => onOpenPlayer(p.handle)}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  <Avatar handle={p.handle} size={38} live />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-ink">
                      {p.handle}
                    </span>
                    <span className="block truncate text-xs tabular-nums text-ink-muted">
                      {p.sinceMin}m &middot;{' '}
                      {p.position
                        ? `#${p.position} in queue${queueVenue ? ` · ${machinesLabel(queueVenue)}` : ''}`
                        : p.games.join(' · ')}
                    </span>
                  </span>
                </button>
                {/* One button that reports its own state and turns off again,
                    the same way saying yes to a session does. Notified used to
                    be a chip, so the only way back was to stop meaning it. */}
                {joinsSent?.[p.handle] === arcade.id ? (
                  <ActionButton
                    onClick={() => onUnsendJoin?.(p.handle)}
                    aria-label={`Take back telling ${p.handle} you are coming to ${arcade.short}`}
                  >
                    Notified
                  </ActionButton>
                ) : (
                  <ActionButton
                    onClick={() => onJoin(p.handle, arcade.id)}
                    aria-label={`Tell ${p.handle} you are joining them at ${arcade.short}`}
                  >
                    Join
                  </ActionButton>
                )}
              </div>
            )
          })}
        </div>
      ))}
    </Body>
  )
}

/* Later.

   Future, not live. These used to sit at the top of Here now with no label of
   their own, so a host who was not at any arcade looked like somebody standing
   in one - and the row never said how you knew that host either. They are a
   segment of their own now, and every row states what put it in front of you:
   you arranged it, you were invited, how you know the host, or that the host
   opened it to anyone.

   Two scopes, one filter. Your circle is the sessions you arranged, were
   asked to, said yes to, or that someone you follow is hosting. Open to
   anyone is the public half: every session anyone has posted for anyone,
   whether or not you have ever heard of them. Open used to be a segment of
   its own, which made two top-level answers to one question.

   Open is also the whole tab for a player with nobody in their circle yet.
   Nothing about presence changes for it - nobody is located, nobody is
   approached. A host who posts an open session has chosen to be found, the
   same way a note on the arcade's pinboard would, and saying you are in is
   the only route in the app from a stranger to a conversation. */
function Later({
  scope,
  onScope,
  sessions,
  arcades,
  following,
  venueId,
  onClearVenue,
  rsvps,
  onRsvp,
  onEdit,
  onCancel,
  onOpenArcade,
  onOpenPlayer,
  onMessage,
  onPlan,
}) {
  const open = scope === 'open'
  const [gameId, setGameId] = useState(null)
  const venue = venueId ? arcades.find((a) => a.id === venueId) : null
  /* Only games with something posted get a chip, so the filter row never
     offers an empty list. */
  const games = open
    ? GAMES.filter((g) =>
        sessions.some((s) => s.gameId === g.id && (!venueId || s.venue === venueId))
      )
    : []
  const rows = sessions.filter(
    (s) =>
      (!venueId || s.venue === venueId) && (!open || !gameId || s.gameId === gameId)
  )

  return (
    <Body>
      <div className="flex items-center gap-2 border-b border-line px-4 py-2">
        <div className="flex flex-1 gap-1.5">
          <Seg on={!open} onClick={() => onScope('circle')}>
            Your circle
          </Seg>
          <Seg on={open} onClick={() => onScope('open')}>
            Open
          </Seg>
        </div>
        <ActionButton
          icon={<Plus size={13} />}
          onClick={() => onPlan(open ? { open: true, venue: venueId ?? undefined } : {})}
        >
          {open ? 'Post' : 'Plan'}
        </ActionButton>
      </div>

      {venue && (
        <div className="flex items-center gap-2 border-b border-line bg-brand-50 px-4 py-2.5">
          <span className="min-w-0 flex-1 truncate font-display text-sm font-semibold text-ink">
            {venue.short}
          </span>
          <button
            type="button"
            onClick={onClearVenue}
            className="min-h-11 flex-none rounded-full px-3 text-xs font-semibold text-brand-700 transition-colors duration-150 hover:bg-brand-100"
          >
            All arcades
          </button>
        </div>
      )}

      {games.length > 1 && (
        <div className="no-scrollbar flex gap-1.5 overflow-x-auto border-b border-line px-4 py-2">
          <Seg on={gameId === null} onClick={() => setGameId(null)}>
            Any game
          </Seg>
          {games.map((g) => (
            <Seg
              key={g.id}
              on={gameId === g.id}
              accent={g.color}
              onClick={() => setGameId(g.id)}
            >
              {g.label}
            </Seg>
          ))}
        </div>
      )}

      {rows.length === 0 && (
        <div className="px-4 py-6 text-center">
          <p className="text-sm font-medium text-ink">
            {open ? `Nothing open${venue ? ` at ${venue.short}` : ''}` : 'No plans yet'}
          </p>
          {!open && (
            <QuietAction className="mt-2" onClick={() => onScope('open')}>
              See open sessions
            </QuietAction>
          )}
        </div>
      )}

      <SessionList
        sessions={rows}
        arcades={arcades}
        following={following}
        rsvps={rsvps}
        onRsvp={onRsvp}
        onEdit={onEdit}
        onCancel={onCancel}
        onOpenArcade={onOpenArcade}
        onOpenPlayer={onOpenPlayer}
        onMessage={onMessage}
      />
    </Body>
  )
}

/* One row per session, shared by Later and Open so a session reads the same
   wherever it turns up. Every row states what put it in front of you: you
   arranged it, you were invited, how you know the host, or that the host
   opened it to anyone. */
function SessionList({
  sessions,
  arcades,
  following,
  rsvps,
  onRsvp,
  onEdit,
  onCancel,
  onOpenArcade,
  onOpenPlayer,
  onMessage,
}) {
  /* Calling a session off tells everyone it is off, so the button asks twice
     rather than opening a dialog over a row this small. One slot is enough:
     arming a second row disarms the first. */
  const [confirming, setConfirming] = useState(null)

  return sessions.map((s) => {
    const venue = arcades.find((a) => a.id === s.venue)
    /* Your own sessions have no relationship to state. */
    const rel = s.mine ? null : relationshipOf(s.host, following)
    const going = rsvps.includes(s.id)
    /* The host is a stranger, and the only reason they are on your screen is
       that they opened the door. Say that, rather than "Not connected". */
    const stranger = rel && !rel.youFollow && !rel.followsYou
    const canJoin = s.invitedMe || (s.open && !s.mine)
    const label = s.mine
      ? s.open
        ? 'You posted this'
        : 'You planned this'
      : s.invitedMe
        ? 'Invited you'
        : stranger
          ? 'Open to anyone'
          : rel.label
    return (
      <div
        key={s.id}
        className="flex items-start gap-3 border-b border-line px-4 py-3"
      >
        <span className="mt-0.5 flex -space-x-2">
          {s.going.slice(0, 3).map((h) => (
            <Avatar key={h} handle={h} size={26} className="ring-2 ring-surface" />
          ))}
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-1.5 text-sm text-ink">
            {s.mine ? (
              <span className="font-semibold">You</span>
            ) : (
              <button
                type="button"
                onClick={() => onOpenPlayer(s.host)}
                className="rounded-md font-semibold text-ink"
              >
                {s.host}
              </button>
            )}
            <Chip tone={s.mine ? 'brand' : 'quiet'}>{label}</Chip>
            {s.open && !s.mine && !stranger && (
              <Chip tone="quiet">Open</Chip>
            )}
          </p>
          {/* A run of text, not a flex row: laying it out with flex let the
              venue button be squeezed until its own name broke in half.
              Each part is kept whole and the line breaks between them. */}
          <p className="text-xs leading-snug text-ink-muted">
            <GameDot
              color={gameColor(s.gameId)}
              className="mr-1.5 align-middle"
            />
            <span className="whitespace-nowrap">
              {venue ? (
                <button
                  type="button"
                  onClick={() => onOpenArcade(s.venue)}
                  className="font-medium text-brand-600 underline decoration-brand-200 underline-offset-2 hover:decoration-brand-600"
                >
                  {venue.short}
                </button>
              ) : (
                'an arcade'
              )}{' '}
              &middot;
            </span>{' '}
            <span className="whitespace-nowrap">
              {gameLabel(s.gameId)} &middot;
            </span>{' '}
            <span className="whitespace-nowrap">{s.whenLabel}</span>
          </p>
          {s.note && <p className="text-xs text-ink-subtle">{s.note}</p>}
          {/* Saying yes has to leave a trace, the same way telling someone
              you are on your way does. On an open session it also opens the
              thread, since a stranger who said "anyone" has asked to hear
              from you. */}
          {going && (
            <p className="flex flex-wrap items-center gap-x-1 text-xs font-medium text-fresh">
              <Check size={13} />
              {s.host} told &middot; {s.going.length + 1} going
              {s.open && !rel?.mutual && (
                <>
                  {' '}
                  &middot;{' '}
                  <button
                    type="button"
                    onClick={() => onMessage(s.host)}
                    className="rounded-md font-semibold text-brand-600 underline decoration-brand-200 underline-offset-2 hover:decoration-brand-600"
                  >
                    Message {s.host}
                  </button>
                </>
              )}
            </p>
          )}
          {s.mine && (
            <div className="mt-1.5 flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setConfirming(null)
                  onEdit(s)
                }}
                className="rounded-md text-xs font-semibold text-brand-600 transition-colors duration-150 hover:text-brand-700"
              >
                Change
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirming !== s.id) {
                    setConfirming(s.id)
                    return
                  }
                  setConfirming(null)
                  onCancel(s.id)
                }}
                className="rounded-md text-xs font-semibold text-ink-muted transition-colors duration-150 hover:text-live"
              >
                {confirming === s.id
                  ? 'Tap again to call it off'
                  : 'Call it off'}
              </button>
            </div>
          )}
        </div>
        {canJoin ? (
          <ActionButton
            onClick={() => onRsvp(s.id)}
            aria-label={
              going
                ? `Cancel going to ${s.host}'s session`
                : `Tell ${s.host} you are coming`
            }
          >
            {going ? 'Going' : "I'm in"}
          </ActionButton>
        ) : s.mine ? (
          /* Who has answered matters more than who was asked, once anyone
             has. */
          <Chip tone="quiet">
            {s.open || s.going.length > 0
              ? `${s.going.length} going`
              : `${s.asked.length} asked`}
          </Chip>
        ) : (
          <Chip tone="quiet">{s.going.length} going</Chip>
        )}
      </div>
    )
  })
}

/* Activity. Every line ends in the action it enables, because a feed of facts
   about where people are is not engagement on its own.

   One action per row carries the weight. A check-in offers two things - go
   there, or ask the person what the line is actually like - and they were
   drawn as matching buttons, which is what made the feed read as "a lot of
   different things I can press". Joining is the reason the row is in front of
   you, so it keeps the button and the question becomes a text action beside
   it. Nothing was dropped; only one of them is now the obvious one. */
function Activity({
  arcades,
  onOpenPlayer,
  onOpenClip,
  onOpenArcade,
  onJoin,
  onPlan,
  onMessage,
}) {
  const venueName = (id) => arcades.find((a) => a.id === id)?.short ?? 'an arcade'

  return (
    <Body>
      <ul>
        {ACTIVITY.map((e, i) => (
          <li
            key={e.id}
            className="anim-row flex gap-3 border-b border-line px-4 py-3"
            style={{ animationDelay: `${Math.min(i, 8) * 35}ms` }}
          >
            <button
              type="button"
              onClick={() => onOpenPlayer(e.handle)}
              aria-label={`Open ${e.handle}`}
              className="mt-0.5 transition-transform duration-150 ease-soft hover:scale-105 active:scale-95"
            >
              <Avatar handle={e.handle} size={38} live={e.type === 'checkin'} />
            </button>

            <div className="min-w-0 flex-1">
              <p className="text-sm leading-relaxed text-ink">
                <span className="font-semibold">{e.handle}</span>{' '}
                {e.type === 'checkin' && <>checked into {venueName(e.venue)}</>}
                {e.type === 'checkout' && <>left {venueName(e.venue)}</>}
                {e.type === 'played' && (
                  <>
                    played {e.songs.length} {e.songs.length === 1 ? 'song' : 'songs'} at{' '}
                    {venueName(e.venue)}
                  </>
                )}
                {e.type === 'best' && (
                  <>
                    set a new best on &ldquo;{e.song}&rdquo;,{' '}
                    <span className="tabular-nums">
                      {formatAchievement(e.achievement)}
                    </span>{' '}
                    {gradeOf(e.achievement)}
                  </>
                )}
                {e.type === 'clip' && <>posted a clip of &ldquo;{e.song}&rdquo;</>}
              </p>

              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <span className="text-xs tabular-nums text-ink-subtle">
                  {ago(e.minsAgo)}
                </span>

                {e.type === 'checkin' && (
                  <>
                    <ActionButton
                      onClick={() => onJoin(e.handle, e.venue)}
                      aria-label={`Tell ${e.handle} you are joining them at ${venueName(e.venue)}`}
                    >
                      Join them
                    </ActionButton>
                    <QuietAction
                      onClick={() =>
                        onMessage(e.handle, 'How long is the wait really?')
                      }
                      aria-label={`Ask ${e.handle} what the wait is like`}
                    >
                      What&rsquo;s it like?
                    </QuietAction>
                  </>
                )}
                {e.type === 'checkout' && (
                  <ActionButton onClick={() => onPlan({ invite: e.handle })}>
                    Plan next
                  </ActionButton>
                )}
                {e.type === 'played' && (
                  <ActionButton onClick={() => onOpenArcade(e.venue)}>
                    Open arcade
                  </ActionButton>
                )}
                {e.type === 'best' && (
                  <ActionButton
                    onClick={() =>
                      onMessage(e.handle, 'Nice score, what did you change?')
                    }
                  >
                    Congrats
                  </ActionButton>
                )}
                {e.type === 'clip' && (
                  <ActionButton onClick={() => onOpenClip(e.clipId)}>
                    Watch
                  </ActionButton>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </Body>
  )
}

function Scores({ song, onSong, me, onOpenPlayer }) {
  const rows = leaderboard(song)
  const cut = belowOldCap(rows)
  const current = SONGS.find((s) => s.id === song)

  return (
    <Body>
      <div className="flex flex-wrap gap-1.5 border-b border-line px-4 py-2">
        {SONGS.map((s) => (
          <Seg key={s.id} on={s.id === song} onClick={() => onSong(s.id)}>
            {s.title}
          </Seg>
        ))}
      </div>

      <div className="border-b border-line px-4 py-3">
        <p className="font-display text-sm font-semibold text-ink">{current.title}</p>
        <p className="text-xs tabular-nums text-ink-muted">
          {current.chart} &middot; {FRIENDS.length} people you follow
        </p>
      </div>

      <ol>
        {rows.map((r) => (
          <li key={r.handle}>
            {r.rank === OLD_SITE_FAVOURITE_CAP + 1 && <CapLine cut={cut} />}
            <button
              type="button"
              onClick={() => !r.me && onOpenPlayer(r.handle)}
              className={`flex w-full items-center gap-2.5 border-b border-line px-4 py-2 text-left transition-colors duration-150 ${
                r.me ? 'bg-brand-50' : 'hover:bg-sunken'
              }`}
            >
              <span className="w-5 text-xs tabular-nums text-ink-subtle">{r.rank}</span>
              <Avatar
                handle={r.me ? me.handle : r.handle}
                hue={r.me ? me.hue : null}
                size={28}
                live={Boolean(r.at)}
              />
              <span className="min-w-0 flex-1">
                <span
                  className={`block truncate text-sm ${
                    r.me ? 'font-bold text-brand-700' : 'text-ink'
                  }`}
                >
                  {r.me ? 'You' : r.handle}
                </span>
                {r.at && (
                  <span className="block text-[11px] text-fresh">Out now</span>
                )}
              </span>
              <span className="text-right font-display text-sm tabular-nums text-ink">
                {formatAchievement(r.achievement)}
              </span>
              <Chip tone={r.achievement >= 100.5 ? 'brand' : 'default'}>
                {gradeOf(r.achievement)}
              </Chip>
            </button>
          </li>
        ))}
      </ol>
    </Body>
  )
}

/* The single most useful thing this screen draws: where the old tool stopped. */
function CapLine({ cut }) {
  return (
    <div className="border-y border-dashed border-stale bg-stale-bg px-4 py-2">
      <p className="text-xs font-bold uppercase tracking-wide text-stale">
        Official site stops at {OLD_SITE_FAVOURITE_CAP}
      </p>
      <p className="text-xs tabular-nums text-ink-muted">
        {cut.count} more only on Arcade Circle
      </p>
    </div>
  )
}
