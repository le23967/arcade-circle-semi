import { useEffect, useMemo, useState } from 'react'
import { ARCADES, QUEUE_AHEAD, DEFAULT_GAME } from './data.js'
import {
  estimateWaitMin,
  venueGame,
  venuesForGame,
  otherGamesAt,
  withParty,
  withoutParty,
} from './lib/queue.js'
import { reportIssue, markWorking } from './lib/machines.js'
import { Frame, TabBar, SessionBanner, TAB_IDS, tabLabel } from './components/Frame.jsx'
import { PrimaryButton, SecondaryButton, AlertBanner, Avatar } from './components/ui.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'

import Arcades from './screens/Arcades.jsx'
import Detail from './screens/Detail.jsx'
import CheckIn from './screens/CheckIn.jsx'
import Scan from './screens/Scan.jsx'
import ConfirmQueue from './screens/ConfirmQueue.jsx'
import Report from './screens/Report.jsx'
import MachineReport from './screens/MachineReport.jsx'
import CheckedIn from './screens/CheckedIn.jsx'
import Summary from './screens/Summary.jsx'
import Directions from './screens/Directions.jsx'
import Comments from './screens/Comments.jsx'
import { playSound, isMuted, setMuted } from './lib/sound.js'
import Message from './screens/Message.jsx'
import JoinFriend from './screens/JoinFriend.jsx'
import PlanSession from './screens/PlanSession.jsx'
import Liked from './screens/Liked.jsx'
import MeTab from './screens/MeTab.jsx'
import Friends from './screens/Friends.jsx'
import Watch from './screens/Watch.jsx'
import Follows from './screens/Follows.jsx'
import AddPerson from './screens/AddPerson.jsx'
import Messages from './screens/Messages.jsx'
import EditProfile from './screens/EditProfile.jsx'
import PlayerProfile from './screens/PlayerProfile.jsx'
import DeleteAccount from './screens/DeleteAccount.jsx'
import BlockPerson from './screens/BlockPerson.jsx'
import Welcome from './screens/Welcome.jsx'
import Auth from './screens/Auth.jsx'
import { CLIPS, CLIP_COMMENTS, ME, PLANNED } from './social.js'
import {
  INITIAL_FOLLOWING,
  findPerson,
  isMutual,
  relationshipOf,
  openSessionWith,
  openSessions,
  presentFriends,
} from './lib/social.js'
import { useAuth } from './lib/auth.jsx'
import { useFollows } from './lib/useFollows.js'
import { useConversation, useInbox } from './lib/useConversation.js'
import { useSessions } from './lib/useSessions.js'
import { usePresence } from './lib/usePresence.js'
import {
  hueFromProfile,
  classifyThread,
  getOrCreateConversation,
  insertMessage,
  describeError,
} from './lib/accounts.js'

/* The summary is only interesting if a session has some length to it, and a
   reviewer clicks through in seconds. Check-in is therefore backdated by the
   42 minutes the sketch shows, and still counts up in real time from there. */
const DEMO_SESSION_OFFSET_MIN = 42

/* The gate.

   Who you are is decided before anything else renders. While the stored
   session is being restored there is a one-line screen; with no session the
   welcome and then sign in; with one, the prototype. The prototype is keyed
   by user id, so signing out or switching accounts unmounts it and every
   piece of per-user state - the open thread, the profile being looked at,
   the navigation trail - goes with it. Nothing of the previous person is
   left on screen.

   The welcome screen is shown once per page load to people who are not
   signed in. It is not stored anywhere, so a field-study participant on a
   fresh reload always starts there; a returning account holder never sees it
   because their session is restored first. */
export default function App() {
  const auth = useAuth()
  const [entered, setEntered] = useState(false)
  /* Only offered when Supabase is not configured, so the prototype can still
     be walked through on a machine without the two env values. */
  const [guest, setGuest] = useState(false)
  const [game, setGame] = useState(DEFAULT_GAME)

  if (auth.status === 'checking') {
    return (
      <Frame>
        <Splash text="Checking session…" />
      </Frame>
    )
  }

  if (auth.status !== 'signed-in' && !guest) {
    if (!entered) {
      return (
        <Frame>
          <Welcome game={game} onGame={setGame} onContinue={() => setEntered(true)} />
        </Frame>
      )
    }
    return (
      <Frame>
        <Auth
          configured={auth.configured}
          restoreError={auth.error}
          onSignIn={auth.signIn}
          onSignUp={auth.signUp}
          onBack={() => setEntered(false)}
          onGuest={auth.configured ? null : () => setGuest(true)}
        />
      </Frame>
    )
  }

  return <Prototype key={auth.user?.id ?? 'guest'} auth={auth} initialGame={game} />
}

function Splash({ text }) {
  return (
    <div className="flex h-full items-center justify-center bg-surface">
      <p role="status" className="text-xs text-ink-subtle">
        {text}
      </p>
    </div>
  )
}

