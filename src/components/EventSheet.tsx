import { useState, type ReactNode } from 'react';
import { deleteEvent, updateEvent } from '../data/events';
import { normalizeClock } from '../lib/format';
import { periodLabel, periodName, periodsFor } from '../lib/periods';
import {
  GOAL_REASON_LABELS,
  HIGH_DANGER_HELP,
  type GoalReason,
  type ShotEvent,
  type Strength,
} from '../types';
import BottomSheet from './BottomSheet';
import Chip from './Chip';
import { CheckIcon } from './Icons';
import NetDiagram from './NetDiagram';
import Segmented from './Segmented';

interface Props {
  event: ShotEvent;
  numPeriods: number;
  onClose: () => void;
  /** Also allow changing type and period, and deleting (used from the event log). */
  full?: boolean;
}

const inputClass =
  'h-12 w-full rounded-[14px] border border-line-strong bg-well px-3.5 text-fg placeholder:text-[#77749a]';

/**
 * Edit an event. Every change is saved immediately, so closing the sheet at any
 * point loses nothing and "Done" is always enabled.
 */
export default function EventSheet({ event, numPeriods, onClose, full = false }: Props) {
  // Text fields keep local state so typing isn't disturbed by live-query refreshes.
  const [clock, setClock] = useState(event.gameClock ?? '');
  const [notes, setNotes] = useState(event.notes ?? '');

  const save = (changes: Parameters<typeof updateEvent>[1]) => updateEvent(event.id, changes);
  const isGoal = event.type === 'goal';

  async function handleDelete() {
    if (!confirm(`Delete this ${event.type}?`)) return;
    await deleteEvent(event.id);
    onClose();
  }

  const title = (
    <span className="flex items-center gap-2">
      <span className={`size-2.5 rounded-full ${isGoal ? 'bg-goal' : 'bg-save'}`} />
      {isGoal ? 'Goal against' : event.highDanger ? 'HD save' : 'Save'}
    </span>
  );

  return (
    <BottomSheet
      title={title}
      subtitle={`${periodName(event.period)} · logged · everything below is optional`}
      onClose={onClose}
      footer={
        <div className="flex gap-2.5">
          {full && (
            <button
              type="button"
              onClick={handleDelete}
              className="h-[58px] rounded-[18px] border border-goal/50 px-5 font-bold text-goal-soft"
            >
              Delete
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="flex h-[58px] flex-1 items-center justify-center gap-2 rounded-[18px] bg-fg text-[17px] font-extrabold text-ink"
          >
            <CheckIcon />
            Done
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-[22px]">
        {full && (
          <>
            <Section label="Type">
              <Segmented
                label="Type"
                options={[
                  { value: 'save', label: 'SAVE' },
                  { value: 'goal', label: 'GOAL' },
                ]}
                value={event.type}
                onChange={(type) => save({ type })}
              />
            </Section>
            <Section label="Period">
              <Segmented
                label="Period"
                options={periodsFor(numPeriods).map((p) => ({ value: p, label: periodLabel(p) }))}
                value={event.period}
                onChange={(period) => save({ period })}
              />
            </Section>
          </>
        )}

        {isGoal && (
          <Section label="Net zone">
            <NetDiagram value={event.netZone} onChange={(netZone) => save({ netZone })} />
          </Section>
        )}

        {isGoal && (
          <Section label="Reason">
            <div className="flex flex-wrap gap-2">
              {(Object.entries(GOAL_REASON_LABELS) as [GoalReason, string][]).map(([r, label]) => (
                <Chip
                  key={r}
                  selected={event.reason === r}
                  onClick={() => save({ reason: event.reason === r ? undefined : r })}
                >
                  {label}
                </Chip>
              ))}
            </div>
          </Section>
        )}

        <button
          type="button"
          onClick={() => save({ highDanger: !event.highDanger })}
          aria-pressed={event.highDanger}
          className="flex items-center gap-3.5 rounded-[18px] border border-line-strong bg-well px-4 py-3.5 text-left"
        >
          <span className="flex flex-1 flex-col gap-1">
            <span className="text-[15px] font-bold">High danger</span>
            <span className="text-xs leading-snug text-muted">{HIGH_DANGER_HELP}</span>
          </span>
          <span
            className={`flex h-8 w-[52px] shrink-0 rounded-full p-[3px] ${
              event.highDanger ? 'justify-end bg-save' : 'justify-start bg-[#3a3566]'
            }`}
          >
            <span className={`size-[26px] rounded-full ${event.highDanger ? 'bg-save-ink' : 'bg-fg-2'}`} />
          </span>
        </button>

        {isGoal && (
          <Section label="Strength">
            <Segmented
              label="Strength"
              options={(['EV', 'PP', 'PK'] as Strength[]).map((s) => ({ value: s, label: s }))}
              value={event.strength}
              onChange={(s) => save({ strength: event.strength === s ? undefined : s })}
            />
          </Section>
        )}

        <div className="flex gap-2.5">
          <label className="eyebrow flex w-28 flex-col gap-2">
            Clock
            <input
              className={`${inputClass} font-display text-[22px] tracking-wider`}
              inputMode="numeric"
              placeholder="MM:SS"
              value={clock}
              onChange={(e) => setClock(e.target.value)}
              onBlur={() => {
                const v = normalizeClock(clock);
                setClock(v);
                if (v !== (event.gameClock ?? '')) save({ gameClock: v || undefined });
              }}
            />
          </label>
          <label className="eyebrow flex flex-1 flex-col gap-2">
            Notes
            <input
              className={`${inputClass} text-[15px] tracking-normal normal-case`}
              placeholder="Anything to remember"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={() => {
                const v = notes.trim();
                if (v !== (event.notes ?? '')) save({ notes: v || undefined });
              }}
            />
          </label>
        </div>
      </div>
    </BottomSheet>
  );
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2.5">
      <h3 className="eyebrow">{label}</h3>
      {children}
    </section>
  );
}
