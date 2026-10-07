import { Fragment, useRef, useState, type PointerEvent } from 'react';
import { NeedsDetailsBadge } from '../../components/Badges';
import EventSheet from '../../components/EventSheet';
import { ChevronIcon, CloseIcon, GripIcon, PlusIcon } from '../../components/Icons';
import { insertEvent, moveEvent, updateEvent, type NewEventFields } from '../../data/events';
import { findDropTarget, type DropTarget } from '../../lib/dragDrop';
import { periodLabel, periodsFor } from '../../lib/periods';
import { formatSvPct, needsDetails, periodTotals } from '../../stats/gameStats';
import { detailsLabel } from '../../lib/format';
import { GOAL_REASON_LABELS, NET_ZONE_LABELS, type Period, type ShotEvent } from '../../types';
import { GameHeader, useGameContext } from './GameLayout';

type Filter = 'all' | 'goals' | 'needs';

/** Where a new event will be inserted: between two sortKeys within a period. */
interface Gap {
  key: string; // which "+" was tapped, so its picker opens in place
  period: Period;
  beforeKey?: number;
  afterKey?: number;
}

/** Pointer bookkeeping for an in-progress drag (kept in a ref; read by the auto-scroll loop). */
interface DragPointer {
  id: string;
  startY: number;
  startScroll: number;
  y: number;
  target: DropTarget | null;
}

/** What the screen shows during a drag. */
interface DragView {
  id: string;
  offsetY: number; // how far the dragged row has moved
  indicatorTop: number; // drop line position, relative to the list container
  target: DropTarget | null;
}

const EDGE = 110; // px from the top/bottom of the screen where dragging auto-scrolls (clears the tab bar)

