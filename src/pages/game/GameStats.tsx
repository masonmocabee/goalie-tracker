import { useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import BackupNudge from '../../components/BackupNudge';
import { HdTag } from '../../components/Badges';
import EventSheet from '../../components/EventSheet';
import { ListIcon, ShieldIcon, TrashIcon } from '../../components/Icons';
import NetDiagram from '../../components/NetDiagram';
import RinkDiagram from '../../components/RinkDiagram';
import { deleteGame } from '../../data/games';
import { formatGameDate, todayIso } from '../../lib/format';
import { periodLabel, periodsFor } from '../../lib/periods';
import { formatSvPct, highDangerTotals, needsDetails, periodTotals, totals } from '../../stats/gameStats';
import { isShutout } from '../../stats/seasonStats';
import { GOAL_REASON_LABELS, NET_ZONE_LABELS, type NetZone, type ShotEvent } from '../../types';
import { GameHeader, StatusEyebrow, useGameContext } from './GameLayout';

/** Per-game summary. */
export default function GameStats() {
  const { game, events } = useGameContext();
  const [editingId, setEditingId] = useState<string | null>(null);
  const navigate = useNavigate();

  const all = totals(events);
  const hd = highDangerTotals(events);
  const goals = events.filter((e) => e.type === 'goal'); // timeline order = goal #1, #2...
  const periods = periodsFor(game.numPeriods).filter((p) => p !== 'OT' || periodTotals(events, 'OT').shots > 0);
  const editing = editingId ? events.find((e) => e.id === editingId) : undefined;
  const shutout = isShutout(game, events, todayIso());

  async function handleDelete() {
    const shots = all.shots === 1 ? '1 shot' : `${all.shots} shots`;
    if (!confirm(`Delete the game vs ${game.opponent} on ${formatGameDate(game.date)} and its ${shots}? This can't be undone.`)) {
      return;
    }
    navigate('/', { replace: true });
    await deleteGame(game.id);
  }

  const markers: Partial<Record<NetZone, number[]>> = {};
  goals.forEach((g, i) => {
    if (!g.netZone) return;
    (markers[g.netZone] ??= []).push(i + 1);
  });

  const rinkMarkers = goals.flatMap((g, i) => (g.shotOrigin ? [{ origin: g.shotOrigin, label: String(i + 1) }] : []));

  return (
    <div className="flex flex-col gap-4 pb-6">
      <GameHeader eyebrow={<StatusEyebrow game={game} prefix={formatGameDate(game.date)} />} title={`vs ${game.opponent}`} />

      {game.final && <BackupNudge className="mx-4" />}

      {all.shots === 0 ? (
        <Card>
          <p className="text-muted">No shots logged yet.</p>
          <Link to="../entry" className="font-bold text-save">
            Start tracking
          </Link>
        </Card>
      ) : (
        <>
          <Card>
            <div className="flex items-end justify-between">
              <div className="flex flex-col gap-1.5">
                <div className="eyebrow">Save %</div>
                <div className="font-display text-[96px] leading-[0.82] font-bold">{formatSvPct(all.svPct)}</div>
              </div>
              <div className="flex flex-col items-end gap-2 pb-1">
                {shutout && (
                  <span className="flex items-center gap-1.5 rounded-full bg-save px-3 py-1 text-[13px] font-extrabold text-save-ink">
                    <ShieldIcon size={16} />
                    Shutout
                  </span>
                )}
                <span className="text-sm text-muted">
                  {all.saves} of {all.shots} stopped
                </span>
              </div>
            </div>
            <div className="flex h-2.5 overflow-hidden rounded-full bg-goal-track">
              <div className="bg-save" style={{ width: `${(all.svPct ?? 0) * 100}%` }} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Tile value={all.shots} label="Shots" />
              <Tile value={all.saves} label="Saves" className="text-save" />
              <Tile value={all.goals} label="Goals against" className="text-goal" />
              <Tile
                value={formatSvPct(hd.svPct)}
                label={hd.shots ? `HDSV% · ${hd.saves} of ${hd.shots}` : 'HDSV% · no HD shots'}
              />
            </div>
          </Card>

          <Card title="By period">
            <table className="w-full border-collapse text-[15px] tabular-nums">
              <thead>
                <tr className="text-xs font-bold text-muted">
                  <th className="py-1.5 text-left" />
                  <th className="text-right">SA</th>
                  <th className="text-right">SV</th>
                  <th className="text-right">GA</th>
                  <th className="text-right">SV%</th>
                </tr>
              </thead>
              <tbody>
                {periods.map((p) => {
                  const t = periodTotals(events, p);
                  return (
                    <tr key={p} className="border-t border-divider">
                      <td className="py-3 text-left font-display text-xl font-bold">{periodLabel(p)}</td>
                      <td className="text-right">{t.shots}</td>
                      <td className="text-right">{t.saves}</td>
                      <td className="text-right text-goal">{t.goals}</td>
                      <td className="text-right font-bold">{formatSvPct(t.svPct)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>

          {goals.length > 0 && (
            <>
              <Card title="Goal location">
                <RinkDiagram markers={rinkMarkers} />
                {rinkMarkers.length < goals.length && (
                  <p className="text-xs text-muted">
                    {rinkMarkers.length === 0 ? 'No locations yet.' : `${goals.length - rinkMarkers.length} not placed.`} Tap a goal
                    below to mark where it was shot from.
                  </p>
                )}
              </Card>

              <Card title="Where they went in">
                <NetDiagram markers={markers} />
              </Card>

              <section className="mx-4 flex flex-col gap-2.5">
                <h2 className="eyebrow mx-1 mt-1">Goals</h2>
                {goals.map((g, i) => (
                  <GoalCard key={g.id} goal={g} number={i + 1} onClick={() => setEditingId(g.id)} />
                ))}
              </section>
            </>
          )}
        </>
      )}

      <Link
        to="../log"
        className="mx-4 mt-1 flex h-14 items-center justify-center gap-2.5 rounded-2xl border border-line-strong bg-panel text-[15px] font-bold"
      >
        <ListIcon />
        Open event log
      </Link>

      <button
        type="button"
        onClick={handleDelete}
        className="mx-4 flex h-14 items-center justify-center gap-2.5 rounded-2xl border border-goal/40 text-[15px] font-bold text-goal-soft"
      >
        <TrashIcon />
        Delete game
      </button>

      {editing && (
        <EventSheet key={editing.id} event={editing} numPeriods={game.numPeriods} onClose={() => setEditingId(null)} />
      )}
    </div>
  );
}

function GoalCard({ goal, number, onClick }: { goal: ShotEvent; number: number; onClick: () => void }) {
  const missing = needsDetails(goal);
  const what = [goal.netZone && NET_ZONE_LABELS[goal.netZone], goal.reason && GOAL_REASON_LABELS[goal.reason]].filter(
    Boolean,
  );
  const when = [periodLabel(goal.period), goal.gameClock ?? 'no clock', goal.strength].filter(Boolean).join(' · ');

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-3.5 rounded-[18px] px-4 py-3.5 text-left ${
        missing ? 'border border-dashed border-goal/45 bg-goal/[0.06]' : 'surface border border-line'
      }`}
    >
      <span
        className={`flex size-[30px] shrink-0 items-center justify-center rounded-full text-[13px] font-extrabold ${
          missing ? 'border-2 border-goal text-goal-soft' : 'bg-goal text-goal-ink'
        }`}
      >
        {number}
      </span>
      <span className="flex flex-1 flex-col gap-0.5">
        <span className="text-[15px] font-bold">{what.length ? what.join(' · ') : 'Needs details'}</span>
        <span className="text-[13px] text-muted">{when}</span>
      </span>
      {goal.highDanger && <HdTag />}
      {missing && <span className="text-[13px] font-bold text-goal-soft">Add</span>}
    </button>
  );
}

function Card({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="mx-4 flex flex-col gap-4 rounded-3xl surface border border-line px-5 py-5">
      {title && <h2 className="eyebrow">{title}</h2>}
      {children}
    </section>
  );
}

function Tile({ value, label, className = '' }: { value: ReactNode; label: string; className?: string }) {
  return (
    <div className="flex flex-col gap-0.5 tile rounded-[18px] px-3.5 py-3.5">
      <div className={`font-display text-[30px] leading-none font-bold ${className}`}>{value}</div>
      <div className="text-xs font-semibold text-muted">{label}</div>
    </div>
  );
}
