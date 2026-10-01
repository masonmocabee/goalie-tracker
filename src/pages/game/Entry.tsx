import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import BottomSheet from '../../components/BottomSheet';
import EventSheet from '../../components/EventSheet';
import { FlagIcon, ListIcon, UndoIcon } from '../../components/Icons';
import Segmented from '../../components/Segmented';
import { appendEvent, undoLast, type NewEventFields } from '../../data/events';
import { updateGame } from '../../data/games';
import { periodLabel, periodsFor } from '../../lib/periods';
import { formatSvPct, lastLogged, periodTotals, totals } from '../../stats/gameStats';
import type { Period, ShotEvent } from '../../types';
import { GameHeader, HEADER_BUTTON, StatusEyebrow, useGameContext } from './GameLayout';

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
  const [showMenu, setShowMenu] = useState(false);
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
    setShowMenu(false);
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
          <button type="button" onClick={() => setShowMenu(true)} aria-label="Game menu" className={HEADER_BUTTON}>
            <ListIcon size={24} />
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

      <div className="surface mx-4 mt-3 flex flex-col gap-5 rounded-[28px] border border-line p-5">
        <div className="flex items-end justify-between">
          <div className="flex flex-col gap-1.5">
            <div className="eyebrow">Save %</div>
            <div className="font-display text-[96px] leading-[0.82] font-bold">{formatSvPct(all.svPct)}</div>
          </div>
          <div className="flex flex-col items-end gap-1 pb-0.5">
            <div className="eyebrow">This period</div>
            <div className="font-display text-[36px] leading-none font-bold text-save">{formatSvPct(cur.svPct)}</div>
            <div className="text-[13px] text-fg-2/80">
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
          className="surface flex h-14 items-center gap-3 rounded-[20px] border border-line px-4 active:bg-white/5"
        >
          <UndoIcon />
          <span className="text-base font-bold">Undo last</span>
          <span className="ml-auto text-[13px] text-muted">{last ? eventLabel(last) : 'Nothing to undo'}</span>
        </button>

        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => log({ type: 'save', highDanger: false })}
            className="fill-save flex h-[146px] flex-col items-center justify-center gap-2 rounded-[28px] border border-white/30 text-save-ink active:scale-[0.97]"
          >
            <span className="font-display text-[44px] leading-[0.9] font-bold tracking-[0.04em]">SAVE</span>
            <span className="text-sm font-semibold">One tap · {periodLabel(period)}</span>
          </button>
          <button
            type="button"
            onClick={() => log({ type: 'save', highDanger: true })}
            className="fill-hd flex h-[146px] flex-col items-center justify-center gap-1.5 rounded-[28px] border-2 border-save-line text-fg active:scale-[0.97]"
          >
            <span className="font-display text-[40px] leading-[0.9] font-bold tracking-[0.04em]">
              HD
              <br />
              SAVE
            </span>
            <span className="text-sm font-medium text-fg-2">High danger</span>
          </button>
        </div>
        <button
          type="button"
          onClick={() => log({ type: 'goal', highDanger: false })}
          className="fill-goal flex h-[90px] items-center justify-center gap-6 rounded-[28px] border border-white/25 text-goal-ink active:scale-[0.98]"
        >
          <span className="font-display text-[44px] leading-none font-bold tracking-[0.04em]">GOAL</span>
          <span className="text-sm font-semibold text-[#4a1a0c]">Details optional</span>
        </button>
      </div>

      {showMenu && (
        <BottomSheet title={`vs ${game.opponent}`} onClose={() => setShowMenu(false)}>
          <div className="flex flex-col gap-2.5">
            <Link
              to={`/game/${game.id}/log`}
              className="surface flex h-14 items-center gap-3 rounded-[18px] border border-line px-4 text-base font-bold"
            >
              <ListIcon size={20} />
              Event log
            </Link>
            <button
              type="button"
              onClick={toggleFinal}
              className="surface flex h-14 items-center gap-3 rounded-[18px] border border-line px-4 text-base font-bold"
            >
              <FlagIcon size={20} />
              {game.final ? 'Reopen game' : 'End game'}
            </button>
          </div>
        </BottomSheet>
      )}

      {editing && (
        <EventSheet key={editing.id} event={editing} numPeriods={game.numPeriods} onClose={() => setEditingId(null)} />
      )}
    </>
  );
}

function Tile({ value, label, className = '' }: { value: number; label: string; className?: string }) {
  return (
    <div className="tile flex flex-col gap-1.5 rounded-[18px] px-3.5 py-4">
      <div className={`font-display text-[34px] leading-none font-bold ${className}`}>{value}</div>
      <div className="text-sm text-fg-2/80">{label}</div>
    </div>
  );
}