function Prototype({ auth, initialGame }) {
  const [arcades, setArcades] = useState(ARCADES)
  const [tab, setTab] = useState(TAB_IDS[0])
  const [view, setView] = useState(TAB_IDS[0])
  const [arcadeView, setArcadeView] = useState('list')
  const [game, setGame] = useState(initialGame ?? DEFAULT_GAME)
  const [modal, setModal] = useState(null)
  const [activeId, setActiveId] = useState(null)
  const [scanMethod, setScanMethod] = useState('qr')
  /* The queue you joined on this phone this run. It remembers what joining
     added - one solo party or one pair - so leaving can take back exactly
     that, whatever has happened to the count since. */
  const [ownSession, setOwnSession] = useState(null)
  /* What the check-in screen has been told for this join: solo or with a
     partner, and whether this one check-in is shared. `share` is null until
     the person changes it, which means "whatever Me says". */
  const [joinChoice, setJoinChoice] = useState({ party: 'solo', share: null })
  /* The turn alert has called you: you are on a machine now, so the queue
     screen offers Check out rather than Leave queue. */
  const [turnUp, setTurnUp] = useState(false)
  /* Which queue the count report is correcting - the arcade page's, or the
     one you are standing in. */
  const [reportFor, setReportFor] = useState(null)
  const [notify, setNotify] = useState(true)
  const [reports, setReports] = useState(7)
  const [lastSession, setLastSession] = useState(null)
  const [friendsSection, setFriendsSection] = useState('now')
  const [song, setSong] = useState('pandora')
  const [playerHandle, setPlayerHandle] = useState(null)
  const [visible, setVisible] = useState(true)
  const [clipIndex, setClipIndex] = useState(0)
  const [clipScope, setClipScope] = useState('following')
  const [called, setCalled] = useState(false)
  const [followsTab, setFollowsTab] = useState('followers')
  const [likedIds, setLikedIds] = useState([])
  const [comments, setComments] = useState(CLIP_COMMENTS)
  const [queueOpen, setQueueOpen] = useState(false)
  const [soundOn, setSoundOn] = useState(() => !isMuted())
  /* The open thread: a real account ({ kind: 'real', profile }) or a seeded
     sample player ({ kind: 'sample', handle }). Real messages live in the
     database and are loaded by the thread itself; nothing is held here. */
  const [chat, setChat] = useState(null)
  const [planPreset, setPlanPreset] = useState({})
  /* Who you follow among the SEEDED players. This drives the prototype's
     presence, scores and planned sessions and is not the real follow graph -
     that is `follows` below, and the two never mix. */
  const [followingHandles, setFollowingHandles] = useState(INITIAL_FOLLOWING)
  /* The pending "tell them I'm coming", and the ones already sent. */
  const [joinTarget, setJoinTarget] = useState(null)
  const [joinsSent, setJoinsSent] = useState({})
  /* Which arcade the Here now list was opened from, if any. Null means the
     general, all-arcades view. */
  const [hereVenueId, setHereVenueId] = useState(null)
  /* Without an account, sessions and who is out are the prototype's sample
     data, held here for the run. With one they come from the database
     below, shared with everyone else, and these two are not used. */
  const [localRsvps, setLocalRsvps] = useState([])
  const [localPlanned, setLocalPlanned] = useState(PLANNED)
  /* Where back goes. A single "the screen I came from" slot was enough while
     no two screens could open each other - then the conversation header
     started opening the profile, and the profile's Message button opened the
     conversation, and each overwrote the other's slot. Back then bounced
     between the two forever with no way out but a page reload, which is the
     trap the evaluation already caught once. A stack cannot do that: every
     step is recorded, and back unwinds them in order. */
  const [history, setHistory] = useState([])
  /* 'messages' is a step in that history like any other, but it is drawn
     as a sheet over the tab it was opened from rather than as a screen of
     its own. Opening a thread from it pushes the thread; leaving the
     thread, by either of its two controls, clears the trail and lands on
     the tab. Only declining or blocking from inside a thread steps back to
     the list, because that is where the next request is. */
  const sheetOpen = view === 'messages'
  /* Your identity is your real profile when signed in. Without an account
     (a build with no Supabase configured) the seeded ME stands in, editable
     for the run only. */
  const profile = auth.profile
  const myId = auth.user?.id ?? null
  const [guestMe, setGuestMe] = useState({ handle: ME.handle, hue: null })
  const me = profile
    ? { id: profile.id, handle: profile.handle, hue: hueFromProfile(profile) }
    : guestMe
  /* The real follow graph: other accounts, both directions, and blocks. */
  const follows = useFollows(myId)
  /* Every conversation you are in, kept for the whole session so the way
     into it can say what is waiting. Which list a thread belongs to needs
     the follow graph as well as the row, so it is worked out here. */
  const inbox = useInbox(myId)
  const chats = []
  const requests = []
  for (const thread of inbox.threads) {
    const kind = classifyThread({
      status: thread.status,
      requestedBy: thread.requestedBy,
      myId,
      mutual: follows.relationship(thread.partner.id).mutual,
      hasMessage: Boolean(thread.last),
    })
    if (kind === 'chat' || kind === 'sent') chats.push({ ...thread, kind })
    else if (kind === 'request') requests.push({ ...thread, kind })
  }
  const unreadChats = chats.filter(
    (t) => t.kind === 'chat' && t.last?.sender === 'them' && t.last.status !== 'read'
  ).length
  const messageBadge = unreadChats + requests.length
  /* A real account being looked at, as opposed to a seeded player. */
  const [realPlayer, setRealPlayer] = useState(null)
  /* The person a block sheet is asking about, and where it was opened from. */
  const [blockTarget, setBlockTarget] = useState(null)
  /* Sessions and presence, shared through the database when signed in.
     Presence looks again whenever the follow graph changes, since a new
     mutual may already be out. */
  const realSessions = useSessions(myId)
  const graphKey = useMemo(
    () =>
      `${follows.following.map((p) => p.id).join(',')}|${follows.followers.map((p) => p.id).join(',')}`,
    [follows.following, follows.followers]
  )
  const presence = usePresence(myId, graphKey)
  const planned = myId ? realSessions.sessions : localPlanned
  const rsvps = myId ? realSessions.rsvps : localRsvps
  /* Who is at an arcade: real mutuals when signed in, sample players when
     not. Everything that draws people on the map or lists them reads this. */
  const present = useMemo(
    () => (myId ? presence.present : presentFriends(followingHandles)),
    [myId, presence.present, followingHandles]
  )
  /* Why the map may be empty, said once, where the emptiness is. */
  const mutualCount = useMemo(() => {
    const followerIds = new Set(follows.followers.map((p) => p.id))
    return follows.following.filter((p) => followerIds.has(p.id)).length
  }, [follows.following, follows.followers])
  const presenceHint = !myId
    ? null
    : mutualCount === 0
      ? 'Follow someone who follows you back to see them here.'
      : null
  /* Whether to raise a system notification for a message that arrives
     while the app is in the background. Off until the person turns it on,
     which is when the browser asks them. */
  const [alertsOn, setAlertsOn] = useState(() => {
    try {
      return window.localStorage.getItem('arcade-circle:alerts') === 'on'
    } catch {
      return false
    }
  })
  /* Favourite arcades, kept on this device. A favourite is easier to find;
     it is never ranked above a faster option. */
  const [favourites, setFavourites] = useState(() => {
    try {
      const list = JSON.parse(window.localStorage.getItem('arcade-circle:favourites') ?? '[]')
      return Array.isArray(list) ? list.filter((id) => typeof id === 'string') : []
    } catch {
      return []
    }
  })
  function toggleFavourite(id) {
    const next = favourites.includes(id)
      ? favourites.filter((f) => f !== id)
      : [...favourites, id]
    setFavourites(next)
    try {
      window.localStorage.setItem('arcade-circle:favourites', JSON.stringify(next))
    } catch {
      /* Nothing to remember it in; the star still works this run. */
    }
  }
  async function setAlerts(on) {
    if (!on) {
      setAlertsOn(false)
      try {
        window.localStorage.setItem('arcade-circle:alerts', 'off')
      } catch {
        /* Nothing to remember it in; the toggle still works this run. */
      }
      return
    }
    if (typeof Notification === 'undefined') return
    const permission =
      Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission()
    const granted = permission === 'granted'
    setAlertsOn(granted)
    try {
      window.localStorage.setItem('arcade-circle:alerts', granted ? 'on' : 'off')
    } catch {
      /* As above. */
    }
  }
  /* A real account by handle, from anything already loaded: follows, who
     is out, and the sessions on Later. Rows in those lists carry handles,
     the way the sample data does, so a tap has to find the account again. */
  function realProfileByHandle(handle) {
    for (const p of follows.following) if (p.handle === handle) return p
    for (const p of follows.followers) if (p.handle === handle) return p
    for (const p of presence.present) if (p.handle === handle) return p.profile
    for (const sess of realSessions.sessions) {
      if (sess.hostProfile?.handle === handle) return sess.hostProfile
      for (const p of sess.askedProfiles) if (p.handle === handle) return p
    }
    return null
  }
  /* A check-in made earlier - on this phone before a reload, or on another
     one - is still yours. It is read straight off your presence row, so
     the banner and the queue screen come back with it and leave with it,
     with nothing to keep in step. */
  const restored = useMemo(() => {
    const mine = presence.mine
    if (!myId || !mine?.active) return null
    const venue = venueGame(arcades.find((a) => a.id === mine.venue_id), mine.game_id)
    if (!venue) return null
    return {
      arcadeId: mine.venue_id,
      gameId: mine.game_id,
      position: mine.position ?? venue.queue + 1,
      checkInAt: Date.parse(mine.checked_in_at),
      waitedMin: estimateWaitMin(venue),
      /* Joined on another phone or before a reload: this run's counts never
         had the party added, so there is nothing here to take back. */
      party: null,
      shared: Boolean(mine.visible),
    }
  }, [myId, presence.mine, arcades])
  const session = ownSession ?? restored

  /* Anything that navigates "back to the tab I came from" goes through this,
     so a renamed tab can never strand the view on an id nothing renders. */
  const backTab = TAB_IDS.includes(tab) ? tab : TAB_IDS[0]

  const rows = venuesForGame(arcades, game)
  const rawArcade = arcades.find((a) => a.id === activeId) ?? arcades[0]
  const arcade = venueGame(rawArcade, game) ?? rows[0] ?? null
  /* One lookup over one normalised roster, so a profile opened from the
     Followers list carries the same shape as one opened from the map. */
  const player = playerHandle ? findPerson(playerHandle) : null
  const playerRelationship = playerHandle
    ? relationshipOf(playerHandle, followingHandles)
    : null

  /* One line naming the open session that lets you reach its host, for the
     screens that have to say why a stranger's thread is open. */
  function viaLabel(session) {
    if (!session) return null
    const venue = arcades.find((a) => a.id === session.venue)
    return `${venue?.short ?? 'an arcade'}, ${session.whenLabel}`
  }

  /* Going somewhere new records where you were; going back unwinds it. */
  function push(next) {
    setHistory((h) => [...h, view])
    setView(next)
  }

  function goBack() {
    const previous = history[history.length - 1] ?? backTab
    setHistory((h) => h.slice(0, -1))
    setView(previous)
  }

  /* A tab is a starting point, not a step, so arriving at one clears the
     trail behind it. */
  function goRoot(next) {
    setHistory([])
    setView(next)
  }

  /* Out of messaging altogether: the tab this trail started from, with
     the trail cleared. */
  function leaveToTab() {
    goRoot(backTab)
  }

  const clip = CLIPS[clipIndex]
  const clipComments = comments[clip.id] ?? []
  const liked = likedIds.includes(clip.id)

  function toggleLike() {
    setLikedIds((ids) =>
      ids.includes(clip.id) ? ids.filter((i) => i !== clip.id) : [...ids, clip.id]
    )
  }

  function postComment(text) {
    setComments((all) => ({
      ...all,
      [clip.id]: [
        { id: `own-${Date.now()}`, handle: me.handle, text, minsAgo: 0 },
        ...(all[clip.id] ?? []),
      ],
    }))
  }

  /* Jumping to a clip from Activity or from Liked lands you in the feed at
     that clip, rather than opening a one-off player. Watch is no longer a
     tab, so the feed is a step like any other screen: the tab you came from
     stays the tab, and Back returns to the list or the queue you left. */
  function openClip(id) {
    const i = CLIPS.findIndex((c) => c.id === id)
    if (i < 0) return
    setClipIndex(i)
    push('watch')
  }

  /* Messaging is real: a thread with another account, stored in the
     database, that starts as a request when you do not follow each other.
     The seeded players have no account behind them, so a Message tap on one
     of them opens a closed thread that says so rather than a box that goes
     nowhere. The old prototype exception for open-session hosts is not
     carried over - it will return when open sessions themselves are stored. */
  function openMessage(handle) {
    const real = realProfileByHandle(handle)
    if (real) {
      openRealChat(real)
      return
    }
    /* Seeded players: the prototype's own rule still decides whether the
       tap does anything at all. */
    if (
      !isMutual(handle, followingHandles) &&
      !openSessionWith(handle, planned, rsvps)
    )
      return
    setChat({ kind: 'sample', handle })
    push('chat')
  }

  function openRealChat(target) {
    setChat({ kind: 'real', profile: target })
    push('chat')
  }

  /* Anything the app says it has told a real person - a session they are
     asked to, a change to it, that you are on your way - is a message in
     the conversation their profile would open: a request if they do not
     follow you back. The database applies the same rules as any other
     send, so a stranger who already has your request waiting is told so
     rather than messaged twice. */
  async function sendNote(profile, text) {
    if (!myId) return { error: 'Sign in to ask people.' }
    try {
      const conversation = await getOrCreateConversation(profile.id)
      await insertMessage(conversation.id, myId, text)
      inbox.refresh()
      return { error: null }
    } catch (e) {
      return { error: describeError(e, 'Could not send the invitation.') }
    }
  }

  /* Blocking asks first, on a sheet that names the person. Confirmed from
     inside their thread, the thread is closed too - it is no longer yours
     to see - and you land back where you opened it from. */
  function askToBlock(target, from) {
    setBlockTarget({ profile: target, from })
    setModal('block')
  }

  async function confirmBlock() {
    if (!blockTarget) return { error: 'Nobody to block.' }
    const result = await follows.block(blockTarget.profile.id)
    if (result.error) return result
    inbox.refresh()
    setModal(null)
    if (blockTarget.from === 'thread') goBack()
    setBlockTarget(null)
    return result
  }

  /* "Join them" is about a person, so it asks before it acts and then says
     who was told. It never checks anyone in - that is a separate action at the
     machine. */
  function openJoin(handle, arcadeId) {
    if (!arcadeId) return
    setJoinTarget({ handle, arcadeId, sent: false })
    setModal('join')
  }

  /* Telling a real person you are coming is a message to them - it is the
     only thing that actually leaves this phone - so the sheet waits for it
     to go and says so if it did not. A sample player has nobody to tell. */
  async function confirmJoin() {
    if (!joinTarget) return
    const real = realProfileByHandle(joinTarget.handle)
    const venue = arcades.find((a) => a.id === joinTarget.arcadeId)
    if (real) {
      setJoinTarget((t) => ({ ...t, busy: true, error: null }))
      const result = await sendNote(real, `On my way to ${venue?.short ?? 'the arcade'} - see you there.`)
      if (result.error) {
        setJoinTarget((t) => (t ? { ...t, busy: false, error: result.error } : t))
        return
      }
    }
    setJoinsSent((all) => ({ ...all, [joinTarget.handle]: joinTarget.arcadeId }))
    setJoinTarget((t) => (t ? { ...t, sent: true, busy: false, error: null } : t))
    playSound('success')
  }

  /* Plans change, so telling someone you are coming has to be as undoable as
     saying yes to a session already is. For a real person that is one more
     message, since the first one cannot be unsaid. */
  function unsendJoin(handle) {
    const arcadeId = joinsSent[handle]
    setJoinsSent((all) => {
      const next = { ...all }
      delete next[handle]
      return next
    })
    setJoinTarget((t) => (t && t.handle === handle ? { ...t, sent: false } : t))
    const real = realProfileByHandle(handle)
    if (real) {
      const venue = arcades.find((a) => a.id === arcadeId)
      sendNote(real, `Change of plan - not coming to ${venue?.short ?? 'the arcade'} after all.`)
    }
  }

  /* Sending replaces the session it was opened on, if it was opened on one, so
     a change leaves one session rather than two. Signed in, the session is
     written to the database and the people asked are attached to it there;
     the screen that called this then messages them. */
  async function savePlan(plan, { inviteeIds = [], editingId = null } = {}) {
    if (myId) {
      return realSessions.save(
        { venueId: plan.venue, gameId: plan.gameId, startsAt: plan.when, note: plan.note, open: plan.open },
        inviteeIds,
        editingId
      )
    }
    setLocalPlanned((list) =>
      list.some((s) => s.id === plan.id)
        ? list.map((s) => (s.id === plan.id ? plan : s))
        : [plan, ...list]
    )
    return { error: null, id: plan.id, added: [] }
  }

  /* Calling a session off tells everyone on it, in the thread each of them
     already has with you. */
  async function cancelPlan(id) {
    if (myId) {
      const sess = realSessions.sessions.find((s) => s.id === id)
      const result = await realSessions.cancel(id)
      if (!result.error && sess) {
        const venue = arcades.find((a) => a.id === sess.venue)
        for (const profile of sess.askedProfiles) {
          sendNote(profile, `Called off: ${venue?.short ?? 'the arcade'}, ${sess.whenLabel}. Sorry.`)
        }
      }
      return
    }
    setLocalPlanned((list) => list.filter((s) => s.id !== id))
    setLocalRsvps((list) => list.filter((s) => s !== id))
  }

  /* Reopens Plan a session on an existing one, with everything already filled
     in, rather than making people rebuild it from scratch to move it an hour. */
  function editPlan(session) {
    openPlan({
      venue: session.venue,
      gameId: session.gameId,
      invited: session.asked ?? [],
      invitedProfiles: session.askedProfiles ?? [],
      when: session.when,
      open: Boolean(session.open),
      note: session.note ?? '',
      editingId: session.id,
    })
  }

  /* Saying yes to a session is reversible, so it commits straight away and
     shows the result, rather than asking first. The host hears either way:
     the row says they were told, so they are. */
  async function toggleRsvp(id) {
    if (myId) {
      const sess = realSessions.sessions.find((s) => s.id === id)
      if (!sess) return
      const going = !sess.goingMe
      const result = await realSessions.rsvp(id, going)
      if (!result.error && sess.hostProfile && !sess.mine) {
        const venue = arcades.find((a) => a.id === sess.venue)
        sendNote(
          sess.hostProfile,
          going
            ? `I'm in for ${venue?.short ?? 'the arcade'}, ${sess.whenLabel}.`
            : `Can't make ${venue?.short ?? 'the arcade'}, ${sess.whenLabel} after all.`
        )
      }
      return
    }
    setLocalRsvps((list) =>
      list.includes(id) ? list.filter((s) => s !== id) : [...list, id]
    )
  }

  function toggleFollow(handle) {
    setFollowingHandles((list) =>
      list.includes(handle) ? list.filter((h) => h !== handle) : [...list, handle]
    )
  }

  /* Here now is venue-scoped only while you are inside the venue you opened it
     from. Anything that goes back to Circle on its own terms drops the filter,
     so the tab is never permanently narrowed. */
  function openHereAt(venueId) {
    setHereVenueId(venueId)
    setFriendsSection('now')
    setTab('friends')
    goRoot('friends')
  }

  /* Same shape for the open sessions at a venue: the arcade page says there
     are some, and tapping through lands on Open filtered to that arcade. */
  function openSessionsAt(venueId) {
    setHereVenueId(venueId)
    setFriendsSection('open')
    setTab('friends')
    goRoot('friends')
  }

  function pickFriendsSection(next) {
    setHereVenueId(null)
    setFriendsSection(next)
  }

  /* Opening a plan from anywhere carries whatever context that place already
     knows - which venue, which game, who to invite. */
  function openPlan(preset = {}) {
    setPlanPreset(preset)
    push('plan')
  }

  /* Back has to land on the screen the profile was opened from, including the
     two that are not tabs. Opening someone from People used to return you to
     the Me tab, which reads as a failed back. */
  function openPlayer(handle) {
    const real = realProfileByHandle(handle)
    if (real) {
      openRealProfile(real)
      return
    }
    setRealPlayer(null)
    setPlayerHandle(handle)
    push('player')
  }

  function openRealProfile(target) {
    setPlayerHandle(null)
    setRealPlayer(target)
    push('player')
  }

  /* Edits go to the real profile when there is one. The screen shows the
     server's answer - a taken username, most likely - under the field. */
  async function saveProfile({ handle, hue }) {
    if (profile) {
      const result = await auth.updateProfile({
        handle,
        avatar_hue: hue === null || hue === undefined ? null : String(hue),
      })
      if (!result.error) goBack()
      return result
    }
    setGuestMe({ handle, hue })
    goBack()
    return { error: null }
  }

  function patchVenueGame(id, gameId, patch) {
    setArcades((list) =>
      list.map((a) =>
        a.id === id
          ? { ...a, games: { ...a.games, [gameId]: { ...a.games[gameId], ...patch } } }
          : a
      )
    )
  }

  /* Opening a venue that does not run the selected game would show nothing, so
     switching game from the detail screen switches the whole filter. */
  function pickGame(next) {
    setGame(next)
  }

  function goTab(next) {
    setTab(next)
    setModal(null)
    goRoot(next)
    /* Coming into Circle from the tab bar is the general view, never whatever
       venue you happened to look at earlier. */
    if (next === 'friends') setHereVenueId(null)
  }

  function openArcade(id) {
    setActiveId(id)
    push('detail')
  }

  /* Check in & join queue starts fresh each time: solo, and shared the way
     the Me tab says, until the person changes either for this join. */
  function openCheckIn() {
    setJoinChoice({ party: 'solo', share: null })
    setView('checkin')
  }

  /* Joining puts you in the queue straight away.

     A QR scan or NFC tap is the physical proof that you are at the machine,
     so it joins you on the current count with nothing to fill in (finding
     C). Nobody looked at the line, though, so the report keeps the age it
     had: a join must not make an unchecked number look freshly verified
     (finding E). Manual check-in is the fallback, and there the person has
     just confirmed the count, so `counted` replaces it and the age resets.

     You are added as one party, solo or pair, and the session remembers
     which, so leaving takes back exactly that. */
  function joinQueue({ counted = null } = {}) {
    const target = arcade
    const party = joinChoice.party
    const shared = joinChoice.share ?? visible
    const base = counted ?? { queue: target.queue, solo: target.solo }
    const position = base.queue + 1

    patchVenueGame(target.id, target.gameId, {
      ...withParty(base, party),
      ...(counted ? { updatedMinsAgo: 0, updatedAt: '12:38 PM' } : {}),
    })

    setTurnUp(false)
    setOwnSession({
      arcadeId: target.id,
      gameId: target.gameId,
      position,
      checkInAt: Date.now() - DEMO_SESSION_OFFSET_MIN * 60_000,
      waitedMin: estimateWaitMin({ ...target, ...base }),
      party,
      countVerified: Boolean(counted),
      shared,
    })
    /* Shared with the people allowed to see you, unless this check-in was
       made without sharing. Either way you count in the queue. */
    presence.checkIn({ venueId: target.id, gameId: target.gameId, position, visible: shared })
    playSound('success')
    setTab('arcades')
    goRoot('checkedin')
  }

  /* Both ways out of a queue hand the slot back, so both go through here.
     They take back the party the session says joining added - not a solo
     player by default. Assuming solo turned one of the venue's pairs into a
     solo player on every pass once pairs could join, and it compounds: the
     running order draws pairs as single players and the wait falls with
     them. A session restored from another phone added nothing to this run's
     counts, so it takes nothing away.

     Neither exit touches the report's age. Leaving is not a count. */
  function releaseQueueSlot() {
    if (!session.party) return
    const target = venueGame(
      arcades.find((a) => a.id === session.arcadeId),
      session.gameId
    )
    patchVenueGame(target.id, session.gameId, withoutParty(target, session.party))
  }

  /* A count correction. When it is the queue you are standing in, the
     person counts everyone but their own party, which is added back, and
     their place becomes the one behind everybody they counted - the same
     rule manual check-in uses. */
  function submitCount({ queue, solo }) {
    const target = reportVenue
    if (!target) return
    const counts = reportYou ? withParty({ queue, solo }, reportYou) : { queue, solo }
    patchVenueGame(target.id, target.gameId, {
      ...counts,
      updatedMinsAgo: 0,
      updatedAt: '12:38 PM',
    })
    setReports((n) => n + 1)
    if (reportYou && ownSession) {
      const position = queue + 1
      setOwnSession((s) => (s ? { ...s, position } : s))
      presence.checkIn({
        venueId: target.id,
        gameId: target.gameId,
        position,
        visible: ownSession.shared,
      })
    }
  }

  function openCountReport(target) {
    setReportFor({ arcadeId: target.id, gameId: target.gameId })
    setModal('report')
  }

  /* Leaving the queue is not checking out. Nothing was played, so no session
     is recorded and there is no summary to show - it drops you back on the
     venue, where you can queue again or look somewhere else. */
  function leaveQueue() {
    releaseQueueSlot()
    presence.checkOut()
    setActiveId(session.arcadeId)
    setOwnSession(null)
    setTurnUp(false)
    setModal(null)
    setTab('arcades')
    goRoot('detail')
  }

  function doCheckOut() {
    releaseQueueSlot()
    presence.checkOut()

    const elapsed = Math.max(
      1,
      Math.round((Date.now() - session.checkInAt) / 60_000)
    )
    setLastSession({
      arcadeId: session.arcadeId,
      gameId: session.gameId,
      sessionMin: elapsed,
      waitedMin: session.waitedMin,
    })
    setOwnSession(null)
    setTurnUp(false)
    setModal(null)
    goRoot('summary')
  }

  /* What is drawn as the screen: the view, or the tab under the sheet. */
  const screen = sheetOpen ? backTab : view
  const showTabs = ['arcades', 'friends', 'me', 'detail'].includes(screen)
  const sessionArcade = session
    ? venueGame(
        arcades.find((a) => a.id === session.arcadeId),
        session.gameId
      )
    : null
  const reportVenue = reportFor
    ? venueGame(arcades.find((a) => a.id === reportFor.arcadeId), reportFor.gameId)
    : null
  /* Your own party, when the count being corrected is the queue you joined
     here. */
  const reportYou =
    ownSession?.party &&
    reportVenue &&
    ownSession.arcadeId === reportVenue.id &&
    ownSession.gameId === reportVenue.gameId
      ? ownSession.party
      : null
  /* Who a check-in is shared with, in the words the Me tab uses. Without an
     account there is nobody to share it with. */
  const audienceLabel = myId
    ? profile?.presence_audience === 'followers'
      ? 'all followers'
      : 'mutual friends'
    : null

  return (
    <Frame>
      <div className="relative flex h-full flex-col">
        {/* Everything behind an open sheet is inert: not focusable, not
            read, not tappable through the scrim. */}
        <div className="min-h-0 flex-1" inert={sheetOpen ? '' : undefined}>
          <ErrorBoundary resetKey={screen}>
          {screen === 'arcades' && (
            <Arcades
              arcades={rows}
              allArcades={arcades}
              game={game}
              onGame={setGame}
              view={arcadeView}
              onView={setArcadeView}
              onOpen={openArcade}
              following={followingHandles}
              favourites={favourites}
            />
          )}

          {screen === 'watch' && (
            <Watch
              onBack={goBack}
              clips={CLIPS}
              index={clipIndex}
              onIndex={setClipIndex}
              scope={clipScope}
              onScope={setClipScope}
              arcades={arcades}
              session={session}
              sessionArcade={sessionArcade}
              called={called}
              onCall={() => {
                playSound('alert')
                setCalled(true)
              }}
              liked={liked}
              likeCount={clip.likes + (liked ? 1 : 0)}
              onLike={toggleLike}
              commentCount={clipComments.length}
              onComments={() => setModal('comments')}
              onGo={() => {
                setCalled(false)
                setTurnUp(true)
                setTab('arcades')
                goRoot('checkedin')
              }}
            />
          )}

          {screen === 'addperson' && (
            <AddPerson
              me={me}
              myId={myId}
              configured={auth.configured}
              follows={follows}
              onBack={goBack}
              onOpenProfile={openRealProfile}
            />
          )}

          {screen === 'follows' && (
            <Follows
              tabName={followsTab}
              onTab={setFollowsTab}
              onBack={goBack}
              myId={myId}
              configured={auth.configured}
              follows={follows}
              onOpenProfile={openRealProfile}
              onAddPerson={() => push('addperson')}
            />
          )}

          {screen === 'friends' && (
            <Friends
              arcades={arcades}
              game={game}
              onGame={setGame}
              section={friendsSection}
              onSection={pickFriendsSection}
              hereVenueId={hereVenueId}
              onClearVenue={() => setHereVenueId(null)}
              song={song}
              onSong={setSong}
              me={me}
              following={followingHandles}
              present={present}
              presenceHint={presenceHint}
              joinsSent={joinsSent}
              planned={planned}
              rsvps={rsvps}
              onRsvp={toggleRsvp}
              onEditPlan={editPlan}
              onCancelPlan={cancelPlan}
              onUnsendJoin={unsendJoin}
              onOpenPlayer={openPlayer}
              onOpenClip={openClip}
              onOpenArcade={openArcade}
              onJoin={openJoin}
              onPlan={openPlan}
              onMessage={openMessage}
              onOpenMessages={() => push('messages')}
              messageBadge={messageBadge}
              onAddPerson={() => push('addperson')}
            />
          )}

          {screen === 'chat' && chat?.kind === 'real' && (
            <RealThread
              key={chat.profile.id}
              myId={myId}
              partner={chat.profile}
              relationship={follows.relationship(chat.profile.id)}
              blocked={follows.isBlocked(chat.profile.id)}
              onChanged={inbox.refresh}
              onBlock={() => askToBlock(chat.profile, 'thread')}
              onOpenProfile={() => openRealProfile(chat.profile)}
              onBack={leaveToTab}
              backLabel={`Back to ${tabLabel(backTab)}`}
              onClose={leaveToTab}
              onDeclined={goBack}
            />
          )}

          {screen === 'chat' && chat?.kind === 'sample' && (
            <Message
              handle={chat.handle}
              messages={[]}
              mode="closed"
              closedNote={`${chat.handle} can’t receive messages.`}
              onOpenProfile={() => openPlayer(chat.handle)}
              onBack={leaveToTab}
              backLabel={`Back to ${tabLabel(backTab)}`}
              onClose={leaveToTab}
            />
          )}

          {screen === 'editprofile' && (
            <EditProfile me={me} onSave={saveProfile} onBack={goBack} />
          )}

          {screen === 'plan' && (
            <PlanSession
              arcades={rows}
              preset={planPreset}
              me={me}
              myId={myId}
              follows={follows}
              onSendInvite={sendNote}
              onPlanned={savePlan}
              onBack={goBack}
              onDone={(open) => {
                /* A new invitation belongs with the other planned ones, not
                   in the list of who is at an arcade right now. An open one
                   lands on Open, where the people it was posted for will
                   see it. */
                setHereVenueId(null)
                setFriendsSection(open ? 'open' : 'planned')
                setTab('friends')
                goRoot('friends')
              }}
            />
          )}

          {screen === 'liked' && (
            <Liked
              likedIds={likedIds}
              onBack={goBack}
              onOpenClip={openClip}
            />
          )}

          {screen === 'player' && realPlayer && (
            <PlayerProfile
              player={{
                id: realPlayer.id,
                handle: realPlayer.handle,
                hue: hueFromProfile(realPlayer),
                games: [],
                songs: [],
                scores: null,
                at: null,
                real: true,
              }}
              relationship={follows.relationship(realPlayer.id)}
              blocked={follows.isBlocked(realPlayer.id)}
              arcade={
                arcades.find((a) => a.id === present.find((p) => p.id === realPlayer.id)?.at) ?? null
              }
              sinceMin={present.find((p) => p.id === realPlayer.id)?.sinceMin ?? null}
              joinedAt={joinsSent[realPlayer.handle] ?? null}
              onBack={leaveToTab}
              backLabel={`Back to ${tabLabel(backTab)}`}
              onClose={leaveToTab}
              onOpenArcade={openArcade}
              onJoin={openJoin}
              onUnsendJoin={unsendJoin}
              onMessage={() => openRealChat(realPlayer)}
              onToggleFollow={() => follows.toggle(realPlayer.id)}
              onBlock={() => askToBlock(realPlayer, 'profile')}
              onUnblock={() => follows.unblock(realPlayer.id)}
              onPlan={() => {}}
            />
          )}

          {screen === 'player' && !realPlayer && player && (
            <PlayerProfile
              player={player}
              relationship={playerRelationship}
              arcade={arcades.find((a) => a.id === player.at) ?? null}
              joinedAt={joinsSent[player.handle] ?? null}
              openSession={viaLabel(openSessionWith(player.handle, planned, rsvps))}
              onBack={leaveToTab}
              backLabel={`Back to ${tabLabel(backTab)}`}
              onClose={leaveToTab}
              onOpenArcade={openArcade}
              onJoin={openJoin}
              onUnsendJoin={unsendJoin}
              onMessage={openMessage}
              onToggleFollow={toggleFollow}
              onPlan={openPlan}
            />
          )}

          {screen === 'me' && (
            <MeTab
              me={me}
              account={auth.user}
              onEditProfile={() => push('editprofile')}
              onSignOut={auth.signOut}
              onDeleteAccount={() => setModal('delete')}
              reports={reports}
              sessions={3}
              visible={visible}
              onVisible={(on) => {
                setVisible(on)
                presence.setVisible(on)
              }}
              audience={profile ? (profile.presence_audience ?? 'mutuals') : null}
              onAudience={(next) => auth.updateProfile({ presence_audience: next })}
              alerts={alertsOn}
              alertsSupported={typeof Notification !== 'undefined'}
              alertsBlocked={typeof Notification !== 'undefined' && Notification.permission === 'denied'}
              onAlerts={setAlerts}
              onOpenFollows={(t) => {
                setFollowsTab(t)
                push('follows')
              }}
              followers={follows.followers.length}
              following={follows.following.length}
              likedCount={likedIds.length}
              onOpenLiked={() => push('liked')}
              soundOn={soundOn}
              onSound={(on) => {
                setMuted(!on)
                setSoundOn(on)
                if (on) playSound('success')
              }}
            />
          )}

          {screen === 'detail' && arcade && (
            <Detail
              arcade={arcade}
              otherGames={otherGamesAt(rawArcade, game)}
              onPickGame={pickGame}
              onDirections={() => setModal('directions')}
              queueOpen={queueOpen}
              onToggleQueue={() => setQueueOpen((o) => !o)}
              mePosition={
                session &&
                session.arcadeId === arcade.id &&
                session.gameId === arcade.gameId
                  ? session.position
                  : null
              }
              onBack={goBack}
              onCheckIn={openCheckIn}
              onReport={() => openCountReport(arcade)}
              onReportMachine={() => setModal('machine')}
              favourite={favourites.includes(arcade.id)}
              onToggleFavourite={() => toggleFavourite(arcade.id)}
              present={present}
              onFriends={() => openHereAt(arcade.id)}
              openCount={
                openSessions(planned).filter((s) => s.venue === arcade.id).length
              }
              onOpenSessions={() => openSessionsAt(arcade.id)}
            />
          )}

          {screen === 'checkin' && (
            <CheckIn
              arcade={arcade}
              party={joinChoice.party}
              onParty={(party) => setJoinChoice((c) => ({ ...c, party }))}
              share={joinChoice.share ?? visible}
              onShare={(share) => setJoinChoice((c) => ({ ...c, share }))}
              audienceLabel={audienceLabel}
              onBack={() => setView('detail')}
              onScan={(method) => {
                setScanMethod(method)
                setView('scan')
              }}
              onManual={() => setView('confirm')}
            />
          )}

          {screen === 'scan' && (
            <Scan
              arcade={arcade}
              method={scanMethod}
              party={joinChoice.party}
              onBack={() => setView('checkin')}
              onSuccess={() => joinQueue()}
            />
          )}

          {/* Manual check-in only: the one path where the person confirms
              the count before joining. */}
          {screen === 'confirm' && arcade && (
            <ConfirmQueue
              arcade={arcade}
              party={joinChoice.party}
              onBack={() => setView('checkin')}
              onConfirm={(counted) => joinQueue({ counted })}
            />
          )}

          {screen === 'checkedin' && session && sessionArcade && (
            <CheckedIn
              arcade={sessionArcade}
              position={session.position}
              total={Math.max(session.position, sessionArcade.queue)}
              queueAhead={QUEUE_AHEAD}
              aheadMin={estimateWaitMin({
                ...sessionArcade,
                queue: Math.max(0, session.position - 1),
                solo: Math.min(sessionArcade.solo, session.position - 1),
              })}
              party={session.party}
              shared={session.shared}
              audienceLabel={audienceLabel}
              turnUp={turnUp}
              notify={notify}
              onNotify={setNotify}
              onWatch={() => push('watch')}
              onUpdateCount={() => openCountReport(sessionArcade)}
              /* Out of the queue screen is back to Circle, where the queue
                 banner keeps the way back in; the arcade page is a step
                 behind you, not a place to be returned to. */
              onBack={() => {
                setTab('friends')
                goRoot('friends')
              }}
              onClose={() => {
                setTab('friends')
                goRoot('friends')
              }}
              onCheckOut={() => setModal('checkout')}
              onLeaveQueue={() => setModal('leavequeue')}
            />
          )}

          {screen === 'summary' && lastSession && (
            <Summary
              arcade={venueGame(
                arcades.find((a) => a.id === lastSession.arcadeId),
                lastSession.gameId
              )}
              sessionMin={lastSession.sessionMin}
              waitedMin={lastSession.waitedMin}
              onDone={() => {
                setTab('arcades')
                goRoot('arcades')
              }}
            />
          )}
          </ErrorBoundary>
        </div>

        {showTabs && (
          <TabBar
            active={tab}
            onSelect={goTab}
            banner={
              session && sessionArcade ? (
                <SessionBanner
                  arcadeName={sessionArcade.short}
                  position={session.position}
                  total={Math.max(session.position, sessionArcade.queue)}
                  onOpen={() => goRoot('checkedin')}
                />
              ) : null
            }
          />
        )}

        {myId && (
          <IncomingAlert
            incoming={inbox.incoming}
            threads={inbox.threads}
            suppressed={sheetOpen || (screen === 'chat' && chat?.kind === 'real')}
            viewingPartnerId={screen === 'chat' && chat?.kind === 'real' ? chat.profile.id : null}
            alertsOn={alertsOn}
            soundOn={soundOn}
            onOpen={(partner) => {
              inbox.clearIncoming()
              setModal(null)
              openRealChat(partner)
            }}
            onClear={inbox.clearIncoming}
          />
        )}

        {sheetOpen && (
          <Messages
            chats={chats}
            requests={requests}
            loading={inbox.loading}
            error={inbox.error}
            signedIn={Boolean(myId)}
            onOpen={(thread) => openRealChat(thread.partner)}
            onClose={goBack}
          />
        )}

        {modal === 'block' && blockTarget && (
          <BlockPerson
            handle={blockTarget.profile.handle}
            hue={hueFromProfile(blockTarget.profile)}
            onConfirm={confirmBlock}
            onCancel={() => {
              setModal(null)
              setBlockTarget(null)
            }}
          />
        )}

        {modal === 'delete' && profile && (
          <DeleteAccount
            handle={profile.handle}
            onConfirm={auth.deleteAccount}
            onCancel={() => setModal(null)}
          />
        )}

        {modal === 'report' && reportVenue && (
          <Report
            arcade={reportVenue}
            you={reportYou}
            onCancel={() => {
              setModal(null)
              setReportFor(null)
            }}
            onSubmit={submitCount}
          />
        )}

        {/* The machine-condition report: anonymous, and applied to this
            session's data straight away, so the working count, the wait,
            the order and Fastest now all answer to it. */}
        {modal === 'machine' && arcade && (
          <MachineReport
            arcade={arcade}
            onCancel={() => setModal(null)}
            onReport={(report) =>
              patchVenueGame(arcade.id, arcade.gameId, reportIssue(arcade, report))
            }
            onWorking={(issueId) =>
              patchVenueGame(arcade.id, arcade.gameId, markWorking(arcade, issueId))
            }
          />
        )}

        {modal === 'comments' && (
          <Comments
            clip={clip}
            comments={clipComments}
            onPost={postComment}
            onClose={() => setModal(null)}
          />
        )}

        {modal === 'join' && joinTarget && (
          <JoinFriend
            handle={joinTarget.handle}
            arcade={arcades.find((a) => a.id === joinTarget.arcadeId) ?? null}
            sent={joinTarget.sent}
            busy={Boolean(joinTarget.busy)}
            error={joinTarget.error ?? null}
            real={Boolean(realProfileByHandle(joinTarget.handle))}
            onConfirm={confirmJoin}
            onUndo={() => unsendJoin(joinTarget.handle)}
            onOpenArcade={() => {
              setModal(null)
              openArcade(joinTarget.arcadeId)
            }}
            onClose={() => setModal(null)}
          />
        )}

        {modal === 'directions' && arcade && (
          <Directions arcade={arcade} onCancel={() => setModal(null)} />
        )}

        {modal === 'checkout' && sessionArcade && (
          <QueueExitSheet
            title={`Finished at ${sessionArcade.short}?`}
            detail="Frees your machine and saves the session."
            confirmLabel="Check out"
            onCancel={() => setModal(null)}
            onConfirm={doCheckOut}
          />
        )}

        {modal === 'leavequeue' && sessionArcade && session && (
          <QueueExitSheet
            title={`Leave the queue at ${sessionArcade.short}?`}
            detail={`You give up #${session.position}.`}
            confirmLabel="Leave queue"
            onCancel={() => setModal(null)}
            onConfirm={leaveQueue}
          />
        )}
      </div>
    </Frame>
  )
}

