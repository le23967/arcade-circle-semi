import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import { Circle, MapContainer, Marker, TileLayer } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { Avatar, GameDot, PrimaryButton, Chip, Stat } from '../components/ui.jsx'
import { Clock, Chevron, Crosshair, Cabinet, Pin, Refresh } from '../components/Icons.jsx'
import { GAMES, ME_MAP, gameColor } from '../data.js'
import {
  estimateWaitMin,
  isStale,
  ageShort,
  machinesLabel,
  workingLabel,
  venueForPlayer,
} from '../lib/queue.js'

const MAP_CENTRE = [-33.88015, 151.20335]
const START_ZOOM = 15
const MIN_ZOOM = 2
const MAX_ZOOM = 19

const AVATAR_HUES = [
  ['#eef2ff', '#4338ca'],
  ['#fff1f2', '#be123c'],
  ['#ecfdf5', '#047857'],
  ['#fff7ed', '#c2410c'],
  ['#f5f3ff', '#6d28d9'],
  ['#ecfeff', '#0e7490'],
  ['#fefce8', '#a16207'],
]

const HTML_ESCAPES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#039;',
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => HTML_ESCAPES[character])
}

function hueFor(handle) {
  let value = 0
  for (let index = 0; index < handle.length; index += 1) {
    value = (value * 31 + handle.charCodeAt(index)) >>> 0
  }
  return AVATAR_HUES[value % AVATAR_HUES.length]
}

/* The pin carries the venue's short name and the wait, on one line.

   It used to stack a wait pill on top of a separate name label - 58px of
   marker before the avatars even started - and our three venues land 41px
   apart one zoom out, so the stacks came down on each other and hid the
   numbers. So the name went and the pin carried the wait alone. The field
   study showed what that cost: "what is this arcade name? ... Unknown
   arcade, 31 minutes wait" (finding G). The name is back, inside the same
   single 30px row rather than as a second one, so the pins stay as short
   as they were and only grow sideways.

   The wait is still spelled out in minutes rather than shortened, which an
   earlier evaluation asked for.

   The box around the pill is for placing, not for pressing: pointer events are
   off on it and back on for the pill, so markers standing close together stop
   stealing each other's taps through invisible padding. The click still
   reaches Leaflet, which listens on the root and gets it by bubbling. */
const VENUE_ICON = { width: 240, height: 30 }

function makeVenueIcon(arcade, active) {
  const wait = estimateWaitMin(arcade)
  const name = escapeHtml(arcade.short)
  const waitText = escapeHtml(
    wait === null ? 'unavailable' : `${isStale(arcade) ? '~' : ''}${wait} min wait`
  )
  const ariaLabel = escapeHtml(
    wait === null
      ? `${arcade.short}, no working machines`
      : `${arcade.short}, about ${wait} minutes wait`
  )
  const dot = active ? 'rgba(255,255,255,0.9)' : arcade.gameColor

  return L.divIcon({
    className: 'map-venue-marker',
    iconSize: [VENUE_ICON.width, VENUE_ICON.height],
    iconAnchor: [VENUE_ICON.width / 2, VENUE_ICON.height / 2],
    html: `
      <div style="display:flex;width:${VENUE_ICON.width}px;height:${VENUE_ICON.height}px;align-items:center;justify-content:center;pointer-events:none;">
        <button type="button" class="map-marker-button" aria-label="${ariaLabel}" style="display:flex;border:0;background:transparent;padding:0;color:inherit;cursor:pointer;font:inherit;pointer-events:auto;">
          <span class="map-venue-pill" style="display:flex;align-items:center;gap:6px;border:${active ? '0' : '1px solid var(--line)'};border-radius:999px;background:${active ? 'var(--brand-600)' : 'var(--surface)'};padding:6px 12px 6px 9px;color:${active ? '#fff' : 'var(--ink)'};box-shadow:0 8px 20px rgba(24,24,27,0.18);transition:transform 150ms ease,background 150ms ease;">
            <span style="width:8px;height:8px;flex:none;border-radius:999px;background:${dot};"></span>
            <span style="white-space:nowrap;font-size:12px;font-weight:500;">${name}</span>
            <span style="white-space:nowrap;font-size:12px;font-weight:700;font-variant-numeric:tabular-nums;">${waitText}</span>
          </span>
        </button>
      </div>
    `,
  })
}