/** Reconciliation timeline: edit, insert and reorder events. */
export default function EventLog() {
  const { game, events } = useGameContext();
  const [filter, setFilter] = useState<Filter>('all');
  const [collapsed, setCollapsed] = useState<Set<Period>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [gap, setGap] = useState<Gap | null>(null);
  const [dragView, setDragView] = useState<DragView | null>(null);
  const dragRef = useRef<DragPointer | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rowEls = useRef(new Map<string, HTMLElement>());
  const sectionEls = useRef(new Map<Period, HTMLElement>());

  const periods = periodsFor(game.numPeriods);
  const editing = editingId ? events.find((e) => e.id === editingId) : undefined;
  const needsCount = events.filter(needsDetails).length;
  const editable = filter === 'all'; // inserting and dragging only make sense on the full timeline
  const visible = events.filter((e) =>
    filter === 'goals' ? e.type === 'goal' : filter === 'needs' ? needsDetails(e) : true,
  );

  async function insert(fields: NewEventFields) {
    if (!gap) return;
    const event = await insertEvent(game.id, gap.period, gap.beforeKey, gap.afterKey, fields);
    setGap(null);
    if (fields.type === 'goal') setEditingId(event.id);
  }

  function toggleCollapsed(p: Period) {
    const next = new Set(collapsed);
    if (next.has(p)) next.delete(p);
    else next.add(p);
    setCollapsed(next);
  }

  // --- Drag and drop -------------------------------------------------------

  // Recompute the drop target from the current pointer position and on-screen layout.
  function updateDrag() {
    const drag = dragRef.current;
    const container = containerRef.current;
    if (!drag || !container) return;
    const rows = events.flatMap((e) => {
      const r = rowEls.current.get(e.id)?.getBoundingClientRect();
      return r ? [{ id: e.id, period: e.period, sortKey: e.sortKey, top: r.top, bottom: r.bottom }] : [];
    });
    const sections = periods.flatMap((p) => {
      const r = sectionEls.current.get(p)?.getBoundingClientRect();
      return r ? [{ period: p, top: r.top, bottom: r.bottom }] : [];
    });
    const target = findDropTarget(rows, sections, drag.id, drag.y);
    drag.target = target;
    setDragView({
      id: drag.id,
      offsetY: drag.y - drag.startY + (window.scrollY - drag.startScroll),
      indicatorTop: target ? target.indicatorY - container.getBoundingClientRect().top : 0,
      target,
    });
  }
  const updateDragRef = useRef(updateDrag);
  updateDragRef.current = updateDrag;

  function startDrag(eventId: string, e: PointerEvent<HTMLElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { id: eventId, startY: e.clientY, startScroll: window.scrollY, y: e.clientY, target: null };
    setGap(null);
    navigator.vibrate?.(20);
    updateDrag();
    // Auto-scroll while the finger is held near the top or bottom edge.
    const tick = () => {
      const drag = dragRef.current;
      if (!drag) return;
      const step = drag.y < EDGE ? -10 : drag.y > window.innerHeight - EDGE ? 10 : 0;
      if (step) {
        window.scrollBy(0, step);
        updateDragRef.current();
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  function moveDrag(e: PointerEvent<HTMLElement>) {
    if (!dragRef.current) return;
    dragRef.current.y = e.clientY;
    updateDrag();
  }

  async function endDrag(drop: boolean) {
    const drag = dragRef.current;
    dragRef.current = null;
    setDragView(null);
    const target = drag?.target;
    if (drop && drag && target && !target.unchanged) {
      await moveEvent(drag.id, target.period, target.beforeKey, target.afterKey);
    }
  }

  const dragHandlers = (eventId: string) => ({
    onPointerDown: (e: PointerEvent<HTMLElement>) => startDrag(eventId, e),
    onPointerMove: moveDrag,
    onPointerUp: () => endDrag(true),
    onPointerCancel: () => endDrag(false),
  });

  const setSectionEl = (p: Period) => (el: HTMLElement | null) => {
    if (el) sectionEls.current.set(p, el);
    else sectionEls.current.delete(p);
  };

  // --- Render --------------------------------------------------------------

  function insertSlot(key: string, period: Period, beforeKey?: number, afterKey?: number) {
    if (!editable) return null;
    if (gap?.key === key) return <InsertPicker period={period} onPick={insert} onCancel={() => setGap(null)} />;
    return <InsertButton hidden={!!dragView} onClick={() => setGap({ key, period, beforeKey, afterKey })} />;
  }

  return (
    <div className="flex flex-col pb-6">
      <GameHeader eyebrow={`vs ${game.opponent} · ${events.length} shots`} title="Event log" />

      <div className="flex gap-2 px-4 pt-3 pb-2">
        <FilterChip on={filter === 'all'} onClick={() => setFilter('all')}>
          All
        </FilterChip>
        <FilterChip on={filter === 'goals'} onClick={() => setFilter('goals')}>
          Goals
        </FilterChip>
        <button
          type="button"
          onClick={() => setFilter('needs')}
          aria-pressed={filter === 'needs'}
          className={`flex h-10 items-center gap-1.5 rounded-full border px-3.5 text-sm font-bold ${
            filter === 'needs' ? 'border-goal bg-goal text-goal-ink' : 'border-goal/40 bg-goal/10 text-goal-soft'
          }`}
        >
          Needs details
          <span
            className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs ${
              filter === 'needs' ? 'bg-goal-ink text-goal' : 'bg-goal text-goal-ink'
            }`}
          >
            {needsCount}
          </span>
        </button>
      </div>

      {editable && events.length > 0 && (
        <div className="flex items-center gap-2 px-5 pb-1 text-xs text-muted">
          <GripIcon size={14} />
          Tap HD to toggle · drag the handle to reorder · + to insert
        </div>
      )}

      <div ref={containerRef} className="relative flex flex-col gap-3 px-4 pt-2">
        {periods.map((period) => {
          const rows = visible.filter((e) => e.period === period);
          const t = periodTotals(events, period);
          const isCollapsed = collapsed.has(period);

          if (rows.length === 0) {
            if (!editable) return null;
            // Empty period: a dashed card that still accepts inserts and drops.
            return (
              <div key={period} ref={setSectionEl(period)} className="rounded-[18px] border border-dashed border-line-strong text-muted">
                <div className="flex h-[60px] items-center gap-3 px-4">
                  <span className="font-display text-[22px] font-bold tracking-wider">{periodLabel(period)}</span>
                  <span className="text-[13px]">Not started</span>
                  {gap?.key !== `${period}:0` && (
                    <button
                      type="button"
                      aria-label={`Insert in ${periodLabel(period)}`}
                      onClick={() => setGap({ key: `${period}:0`, period })}
                      className={`ml-auto flex h-9 w-11 items-center justify-center rounded-full border border-dashed border-[#3a3566] ${
                        dragView ? 'invisible' : ''
                      }`}
                    >
                      <PlusIcon size={14} />
                    </button>
                  )}
                </div>
                {gap?.key === `${period}:0` && (
                  <div className="px-2 pb-2">
                    <InsertPicker period={period} onPick={insert} onCancel={() => setGap(null)} />
                  </div>
                )}
              </div>
            );
          }

          return (
            <section
              key={period}
              ref={isCollapsed ? setSectionEl(period) : undefined}
              className="overflow-hidden rounded-[22px] surface border border-line"
            >
              <button
                type="button"
                onClick={() => toggleCollapsed(period)}
                aria-expanded={!isCollapsed}
                className={`flex h-[60px] w-full items-center gap-3 px-4 text-left ${
                  isCollapsed ? '' : 'border-b border-divider'
                }`}
              >
                <span className="font-display text-[22px] font-bold tracking-wider">{periodLabel(period)}</span>
                <span className="text-[13px] text-muted">
                  {t.shots} SA · {t.goals} GA · {formatSvPct(t.svPct)}
                </span>
                <ChevronIcon className={`ml-auto text-muted ${isCollapsed ? '' : 'rotate-180'}`} />
              </button>

              {!isCollapsed && (
                <div ref={setSectionEl(period)} className="flex flex-col px-2 py-1">
                  {insertSlot(`${period}:0`, period, undefined, rows[0].sortKey)}
                  {rows.map((e, i) => (
                    <Fragment key={e.id}>
                      <EventRow
                        event={e}
                        onClick={() => setEditingId(e.id)}
                        dragHandlers={editable ? dragHandlers(e.id) : undefined}
                        offsetY={dragView?.id === e.id ? dragView.offsetY : undefined}
                        rowRef={(el) => {
                          if (el) rowEls.current.set(e.id, el);
                          else rowEls.current.delete(e.id);
                        }}
                      />
                      {insertSlot(`${period}:${i + 1}`, period, e.sortKey, rows[i + 1]?.sortKey)}
                    </Fragment>
                  ))}
                </div>
              )}
            </section>
          );
        })}

        {!editable && visible.length === 0 && (
          <p className="py-8 text-center text-muted">
            {filter === 'needs' ? 'Every goal has its details.' : 'No goals against.'}
          </p>
        )}

        {dragView?.target && !dragView.target.unchanged && (
          <div
            className="pointer-events-none absolute inset-x-6 z-10 flex -translate-y-1/2 items-center"
            style={{ top: dragView.indicatorTop }}
          >
            <span className="size-2.5 rounded-full bg-save" />
            <span className="h-[3px] flex-1 rounded-full bg-save" />
          </div>
        )}
      </div>

      {editing && (
        <EventSheet
          key={editing.id}
          full
          event={editing}
          numPeriods={game.numPeriods}
          onClose={() => setEditingId(null)}
        />
      )}
    </div>
  );
}

interface EventRowProps {
  event: ShotEvent;
  onClick: () => void;
  dragHandlers?: {
    onPointerDown: (e: PointerEvent<HTMLElement>) => void;
    onPointerMove: (e: PointerEvent<HTMLElement>) => void;
    onPointerUp: () => void;
    onPointerCancel: () => void;
  };
  /** Set while this row is being dragged. */
  offsetY?: number;
  rowRef: (el: HTMLDivElement | null) => void;
}

function EventRow({ event, onClick, dragHandlers, offsetY, rowRef }: EventRowProps) {
  const isGoal = event.type === 'goal';
  const dragging = offsetY !== undefined;
  const detail = [
    event.netZone && NET_ZONE_LABELS[event.netZone],
    detailsLabel(event.details),
    event.reason && GOAL_REASON_LABELS[event.reason],
    event.strength && event.strength !== 'EV' && event.strength,
    event.notes,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div
      ref={rowRef}
      style={dragging ? { transform: `translateY(${offsetY}px)` } : undefined}
      className={`relative flex items-center rounded-[14px] ${
        dragging ? 'z-20 bg-divider shadow-2xl ring-2 ring-save' : ''
      }`}
    >
      <button
        type="button"
        onClick={onClick}
        className="flex min-h-14 min-w-0 flex-1 items-center gap-3 rounded-[14px] p-2 text-left active:bg-divider"
      >
        <EventIcon event={event} />
        <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
          <span className="text-[15px] font-bold">{isGoal ? 'Goal' : 'Save'}</span>
          {detail && <span className="truncate text-[13px] text-muted">{detail}</span>}
          {needsDetails(event) && <NeedsDetailsBadge />}
        </span>
        {event.gameClock && (
          <span className="font-display text-lg font-semibold tracking-wider text-muted">{event.gameClock}</span>
        )}
      </button>
      <button
        type="button"
        onClick={() => {
          navigator.vibrate?.(15);
          updateEvent(event.id, { highDanger: !event.highDanger });
        }}
        aria-pressed={event.highDanger}
        aria-label={event.highDanger ? 'High danger: on' : 'High danger: off'}
        className="flex h-12 w-12 shrink-0 items-center justify-center"
      >
        <span
          className={`rounded-md px-1.5 py-1 text-[11px] font-extrabold tracking-[0.08em] ${
            event.highDanger
              ? 'bg-save text-save-ink'
              : 'border border-dashed border-[#3a3566] text-faint'
          }`}
        >
          HD
        </span>
      </button>
      {dragHandlers && (
        <div
          {...dragHandlers}
          role="button"
          aria-label="Drag to reorder"
          className="flex h-12 w-11 shrink-0 cursor-grab touch-none items-center justify-center rounded-xl text-faint select-none active:cursor-grabbing"
        >
          <GripIcon />
        </div>
      )}
    </div>
  );
}

/** Ring = save, ring with a dot = HD save, solid orange = goal. */
function EventIcon({ event }: { event: ShotEvent }) {
  if (event.type === 'goal') return <span className="size-[22px] shrink-0 rounded-full bg-goal" />;
  if (event.highDanger)
    return (
      <span className="flex size-[22px] shrink-0 items-center justify-center rounded-full border-2 border-save bg-save-deep">
        <span className="size-2 rounded-full bg-save" />
      </span>
    );
  return <span className="size-[22px] shrink-0 rounded-full border-2 border-save" />;
}

function InsertButton({ onClick, hidden }: { onClick: () => void; hidden: boolean }) {
  return (
    <div className={`flex h-7 items-center gap-1.5 pr-2 pl-[38px] ${hidden ? 'invisible' : ''}`}>
      <div className="h-px flex-1 bg-divider" />
      <button
        type="button"
        onClick={onClick}
        aria-label="Insert here"
        className="flex h-7 w-11 items-center justify-center rounded-full border border-dashed border-[#3a3566] text-muted"
      >
        <PlusIcon size={14} />
      </button>
      <div className="h-px flex-1 bg-divider" />
    </div>
  );
}

function InsertPicker({
  period,
  onPick,
  onCancel,
}: {
  period: Period;
  onPick: (fields: NewEventFields) => void;
  onCancel: () => void;
}) {
  const btn = 'h-[52px] rounded-[14px] font-display text-xl font-bold tracking-wider';
  return (
    <div className="mt-1.5 mb-2.5 flex flex-col gap-2.5 rounded-2xl border border-save-line bg-save-deep/50 p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold tracking-[0.12em] text-save-soft uppercase">
          Insert here · {periodLabel(period)}
        </span>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Cancel insert"
          className="flex size-8 items-center justify-center text-muted"
        >
          <CloseIcon size={18} />
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <button type="button" onClick={() => onPick({ type: 'save', highDanger: false })} className={`${btn} fill-save text-save-ink`}>
          SAVE
        </button>
        <button
          type="button"
          onClick={() => onPick({ type: 'save', highDanger: true })}
          className={`${btn} fill-hd border-2 border-save-line text-fg`}
        >
          HD SAVE
        </button>
        <button type="button" onClick={() => onPick({ type: 'goal', highDanger: false })} className={`${btn} fill-goal text-goal-ink`}>
          GOAL
        </button>
      </div>
    </div>
  );
}

function FilterChip({ on, onClick, children }: { on: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`h-10 rounded-full border px-4 text-sm font-bold ${
        on ? 'border-fg bg-fg text-ink' : 'border-line-strong bg-panel text-fg-2'
      }`}
    >
      {children}
    </button>
  );
}
