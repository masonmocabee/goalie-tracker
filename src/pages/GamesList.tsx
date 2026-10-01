import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { NeedsDetailsBadge, ShutoutBadge } from '../components/Badges';
import BottomSheet from '../components/BottomSheet';
import { PlusIcon } from '../components/Icons';
import NewGameForm from '../components/NewGameForm';
import { useGamesWithEvents } from '../data/hooks';
import { dateTile, formatGaa, seasonLabel, todayIso } from '../lib/format';
import { formatSvPct, needsDetails, totals } from '../stats/gameStats';
import { isShutout, seasonStats } from '../stats/seasonStats';

export default function GamesList() {
  const games = useGamesWithEvents();
  const [showNew, setShowNew] = useState(false);
  const navigate = useNavigate();

  if (games === undefined) return null;
  const today = todayIso();
  const season = seasonStats(games, today);
  const needing = games.filter((g) => g.events.some(needsDetails)).length;

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-[18px] px-4 pt-[max(1.75rem,env(safe-area-inset-top))] pb-4">
      <div className="flex flex-col gap-1">
        <div className="text-xs font-bold tracking-[0.14em] text-muted uppercase">Season {seasonLabel(today)}</div>
        <h1 className="font-display text-[46px] leading-[0.95] font-bold tracking-[0.01em]">Games</h1>
      </div>

      {games.length > 0 && (
        <Link to="/season" className="grid grid-cols-3 gap-2 rounded-[20px] border border-line bg-panel px-[18px] py-4">
          <StripStat value={formatSvPct(season.overall.svPct)} label="Season SV%" className="text-save" />
          <StripStat value={formatGaa(season.gaa)} label="GAA" />
          <StripStat value={String(season.games)} label="Games" />
        </Link>
      )}

      <button
        type="button"
        onClick={() => setShowNew(true)}
        className="flex h-[60px] items-center justify-center gap-2.5 rounded-[18px] bg-save text-[17px] font-extrabold text-save-ink"
      >
        <PlusIcon size={22} />
        New game
      </button>

      {games.length === 0 ? (
        <p className="pt-6 text-center text-muted">No games yet. Start one before puck drop.</p>
      ) : (
        <>
          <div className="mt-1 flex items-baseline justify-between">
            <h2 className="text-[13px] font-bold tracking-[0.12em] text-muted uppercase">Recent</h2>
            {needing > 0 && <div className="text-[13px] text-muted">{needing} need details</div>}
          </div>
          <ul className="flex flex-col gap-2.5">
            {games.map(({ game, events }) => {
              const t = totals(events);
              const tile = dateTile(game.date);
              const where = game.homeAway === 'home' ? 'Home' : game.homeAway === 'away' ? 'Away' : null;
              return (
                <li key={game.id}>
                  <Link
                    to={`/game/${game.id}`}
                    className="flex items-center gap-3.5 rounded-[18px] border border-line bg-panel py-3 pr-4 pl-3"
                  >
                    <div className="flex h-14 w-[52px] shrink-0 flex-col items-center justify-center rounded-xl bg-well">
                      <div className="text-[11px] font-bold tracking-[0.1em] text-muted">{tile.mon}</div>
                      <div className="font-display text-[26px] leading-none font-bold">{tile.day}</div>
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <div className="truncate text-base font-bold">{game.opponent}</div>
                      <div className="text-[13px] text-muted">
                        {[where, `${t.shots} SA`, `${t.goals} GA`, !game.final && 'Live'].filter(Boolean).join(' · ')}
                      </div>
                      {isShutout(game, events, today) && <ShutoutBadge />}
                      {events.some(needsDetails) && <NeedsDetailsBadge />}
                    </div>
                    <div className="flex flex-col items-end">
                      <div className="font-display text-[30px] leading-none font-bold">{formatSvPct(t.svPct)}</div>
                      <div className="text-[11px] font-bold tracking-[0.08em] text-muted">SV%</div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {showNew && (
        <BottomSheet title="New game" onClose={() => setShowNew(false)}>
          <NewGameForm onCreated={(game) => navigate(`/game/${game.id}/entry`)} />
        </BottomSheet>
      )}
    </div>
  );
}

function StripStat({ value, label, className = '' }: { value: string; label: string; className?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className={`font-display text-[36px] leading-none font-bold ${className}`}>{value}</div>
      <div className="text-xs font-semibold text-muted">{label}</div>
    </div>
  );
}