/* A live thread with another account.

   The conversation hook lives in this component rather than in the shell so
   its realtime channel opens when the thread is on screen and closes when it
   is not - going back, opening a different person, or signing out all
   unmount it. It is keyed by the other person's id above, so a different
   person is a different mount. What the bottom of the screen offers comes
   from the hook: a composer, a request in flight, or the three answers to
   one. Answering tells the inbox to look again, so the counts on the way in
   are right by the time you are back there. */
function RealThread({
  myId,
  partner,
  relationship,
  blocked,
  onChanged,
  onBlock,
  onOpenProfile,
  onBack,
  backLabel,
  onClose,
  /* Where a declined request leaves you: the list it came from. */
  onDeclined,
}) {
  const thread = useConversation(myId, partner.id, { mutual: relationship.mutual, blocked })

  async function answer(action) {
    const result = await action()
    if (!result?.error) onChanged?.()
    return result
  }

  const subtitle = relationship.mutual
    ? 'You follow each other'
    : thread.mode === 'request-received'
      ? 'Message request'
      : thread.mode === 'request-sent'
        ? 'Request sent'
        : relationship.youFollow
          ? 'You follow them'
          : relationship.followsYou
            ? 'Follows you'
            : 'Not connected'

  return (
    <Message
      handle={partner.handle}
      hue={hueFromProfile(partner)}
      messages={thread.messages}
      mode={thread.mode}
      subtitle={subtitle}
      closedNote={thread.mode === 'closed' ? 'You can’t message this person.' : ''}
      loading={thread.loading}
      error={thread.error}
      sending={thread.sending}
      sendError={thread.sendError}
      answering={thread.answering}
      answerError={thread.answerError}
      onSend={async (text) => {
        const result = await thread.send(text)
        if (!result?.error) onChanged?.()
        return result
      }}
      onAccept={() => answer(thread.accept)}
      onDecline={async () => {
        const result = await answer(thread.decline)
        /* Declined, the request is no longer yours to look at: back to
           the list it came from. */
        if (!result?.error) onDeclined()
      }}
      onBlock={onBlock}
      onOpenProfile={onOpenProfile}
      onBack={onBack}
      backLabel={backLabel}
      onClose={onClose}
    />
  )
}

