import { useState } from 'react'
import { Screen, TopBar, Body, Seg, Info } from '../components/ui.jsx'
import { Chevron, Plus } from '../components/Icons.jsx'
import PersonRow from '../components/PersonRow.jsx'

/* Followers / Following.

   Kept as a plain roster. The only thing it adds beyond a count is which
   direction each relationship runs, because presence is only shared between
   mutuals - so "follows you" and "you follow" are functional states here, not
   vanity numbers.

   Finding new people is not this screen's job any more. It used to carry a
   search field of its own, which made two places to type the same username
   and left the QR route as a side door. Add someone is the one way in for
   all of it - search, scan a code, show yours - and the row at the top is
   the way there.

   Everyone on this screen is a real account. The two lists are your real
   follow edges, and Follow writes a real row. The seeded players on the map
   and the leaderboard are prototype data and are deliberately not mixed in
   here. */
export default function Follows({
  tabName,
  onTab,
  onBack,
  myId,
  configured,
  follows,
  onOpenProfile,
  onAddPerson,
}) {
  const [actionError, setActionError] = useState(null)
  const signedIn = Boolean(myId)
  const rows = tabName === 'followers' ? follows.followers : follows.following

  async function toggle(profile) {
    setActionError(null)
    const result = await follows.toggle(profile.id)
    if (result?.error) setActionError(result.error)
  }

  return (
    <Screen>
      <TopBar
        title="People"
        onBack={onBack}
        right={
          <Info>Only people who follow each other see each other&rsquo;s arcade.</Info>
        }
      />

      <button
        type="button"
        onClick={onAddPerson}
        className="flex w-full items-center gap-3 border-b border-line px-4 py-3 text-left transition-colors duration-150 hover:bg-sunken"
      >
        <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-brand-50 text-brand-700">
          <Plus size={18} />
        </span>
        <span className="min-w-0 flex-1 text-sm font-semibold text-ink">Add someone</span>
        <Chevron size={16} className="text-ink-subtle" />
      </button>

      {!signedIn ? (
        <Body>
          <p className="px-6 py-10 text-center text-xs leading-relaxed text-ink-muted">
            {configured ? 'Sign in to see people' : 'Accounts unavailable'}
          </p>
        </Body>
      ) : (
        <>
          <div role="tablist" aria-label="Lists" className="flex gap-2 border-b border-line px-4 py-2">
            <Seg
              role="tab"
              aria-selected={tabName === 'followers'}
              on={tabName === 'followers'}
              onClick={() => onTab('followers')}
              className="min-h-[36px]"
            >
              Followers {follows.followers.length}
            </Seg>
            <Seg
              role="tab"
              aria-selected={tabName === 'following'}
              on={tabName === 'following'}
              onClick={() => onTab('following')}
              className="min-h-[36px]"
            >
              Following {follows.following.length}
            </Seg>
          </div>

          <Body>
            {follows.error && <ActionError text={follows.error} />}
            {actionError && <ActionError text={actionError} />}
            {follows.loading ? (
              <p role="status" className="px-6 py-10 text-center text-xs text-ink-subtle">
                Loading…
              </p>
            ) : rows.length === 0 ? (
              <p className="px-6 py-10 text-center text-xs leading-relaxed text-ink-muted">
                {tabName === 'followers' ? 'No followers yet' : 'Not following anyone yet'}
              </p>
            ) : (
              <ul>
                {rows.map((p) => (
                  <PersonRow
                    key={p.id}
                    person={p}
                    relationship={follows.relationship(p.id)}
                    onOpen={() => onOpenProfile(p)}
                    onToggleFollow={() => toggle(p)}
                  />
                ))}
              </ul>
            )}
          </Body>
        </>
      )}
    </Screen>
  )
}

function ActionError({ text }) {
  return (
    <p role="alert" className="border-b border-line bg-live-bg px-4 py-2 text-xs font-medium text-live">
      {text}
    </p>
  )
}