/* Faces stay separate until there are more than two.

   Everybody at a venue shares its coordinate, so the avatars are fanned out
   sideways to keep off each other, and every extra person widens the row by
   25px - which is how five of them ended up reaching into the pins either
   side. Folding past two is the balance: one or two people are worth their own
   face and their own tap, and beyond that the row would grow without limit, so
   the third slot becomes a count. */
const MAX_FACES = 2
const FACE = 32
/* Less than a face wide, so the stack overlaps. Elements that are visually
   connected read as related; a row with gaps in it reads as separate things
   that happen to be near each other. */
const FACE_STEP = 24
const FACE_LIFT = 51

function faceIcon({ html, ariaLabel, index, count }) {
  const offset = (index - (count - 1) / 2) * FACE_STEP

  return L.divIcon({
    className: 'map-friend-marker',
    iconSize: [FACE, FACE],
    iconAnchor: [FACE / 2 - offset, FACE_LIFT],
    html: `
      <div style="display:flex;width:${FACE}px;height:${FACE}px;align-items:center;justify-content:center;">
        ${html(ariaLabel)}
      </div>
    `,
  })
}

function makeFriendIcon(player, arcade, index, count) {
  const [background, colour] = hueFor(player.handle)
  const initials =
    player.handle.replace(/[^a-z0-9]/gi, '').slice(0, 2).toUpperCase() || '?'

  return faceIcon({
    ariaLabel: escapeHtml(`${player.handle}, at ${arcade.short}`),
    index,
    count,
    html: (label) => `
      <button type="button" class="map-marker-button map-avatar" aria-label="${label}" style="position:relative;display:flex;width:${FACE}px;height:${FACE}px;align-items:center;justify-content:center;border:2px solid #fff;border-radius:999px;background:${background};padding:0;color:${colour};box-shadow:0 4px 12px rgba(24,24,27,0.2);cursor:pointer;font-family:inherit;font-size:12px;font-weight:700;transition:transform 150ms ease;">
        ${escapeHtml(initials)}
        <span style="position:absolute;right:-2px;bottom:-2px;width:10px;height:10px;border:2px solid #fff;border-radius:999px;background:var(--fresh);"></span>
      </button>
    `,
  })
}

/* The overflow count, in the shape the rest of the world uses for it.

   This went through two wrong answers first. A filled avatar-coloured circle
   impersonated a person, so a tap on it went somewhere the shape had not
   promised. Squaring it off fixed the lie and broke the group: a plate with a
   border sitting beside two faces reads as an unrelated control, not as the
   rest of the people.

   The convention settles it. Atlassian, Material, Ant and Fluent all end an
   avatar group with a numeric avatar - same circle, same size, same ring, in
   the same stack - and it opens the full list when tapped. That is what people
   already know from Slack, Figma and Docs, so it is what this should be.

   What keeps it from impersonating a person is colour, not shape: a flat
   neutral ground and no initials, no presence dot. It is plainly the counter
   for this group, and tapping it opens the card that names everyone in it. */
function makeMoreIcon(extra, arcade, index, count) {
  return faceIcon({
    ariaLabel: escapeHtml(
      `${extra} more ${extra === 1 ? 'person' : 'people'} you follow at ${arcade.short}`
    ),
    index,
    count,
    html: (label) => `
      <button type="button" class="map-marker-button map-avatar" aria-label="${label}" style="position:relative;display:flex;width:${FACE}px;height:${FACE}px;align-items:center;justify-content:center;border:2px solid #fff;border-radius:999px;background:var(--line);padding:0;color:var(--ink-muted);box-shadow:0 4px 12px rgba(24,24,27,0.2);cursor:pointer;font-family:inherit;font-size:11px;font-weight:700;font-variant-numeric:tabular-nums;transition:transform 150ms ease;">+${extra}</button>
    `,
  })
}

