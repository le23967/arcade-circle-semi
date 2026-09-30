import { Screen, Body, PrimaryButton, Seg } from '../components/ui.jsx'
import { Users } from '../components/Icons.jsx'
import { GAMES } from '../data.js'

/* First use.

   The Week 7 critique found that a reviewer landing on the map could not say
   what the app was for. One screen, one sentence, and the one choice the
   rest of the app depends on: which game's queues you are looking at. It is
   not a tutorial - nothing after Continue explains anything - and it is
   deliberately not remembered, so every field-study participant starts from
   the same place on a reload.

   Week 9 asked for less of everything, so the line promising the choice can
   be changed later went: the game picker on Arcades says that by being
   there. What is left is the name, the three jobs in one sentence, the
   choice and the button. */
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
        <p className="mt-2 text-base leading-relaxed text-ink-muted">
          See who&rsquo;s at nearby rhythm-game arcades, compare queues, and plan a
          session.
        </p>

        <p
          id="welcome-game"
          className="mt-10 text-xs font-semibold uppercase tracking-wide text-ink-muted"
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
