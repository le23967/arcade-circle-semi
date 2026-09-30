/* ---------------------------------------------------------------------------
   Social layer seed data.

   Scope is deliberately narrow. Only three things in the interviews had a
   participant volunteer them without being prompted with a concept first:

   - the 20-person favourite cap on the official maimai score site
   - being able to see which players are around
   - what game someone mainly plays, and what songs they like

   Everything else in the social space (matchmaking with strangers, icebreaker
   prompts, invite rewards) came out of the team's own brainstorm, so it is not
   built here. See README for the evidence grading.
--------------------------------------------------------------------------- */

/* The official maimai score site lets you favourite 20 people and no more:
   "the website lets you favorite up to 20 people ... but you can't have more
   than that" - and, unprompted, "if you make something [to] get around that,
   that would actually be like-". This constant exists so the prototype can
   draw the line and show who falls below it. */
export const OLD_SITE_FAVOURITE_CAP = 20

/* Song titles are real maimai tracks rather than invented ones, so the score
   screen reads like the game it is about. Two caveats are worth keeping
   honest, in the same spirit as the venue data:

   - the difficulty is given as its tier (Master, Re:MASTER, Expert) and not as
     a level number, because chart constants move between versions and we have
     not verified them against the current international release
   - the achievement percentages are invented, as are the players

   Check the titles against the official site before quoting them as fact. */
export const SONGS = [
  { id: 'pandora', title: 'PANDORA PARADOXXX', chart: 'Re:MASTER' },
  { id: 'oshama', title: 'Oshama Scramble!', chart: 'Master' },
  { id: 'qzkago', title: 'QZKago Requiem', chart: 'Master' },
]

export const ME = {
  handle: 'kenta',
  games: ['maimai DX', 'Taiko'],
  songs: ['PANDORA PARADOXXX', 'Oshama Scramble!', 'Garakuta Doll Play'],
  scores: { pandora: 100.4921, oshama: 99.8812, qzkago: 100.7734 },
  visible: true,
}

/* handle, games, favourite songs, per-song achievement, and where they are
   now. `at` is a venue id or null - venue level only, never a coordinate. */
const f = (handle, games, songs, pandora, oshama, qzkago, at = null, sinceMin = 0) => ({
  handle,
  games,
  songs,
  scores: { pandora, oshama, qzkago },
  at,
  sinceMin,
})