const YOU_ICON_APPROX = L.divIcon({
  className: 'map-you-marker',
  iconSize: [70, 38],
  iconAnchor: [35, 8],
  html: `
    <div aria-label="Approximate location" style="display:flex;width:70px;flex-direction:column;align-items:center;">
      <span style="width:16px;height:16px;border:3px solid #fff;border-radius:999px;background:var(--ink-subtle);box-shadow:0 2px 6px rgba(24,24,27,0.25);"></span>
      <span style="margin-top:3px;border-radius:4px;background:rgba(255,255,255,0.88);padding:1px 4px;color:var(--ink-muted);font-size:9px;font-weight:700;letter-spacing:0.04em;line-height:13px;text-transform:uppercase;white-space:nowrap;">Approx</span>
    </div>
  `,
})

const YOU_ICON = L.divIcon({
  className: 'map-you-marker',
  iconSize: [58, 38],
  iconAnchor: [29, 8],
  html: `
    <div aria-label="Your location" style="display:flex;width:58px;flex-direction:column;align-items:center;">
      <span style="position:relative;display:flex;width:16px;height:16px;">
        <span class="anim-ring" style="position:absolute;width:16px;height:16px;border-radius:999px;background:var(--brand-500);"></span>
        <span style="position:relative;width:16px;height:16px;border:3px solid #fff;border-radius:999px;background:var(--brand-600);box-shadow:0 2px 6px rgba(24,24,27,0.25);"></span>
      </span>
      <span style="margin-top:3px;border-radius:4px;background:rgba(255,255,255,0.88);padding:1px 4px;color:var(--brand-700);font-size:9px;font-weight:700;letter-spacing:0.04em;line-height:13px;text-transform:uppercase;white-space:nowrap;">You</span>
    </div>
  `,
})

/* The map and the Here now list used to be two segments answering one
   question. They are one view now: the map, with the list as a sheet that
   rises over it. `list` is that sheet's content, and the map owns nothing
   about it beyond whether it is up.

   A count of what was on this screen made the case. The map alone carried
   four zoom-and-pan buttons, an "out now" badge, a second copyright line, and
   a bottom card of five friend chips that repeated the five avatars already
   drawn on the map - all of it on top of a six-segment bar that no longer fit
   the width. Every one of those was defensible on its own and the sum was a
   screen people did not know where to look at. Pinch and scroll already zoom;
   the count is in the sheet header; Leaflet already prints the credit; and
   one "see the list" target replaces the five chips. */
