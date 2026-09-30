import {
  Avatar,
  Body,
  Chip,
  Screen,
  Seg,
  Toggle,
  Disclosure,
  TopBar,
} from '../components/ui.jsx'
import {
  Bars,
  Chevron,
  Heart,
  Play,
  Pulse,
  Shield,
  Users,
} from '../components/Icons.jsx'
import { ME } from '../social.js'

const WEEKLY_GOAL = 4

/* The Me tab.

   `me` is the signed-in account's real profile - handle and colour from the
   database - and the two counts are real follow edges. The games, songs and
   the weekly goal below are still seeded: the app does not record play yet.
   They used to be labelled "sample data" on screen; Week 9 asked for no
   prototype language in the interface, so the label went and this note is
   where that caveat now lives. */
export default function MeTab({
  me,
  account = null,
  onEditProfile,
  onSignOut,
  onDeleteAccount,
  reports,
  sessions,
  visible,
  onVisible,
  /* Who may see your arcade: 'mutuals' or 'followers'. Null without an
     account, when there is nobody to share it with anyway. */
  audience = null,
  onAudience,
  /* System notifications for messages that arrive while the app is in
     the background. Only offered where the browser can do it. */
  alerts = false,
  alertsSupported = false,
  alertsBlocked = false,
  onAlerts,
  soundOn,
  onSound,
  onOpenFollows,
  followers = 0,
  following = 0,
  likedCount,
  onOpenLiked,
}) {
  const safeSessions = Math.max(0, Number(sessions) || 0)
  const safeReports = Math.max(0, Number(reports) || 0)
  const safeLikedCount = Math.max(0, Number(likedCount) || 0)
  const sessionsToGo = Math.max(0, WEEKLY_GOAL - safeSessions)
  const progress = Math.min(100, (safeSessions / WEEKLY_GOAL) * 100)

  return (
    <Screen>
      <TopBar title="Me" />

      <Body className="bg-sunken">
        <div className="space-y-3 px-4 py-4 pb-6">
          <section className="overflow-hidden rounded-2xl border border-brand-200 bg-brand-50 shadow-sm">
            {/* Your handle and colour are yours, so the card that shows them is
                the control that changes them. */}
            <button
              type="button"
              onClick={onEditProfile}
              className="flex w-full items-center gap-3 p-4 text-left transition-colors duration-150 hover:bg-brand-100"
            >
              <Avatar handle={me.handle} hue={me.hue} size={58} />
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-display text-xl font-bold tracking-tight text-ink">
                    {me.handle}
                  </span>
                  <Chip tone="brand">Sydney</Chip>
                </span>
                {/* The email lives in the Account section below; up here the
                    card is who you are in the app, not how you log in. */}
                {!account && (
                  <span className="mt-0.5 block truncate text-xs text-ink-muted">
                    Not signed in
                  </span>
                )}
              </span>
              <span className="flex flex-none items-center gap-1 text-xs font-semibold text-brand-700">
                Edit
                <Chevron size={13} />
              </span>
            </button>

            <div className="border-t border-brand-200 bg-surface/70 px-4 py-3">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
                    Weekly goal
                  </p>
                  <p className="mt-0.5 text-xs text-ink-muted">
                    {sessionsToGo === 0 ? 'Goal met' : `${sessionsToGo} to go`}
                  </p>
                </div>
                <p className="font-display text-lg font-bold tabular-nums text-ink">
                  {safeSessions}
                  <span className="text-sm font-medium text-ink-muted">/{WEEKLY_GOAL}</span>
                </p>
              </div>
              <div
                className="mt-2 h-2 overflow-hidden rounded-full bg-brand-100"
                role="progressbar"
                aria-label="Weekly session goal"
                aria-valuemin={0}
                aria-valuemax={WEEKLY_GOAL}
                aria-valuenow={Math.min(safeSessions, WEEKLY_GOAL)}
              >
                <span
                  className="block h-full rounded-full bg-brand-600 transition-[width] duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </section>

          <section aria-label="Profile shortcuts" className="grid grid-cols-3 gap-2">
            <QuickAction
              label="Followers"
              value={followers}
              Icon={Users}
              onClick={() => onOpenFollows('followers')}
            />
            <QuickAction
              label="Following"
              value={following}
              Icon={Users}
              onClick={() => onOpenFollows('following')}
            />
            <QuickAction
              label="Liked clips"
              value={safeLikedCount}
              Icon={Heart}
              onClick={onOpenLiked}
            />
          </section>

          <Disclosure
            title="Your player card"
            hint={ME.games.join(', ')}
            icon={<Bars size={17} />}
          >
            <div className="grid grid-cols-2 gap-2">
              <Preference title="Main games" Icon={Bars} items={ME.games} />
              <Preference title="On repeat" Icon={Play} items={ME.songs} />
            </div>
          </Disclosure>

          <Disclosure
            title="Community contribution"
            hint={`${safeSessions} sessions, ${safeReports} queue updates`}
            icon={<Pulse size={17} />}
          >
            <div className="grid grid-cols-2 gap-2">
              <ContributionStat
                label="Play sessions"
                value={safeSessions}
                Icon={Play}
              />
              <ContributionStat
                label="Queue updates"
                value={safeReports}
                Icon={Pulse}
              />
            </div>

          </Disclosure>

          <Disclosure
            title="Privacy and sound"
            hint={`${visible ? (audience === 'followers' ? 'Seen by all followers' : 'Seen by mutual friends') : 'Hidden'} · sound ${soundOn ? 'on' : 'off'}`}
            icon={<Shield size={17} />}
          >
            <Toggle
              checked={visible}
              onChange={onVisible}
              label={visible ? 'Sharing your arcade' : 'Hidden'}
            />

            {/* Presence was always for people who follow each other, and
                that is still the default. Opening it to everyone who
                follows you is the person's own call - it is their arcade
                being shared - which is what keeps the research finding
                about strangers intact. The field study backed both halves
                (finding H): sharing "mainly just to people I know", and
                "control over who can see that I'm there", so the wider
                option is named plainly and said to be opt-in. */}
            {audience && (
              <div className="mt-2 rounded-xl border border-line bg-surface p-3">
                <p className="text-sm font-medium text-ink">Who can see where you are</p>
                <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label="Who can see where you are">
                  <Seg
                    on={audience === 'mutuals'}
                    aria-pressed={audience === 'mutuals'}
                    onClick={() => onAudience?.('mutuals')}
                  >
                    Mutual friends
                  </Seg>
                  <Seg
                    on={audience === 'followers'}
                    aria-pressed={audience === 'followers'}
                    onClick={() => onAudience?.('followers')}
                  >
                    All followers
                  </Seg>
                </div>
              </div>
            )}

            {alertsSupported && (
              <div className="mt-2">
                <Toggle
                  checked={alerts}
                  onChange={onAlerts}
                  label={alerts ? 'Background alerts on' : 'Background alerts off'}
                  hint={alertsBlocked ? 'Blocked in browser' : null}
                />
              </div>
            )}

            {/* Sound is on by default, but an arcade is loud and a lecture
                theatre is not, so it has to be one tap away. */}
            <div className="mt-2">
              <Toggle
                checked={soundOn}
                onChange={onSound}
                label={soundOn ? 'Sound on' : 'Sound off'}
              />
            </div>

          </Disclosure>

          {/* The account itself: what it is signed in as, and the two ways
              out. Signing out is ordinary and reversible, so it looks like
              any other row. Deleting is neither, so it sits apart, in the
              colour the app keeps for things that cannot be taken back, and
              it asks again before it does anything. */}
          {account && (
            <section
              aria-labelledby="account-heading"
              className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm"
            >
              <div className="border-b border-line px-4 py-3">
                <h2 id="account-heading" className="font-display text-sm font-semibold text-ink">
                  Account
                </h2>
                <p className="mt-0.5 truncate text-xs text-ink-muted">{account.email ?? 'Signed in'}</p>
              </div>
              <button
                type="button"
                onClick={onSignOut}
                className="flex min-h-[48px] w-full items-center border-b border-line px-4 py-3 text-left text-sm font-semibold text-ink transition-colors duration-150 hover:bg-sunken"
              >
                Sign out
              </button>
              <button
                type="button"
                onClick={onDeleteAccount}
                className="flex min-h-[48px] w-full items-center px-4 py-3 text-left text-sm font-semibold text-live transition-colors duration-150 hover:bg-live-bg"
              >
                Delete account
              </button>
            </section>
          )}
        </div>
      </Body>
    </Screen>
  )
}

