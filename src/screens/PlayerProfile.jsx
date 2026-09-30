import {
  Screen,
  TopBar,
  Body,
  Avatar,
  Chip,
  PrimaryButton,
  SecondaryButton,
  QuietAction,
  GameDot,
} from '../components/ui.jsx'
import { SONGS } from '../social.js'
import {
  sharedSongs,
  sharedGames,
  gradeOf,
  formatAchievement,
} from '../lib/social.js'

/* Player profile.

   This screen used to end in nothing on purpose. The team's own conclusion was
   that "the app can't force our users to just go up to someone they haven't
   met" - "it's impossible" - so it showed what you had in common and stopped.
   The six-year player's own way in was someone else opening with "do you wanna
   play together?" at the cabinet, not an app.

   Consultation feedback was that a feature which only tells you where someone
   is has no purpose - knowing has to lead to joining them, asking them about
   the venue, or arranging to meet. So the actions are back, scoped to people
   you follow both ways. The stranger case is untouched: nothing here appears
   for someone who has not followed you back, so the original finding still
   holds where it applied.

   Every field below the handle is optional. Someone who follows you and whom
   you have not followed back is on record as a handle and a game and nothing
   else, so this screen has to render that person as readily as a mutual whose
   scores it has had for months. It reads the relationship from explicit state
   rather than inferring it from which fields happen to be missing.

   A real account arrives here as `player.real`. It has a handle, a colour
   and a relationship and nothing else yet - no games, songs, scores or
   presence, because none of that is stored for accounts. Its actions are
   Message and Follow, whatever the relationship: a message to someone who
   does not follow you back arrives as a request they can accept, decline
   or block, and the line under the buttons says so. Joining them at an
   arcade and planning a session still run on prototype data, so they stay
   with the seeded players. Someone you have blocked gets neither button,
   only the way back. */
export default function PlayerProfile({
  player,
  relationship,
  arcade,
  joinedAt,
  /* The open session of theirs you have joined, as one line, or null. It is
     the only thing that puts a Message button on a stranger's profile. */
  openSession = null,
  /* Both leave for the tab this trail started from; the label says which. */
  onBack,
  backLabel = 'Back',
  onClose = null,
  onOpenArcade,
  onJoin,
  onUnsendJoin,
  onMessage,
  onToggleFollow,
  onPlan,
  /* Real accounts only: whether you have blocked them, and the two ways to
     change that. Blocking asks first; the confirmation lives above this
     screen. */
  blocked = false,
  onBlock,
  onUnblock,
  busy = false,
  /* How long a real account has been at `arcade`, when they are there. */
  sinceMin = null,
}) {
  const rel = relationship ?? {
    youFollow: false,
    followsYou: false,
    mutual: false,
    label: 'Not connected',
  }
  const songs = sharedSongs(player)
  const games = sharedGames(player)
  const playerGames = player.games ?? []
  const playerSongs = player.songs ?? []
  const joined = joinedAt && arcade && joinedAt === arcade.id

  return (
    <Screen>
      <TopBar
        title={player.handle}
        subtitle={
          blocked
            ? 'Blocked'
            : rel.mutual
              ? 'You follow each other'
              : rel.youFollow
                ? 'You follow them'
                : rel.followsYou
                  ? 'Follows you'
                  : 'Not connected'
        }
        onBack={onBack}
        backLabel={backLabel}
        onClose={onClose}
        closeLabel="Close profile"
      />

      <Body>
        <div className="flex items-center gap-3 border-b border-line px-4 py-4">
          <Avatar handle={player.handle} hue={player.hue ?? null} size={56} live={Boolean(arcade)} />
          <div className="min-w-0">
            <p className="font-display text-lg font-semibold text-ink">
              {player.handle}
            </p>
            <p className="truncate text-xs text-ink-muted">
              {player.real
                ? 'Account'
                : playerGames.length > 0
                  ? playerGames.join(' · ')
                  : 'No games listed'}
            </p>
          </div>
          <Chip className="ml-auto" tone={rel.mutual ? 'brand' : 'default'}>
            {blocked ? 'Blocked' : rel.label}
          </Chip>
        </div>

        {arcade && (
          <button
            type="button"
            onClick={() => onOpenArcade(arcade.id)}
            className="flex w-full items-center gap-3 border-b border-line bg-fresh-bg px-4 py-3 text-left transition-colors duration-150 hover:brightness-95"
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className="anim-ring absolute inline-flex h-full w-full rounded-full bg-fresh" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-fresh" />
            </span>
            <span className="flex-1">
              <span className="block text-sm font-semibold text-ink">
                At {arcade.name}
              </span>
              <span className="block text-xs tabular-nums text-ink-muted">
                {player.sinceMin ?? sinceMin ?? 0}m
              </span>
            </span>
            <span className="text-xs font-semibold text-fresh">Open</span>
          </button>
        )}

        <Section title="In common">
          {games.length === 0 && songs.length === 0 ? (
            <p className="text-sm text-ink-muted">&mdash;</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {[...games, ...songs].map((item) => (
                <Chip key={item} tone="brand">
                  {item}
                </Chip>
              ))}
            </div>
          )}
        </Section>

        <Section title="Favourite songs">
          {playerSongs.length === 0 ? (
            <p className="text-sm text-ink-muted">&mdash;</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {playerSongs.map((s) => (
                <Chip key={s} tone={songs.includes(s) ? 'brand' : 'default'}>
                  {s}
                </Chip>
              ))}
            </div>
          )}
        </Section>

        {player.scores && (
          <Section title="Scores">
            <ul>
              {SONGS.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center gap-2 border-b border-line py-2 last:border-b-0"
                >
                  <GameDot color="var(--game-maimai)" />
                  <span className="flex-1 text-sm text-ink">{s.title}</span>
                  <span className="font-display text-sm tabular-nums text-ink">
                    {formatAchievement(player.scores[s.id])}
                  </span>
                  <Chip tone={player.scores[s.id] >= 100.5 ? 'brand' : 'default'}>
                    {gradeOf(player.scores[s.id])}
                  </Chip>
                </li>
              ))}
            </ul>
          </Section>
        )}

      </Body>

      {/* The actions the consultation asked for: reach out, join them where
          they are, or arrange the next one - all of which need the follow to
          run both ways first, so a one-way profile offers the follow instead of
          an action that would quietly do nothing. */}
      <div className="space-y-2 border-t border-line p-4">
        {player.real ? (
          <RealActions
            player={player}
            rel={rel}
            blocked={blocked}
            busy={busy}
            arcade={arcade}
            joined={joined}
            onJoin={onJoin}
            onUnsendJoin={onUnsendJoin}
            onMessage={onMessage}
            onToggleFollow={onToggleFollow}
            onBlock={onBlock}
            onUnblock={onUnblock}
          />
        ) : rel.mutual ? (
          <>
            {joined && (
              <div className="flex items-center gap-2 rounded-xl bg-fresh-bg px-3 py-2">
                <p className="min-w-0 flex-1 text-xs font-medium text-ink">
                  {player.handle} knows you&rsquo;re coming
                </p>
                <button
                  type="button"
                  onClick={() => onUnsendJoin?.(player.handle)}
                  className="min-h-11 flex-none rounded-md text-xs font-semibold text-ink-muted underline decoration-ink-subtle underline-offset-2 transition-colors duration-150 hover:text-ink"
                >
                  Undo
                </button>
              </div>
            )}
            {arcade ? (
              <PrimaryButton onClick={() => onJoin(player.handle, arcade.id)}>
                Join them at {arcade.short}
              </PrimaryButton>
            ) : (
              <PrimaryButton onClick={() => onPlan({ invite: player.handle })}>
                Plan a session together
              </PrimaryButton>
            )}
            <SecondaryButton onClick={() => onMessage(player.handle)}>
              Message
            </SecondaryButton>
          </>
        ) : (
          <>
            {openSession && (
              <div className="flex items-center gap-2 rounded-xl bg-fresh-bg px-3 py-2">
                <p className="min-w-0 flex-1 text-xs font-medium text-ink">
                  Going &middot; {openSession}
                </p>
              </div>
            )}
            {openSession && (
              <SecondaryButton onClick={() => onMessage(player.handle)}>
                Message about the session
              </SecondaryButton>
            )}
            {rel.youFollow ? (
              <SecondaryButton onClick={() => onToggleFollow(player.handle)}>
                Following
              </SecondaryButton>
            ) : (
              <PrimaryButton onClick={() => onToggleFollow(player.handle)}>
                {rel.followsYou ? 'Follow back' : 'Follow'}
              </PrimaryButton>
            )}
          </>
        )}
      </div>
    </Screen>
  )
}