export default function FriendsMap({
  arcades,
  /* Venues with every game's queue, and the selected game, so a friend's
     card can find the queue they are actually in. */
  rawArcades = [],
  game,
  /* The waits on the pins are one game's queues; this changes which. */
  onGame,
  /* Who is out, already scoped to the people allowed to see you and whom
     you are allowed to see. */
  present = [],
  /* One line for the card when nobody is out, when there is something
     worth saying about why. */
  emptyHint = null,
  joinsSent,
  listOpen = false,
  listTitle = null,
  onOpenList,
  onCloseList,
  list = null,
  onOpenPlayer,
  onOpenArcade,
  onJoin,
  onUnsendJoin,
  onMessage,
}) {
  const [map, setMap] = useState(null)
  const [selected, setSelected] = useState(null)
  const [tileState, setTileState] = useState('loading')
  /* Real position when the browser gives us one, otherwise the seeded
     location. `live` says which, so the map never implies a precision it does
     not have. */
  const [me, setMe] = useState({ lat: ME_MAP.lat, lng: ME_MAP.lng, accuracy: null, live: false })
  const [geoState, setGeoState] = useState(() =>
    typeof navigator !== 'undefined' && navigator.geolocation ? 'locating' : 'unavailable'
  )
  const tileFailed = useRef(false)
  const here = present

  /* Watch rather than read once, so the dot follows you while you walk to the
     arcade. Venue level privacy is unaffected: this position stays on the
     device and is never attached to a check-in or shared with anyone. */
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return undefined
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        setMe({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          live: true,
        })
        setGeoState('live')
      },
      () => setGeoState('denied'),
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 10000 }
    )
    return () => navigator.geolocation.clearWatch(id)
  }, [])

  const tileHandlers = useMemo(
    () => ({
      loading() {
        tileFailed.current = false
        setTileState('loading')
      },
      load() {
        setTileState(tileFailed.current ? 'error' : 'ready')
      },
      tileerror() {
        tileFailed.current = true
        setTileState('error')
      },
    }),
    []
  )

  const friendCard = selected?.kind === 'friend' ? selected.player : null
  const venueCard =
    selected?.kind === 'venue' ? arcades.find((arcade) => arcade.id === selected.id) : null

  /* Picking a pin answers a narrower question than the list does, so it
     replaces the sheet rather than sitting under it. */
  function pick(next) {
    setSelected(next)
    onCloseList?.()
  }

  function locateMe() {
    if (!map) return
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    map.setView([me.lat, me.lng], Math.max(map.getZoom(), 16), { animate: !reduceMotion })
  }

  return (
    <div className="arcade-map relative min-h-0 flex-1 overflow-hidden bg-[#e9e6df]">
      <style>{`
        .arcade-map .leaflet-container { font-family: inherit; }
        .arcade-map .map-marker-button:focus-visible {
          outline: 3px solid var(--brand-600);
          outline-offset: 2px;
        }
        .arcade-map .map-marker-button:hover .map-venue-pill,
        .arcade-map .map-avatar:hover { transform: translateY(-1px) scale(1.04); }
        .arcade-map .map-marker-button:active .map-venue-pill,
        .arcade-map .map-avatar:active { transform: scale(0.96); }
        .arcade-map .leaflet-control-attribution {
          background: rgba(255,255,255,0.82);
          font-size: 9px;
          padding: 1px 5px;
          border-radius: 6px 0 0 0;
          color: var(--ink-subtle);
        }
        .arcade-map .leaflet-control-attribution a { color: var(--ink-muted); }
      `}</style>

      <MapContainer
        ref={setMap}
        center={MAP_CENTRE}
        zoom={START_ZOOM}
        minZoom={MIN_ZOOM}
        maxZoom={MAX_ZOOM}
        zoomControl={false}
        scrollWheelZoom
        worldCopyJump
        className="h-full w-full"
        style={{
          backgroundColor: '#e9e6df',
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.28) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.28) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      >
        {/* OpenStreetMap's tile policy requires the credit, so it stays. It is
            styled down rather than switched off. */}
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          maxNativeZoom={19}
          eventHandlers={tileHandlers}
        />

        {arcades.map((arcade) => (
          <VenueMarkers
            key={arcade.id}
            arcade={arcade}
            friends={here.filter((player) => player.at === arcade.id)}
            active={selected?.kind === 'venue' && selected.id === arcade.id}
            onPickVenue={() => pick({ kind: 'venue', id: arcade.id })}
            onPickFriend={(player) => pick({ kind: 'friend', player })}
          />
        ))}

        {me.live && me.accuracy ? (
          <Circle
            center={[me.lat, me.lng]}
            radius={Math.min(me.accuracy, 220)}
            pathOptions={{
              color: 'var(--brand-600)',
              fillColor: 'var(--brand-500)',
              fillOpacity: 0.12,
              weight: 1,
            }}
          />
        ) : null}

        <Marker
          position={[me.lat, me.lng]}
          icon={me.live ? YOU_ICON : YOU_ICON_APPROX}
          interactive={false}
          keyboard={false}
          zIndexOffset={300}
        />
      </MapContainer>

      {/* Which game the waits on the pins are for. It used to be a row of
          its own above the map, labelled; on the map, next to the numbers it
          qualifies, the game's own dot and name are label enough. */}
      {onGame && (
        <div className="pointer-events-none absolute left-3 top-3 z-[1000]">
          <label className="pointer-events-auto relative flex min-h-11 items-center gap-1.5 rounded-full border border-line bg-surface pl-3 pr-2 shadow-lg">
            <span className="sr-only">Waits for</span>
            <GameDot color={gameColor(game)} className="h-2.5 w-2.5" />
            <select
              value={game}
              onChange={(e) => onGame(e.target.value)}
              className="h-11 max-w-[150px] appearance-none bg-transparent pr-6 text-sm font-semibold text-ink outline-none"
            >
              {GAMES.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.label}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-3 rotate-90 text-ink-muted" aria-hidden="true">
              <Chevron size={14} />
            </span>
          </label>
        </div>
      )}

      {/* One control. Zoom is pinch, scroll or keyboard on the map itself,
          and the map opens framed on all three venues, so the only thing a
          button has to do is take you to yourself. */}
      {!listOpen && (
        <div className="pointer-events-none absolute right-3 top-3 z-[1000]">
          <span className="pointer-events-auto flex overflow-hidden rounded-xl border border-line bg-surface shadow-lg">
            <ZoomButton
              label={geoState === 'live' ? 'Centre on my location' : 'Find my location'}
              disabled={geoState === 'unavailable' || geoState === 'denied'}
              onClick={locateMe}
            >
              <Crosshair size={15} />
            </ZoomButton>
          </span>
        </div>
      )}

      {tileState !== 'ready' && (
        <span
          role="status"
          className="pointer-events-none absolute left-3 top-16 z-[1000] rounded-full border border-line bg-surface/95 px-2 py-1 text-[10px] font-medium text-ink-muted shadow-sm"
        >
          {tileState === 'error' ? 'Map unavailable' : 'Loading map…'}
        </span>
      )}

      {listOpen ? (
        <div className="anim-sheet absolute inset-x-0 bottom-0 z-[1000] flex h-[78%] flex-col rounded-t-2xl border-t border-line bg-surface shadow-2xl">
          <button
            type="button"
            onClick={onCloseList}
            aria-label="Back to the map"
            className="flex items-center gap-2 border-b border-line px-4 py-3 text-left"
          >
            <span className="min-w-0 flex-1 truncate font-display text-sm font-semibold text-ink">
              {listTitle ??
                `${here.length} ${here.length === 1 ? 'friend is' : 'friends are'} out`}
            </span>
            <span className="text-xs font-semibold text-brand-600">Map</span>
            <span className="rotate-90 text-ink-muted">
              <Chevron size={16} />
            </span>
          </button>
          {list}
        </div>
      ) : (
      <div className="absolute inset-x-0 bottom-0 z-[1000] p-3">
        {venueCard ? (
          <VenueCard
            arcade={venueCard}
            friends={here.filter((player) => player.at === venueCard.id)}
            onEnter={() => onOpenArcade(venueCard.id)}
            onPickFriend={(player) => setSelected({ kind: 'friend', player })}
            onClose={() => setSelected(null)}
          />
        ) : friendCard ? (
          <FriendCard
            player={friendCard}
            arcade={arcades.find((arcade) => arcade.id === friendCard.at)}
            queueVenue={venueForPlayer(rawArcades, friendCard, game)}
            joined={joinsSent?.[friendCard.handle] === friendCard.at}
            onJoin={() => onJoin(friendCard.handle, friendCard.at)}
            onUndoJoin={() => onUnsendJoin?.(friendCard.handle)}
            onMessage={() => onMessage(friendCard.handle)}
            onProfile={() => onOpenPlayer(friendCard.handle)}
            onClose={() => setSelected(null)}
          />
        ) : (
          <SummaryCard friends={here} arcades={arcades} onOpenList={onOpenList} emptyHint={emptyHint} />
        )}
      </div>
      )}
    </div>
  )
}