function QuickAction({ label, value, Icon, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-w-0 rounded-2xl border border-line bg-surface p-3 text-left shadow-sm transition-all duration-150 ease-soft hover:border-brand-200 hover:bg-brand-50 active:scale-[0.98]"
    >
      <span className="flex items-center justify-between text-ink-muted">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-sunken">
          <Icon size={15} />
        </span>
        <Chevron size={13} />
      </span>
      <span className="mt-2 block font-display text-lg font-bold tabular-nums text-ink">
        {value}
      </span>
      <span className="block truncate text-[10px] font-medium text-ink-muted">{label}</span>
    </button>
  )
}

function Preference({ title, Icon, items }) {
  return (
    <div className="min-w-0 rounded-xl bg-sunken p-3">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold text-ink">
        <Icon size={14} className="text-brand-600" />
        {title}
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {items.map((item) => (
          <Chip key={item} tone="quiet" className="max-w-full truncate">
            {item}
          </Chip>
        ))}
      </div>
    </div>
  )
}

function ContributionStat({ label, value, Icon }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-line bg-sunken p-2.5">
      <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-surface text-brand-600 shadow-sm">
        <Icon size={16} />
      </span>
      <span className="min-w-0">
        <span className="block font-display text-lg font-bold tabular-nums leading-none text-ink">
          {value}
        </span>
        <span className="mt-1 block whitespace-nowrap text-[10px] text-ink-muted">
          {label}
        </span>
      </span>
    </div>
  )
}