/* A message arriving while you are somewhere else in the app.

   The inbox already counts it on the way in; this says it where you are,
   for a few seconds, with the way to it one tap away. It stays quiet when
   you are already looking at that conversation or at the list. With the
   app in the background and alerts turned on, the same line goes out as a
   system notification, which is the only way a phone in a pocket hears
   anything. */
function IncomingAlert({ incoming, threads, suppressed, viewingPartnerId, alertsOn, soundOn, onOpen, onClear }) {
  const thread = incoming ? threads.find((t) => t.id === incoming.conversationId) : null
  const partner = thread?.partner ?? null
  const show = Boolean(incoming && partner) && !suppressed && partner?.id !== viewingPartnerId

  /* One cue and, if the app is not on screen, one notification, per
     message. */
  useEffect(() => {
    if (!incoming || !partner) return undefined
    if (partner.id === viewingPartnerId) return undefined
    if (soundOn) playSound('message')
    if (
      alertsOn &&
      typeof document !== 'undefined' &&
      document.hidden &&
      typeof Notification !== 'undefined' &&
      Notification.permission === 'granted'
    ) {
      try {
        const note = new Notification(partner.handle, { body: incoming.text, tag: incoming.conversationId })
        note.onclick = () => {
          window.focus()
          onOpen(partner)
        }
      } catch {
        /* Some browsers only allow this from a service worker; the line
           on screen still happens. */
      }
    }
    return undefined
    /* Keyed on the message: a change of screen must not replay it. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incoming?.id])

  useEffect(() => {
    if (!show) return undefined
    const timer = window.setTimeout(onClear, 7000)
    return () => window.clearTimeout(timer)
  }, [show, incoming?.id, onClear])

  if (!show) return null
  return (
    <AlertBanner
      avatar={<Avatar handle={partner.handle} hue={hueFromProfile(partner)} size={36} />}
      title={partner.handle}
      text={incoming.text}
      openLabel={`Open your conversation with ${partner.handle}`}
      onOpen={() => onOpen(partner)}
      onClose={onClear}
    />
  )
}

/* SCREEN 7 - confirming a way out of the queue.

   Both exits give the slot back, so both ask first. They are not the same
   thing though: checking out ends a session that happened, while leaving the
   queue says one never started. From the waiting end of the queue only the
   second is true, so the copy has to separate them rather than leaving one
   button to mean both. */
function QueueExitSheet({ title, detail, confirmLabel, onCancel, onConfirm }) {
  return (
    <div className="anim-scrim absolute inset-0 z-10 flex items-end bg-ink/40">
      <div className="anim-sheet w-full rounded-t-2xl border-t border-line bg-surface p-4 shadow-2xl">
        <h2 className="font-display text-base font-semibold text-ink">
          {title}
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-ink-muted">{detail}</p>
        <div className="mt-4 space-y-2">
          <PrimaryButton onClick={onConfirm}>{confirmLabel}</PrimaryButton>
          <SecondaryButton onClick={onCancel}>Cancel</SecondaryButton>
        </div>
      </div>
    </div>
  )
}