function VenueMarkers({ arcade, friends, active, onPickVenue, onPickFriend }) {
  const venueIcon = useMemo(() => makeVenueIcon(arcade, active), [arcade, active])
  const faces = friends.slice(0, MAX_FACES)
  const extra = friends.length - faces.length
  const slots = faces.length + (extra > 0 ? 1 : 0)

  if (!arcade.map?.lat || !arcade.map?.lng) return null

  return (
    <>
      <Marker
        position={[arcade.map.lat, arcade.map.lng]}
        icon={venueIcon}
        keyboard={false}
        riseOnHover
        zIndexOffset={active ? 450 : 400}
        eventHandlers={{ click: onPickVenue }}
      />
      {faces.map((player, index) => (
        <FaceMarker
          key={player.handle}
          arcade={arcade}
          icon={makeFriendIcon(player, arcade, index, slots)}
          index={index}
          onPick={() => onPickFriend(player)}
        />
      ))}
      {extra > 0 && (
        <FaceMarker
          arcade={arcade}
          icon={makeMoreIcon(extra, arcade, faces.length, slots)}
          index={faces.length}
          onPick={onPickVenue}
        />
      )}
    </>
  )
}

function FaceMarker({ arcade, icon, index, onPick }) {
  return (
    <Marker
      position={[arcade.map.lat, arcade.map.lng]}
      icon={icon}
      keyboard={false}
      riseOnHover
      zIndexOffset={500 + index}
      eventHandlers={{ click: onPick }}
    />
  )
}