const FOLLOWING = [
  f('mtsk', ['maimai DX'], ['Halcyon', 'Valsqotch'], 101.0, 100.4021, 100.9912),
  f('yuzu', ['maimai DX', 'CHUNITHM'], ['PANDORA PARADOXXX', 'Garakuta Doll Play'], 100.9812, 100.1144, 100.8003),
  f('kaito', ['maimai DX', 'Sound Voltex'], ['Oshama Scramble!', 'GIGANTOMAKHIA'], 100.9455, 100.0087, 100.6621),
  f('hana', ['maimai DX'], ['Valsqotch', 'QZKago Requiem'], 100.8901, 99.9310, 100.9004, 'central-park', 5),
  f('sable', ['maimai DX', 'DDR'], ['Halcyon', 'Garakuta Doll Play'], 100.8534, 99.8776, 100.4415),
  f('mike', ['maimai DX', 'Sound Voltex'], ['Garakuta Doll Play', 'Valsqotch'], 100.8203, 99.8102, 100.2470),
  f('quill', ['maimai DX'], ['PANDORA PARADOXXX', 'GIGANTOMAKHIA'], 100.7998, 99.7420, 100.2288),
  f('nagi', ['maimai DX', 'Taiko'], ['QZKago Requiem', 'Valsqotch'], 100.7412, 99.6903, 100.5570, 'koko-town-hall', 7),
  f('ovo_', ['maimai DX', 'CHUNITHM'], ['Oshama Scramble!', 'Halcyon'], 100.687, 99.6015, 100.1192, 'koko-town-hall', 11),
  f('tomo', ['maimai DX'], ['Garakuta Doll Play', 'PANDORA PARADOXXX'], 100.6103, 99.5338, 99.9840),
  f('lyn', ['maimai DX', 'GITADORA'], ['GIGANTOMAKHIA', 'QZKago Requiem'], 100.5488, 99.4901, 100.3306),
  f('breeze', ['maimai DX'], ['Valsqotch', 'Oshama Scramble!'], 100.4102, 99.4177, 99.8812),
  f('raven', ['maimai DX', 'Sound Voltex'], ['Halcyon', 'PANDORA PARADOXXX'], 100.3577, 99.3560, 100.0451),
  f('miko', ['maimai DX'], ['Garakuta Doll Play', 'GIGANTOMAKHIA'], 100.2914, 99.2884, 99.7723),
  f('sora', ['maimai DX', 'Taiko'], ['QZKago Requiem', 'Halcyon'], 100.1806, 99.2011, 100.1938),
  f('piper', ['maimai DX'], ['PANDORA PARADOXXX', 'Valsqotch'], 100.0455, 99.1350, 99.6604),
  f('teo', ['maimai DX', 'DDR'], ['Oshama Scramble!', 'Garakuta Doll Play'], 99.9218, 99.0702, 99.9017),
  f('wasp', ['maimai DX'], ['GIGANTOMAKHIA', 'Halcyon'], 99.8004, 98.9945, 99.5528),
  f('jun', ['maimai DX', 'CHUNITHM'], ['Valsqotch', 'QZKago Requiem'], 99.6531, 98.9211, 99.8140),
  f('hako', ['maimai DX'], ['Garakuta Doll Play', 'Oshama Scramble!'], 99.5117, 98.8503, 99.4462),
  f('maki', ['maimai DX'], ['PANDORA PARADOXXX', 'GIGANTOMAKHIA'], 99.3842, 98.7790, 99.7005),
  f('rin', ['maimai DX', 'Taiko'], ['PANDORA PARADOXXX', 'GIGANTOMAKHIA'], 99.2015, 98.7044, 99.3311, 'central-park', 24),
  f('cyan', ['maimai DX', 'Sound Voltex'], ['Halcyon', 'Valsqotch'], 99.0778, 98.6320, 99.1877),
  f('kaz', ['maimai DX'], ['Valsqotch', 'Garakuta Doll Play'], 98.9341, 98.5588, 99.0244, 'central-park', 8),
  f('penny', ['maimai DX', 'DDR'], ['QZKago Requiem', 'Oshama Scramble!'], 98.762, 98.4802, 98.8619),
  f('leo', ['maimai DX'], ['GIGANTOMAKHIA', 'Garakuta Doll Play'], 98.4193, 98.3115, 98.5530),
  f('zed', ['maimai DX', 'GITADORA'], ['Oshama Scramble!', 'Halcyon'], 98.0055, 98.1006, 98.2201),
  f('mia', ['maimai DX', 'Sound Voltex'], ['Oshama Scramble!', 'Valsqotch'], 97.8410, 97.9633, 98.0742),
]

/* Following is not symmetric. A few of the people you follow do not follow
   back, and some people follow you that you have not followed. Presence is
   only ever shared between mutuals, so this distinction is load-bearing
   rather than decorative. */
const NOT_FOLLOWING_BACK = new Set(['kaito', 'sable', 'piper', 'wasp', 'penny'])

export const FRIENDS = FOLLOWING.map((p) => ({
  ...p,
  followsYou: !NOT_FOLLOWING_BACK.has(p.handle),
}))

/* People who follow you that you have not followed back. They cannot see your
   presence until you follow them too. */
export const FOLLOWERS_ONLY = [
  { handle: 'aki', games: ['maimai DX'] },
  { handle: 'nori', games: ['maimai DX', 'Taiko'] },
  { handle: 'polar', games: ['maimai DX', 'Sound Voltex'] },
  { handle: 'hoshi', games: ['maimai DX'] },
  { handle: 'vex', games: ['maimai DX', 'CHUNITHM'] },
  { handle: 'tsuki', games: ['maimai DX', 'DDR'] },
  { handle: 'orb', games: ['maimai DX'] },
  { handle: 'nine', games: ['maimai DX', 'Taiko'] },
  { handle: 'kumo', games: ['maimai DX'] },
]

/* People with no connection to you either way. They are on the app, and the
   only reason you would ever see one is that they posted a session open to
   anyone. A new player whose circle is empty is in exactly this position
   themselves, which is why the roster has to hold people like this at all:
   without them, every screen on the Circle tab is blank until someone you
   already know joins. */
export const OPEN_PLAYERS = [
  { handle: 'dex', games: ['maimai DX', 'CHUNITHM'], songs: ['Halcyon', 'Oshama Scramble!'] },
  { handle: 'fern', games: ['maimai DX'], songs: ['Garakuta Doll Play'] },
  { handle: 'kit', games: ['CHUNITHM', 'maimai DX'], songs: ['PANDORA PARADOXXX'] },
  { handle: 'tama', games: ['Taiko', 'maimai DX'], songs: ['Valsqotch', 'QZKago Requiem'] },
]