/* The actions for a real account. Message is always first: it is what a
   profile is for. Under it, the follow. The line that explained whether a
   message would arrive as a request went in the Week 9 cut; the composer
   itself now says "Write a request…" when it is one. */
function RealActions({
  player,
  rel,
  blocked,
  busy,
  arcade,
  joined,
  onJoin,
  onUnsendJoin,
  onMessage,
  onToggleFollow,
  onBlock,
  onUnblock,
}) {
  if (blocked) {
    return (
      <>
        <p className="rounded-xl bg-sunken px-3 py-2.5 text-xs font-medium text-ink-muted">
          Blocked
        </p>
        <SecondaryButton onClick={onUnblock} disabled={busy}>
          {busy ? 'Working…' : `Unblock ${player.handle}`}
        </SecondaryButton>
      </>
    )
  }

  /* Someone you follow both ways who is at an arcade right now: joining
     them is the first thing to offer, and Message steps down a level. */
  const there = Boolean(arcade) && rel.mutual
  return (
    <>
      {there && joined && (
        <div className="flex items-center gap-2 rounded-xl bg-fresh-bg px-3 py-2">
          <p className="min-w-0 flex-1 text-xs font-medium text-ink">
            {player.handle} knows you&rsquo;re coming
          </p>
          <button
            type="button"
            onClick={() => onUnsendJoin?.(player.handle)}
            className="min-h-11 flex-none rounded-md text-xs font-semibold text-ink-muted underline decoration-ink-subtle underline-offset-2 transition-colors duration-150 hover:text-ink"
          >
            Undo
          </button>
        </div>
      )}
      {there && !joined ? (
        <>
          <PrimaryButton onClick={() => onJoin(player.handle, arcade.id)} disabled={busy}>
            Join them at {arcade.short}
          </PrimaryButton>
          <SecondaryButton onClick={() => onMessage(player.handle)} disabled={busy}>
            Message
          </SecondaryButton>
        </>
      ) : (
        <PrimaryButton onClick={() => onMessage(player.handle)} disabled={busy}>
          Message
        </PrimaryButton>
      )}
      <SecondaryButton onClick={() => onToggleFollow(player.handle)} disabled={busy}>
        {rel.youFollow ? 'Following' : rel.followsYou ? 'Follow back' : 'Follow'}
      </SecondaryButton>
      <div className="flex justify-center pt-1">
        <QuietAction onClick={onBlock} disabled={busy} className="min-h-[44px] px-3">
          Block {player.handle}
        </QuietAction>
      </div>
    </>
  )
}

function Section({ title, children }) {
  return (
    <div className="border-b border-line px-4 py-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
        {title}
      </p>
      {children}
    </div>
  )
}