function Card({ children }) {
  return (
    <div className="anim-row rounded-2xl border border-line bg-surface p-3 shadow-xl">
      {children}
    </div>
  )
}

function SummaryCard({ friends, arcades, onOpenList, emptyHint = null }) {
  /* Which venues, in the order the map shows them, so the line under the
     count says where without listing anyone twice. */
  const venues = arcades.filter((a) => friends.some((p) => p.at === a.id))
  return (
    <Card>
      <button
        type="button"
        onClick={onOpenList}
        className="flex min-h-11 w-full items-center gap-3 text-left"
      >
        <span className="flex -space-x-2">
          {friends.slice(0, 3).map((p) => (
            <Avatar key={p.handle} handle={p.handle} size={26} className="ring-2 ring-surface" />
          ))}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-display text-sm font-semibold text-ink">
            {friends.length} {friends.length === 1 ? 'friend is' : 'friends are'} out
          </span>
          <span className="block truncate text-[11px] text-ink-muted">
            {venues.length > 0
              ? venues.map((a) => a.short).join(' · ')
              : emptyHint || 'Nobody out right now'}
          </span>
        </span>
        <span className="text-xs font-semibold text-brand-600">List</span>
        <span className="-rotate-90 text-ink-muted">
          <Chevron size={16} />
        </span>
      </button>
    </Card>
  )
}

function VenueCard({ arcade, friends, onEnter, onPickFriend, onClose }) {
  return (
    <Card>
      <div className="flex items-start gap-2">
        <GameDot color={arcade.gameColor} className="mt-1.5 h-2.5 w-2.5" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-base font-semibold text-ink">
            {arcade.name}
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
            <Stat
              label="Wait"
              tone={estimateWaitMin(arcade) === null ? 'live' : 'ink'}
              icon={<Clock size={13} />}
            >
              {estimateWaitMin(arcade) === null
                ? 'Unavailable'
                : `${isStale(arcade) ? '~' : ''}${estimateWaitMin(arcade)} min`}
            </Stat>
            <Stat label="Updated" tone={isStale(arcade) ? 'stale' : 'default'} icon={<Refresh size={12} />}>
              {ageShort(arcade)}
            </Stat>
            <Stat label="Machines" icon={<Cabinet size={13} />}>
              {workingLabel(arcade)}
            </Stat>
            <Stat label="Distance" icon={<Pin size={12} />}>
              {arcade.distanceKm.toFixed(1)} km
            </Stat>
          </p>
        </div>
        <CloseButton onClick={onClose} />
      </div>

      {/* Named, and each name opens that person.

          A venue with more than two people you follow folds the rest into a
          count on the map, so this row is how you reach whoever is behind it.
          Left as plain text, joining the third person meant a trip back out to
          the roster along the bottom - a longer way round than the map you
          were already looking at. */}
      {friends.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5 rounded-xl bg-fresh-bg px-2 py-1.5">
          {friends.map((player) => (
            <button
              key={player.handle}
              type="button"
              onClick={() => onPickFriend(player)}
              aria-label={`Open ${player.handle}`}
              className="flex items-center gap-1.5 rounded-full bg-surface/70 py-0.5 pl-0.5 pr-2 text-[11px] font-medium text-ink transition-colors duration-150 hover:bg-surface active:scale-95"
            >
              <Avatar handle={player.handle} size={20} />
              {player.handle}
            </button>
          ))}
          <span className="text-[11px] text-ink-muted">here</span>
        </div>
      )}

      <div className="mt-2.5">
        <PrimaryButton onClick={onEnter}>Open arcade</PrimaryButton>
      </div>
    </Card>
  )
}

