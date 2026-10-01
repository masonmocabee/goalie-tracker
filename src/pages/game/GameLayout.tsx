import type { ReactNode } from 'react';
import { Link, Navigate, Outlet, useOutletContext, useParams } from 'react-router-dom';
import { BackIcon, ChartIcon, ListIcon, TargetIcon } from '../../components/Icons';
import TabBar, { TAB_BAR_PADDING } from '../../components/TabBar';
import { useGame, useGameEvents } from '../../data/hooks';
import { todayIso } from '../../lib/format';
import type { Game, ShotEvent } from '../../types';

interface GameContext {
  game: Game;
  events: ShotEvent[]; // non-deleted, timeline order
}

/** Loads one game and shows its Entry / Stats / Log tabs. */
export default function GameLayout() {
  const { id } = useParams();
  const game = useGame(id);
  const events = useGameEvents(id);

  if (game === undefined || events === undefined) return null;
  if (game === null) return <NotFound />;

  const base = `/game/${game.id}`;
  return (
    <>
      <div className={`mx-auto flex min-h-dvh max-w-xl flex-col ${TAB_BAR_PADDING}`}>
        <Outlet context={{ game, events } satisfies GameContext} />
      </div>
      <TabBar
        label="Game"
        tabs={[
          { to: `${base}/entry`, label: 'Entry', icon: <TargetIcon size={22} /> },
          { to: `${base}/stats`, label: 'Stats', icon: <ChartIcon size={22} /> },
          { to: `${base}/log`, label: 'Log', icon: <ListIcon size={22} /> },
        ]}
      />
    </>
  );
}

export function useGameContext(): GameContext {
  return useOutletContext<GameContext>();
}

/** Opening a game: today's unfinished game goes to Entry, anything else to Stats. */
export function GameIndex() {
  const { game } = useGameContext();
  const live = !game.final && game.date === todayIso();
  return <Navigate to={live ? 'entry' : 'stats'} replace />;
}

interface HeaderProps {
  eyebrow: ReactNode;
  title: ReactNode;
  right?: ReactNode;
  centered?: boolean;
}

/** Back to games, a small status line, and the title. */
export function GameHeader({ eyebrow, title, right, centered = false }: HeaderProps) {
  return (
    <div className="flex items-center gap-2 px-3 pt-[max(1rem,env(safe-area-inset-top))] pb-1.5">
      <Link to="/" aria-label="Back to games" className="flex size-11 shrink-0 items-center justify-center rounded-[14px]">
        <BackIcon size={24} />
      </Link>
      <div className={`flex min-w-0 flex-1 flex-col gap-0.5 ${centered ? 'items-center text-center' : ''}`}>
        <div className="flex items-center gap-1.5 text-[11px] font-bold tracking-[0.14em] text-muted uppercase">
          {eyebrow}
        </div>
        <h1 className="truncate font-display text-[28px] leading-none font-bold tracking-wide">{title}</h1>
      </div>
      <div className="flex min-w-11 shrink-0 justify-end">{right}</div>
    </div>
  );
}

/** "Live · Home" with an orange dot, or "Final · Home". */
export function StatusEyebrow({ game, prefix }: { game: Game; prefix?: string }) {
  const where = game.homeAway === 'home' ? 'Home' : game.homeAway === 'away' ? 'Away' : null;
  return (
    <>
      {!game.final && <span className="size-[7px] rounded-full bg-goal" />}
      {[prefix, game.final ? 'Final' : 'Live', where].filter(Boolean).join(' · ')}
    </>
  );
}

function NotFound() {
  return (
    <div className="p-6 text-center">
      <p className="mb-4">Game not found.</p>
      <Link to="/" className="font-bold text-save underline">
        Back to games
      </Link>
    </div>
  );
}
