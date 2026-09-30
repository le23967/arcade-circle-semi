import { Screen, Body, PrimaryButton, Seg } from '../components/ui.jsx'
import { Users, Clock, Calendar } from '../components/Icons.jsx'
import { GAMES } from '../data.js'

/* First use.

   The Week 7 critique found that a reviewer landing on the map could not say
   what the app was for. One screen, one sentence, and the one choice the
   rest of the app depends on: which game's queues you are looking at. It is
   not a tutorial - nothing after Continue explains anything - and it is
   deliberately not remembered, so every field-study participant starts from
   the same place on a reload.

   Week 9 asked for less of everything, so the line promising the choice can
   be changed later went, and the one sentence about the app became three
   icons with two words each: who is out, compare queues, plan sessions. What
   is left is the name, the three jobs, the choice and the button. */
export default function Welcome({ game, onGame, onContinue }) {
  return (
    <Screen>
      <Body className="flex flex-col justify-center px-6 py-8">
        <span
          className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-700 via-brand-600 to-[#7c3aed] text-white shadow-lg shadow-brand-600/25"
          aria-hidden="true"
        >
          <Users size={28} />
        </span>
        <h1 className="mt-5 font-display text-3xl font-bold tracking-tight text-ink">
          Arcade Circle
        </h1>
        {/* The three jobs, as icons and two words each rather than a
            sentence to read. */}
        <ul className="mt-4 space-y-2.5">
          {[
            [Users, 'See who’s out'],
            [Clock, 'Compare queues'],
            [Calendar, 'Plan sessions'],
          ].map(([Icon, label]) => (
            <li key={label} className="flex items-center gap-3 text-base font-medium text-ink">
              <span className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                <Icon size={18} />
              </span>
              {label}
            </li>
          ))}
        </ul>

        <p
          id="welcome-game"
          className="mt-8 text-xs font-semibold uppercase tracking-wide text-ink-muted"
        >
          Your game
        </p>
        <div className="mt-2 flex flex-wrap gap-2" role="group" aria-labelledby="welcome-game">
          {GAMES.map((g) => (
            <Seg
              key={g.id}
              on={g.id === game}
              accent={g.color}
              aria-pressed={g.id === game}
              onClick={() => onGame(g.id)}
              className="min-h-11 px-4 text-sm"
            >
              {g.label}
            </Seg>
          ))}
        </div>
      </Body>

      <div className="border-t border-line p-4">
        <PrimaryButton onClick={onContinue}>Continue</PrimaryButton>
      </div>
    </Screen>
  )
}