function FriendCard({
  player,
  arcade,
  /* The queue they are in, for its machine count. */
  queueVenue = null,
  joined,
  onJoin,
  onUndoJoin,
  onMessage,
  onProfile,
  onClose,
}) {
  return (
    <Card>
      <div className="flex items-start gap-3">
        <button type="button" onClick={onProfile} aria-label={`Open ${player.handle}`}>
          <Avatar handle={player.handle} size={44} live />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-base font-semibold text-ink">
            {player.handle}
          </p>
          <p className="truncate text-xs tabular-nums text-ink-muted">
            {arcade?.short} &middot; {player.sinceMin}m
          </p>
          {/* "11th in queue can mean different things if there's five
              cabinets or two": the position always comes with its
              machines. */}
          {queueVenue && (
            <p className="truncate text-xs tabular-nums text-ink-muted">
              {queueVenue.game}
              {player.position ? ` · #${player.position} in queue` : ''} &middot;{' '}
              {machinesLabel(queueVenue)}
            </p>
          )}
          <div className="mt-1 flex flex-wrap gap-1">
            {player.games.slice(0, 2).map((game) => (
              <Chip key={game} tone="quiet">
                {game}
              </Chip>
            ))}
          </div>
        </div>
        <CloseButton onClick={onClose} />
      </div>

      {/* Once they have been told, the card says so rather than offering to
          tell them again. */}
      {joined && (
        <div className="mt-2.5 flex items-center gap-2 rounded-xl bg-fresh-bg px-2.5 py-1.5">
          <p className="min-w-0 flex-1 text-[11px] font-medium text-ink">
            {player.handle} knows you&rsquo;re coming
          </p>
          <button
            type="button"
            onClick={onUndoJoin}
            className="flex-none rounded-md text-[11px] font-semibold text-ink-muted underline decoration-ink-subtle underline-offset-2 transition-colors duration-150 hover:text-ink"
          >
            Undo
          </button>
        </div>
      )}

      <div className="mt-2.5 flex gap-2">
        <button
          type="button"
          onClick={onMessage}
          className="flex-1 rounded-xl border border-line-strong bg-surface py-2.5 font-display text-sm font-semibold text-ink transition-all duration-150 hover:bg-sunken active:scale-[0.98]"
        >
          Message
        </button>
        <button
          type="button"
          onClick={onJoin}
          className="flex-1 rounded-xl bg-brand-600 py-2.5 font-display text-sm font-semibold text-white shadow-lg shadow-brand-600/25 transition-all duration-150 hover:bg-brand-700 active:scale-[0.98]"
        >
          {joined ? 'Notify again' : 'Join them'}
        </button>
      </div>
    </Card>
  )
}

function CloseButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Close"
      className="-mr-1 -mt-1 rounded-full p-1.5 text-ink-subtle transition-colors duration-150 hover:bg-sunken hover:text-ink"
    >
      &times;
    </button>
  )
}

function ZoomButton({ children, label, onClick }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex h-11 w-11 items-center justify-center text-ink transition-colors duration-150 hover:bg-sunken active:bg-line"
    >
      {children}
    </button>
  )
}