/* ---------------------------------------------------------------------------
   Clips.

   A feed is in here for one reason: watching is already what these players do
   with the wait. Asked what he does while queued, one player answered "watch
   videos", and the interviewer noted "I'm guessing that's the general trend."
   The problem is that they watch somewhere else - "scrolling phones and
   they're not paying attention" - and then miss their turn, which is why
   people keep having to ask "who's next?".

   Putting the watching inside the app that holds your place is what makes the
   feed worth building rather than a borrowed pattern. It is also the on-ramp
   the team said they wanted for people outside the community: the introverted
   player got in by watching first - "I'd watch like my friends play for ages
   ... I was really interested 'cause it looked so cool."
--------------------------------------------------------------------------- */
export const CLIPS = [
  { id: 'c1', handle: 'rin', song: 'PANDORA PARADOXXX', chart: 'Master', achievement: 99.2015, venue: 'central-park', postedMin: 12, seconds: 24, likes: 34, comments: 5 },
  { id: 'c2', handle: 'ovo_', song: 'Oshama Scramble!', chart: 'Master', achievement: 99.6015, venue: 'koko-town-hall', postedMin: 41, seconds: 31, likes: 88, comments: 12 },
  { id: 'c3', handle: 'mtsk', song: 'QZKago Requiem', chart: 'Expert', achievement: 100.9912, venue: 'central-park', postedMin: 96, seconds: 19, likes: 210, comments: 27 },
  { id: 'c4', handle: 'kaz', song: 'Valsqotch', chart: 'Master', achievement: 99.0244, venue: 'central-park', postedMin: 143, seconds: 28, likes: 19, comments: 2 },
  { id: 'c5', handle: 'yuzu', song: 'PANDORA PARADOXXX', chart: 'Master', achievement: 100.9812, venue: 'market-city', postedMin: 260, seconds: 22, likes: 156, comments: 18 },
  { id: 'c6', handle: 'nagi', song: 'Halcyon', chart: 'Master', achievement: 100.557, venue: 'koko-town-hall', postedMin: 380, seconds: 35, likes: 74, comments: 9 },
  { id: 'c7', handle: 'lyn', song: 'GIGANTOMAKHIA', chart: 'Expert', achievement: 100.3306, venue: 'central-park', postedMin: 610, seconds: 27, likes: 41, comments: 6 },
  { id: 'c8', handle: 'sora', song: 'QZKago Requiem', chart: 'Expert', achievement: 100.1938, venue: 'market-city', postedMin: 900, seconds: 30, likes: 63, comments: 8 },
]

/* ---------------------------------------------------------------------------
   Activity.

   The temporal half of "seeing where your friends are and all of that". A
   presence list answers "who is there now"; this answers "did I just miss
   them" - if someone left 25 minutes ago there is no point going. Both
   questions came up, and only the first one had a screen.

   Venue ids match ARCADES; `minsAgo` lines up with the `sinceMin` values on
   FRIENDS so the two screens tell the same story.
--------------------------------------------------------------------------- */
export const ACTIVITY = [
  { id: 'a1', handle: 'rin', type: 'played', venue: 'central-park', songs: ['PANDORA PARADOXXX', 'Oshama Scramble!', 'QZKago Requiem', 'GIGANTOMAKHIA'], minsAgo: 3 },
  { id: 'a2', handle: 'mtsk', type: 'clip', song: 'QZKago Requiem', clipId: 'c3', minsAgo: 6 },
  { id: 'a3', handle: 'kaz', type: 'checkin', venue: 'central-park', minsAgo: 8 },
  { id: 'a4', handle: 'ovo_', type: 'checkin', venue: 'koko-town-hall', minsAgo: 11 },
  { id: 'a5', handle: 'yuzu', type: 'best', song: 'PANDORA PARADOXXX', achievement: 100.9812, minsAgo: 18 },
  { id: 'a6', handle: 'rin', type: 'checkin', venue: 'central-park', minsAgo: 24 },
  { id: 'a7', handle: 'ovo_', type: 'checkout', venue: 'central-park', minsAgo: 25 },
  { id: 'a8', handle: 'nagi', type: 'played', venue: 'koko-town-hall', songs: ['Halcyon', 'Valsqotch'], minsAgo: 40 },
  { id: 'a9', handle: 'lyn', type: 'checkout', venue: 'market-city', minsAgo: 55 },
  { id: 'a10', handle: 'tomo', type: 'best', song: 'QZKago Requiem', achievement: 99.984, minsAgo: 96 },
  { id: 'a11', handle: 'mtsk', type: 'played', venue: 'koko-town-hall', songs: ['Garakuta Doll Play', 'PANDORA PARADOXXX', 'Halcyon'], minsAgo: 140 },
]

