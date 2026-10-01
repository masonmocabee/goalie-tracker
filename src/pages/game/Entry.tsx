import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import EventSheet from '../../components/EventSheet';
import { FlagIcon, UndoIcon } from '../../components/Icons';
import Segmented from '../../components/Segmented';
import { appendEvent, undoLast, type NewEventFields } from '../../data/events';
import { updateGame } from '../../data/games';
import { periodLabel, periodsFor } from '../../lib/periods';
import { formatSvPct, lastLogged, periodTotals, totals } from '../../stats/gameStats';
import type { Period, ShotEvent } from '../../types';
import { GameHeader, StatusEyebrow, useGameContext } from './GameLayout';

function eventLabel(e: ShotEvent): string {
  const kind = e.type === 'goal' ? 'Goal' : e.highDanger ? 'HD save' : 'Save';
  return `${kind} · ${periodLabel(e.period)}`;
}

/** Live tracking: one tap per shot. */
export default function Entry() {
  const { game, events } = useGameContext();
  const navigate = useNavigate();
  const [chosenPeriod, setChosenPeriod] = useState<Period | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; key: number } | null>(null);
  const toastTimer = useRef<number>(undefined);

  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  // Until the coach picks a period, follow the latest period that has events.
  const period: Period = chosenPeriod ?? events.at(-1)?.period ?? 1;
  const editing = editingId ? events.find((e) => e.id === editingId) : undefined;
  const all = totals(events);
  const cur = periodTotals(events, period);
  const last = lastLogged(events);

  function flash(text: string, pattern: number | number[]) {
    navigator.vibrate?.(pattern);
    window.clearTimeout(toastTimer.current);
    setToast({ text, key: Date.now() });
    toastTimer.current = window.setTimeout(() => setToast(null), 1200);
  }

  async function log(fields: NewEventFields) {
    const event = await appendEvent(game.id, period, fields);
    const goal = fields.type === 'goal';
    flash(`${eventLabel(event)} logged`, goal ? [40, 40, 40] : 30);
    if (goal) setEditingId(event.id);
  }

  async function handleUndo() {
    const undone = await undoLast(game.id);
    flash(undone ? `Undid ${eventLabel(undone)}` : 'Nothing to undo', 30);
  }

  async function toggleFinal() {
    if (game.final) {
      await updateGame(game.id, { final: false });
      return;
    }
    if (!confirm('End this game? You can still edit it afterwards.')) return;
    await updateGame(game.id, { final: true });
    navigate(`/game/${game.id}/stats`);
  }

  return (
    <>
      <GameHeader
        centered
        eyebrow={<StatusEyebrow game={game} />}
        title={`vs ${game.opponent}`}
        right={
          <button
            type="button"
            onClick={toggleFinal}
            className="flex h-11 items-center gap-1.5 rounded-[14px] border border-line-strong bg-panel px-3 text-[13px] font-bold text-fg-2"
          >
            {game.final ? (
              'Reopen'
            ) : (
              <>
                <FlagIcon size={16} />
                End
              </>
            )}
          </button>
        }
      />

      <div className="mx-4 mt-2.5">
        <Segmented
          large
          label="Period"
          options={periodsFor(game.numPeriods).map((p) => ({ value: p, label: periodLabel(p) }))}
          value={period}
          onChange={setChosenPeriod}
        />
      </div>

      <div className="mx-4 mt-3 flex flex-col gap-[18px] rounded-3xl border border-line bg-panel p-5">
        <div className="flex items-end justify-between">
          <div className="flex flex-col gap-1.5">
            <div className="eyebrow">Save %</div>
            <div className="font-display text-[88px] leading-[0.82] font-bold">{formatSvPct(all.svPct)}</div>
          </div>
          <div className="flex flex-col items-end gap-1 pb-0.5">
            <div className="eyebrow">This period</div>
            <div className="font-display text-[34px] leading-none font-bold text-save">{formatSvPct(cur.svPct)}</div>
            <div className="text-[13px] text-muted">
              {cur.shots} SA · {cur.goals} GA
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Tile value={all.shots} label="Shots" />
          <Tile value={all.saves} label="Saves" className="text-save" />
          <Tile value={all.goals} label="Goals" className="text-goal" />
        </div>
      </div>

      <div className="flex-1" />

      <div className="relative flex flex-col gap-2.5 px-4 pt-4 pb-3">
        {toast && (
          <div
            key={toast.key}
            role="status"
            className="pointer-events-none absolute inset-x-4 -top-8 rounded-xl bg-fg py-2 text-center text-sm font-bold text-ink shadow-lg"
          >
            {toast.text}
          </div>
        )}

        <button
          type="button"
          onClick={handleUndo}
          className="flex h-14 items-center gap-2.5 rounded-2xl border border-line-strong px-4 active:bg-panel"
        >
          <UndoIcon />
          <span className="text-[15px] font-bold">Undo last</span>
          <span className="ml-auto text-[13px] text-muted">{last ? eventLabel(last) : 'Nothing to undo'}</span>
        </button>

        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => log({ type: 'save', highDanger: false })}
            className="flex h-32 flex-col items-center justify-center gap-1.5 rounded-[26px] bg-save text-save-ink active:scale-[0.97]"
          >
            <span className="font-display text-5xl leading-[0.9] font-bold tracking-[0.06em]">SAVE</span>
            <span className="text-[13px] font-bold text-[#123a5c]">One tap · {periodLabel(period)}</span>
          </button>
          <button
            type="button"
            onClick={() => log({ type: 'save', highDanger: true })}
            className="flex h-32 flex-col items-center justify-center gap-1.5 rounded-[26px] border-2 border-save bg-save-deep text-[#d6ecff] active:scale-[0.97]"
          >
            <span className="font-display text-5xl leading-[0.9] font-bold tracking-[0.06em]">HD SAVE</span>
            <span className="text-[13px] font-semibold text-save-soft">High danger</span>
          </button>
        </div>
        <button
          type="button"
          onClick={() => log({ type: 'goal', highDanger: false })}
          className="flex h-[84px] items-center justify-center gap-3.5 rounded-3xl bg-goal text-goal-ink active:scale-[0.98]"
        >
          <span className="font-display text-[40px] leading-none font-bold tracking-[0.06em]">GOAL</span>
          <span className="text-[13px] font-bold text-[#4a2410]">Details optional</span>
        </button>
      </div>

      {editing && (
        <EventSheet key={editing.id} event={editing} numPeriods={game.numPeriods} onClose={() => setEditingId(null)} />
      )}
    </>
  );
}

function Tile({ value, label, className = '' }: { value: number; label: string; className?: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-[14px] bg-well px-3.5 py-3">
      <div className={`font-display text-[32px] leading-none font-bold ${className}`}>{value}</div>
      <div className="text-xs font-semibold text-muted">{label}</div>
    </div>
  );
}