/* Seed comments, keyed by clip id. */
export const CLIP_COMMENTS = {
  c1: [
    { id: 'k1', handle: 'kaz', text: 'that last section is clean', minsAgo: 8 },
    { id: 'k2', handle: 'mtsk', text: 'how are you hitting the slides that fast', minsAgo: 5 },
  ],
  c2: [{ id: 'k3', handle: 'nagi', text: 'gravity well on 14 is brutal, nice', minsAgo: 30 }],
  c3: [
    { id: 'k4', handle: 'yuzu', text: 'sss+ on expert, ridiculous', minsAgo: 80 },
    { id: 'k5', handle: 'lyn', text: 'which machine was this on?', minsAgo: 61 },
    { id: 'k6', handle: 'mtsk', text: 'the left one at koko', minsAgo: 58 },
  ],
  c4: [],
  c5: [{ id: 'k7', handle: 'raven', text: 'been chasing this chart for weeks', minsAgo: 200 }],
  c6: [],
  c7: [{ id: 'k8', handle: 'sora', text: 'good recovery at the end', minsAgo: 540 }],
  c8: [],
}

/* ---------------------------------------------------------------------------
   Planned sessions.

   Consultation feedback pushed on purpose: knowing where people are is not
   engagement on its own, and the example given was that knowing where people
   are only pays off when it lets you arrange to meet them somewhere. So
   presence ends in a plan - a venue, a game, a time, and who is coming.

   `open` marks a session the host posted for anyone on the app, not just the
   people they asked. Everything else on the Circle tab is mutual-only, and
   that rule is what leaves a player with no circle looking at empty lists.
   An open session is the one thing a stranger is allowed to see, because the
   host chose that: nobody is being approached, they are answering an
   invitation that was left out for them.
--------------------------------------------------------------------------- */
export const PLANNED = [
  {
    id: 'ps3',
    host: 'mia',
    venue: 'market-city',
    gameId: 'sdvx',
    whenLabel: 'Today, 5:20 PM',
    note: 'One machine there, so we take turns on it',
    going: ['mia', 'mike'],
    invitedMe: true,
  },
  {
    id: 'ps1',
    host: 'mtsk',
    venue: 'koko-town-hall',
    gameId: 'maimai',
    whenLabel: 'Today, 6:30 PM',
    note: 'Doubles for the extra song, then dinner',
    going: ['mtsk', 'yuzu', 'rin'],
    invitedMe: true,
  },
  {
    id: 'ps4',
    host: 'dex',
    venue: 'koko-town-hall',
    gameId: 'maimai',
    whenLabel: 'Tonight, 7:00 PM',
    note: 'Anyone welcome, any level. Doubles if enough people turn up',
    going: ['dex', 'fern'],
    invitedMe: false,
    open: true,
  },
  {
    id: 'ps5',
    host: 'kit',
    venue: 'central-park',
    gameId: 'chunithm',
    whenLabel: 'Tomorrow, 2:00 PM',
    note: 'New to CHUNITHM, looking for people to learn it with',
    going: ['kit'],
    invitedMe: false,
    open: true,
  },
  {
    id: 'ps6',
    host: 'raven',
    venue: 'koko-town-hall',
    gameId: 'sdvx',
    whenLabel: 'Saturday, 1:00 PM',
    note: 'Two machines, so nobody waits on anybody',
    going: ['raven', 'cyan'],
    invitedMe: false,
    open: true,
  },
  {
    id: 'ps2',
    host: 'nagi',
    venue: 'central-park',
    gameId: 'taiko',
    whenLabel: 'Sunday, 1:00 PM',
    note: 'Quiet before the weekend rush',
    going: ['nagi', 'sora'],
    invitedMe: false,
    open: true,
  },
  {
    id: 'ps7',
    host: 'tama',
    venue: 'market-city',
    gameId: 'taiko',
    whenLabel: 'Sunday, 3:00 PM',
    note: 'Casual, bring whoever',
    going: ['tama'],
    invitedMe: false,
    open: true,
  },
]
